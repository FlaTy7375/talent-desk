import { Router } from "express";
import { Prisma } from "@prisma/client";
import multer from "multer";
import { randomUUID } from "node:crypto";
import prisma from "../lib/prisma.js";
import { supabaseAdmin } from "../lib/supabase.js";
import { requireAuth } from "../middleware/auth.js";
import {
  maybeSyncAvatarFromAttribute,
  upsertPersonalPhotoValue,
} from "../services/avatar.js";
import { maybeSyncDisplayName } from "../services/displayName.js";
import { validateAttributeValue } from "../services/attributeConstraints.js";

const router = Router();
router.use(requireAuth);

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, done) => {
    done(null, ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype));
  },
});

const attributeInclude = {
  category: true,
  options: { orderBy: { sortOrder: "asc" } },
};

const projectInclude = {
  tags: { include: { tag: true } },
};

function projectDto(project) {
  return {
    ...project,
    tags: project.tags.map((link) => link.tag.name),
  };
}

function jsonValue(value) {
  return value === null || value === undefined ? Prisma.JsonNull : value;
}

async function resolveOwner(req, res) {
  const requested = String(req.query.userId || req.body?.ownerId || "").trim();
  if (!requested || requested === req.user.id) {
    return {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      avatarUrl: req.user.avatarUrl,
      version: req.user.version,
    };
  }
  if (req.user.role !== "ADMIN") {
    res.status(403).json({ error: "Only admin can edit another profile" });
    return null;
  }
  const user = await prisma.user.findUnique({
    where: { id: requested },
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      version: true,
    },
  });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return null;
  }
  return user;
}

router.post("/avatar", avatarUpload.single("avatar"), async (req, res) => {
  try {
    const owner = await resolveOwner(req, res);
    if (!owner) return;

    if (!supabaseAdmin) {
      return res.status(503).json({
        error: "Set SUPABASE_SECRET_KEY in server/.env and restart the server",
      });
    }
    if (!req.file) {
      return res.status(400).json({ error: "Choose a JPG, PNG, or WebP image" });
    }

    const bucket = "profile-images";
    const existingBucket = await supabaseAdmin.storage.getBucket(bucket);
    if (existingBucket.error) {
      const created = await supabaseAdmin.storage.createBucket(bucket, {
        public: true,
        fileSizeLimit: 5 * 1024 * 1024,
        allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
      });
      if (created.error && !created.error.message.toLowerCase().includes("already exists")) {
        throw created.error;
      }
    }

    const extension = req.file.mimetype.split("/")[1].replace("jpeg", "jpg");
    const path = `${owner.id}/${randomUUID()}.${extension}`;
    const uploaded = await supabaseAdmin.storage.from(bucket).upload(path, req.file.buffer, {
      contentType: req.file.mimetype,
      cacheControl: "31536000",
      upsert: false,
    });
    if (uploaded.error) throw uploaded.error;

    const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
    await upsertPersonalPhotoValue(owner.id, data.publicUrl);
    res.status(201).json({ url: data.publicUrl });
  } catch (err) {
    console.error("POST /profile/avatar", err);
    res.status(500).json({ error: err.message });
  }
});

async function ensureTags(tx, names) {
  const unique = [...new Set(names.map((name) => String(name).trim()).filter(Boolean))];
  const tags = [];
  for (const name of unique) {
    tags.push(
      await tx.tag.upsert({
        where: { name },
        create: { name },
        update: {},
      })
    );
  }
  return tags;
}

router.get("/", async (req, res) => {
  try {
    const owner = await resolveOwner(req, res);
    if (!owner) return;

    const [systemAttributes, values, projects, cvs, availableInfo, tagSuggestions] =
      await Promise.all([
        prisma.attribute.findMany({
          where: { isSystem: true },
          orderBy: { name: "asc" },
          include: attributeInclude,
        }),
        prisma.attributeValue.findMany({
          where: { userId: owner.id },
          include: { attribute: { include: attributeInclude } },
        }),
        prisma.project.findMany({
          where: { userId: owner.id },
          orderBy: [{ periodEnd: "desc" }, { createdAt: "desc" }],
          include: projectInclude,
        }),
        prisma.cv.findMany({
          where: { userId: owner.id },
          orderBy: { updatedAt: "desc" },
          include: {
            position: { select: { id: true, title: true, company: true } },
            _count: { select: { likes: true } },
          },
        }),
        prisma.attribute.findMany({
          where: { isSystem: false },
          orderBy: { name: "asc" },
          include: attributeInclude,
        }),
        prisma.tag.findMany({
          orderBy: { name: "asc" },
          take: 100,
          select: { name: true },
        }),
      ]);

    const valueByAttribute = new Map(values.map((item) => [item.attributeId, item]));
    const me = systemAttributes.map((attribute) => {
      const value = valueByAttribute.get(attribute.id);
      return {
        attribute,
        value: value?.value ?? null,
        valueVersion: value?.version ?? null,
      };
    });
    const info = values
      .filter((item) => !item.attribute.isSystem)
      .map((item) => ({
        attribute: item.attribute,
        value: item.value,
        valueVersion: item.version,
      }));

    const projectCount = projects.length;
    const cvCount = cvs.length;
    const likeTotal = cvs.reduce((sum, cv) => sum + (cv._count?.likes || 0), 0);

    res.json({
      user: owner,
      me,
      info,
      availableInfo,
      projects: projects.map(projectDto),
      cvs,
      tagSuggestions: tagSuggestions.map((tag) => tag.name),
      badges: [
        { id: "first-project", title: "First Project", threshold: 1, value: projectCount, icon: "kanban" },
        { id: "projects-10", title: "10 Projects", threshold: 10, value: projectCount, icon: "collection" },
        { id: "first-cv", title: "First CV", threshold: 1, value: cvCount, icon: "file-earmark-person" },
        { id: "cvs-5", title: "5 CVs", threshold: 5, value: cvCount, icon: "files" },
        { id: "likes-25", title: "25 Likes", threshold: 25, value: likeTotal, icon: "heart" },
      ].map((rule) => ({
        ...rule,
        earned: rule.value >= rule.threshold,
        progress: Math.min(100, Math.round((rule.value / rule.threshold) * 100)),
      })),
      permissions: {
        canEdit: true,
        isAdminView: owner.id !== req.user.id,
      },
    });
  } catch (err) {
    console.error("GET /profile", err);
    res.status(500).json({ error: err.message });
  }
});

router.put("/attributes/:attributeId", async (req, res) => {
  try {
    const owner = await resolveOwner(req, res);
    if (!owner) return;

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
          userId: owner.id,
          attributeId: attribute.id,
        },
      },
    });

    if (!existing) {
      try {
        const created = await prisma.attributeValue.create({
          data: {
            userId: owner.id,
            attributeId: attribute.id,
            value: jsonValue(req.body.value),
          },
        });
        await maybeSyncAvatarFromAttribute(owner.id, attribute, created.value);
        await maybeSyncDisplayName(owner.id, attribute);
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
            userId: owner.id,
            attributeId: attribute.id,
          },
        },
      }));

    const updated = await prisma.attributeValue.updateMany({
      where: {
        id: row.id,
        version: Number(req.body.version),
      },
      data: {
        value: jsonValue(req.body.value),
        version: { increment: 1 },
      },
    });
    if (updated.count === 0) {
      // Версия не совпала — всё равно пишем последние данные.
      await prisma.attributeValue.update({
        where: { id: row.id },
        data: {
          value: jsonValue(req.body.value),
          version: { increment: 1 },
        },
      });
    }

    const saved = await prisma.attributeValue.findUnique({ where: { id: row.id } });
    await maybeSyncAvatarFromAttribute(owner.id, attribute, saved.value);
    await maybeSyncDisplayName(owner.id, attribute);
    res.json({ value: saved.value, version: saved.version });
  } catch (err) {
    console.error("PUT /profile/attributes", err);
    res.status(500).json({ error: err.message });
  }
});

router.delete("/attributes/:attributeId", async (req, res) => {
  try {
    const owner = await resolveOwner(req, res);
    if (!owner) return;

    const attribute = await prisma.attribute.findUnique({
      where: { id: req.params.attributeId },
    });
    if (!attribute) return res.status(404).json({ error: "Not found" });
    if (attribute.isSystem) {
      return res.status(400).json({ error: "System attribute cannot be removed" });
    }
    await prisma.attributeValue.deleteMany({
      where: { userId: owner.id, attributeId: attribute.id },
    });
    res.json({ removed: true });
  } catch (err) {
    console.error("DELETE /profile/attributes", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/projects", async (req, res) => {
  try {
    const owner = await resolveOwner(req, res);
    if (!owner) return;
    if (!req.body.name?.trim()) return res.status(400).json({ error: "name required" });
    const project = await prisma.$transaction(async (tx) => {
      const tags = await ensureTags(tx, req.body.tags || []);
      return tx.project.create({
        data: {
          userId: owner.id,
          name: req.body.name.trim(),
          periodStart: req.body.periodStart ? new Date(req.body.periodStart) : null,
          periodEnd: req.body.periodEnd ? new Date(req.body.periodEnd) : null,
          description: req.body.description || "",
          tags: { create: tags.map((tag) => ({ tagId: tag.id })) },
        },
        include: projectInclude,
      });
    });
    res.status(201).json({ project: projectDto(project) });
  } catch (err) {
    console.error("POST /profile/projects", err);
    res.status(500).json({ error: err.message });
  }
});

router.patch("/projects/:id", async (req, res) => {
  try {
    const owner = await resolveOwner(req, res);
    if (!owner) return;
    if (req.body.version == null) return res.status(400).json({ error: "version required" });
    const project = await prisma.$transaction(async (tx) => {
      const updated = await tx.project.updateMany({
        where: {
          id: req.params.id,
          userId: owner.id,
          version: Number(req.body.version),
        },
        data: {
          name: req.body.name?.trim(),
          periodStart: req.body.periodStart ? new Date(req.body.periodStart) : null,
          periodEnd: req.body.periodEnd ? new Date(req.body.periodEnd) : null,
          description: req.body.description || "",
          version: { increment: 1 },
        },
      });
      if (updated.count === 0) return null;

      await tx.projectTag.deleteMany({ where: { projectId: req.params.id } });
      const tags = await ensureTags(tx, req.body.tags || []);
      if (tags.length) {
        await tx.projectTag.createMany({
          data: tags.map((tag) => ({ projectId: req.params.id, tagId: tag.id })),
        });
      }
      return tx.project.findUnique({
        where: { id: req.params.id },
        include: projectInclude,
      });
    });
    if (!project) return res.status(409).json({ error: "Version conflict" });
    res.json({ project: projectDto(project) });
  } catch (err) {
    console.error("PATCH /profile/projects", err);
    res.status(500).json({ error: err.message });
  }
});

router.delete("/projects/:id", async (req, res) => {
  try {
    const owner = await resolveOwner(req, res);
    if (!owner) return;
    const result = await prisma.project.deleteMany({
      where: { id: req.params.id, userId: owner.id },
    });
    if (!result.count) return res.status(404).json({ error: "Not found" });
    res.json({ deleted: true });
  } catch (err) {
    console.error("DELETE /profile/projects", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
