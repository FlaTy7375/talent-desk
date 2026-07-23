import { randomUUID } from "crypto";
import { Router } from "express";
import multer from "multer";
import prisma from "../lib/prisma.js";
import { optionalAuth, requireAuth, requireRole } from "../middleware/auth.js";
import { canAccessPosition } from "../services/positionAccess.js";
import { attachResolvedAvatars } from "../services/avatar.js";
import { supabaseAdmin } from "../lib/supabase.js";

const router = Router();
const recruiterOnly = [requireAuth, requireRole("RECRUITER", "ADMIN")];
const LEVELS = ["JUNIOR", "MIDDLE", "SENIOR", "C_LEVEL"];
const POSITION_IMAGE_BUCKET = "position-images";
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

async function ensurePositionImageBucket() {
  if (!supabaseAdmin) {
    const err = new Error("Storage is not configured");
    err.code = "STORAGE_NOT_CONFIGURED";
    throw err;
  }
  const existing = await supabaseAdmin.storage.getBucket(POSITION_IMAGE_BUCKET);
  if (!existing.error) return;
  const created = await supabaseAdmin.storage.createBucket(POSITION_IMAGE_BUCKET, {
    public: true,
    fileSizeLimit: 5 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  });
  if (created.error && !created.error.message.toLowerCase().includes("already exists")) {
    throw created.error;
  }
}

const positionInclude = {
  attributes: {
    orderBy: { sortOrder: "asc" },
    include: {
      attribute: {
        include: {
          category: true,
          options: { orderBy: { sortOrder: "asc" } },
        },
      },
    },
  },
  projectTags: {
    include: { tag: true },
  },
  _count: { select: { cvs: true } },
};

function toDto(position) {
  return {
    ...position,
    attributes: position.attributes.map((item) => item.attribute),
    projectTags: position.projectTags.map((item) => item.tag),
    cvCount: position._count?.cvs ?? 0,
    _count: undefined,
  };
}

function validateBody(body) {
  if (!body.title?.trim()) return "title is required";
  if (body.level && !LEVELS.includes(body.level)) return "invalid level";
  if (!Number.isInteger(Number(body.maxProjects)) || Number(body.maxProjects) < 0) {
    return "maxProjects must be a non-negative integer";
  }
  if (!Array.isArray(body.attributeIds)) return "attributeIds[] is required";
  if (!Array.isArray(body.projectTags)) return "projectTags[] is required";
  if (!Array.isArray(body.accessRules)) return "accessRules[] is required";
  return null;
}

async function ensureTags(db, names) {
  const unique = [...new Set(names.map((name) => String(name).trim()).filter(Boolean))];
  const tags = [];
  for (const name of unique) {
    const tag = await db.tag.upsert({
      where: { name },
      create: { name },
      update: {},
    });
    tags.push(tag);
  }
  return tags;
}

router.get("/", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    const positions = await prisma.position.findMany({
      where: {
        isPublic: true,
        ...(q
          ? { title: { contains: q, mode: "insensitive" } }
          : {}),
      },
      orderBy: { updatedAt: "desc" },
      include: positionInclude,
    });
    res.json({ positions: positions.map(toDto) });
  } catch (err) {
    console.error("GET /positions", err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/manage", ...recruiterOnly, async (_req, res) => {
  try {
    const positions = await prisma.position.findMany({
      orderBy: { updatedAt: "desc" },
      include: positionInclude,
    });
    res.json({ positions: positions.map(toDto) });
  } catch (err) {
    console.error("GET /positions/manage", err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id/view", optionalAuth, async (req, res) => {
  try {
    const position = await prisma.position.findUnique({
      where: { id: req.params.id },
      include: positionInclude,
    });
    if (!position) return res.status(404).json({ error: "Not found" });
    const manager = req.user?.role === "RECRUITER" || req.user?.role === "ADMIN";
    if (!position.isPublic) {
      if (!req.user) return res.status(401).json({ error: "Sign in to view this position" });
      if (!manager && !(await canAccessPosition(req.user.id, position))) {
        return res.status(403).json({ error: "Position is not accessible" });
      }
    }
    res.json({ position: toDto(position) });
  } catch (err) {
    console.error("GET /positions/:id/view", err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id/discussion", requireAuth, async (req, res) => {
  try {
    const position = await prisma.position.findUnique({ where: { id: req.params.id } });
    if (!position) return res.status(404).json({ error: "Not found" });
    const manager = req.user.role === "RECRUITER" || req.user.role === "ADMIN";
    if (!manager && !(await canAccessPosition(req.user.id, position))) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const posts = await prisma.discussionPost.findMany({
      where: { positionId: position.id },
      orderBy: { createdAt: "asc" },
      include: {
        author: {
          select: { id: true, name: true, email: true, avatarUrl: true, role: true },
        },
      },
    });
    await attachResolvedAvatars(posts.map((post) => post.author));
    res.json({ posts });
  } catch (err) {
    console.error("GET /positions/:id/discussion", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/:id/discussion", requireAuth, async (req, res) => {
  try {
    const body = String(req.body.body || "").trim();
    if (!body) return res.status(400).json({ error: "body required" });
    const position = await prisma.position.findUnique({ where: { id: req.params.id } });
    if (!position) return res.status(404).json({ error: "Not found" });
    const manager = req.user.role === "RECRUITER" || req.user.role === "ADMIN";
    if (!manager && !(await canAccessPosition(req.user.id, position))) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const post = await prisma.discussionPost.create({
      data: {
        positionId: position.id,
        authorId: req.user.id,
        body,
      },
      include: {
        author: {
          select: { id: true, name: true, email: true, avatarUrl: true, role: true },
        },
      },
    });
    await attachResolvedAvatars([post.author]);
    res.status(201).json({ post });
  } catch (err) {
    console.error("POST /positions/:id/discussion", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/", ...recruiterOnly, async (req, res) => {
  try {
    const validationError = validateBody(req.body);
    if (validationError) return res.status(400).json({ error: validationError });

    const {
      title,
      shortDescription = "",
      company = null,
      level = null,
      isPublic = true,
      accessRules = [],
      maxProjects = 3,
      imageUrl = null,
      attributeIds,
      projectTags,
    } = req.body;

    const tags = await ensureTags(prisma, projectTags);
    const position = await prisma.position.create({
      data: {
        title: title.trim(),
        shortDescription,
        company: company?.trim() || null,
        level: level || null,
        isPublic: Boolean(isPublic),
        accessRules: isPublic ? [] : accessRules,
        maxProjects: Number(maxProjects),
        imageUrl:
          typeof imageUrl === "string" && imageUrl.trim() ? imageUrl.trim() : null,
        attributes: {
          create: [...new Set(attributeIds)].map((attributeId, index) => ({
            attributeId,
            sortOrder: index,
          })),
        },
        projectTags: {
          create: tags.map((tag) => ({ tagId: tag.id })),
        },
      },
      include: positionInclude,
    });

    res.status(201).json({ position: toDto(position) });
  } catch (err) {
    console.error("POST /positions", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/:id/duplicate", ...recruiterOnly, async (req, res) => {
  try {
    const source = await prisma.position.findUnique({
      where: { id: req.params.id },
      include: positionInclude,
    });
    if (!source) return res.status(404).json({ error: "Not found" });

    const copy = await prisma.position.create({
      data: {
        title: `${source.title} (Copy)`,
        shortDescription: source.shortDescription,
        company: source.company,
        level: source.level,
        isPublic: source.isPublic,
        accessRules: source.accessRules,
        maxProjects: source.maxProjects,
        imageUrl: source.imageUrl,
        attributes: {
          create: source.attributes.map((item) => ({
            attributeId: item.attributeId,
            sortOrder: item.sortOrder,
          })),
        },
        projectTags: {
          create: source.projectTags.map((item) => ({ tagId: item.tagId })),
        },
      },
      include: positionInclude,
    });
    res.status(201).json({ position: toDto(copy) });
  } catch (err) {
    console.error("POST /positions/:id/duplicate", err);
    res.status(500).json({ error: err.message });
  }
});

router.patch("/:id", ...recruiterOnly, async (req, res) => {
  try {
    const validationError = validateBody(req.body);
    if (validationError) return res.status(400).json({ error: validationError });
    if (req.body.version == null) {
      return res.status(400).json({ error: "version is required" });
    }

    // Обновляем только если версия совпала, иначе вернём ошибку о версии.
    const updated = await prisma.position.updateMany({
      where: { id: req.params.id, version: Number(req.body.version) },
      data: {
        title: req.body.title.trim(),
        shortDescription: req.body.shortDescription || "",
        company: req.body.company?.trim() || null,
        level: req.body.level || null,
        isPublic: Boolean(req.body.isPublic),
        accessRules: req.body.isPublic ? [] : req.body.accessRules,
        maxProjects: Number(req.body.maxProjects),
        ...(Object.prototype.hasOwnProperty.call(req.body, "imageUrl")
          ? {
              imageUrl:
                typeof req.body.imageUrl === "string" && req.body.imageUrl.trim()
                  ? req.body.imageUrl.trim()
                  : null,
            }
          : {}),
        version: { increment: 1 },
      },
    });
    if (updated.count === 0) {
      return res.status(409).json({
        error: "Version conflict",
        message: "Position was modified by someone else. Reload and retry.",
      });
    }

    await prisma.positionAttribute.deleteMany({ where: { positionId: req.params.id } });
    await prisma.positionTag.deleteMany({ where: { positionId: req.params.id } });

    const attributeIds = [...new Set(req.body.attributeIds)];
    if (attributeIds.length) {
      await prisma.positionAttribute.createMany({
        data: attributeIds.map((attributeId, index) => ({
          positionId: req.params.id,
          attributeId,
          sortOrder: index,
        })),
      });
    }

    const tags = await ensureTags(prisma, req.body.projectTags);
    if (tags.length) {
      await prisma.positionTag.createMany({
        data: tags.map((tag) => ({
          positionId: req.params.id,
          tagId: tag.id,
        })),
      });
    }

    const result = await prisma.position.findUnique({
      where: { id: req.params.id },
      include: positionInclude,
    });

    res.json({ position: toDto(result) });
  } catch (err) {
    console.error("PATCH /positions/:id", err);
    res.status(500).json({ error: err.message });
  }
});

router.post(
  "/:id/image",
  ...recruiterOnly,
  upload.single("image"),
  async (req, res) => {
    try {
      // Загружаем картинку позиции в хранилище и сохраняем ссылку.
      const position = await prisma.position.findUnique({ where: { id: req.params.id } });
      if (!position) return res.status(404).json({ error: "Not found" });
      if (!req.file) {
        return res.status(400).json({ error: "Choose a JPG, PNG, or WebP image" });
      }
      if (!["image/jpeg", "image/png", "image/webp"].includes(req.file.mimetype)) {
        return res.status(400).json({ error: "Choose a JPG, PNG, or WebP image" });
      }

      await ensurePositionImageBucket();
      const extension = req.file.mimetype.split("/")[1].replace("jpeg", "jpg");
      const path = `${position.id}/${randomUUID()}.${extension}`;
      const uploaded = await supabaseAdmin.storage
        .from(POSITION_IMAGE_BUCKET)
        .upload(path, req.file.buffer, {
          contentType: req.file.mimetype,
          cacheControl: "31536000",
          upsert: false,
        });
      if (uploaded.error) throw uploaded.error;

      const { data } = supabaseAdmin.storage
        .from(POSITION_IMAGE_BUCKET)
        .getPublicUrl(path);

      const updated = await prisma.position.update({
        where: { id: position.id },
        data: { imageUrl: data.publicUrl, version: { increment: 1 } },
        include: positionInclude,
      });

      res.status(201).json({ url: data.publicUrl, position: toDto(updated) });
    } catch (err) {
      if (err.code === "STORAGE_NOT_CONFIGURED") {
        return res.status(503).json({ error: err.message });
      }
      console.error("POST /positions/:id/image", err);
      res.status(500).json({ error: err.message });
    }
  }
);

router.delete("/", ...recruiterOnly, async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
    if (!ids.length) return res.status(400).json({ error: "ids[] required" });
    const result = await prisma.position.deleteMany({ where: { id: { in: ids } } });
    res.json({ deleted: result.count });
  } catch (err) {
    console.error("DELETE /positions", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
