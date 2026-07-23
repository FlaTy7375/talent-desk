import { Router } from "express";
import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

const ATTRIBUTE_TYPES = [
  "STRING",
  "TEXT",
  "IMAGE",
  "NUMERIC",
  "DATE",
  "PERIOD",
  "BOOLEAN",
  "ONE_OF_MANY",
];

router.use(requireAuth, requireRole("RECRUITER", "ADMIN"));

function includeAttribute() {
  return {
    category: true,
    options: { orderBy: { sortOrder: "asc" } },
  };
}

async function touchRecent(userId, attributeId) {
  await prisma.attributeRecentUse.upsert({
    where: {
      userId_attributeId: { userId, attributeId },
    },
    create: { userId, attributeId },
    update: { usedAt: new Date() },
  });
}

router.get("/", async (req, res) => {
  try {
    if (req.query.recent === "1" || req.query.recent === "true") {
      const recent = await prisma.attributeRecentUse.findMany({
        where: { userId: req.user.id },
        orderBy: { usedAt: "desc" },
        take: 10,
        include: {
          attribute: { include: includeAttribute() },
        },
      });
      return res.json({
        attributes: recent.map((r) => r.attribute),
      });
    }

    const where = {};

    const q = (req.query.q || "").trim();
    if (q) {

      where.name = { startsWith: q, mode: "insensitive" };
    }

    if (req.query.categoryId) {
      where.categoryId = String(req.query.categoryId);
    }

    const attributes = await prisma.attribute.findMany({
      where,
      orderBy: [{ isSystem: "desc" }, { name: "asc" }],
      include: includeAttribute(),
    });

    res.json({ attributes });
  } catch (err) {
    console.error("GET /attributes", err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const attribute = await prisma.attribute.findUnique({
      where: { id: req.params.id },
      include: includeAttribute(),
    });
    if (!attribute) {
      return res.status(404).json({ error: "Not found" });
    }
    await touchRecent(req.user.id, attribute.id);
    res.json({ attribute });
  } catch (err) {
    console.error("GET /attributes/:id", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, description = "", type, categoryId, options = [], constraints } = req.body;

    if (!name || !type || !categoryId) {
      return res.status(400).json({ error: "name, type, categoryId required" });
    }
    if (!ATTRIBUTE_TYPES.includes(type)) {
      return res.status(400).json({ error: "Invalid type", allowed: ATTRIBUTE_TYPES });
    }

    const category = await prisma.attributeCategory.findUnique({
      where: { id: categoryId },
    });
    if (!category) {
      return res.status(400).json({ error: "Unknown categoryId" });
    }

    if (type === "ONE_OF_MANY" && (!Array.isArray(options) || options.length < 1)) {
      return res.status(400).json({ error: "ONE_OF_MANY requires options[]" });
    }

    const attribute = await prisma.attribute.create({
      data: {
        name: String(name).trim(),
        description: String(description),
        type,
        categoryId,
        isSystem: false,
        constraints:
          constraints && typeof constraints === "object" ? constraints : undefined,
        options:
          type === "ONE_OF_MANY"
            ? {
                create: options.map((label, index) => ({
                  label: String(label).trim(),
                  sortOrder: index,
                })),
              }
            : undefined,
      },
      include: includeAttribute(),
    });

    await touchRecent(req.user.id, attribute.id);
    res.status(201).json({ attribute });
  } catch (err) {

    if (err.code === "P2002") {
      return res.status(409).json({ error: "Attribute name must be unique" });
    }
    console.error("POST /attributes", err);
    res.status(500).json({ error: err.message });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const { name, description, type, categoryId, options, version, constraints } = req.body;

    if (version === undefined || version === null) {
      return res.status(400).json({ error: "version is required for optimistic locking" });
    }

    const existing = await prisma.attribute.findUnique({
      where: { id: req.params.id },
      include: { options: true },
    });
    if (!existing) {
      return res.status(404).json({ error: "Not found" });
    }



    if (existing.isSystem) {
      const updated = await prisma.attribute.updateMany({
        where: { id: existing.id, version: Number(version) },
        data: {
          description:
            description !== undefined ? String(description) : existing.description,
          version: { increment: 1 },
        },
      });
      if (updated.count === 0) {
        return res.status(409).json({
          error: "Version conflict",
          message: "Attribute was modified by someone else. Reload and retry.",
        });
      }
      const attribute = await prisma.attribute.findUnique({
        where: { id: existing.id },
        include: includeAttribute(),
      });
      await touchRecent(req.user.id, attribute.id);
      return res.json({ attribute });
    }

    if (type && !ATTRIBUTE_TYPES.includes(type)) {
      return res.status(400).json({ error: "Invalid type" });
    }

    const nextType = type || existing.type;
    const constraintsData =
      constraints === null
        ? Prisma.DbNull
        : constraints && typeof constraints === "object"
          ? constraints
          : undefined;

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.attribute.updateMany({
        where: { id: existing.id, version: Number(version) },
        data: {
          name: name !== undefined ? String(name).trim() : undefined,
          description: description !== undefined ? String(description) : undefined,
          type: type || undefined,
          categoryId: categoryId || undefined,
          ...(constraints !== undefined ? { constraints: constraintsData } : {}),
          version: { increment: 1 },
        },
      });

      if (updated.count === 0) {
        return { conflict: true };
      }


      if (nextType === "ONE_OF_MANY" && Array.isArray(options)) {
        await tx.attributeOption.deleteMany({ where: { attributeId: existing.id } });
        if (options.length) {
          await tx.attributeOption.createMany({
            data: options.map((label, index) => ({
              attributeId: existing.id,
              label: String(label).trim(),
              sortOrder: index,
            })),
          });
        }
      }

      if (nextType !== "ONE_OF_MANY") {
        await tx.attributeOption.deleteMany({ where: { attributeId: existing.id } });
      }

      const attribute = await tx.attribute.findUnique({
        where: { id: existing.id },
        include: includeAttribute(),
      });
      return { attribute };
    });

    if (result.conflict) {
      return res.status(409).json({
        error: "Version conflict",
        message: "Attribute was modified by someone else. Reload and retry.",
      });
    }

    await touchRecent(req.user.id, result.attribute.id);
    res.json({ attribute: result.attribute });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ error: "Attribute name must be unique" });
    }
    console.error("PATCH /attributes", err);
    res.status(500).json({ error: err.message });
  }
});

router.delete("/", async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
    if (!ids.length) {
      return res.status(400).json({ error: "ids[] required" });
    }

    const system = await prisma.attribute.findMany({
      where: { id: { in: ids }, isSystem: true },
      select: { id: true, name: true },
    });
    if (system.length) {
      return res.status(400).json({
        error: "Cannot delete system attributes",
        system: system.map((s) => s.name),
      });
    }

    const result = await prisma.attribute.deleteMany({
      where: { id: { in: ids }, isSystem: false },
    });

    res.json({ deleted: result.count });
  } catch (err) {
    console.error("DELETE /attributes", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
