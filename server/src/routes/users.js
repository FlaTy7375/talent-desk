import { Router } from "express";
import prisma from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import {
  attachResolvedAvatars,
} from "../services/avatar.js";
import { attachResolvedDisplayNames } from "../services/displayName.js";

const router = Router();
router.use(requireAuth);

const attributeInclude = {
  category: true,
  options: { orderBy: { sortOrder: "asc" } },
};

router.get("/:id", async (req, res) => {
  try {
    const isSelf = req.user.id === req.params.id;
    const isAdmin = req.user.role === "ADMIN";
    const isRecruiter = req.user.role === "RECRUITER";
    if (!isSelf && !isAdmin && !isRecruiter) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        role: true,
        isBlocked: true,
      },
    });
    if (!user) return res.status(404).json({ error: "User not found" });

    await Promise.all([
      attachResolvedDisplayNames([user]),
      attachResolvedAvatars([user]),
    ]);

    const [systemAttributes, values, projects, cvs] = await Promise.all([
      prisma.attribute.findMany({
        where: { isSystem: true },
        orderBy: { name: "asc" },
        include: attributeInclude,
      }),
      prisma.attributeValue.findMany({
        where: { userId: user.id },
        include: { attribute: { include: attributeInclude } },
      }),
      prisma.project.findMany({
        where: { userId: user.id },
        orderBy: [{ periodEnd: "desc" }, { createdAt: "desc" }],
        include: { tags: { include: { tag: true } } },
      }),
      prisma.cv.findMany({
        where: {
          userId: user.id,
          ...(isSelf || isAdmin ? {} : { status: "PUBLISHED" }),
        },
        orderBy: { updatedAt: "desc" },
        include: {
          position: { select: { id: true, title: true, company: true } },
          _count: { select: { likes: true } },
        },
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
      user,
      me,
      info,
      projects: projects.map((project) => ({
        ...project,
        tags: project.tags.map((link) => link.tag.name),
      })),
      cvs,
      badges: buildBadges({ projectCount, cvCount, likeTotal }),
      permissions: {
        canEdit: isSelf || isAdmin,
        readOnly: !(isSelf || isAdmin),
        isAdminView: isAdmin && !isSelf,
      },
    });
  } catch (err) {
    console.error("GET /users/:id", err);
    res.status(500).json({ error: err.message });
  }
});

function buildBadges({ projectCount, cvCount, likeTotal }) {
  const rules = [
    { id: "first-project", title: "First Project", threshold: 1, value: projectCount, icon: "kanban" },
    { id: "projects-10", title: "10 Projects", threshold: 10, value: projectCount, icon: "collection" },
    { id: "first-cv", title: "First CV", threshold: 1, value: cvCount, icon: "file-earmark-person" },
    { id: "cvs-5", title: "5 CVs", threshold: 5, value: cvCount, icon: "files" },
    { id: "likes-25", title: "25 Likes", threshold: 25, value: likeTotal, icon: "heart" },
  ];
  return rules.map((rule) => ({
    ...rule,
    earned: rule.value >= rule.threshold,
    progress: Math.min(100, Math.round((rule.value / rule.threshold) * 100)),
  }));
}

export default router;
