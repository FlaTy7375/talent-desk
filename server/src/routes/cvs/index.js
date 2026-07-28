import { Router } from "express";
import prisma from "../../lib/prisma.js";
import { requireAuth } from "../../middleware/auth.js";
import { canAccessPosition } from "../../services/positionAccess.js";
import { buildCv } from "../../services/cvBuilder.js";
import {
  enrichPublishedCvs,
  escapeCsv,
  getPublishedAccessibleCvs,
} from "../../services/cvPublishedList.js";
import { Prisma } from "@prisma/client";
import {
  maybeSyncAvatarFromAttribute,
} from "../../services/avatar.js";
import { maybeSyncDisplayName } from "../../services/displayName.js";
import { validateAttributeValue } from "../../services/attributeConstraints.js";

const router = Router();
router.use(requireAuth);

router.get("/available-positions", async (req, res) => {
  try {
    const positions = await prisma.position.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        cvs: {
          where: { userId: req.user.id },
          select: { id: true, status: true },
        },
        _count: { select: { cvs: true } },
      },
    });
    const result = [];
    for (const position of positions) {
      if (await canAccessPosition(req.user.id, position)) {
        result.push({
          id: position.id,
          title: position.title,
          company: position.company,
          shortDescription: position.shortDescription,
          imageUrl: position.imageUrl || null,
          level: position.level,
          isPublic: position.isPublic,
          version: position.version,
          attributes: [],
          cvCount: position._count.cvs,
          existingCv: position.cvs[0] || null,
        });
      }
    }
    res.json({ positions: result });
  } catch (err) {
    console.error("GET /cvs/available-positions", err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/position/:positionId", async (req, res) => {
  try {
    if (req.user.role !== "RECRUITER" && req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Recruiter role required" });
    }
    const position = await prisma.position.findUnique({
      where: { id: req.params.positionId },
    });
    if (!position) return res.status(404).json({ error: "Position not found" });

    const published = await getPublishedAccessibleCvs(position);
    await enrichPublishedCvs(published);

    const liked = await prisma.like.findMany({
      where: {
        userId: req.user.id,
        cvId: { in: published.map((cv) => cv.id) },
      },
      select: { cvId: true },
    });
    const likedIds = new Set(liked.map((row) => row.cvId));

    res.json({
      cvs: published.map((cv) => ({
        id: cv.id,
        status: cv.status,
        updatedAt: cv.updatedAt,
        candidate: cv.user,
        likes: cv._count.likes,
        likedByMe: likedIds.has(cv.id),
      })),
    });
  } catch (err) {
    console.error("GET /cvs/position/:positionId", err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/position/:positionId/export.csv", async (req, res) => {
  try {
    if (req.user.role !== "RECRUITER" && req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Recruiter role required" });
    }
    const position = await prisma.position.findUnique({
      where: { id: req.params.positionId },
    });
    if (!position) return res.status(404).json({ error: "Position not found" });

    const published = await getPublishedAccessibleCvs(position);
    await enrichPublishedCvs(published, { avatars: false });

    const lines = [
      ["name", "email", "likes", "updatedAt", "position"].map(escapeCsv).join(","),
      ...published.map((cv) =>
        [
          cv.user.name || "",
          cv.user.email || "",
          cv._count.likes,
          cv.updatedAt?.toISOString?.() || cv.updatedAt || "",
          position.title || "",
        ]
          .map(escapeCsv)
          .join(",")
      ),
    ];

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="position-${position.id}-cvs.csv"`
    );
    res.send("\uFEFF" + lines.join("\n"));
  } catch (err) {
    console.error("GET /cvs/position/:positionId/export.csv", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const position = await prisma.position.findUnique({
      where: { id: req.body.positionId },
    });
    if (!position) return res.status(404).json({ error: "Position not found" });
    if (!(await canAccessPosition(req.user.id, position))) {
      return res.status(403).json({ error: "Position is not accessible" });
    }
    const cv = await prisma.cv.create({
      data: { userId: req.user.id, positionId: position.id },
    });
    res.status(201).json({ cv: await buildCv(cv.id) });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ error: "CV already exists for this position" });
    }
    console.error("POST /cvs", err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const cv = await buildCv(req.params.id);
    if (!cv) return res.status(404).json({ error: "CV not found" });

    const isOwner = cv.user.id === req.user.id;
    const isAdmin = req.user.role === "ADMIN";
    const isRecruiter = req.user.role === "RECRUITER";
    const isManager = isAdmin || isRecruiter;

    if (!isOwner && !isManager) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (isRecruiter && !isOwner && cv.status !== "PUBLISHED") {
      return res.status(404).json({ error: "CV not found" });
    }

    if (!isManager) {
      const position = await prisma.position.findUnique({
        where: { id: cv.position.id },
      });
      if (!(await canAccessPosition(req.user.id, position))) {
        return res.status(403).json({ error: "CV is hidden: position access lost" });
      }
    }

    let likedByMe = false;
    if (isManager && cv.status === "PUBLISHED") {
      likedByMe = Boolean(
        await prisma.like.findUnique({
          where: { cvId_userId: { cvId: cv.id, userId: req.user.id } },
        })
      );
    }

    res.json({
      cv: { ...cv, likedByMe, likes: cv.likes ?? 0 },
      permissions: {
        canEdit: isOwner || isAdmin,
        canPublish: isOwner || isAdmin,
        canLike: isManager && cv.status === "PUBLISHED",
        readOnly: !(isOwner || isAdmin),
      },
    });
  } catch (err) {
    console.error("GET /cvs/:id", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/:id/like", async (req, res) => {
  try {
    if (req.user.role !== "RECRUITER" && req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Recruiter role required" });
    }
    const cv = await prisma.cv.findUnique({
      where: { id: req.params.id },
      select: { id: true, status: true },
    });
    if (!cv || cv.status !== "PUBLISHED") {
      return res.status(404).json({ error: "Published CV not found" });
    }
    await prisma.like.upsert({
      where: { cvId_userId: { cvId: cv.id, userId: req.user.id } },
      create: { cvId: cv.id, userId: req.user.id },
      update: {},
    });
    const likes = await prisma.like.count({ where: { cvId: cv.id } });
    res.json({ liked: true, likes });
  } catch (err) {
    console.error("POST /cvs/:id/like", err);
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id/like", async (req, res) => {
  try {
    if (req.user.role !== "RECRUITER" && req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Recruiter role required" });
    }
    await prisma.like.deleteMany({
      where: { cvId: req.params.id, userId: req.user.id },
    });
    const likes = await prisma.like.count({ where: { cvId: req.params.id } });
    res.json({ liked: false, likes });
  } catch (err) {
    console.error("DELETE /cvs/:id/like", err);
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id/attributes/:attributeId", async (req, res) => {
  try {
    const cv = await prisma.cv.findUnique({ where: { id: req.params.id } });
    if (!cv) return res.status(404).json({ error: "CV not found" });
    if (cv.userId !== req.user.id && req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Read only" });
    }

    const inTemplate = await prisma.positionAttribute.findUnique({
      where: {
        positionId_attributeId: {
          positionId: cv.positionId,
          attributeId: req.params.attributeId,
        },
      },
    });
    if (!inTemplate) return res.status(400).json({ error: "Not in position template" });

    const attribute = await prisma.attribute.findUnique({
      where: { id: req.params.attributeId },
    });
    if (!attribute) return res.status(404).json({ error: "Attribute not found" });

    const constraintError = validateAttributeValue(attribute, req.body.value);
    if (constraintError) {
      return res.status(400).json({ error: constraintError });
    }

    const existing = await prisma.attributeValue.findUnique({
      where: {
        userId_attributeId: {
          userId: cv.userId,
          attributeId: req.params.attributeId,
        },
      },
    });
    const value = req.body.value == null ? Prisma.JsonNull : req.body.value;

    if (!existing) {
      try {
        const created = await prisma.attributeValue.create({
          data: {
            userId: cv.userId,
            attributeId: req.params.attributeId,
            value,
          },
        });
        await maybeSyncAvatarFromAttribute(cv.userId, attribute, created.value);
        await maybeSyncDisplayName(cv.userId, attribute);
        return res.status(201).json({
          value: created.value,
          version: created.version,
        });
      } catch (err) {
        if (err.code !== "P2002") throw err;
      }
    }

    const row =
      existing ||
      (await prisma.attributeValue.findUnique({
        where: {
          userId_attributeId: {
            userId: cv.userId,
            attributeId: req.params.attributeId,
          },
        },
      }));

    const updated = await prisma.attributeValue.updateMany({
      where: { id: row.id, version: Number(req.body.version) },
      data: { value, version: { increment: 1 } },
    });
    if (!updated.count) {
      await prisma.attributeValue.update({
        where: { id: row.id },
        data: { value, version: { increment: 1 } },
      });
    }
    const saved = await prisma.attributeValue.findUnique({ where: { id: row.id } });
    await maybeSyncAvatarFromAttribute(cv.userId, attribute, saved.value);
    await maybeSyncDisplayName(cv.userId, attribute);
    res.json({ value: saved.value, version: saved.version });
  } catch (err) {
    console.error("PUT /cvs/:id/attributes", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/:id/publish", async (req, res) => {
  try {
    const cv = await prisma.cv.findUnique({ where: { id: req.params.id } });
    if (!cv) return res.status(404).json({ error: "CV not found" });
    if (cv.userId !== req.user.id && req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const aggregate = await buildCv(cv.id);
    if (!aggregate.complete) {
      return res.status(400).json({
        error: "CV is incomplete",
        missing: aggregate.attributes
          .filter((item) => !item.filled)
          .map((item) => item.attribute.name),
      });
    }

    const updated = await prisma.cv.updateMany({
      where: { id: cv.id, version: Number(req.body.version) },
      data: {
        status: "PUBLISHED",
        publishedAt: new Date(),
        version: { increment: 1 },
      },
    });
    if (!updated.count) {
      await prisma.cv.update({
        where: { id: cv.id },
        data: {
          status: "PUBLISHED",
          publishedAt: new Date(),
          version: { increment: 1 },
        },
      });
    }
    res.json({ cv: await buildCv(cv.id) });
  } catch (err) {
    console.error("POST /cvs/:id/publish", err);
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const cv = await prisma.cv.findUnique({ where: { id: req.params.id } });
    if (!cv) return res.status(404).json({ error: "Not found" });
    if (cv.userId !== req.user.id && req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Forbidden" });
    }
    await prisma.cv.delete({ where: { id: cv.id } });
    res.json({ deleted: true });
  } catch (err) {
    console.error("DELETE /cvs/:id", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
