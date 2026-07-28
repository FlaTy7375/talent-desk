import prisma from "../lib/prisma.js";
import { attachResolvedAvatars } from "./avatar.js";
import { attachResolvedDisplayNames } from "./displayName.js";
import { isFilled } from "./positionAccess.js";

export const POSITION_INCLUDE = {
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
  projectTags: { include: { tag: true } },
};

/** Assemble a CV from profile data and position template — no duplicate field storage. */
export async function buildCv(cvId) {
  const cv = await prisma.cv.findUnique({
    where: { id: cvId },
    include: {
      user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      position: { include: POSITION_INCLUDE },
      _count: { select: { likes: true } },
    },
  });
  if (!cv) return null;

  await Promise.all([
    attachResolvedDisplayNames([cv.user]),
    attachResolvedAvatars([cv.user]),
  ]);

  const attributeIds = cv.position.attributes.map((item) => item.attributeId);
  const values = await prisma.attributeValue.findMany({
    where: { userId: cv.userId, attributeId: { in: attributeIds } },
  });
  const valueMap = new Map(values.map((item) => [item.attributeId, item]));

  const attributes = cv.position.attributes.map((item) => {
    const stored = valueMap.get(item.attributeId);
    return {
      attribute: item.attribute,
      value: stored?.value ?? null,
      valueVersion: stored?.version ?? null,
      filled: isFilled(stored?.value),
    };
  });

  const requiredTags = cv.position.projectTags.map((item) => item.tag.name);
  const projects = await prisma.project.findMany({
    where: {
      userId: cv.userId,
      ...(requiredTags.length
        ? { tags: { some: { tag: { name: { in: requiredTags } } } } }
        : {}),
    },
    orderBy: [{ periodEnd: "desc" }, { createdAt: "desc" }],
    take: cv.position.maxProjects,
    include: { tags: { include: { tag: true } } },
  });

  return {
    id: cv.id,
    status: cv.status,
    version: cv.version,
    createdAt: cv.createdAt,
    updatedAt: cv.updatedAt,
    publishedAt: cv.publishedAt,
    likes: cv._count.likes,
    user: cv.user,
    position: {
      id: cv.position.id,
      title: cv.position.title,
      company: cv.position.company,
      shortDescription: cv.position.shortDescription,
      maxProjects: cv.position.maxProjects,
      projectTags: requiredTags,
    },
    attributes,
    projects: projects.map((project) => ({
      ...project,
      tags: project.tags.map((link) => link.tag.name),
    })),
    complete: attributes.every((item) => item.filled),
  };
}
