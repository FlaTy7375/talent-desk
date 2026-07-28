import prisma from "../lib/prisma.js";
import { evaluatePositionAccess } from "./positionAccess.js";
import { attachResolvedAvatars } from "./avatar.js";
import { attachResolvedDisplayNames } from "./displayName.js";

/** Published CVs for a position, filtered by access rules when position is restricted. */
export async function getPublishedAccessibleCvs(position) {
  const cvs = await prisma.cv.findMany({
    where: { positionId: position.id, status: "PUBLISHED" },
    orderBy: { updatedAt: "desc" },
    include: {
      user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      _count: { select: { likes: true } },
    },
  });

  let accessibleIds = new Set(cvs.map((cv) => cv.userId));
  if (!position.isPublic) {
    const rules = Array.isArray(position.accessRules) ? position.accessRules : [];
    const attributeIds = [...new Set(rules.map((rule) => rule.attributeId))];
    const userIds = cvs.map((cv) => cv.userId);
    const values = await prisma.attributeValue.findMany({
      where: { userId: { in: userIds }, attributeId: { in: attributeIds } },
    });
    const maps = new Map();
    for (const value of values) {
      if (!maps.has(value.userId)) maps.set(value.userId, new Map());
      maps.get(value.userId).set(value.attributeId, value.value);
    }
    accessibleIds = new Set(
      cvs
        .filter((cv) =>
          evaluatePositionAccess(position, maps.get(cv.userId) || new Map())
        )
        .map((cv) => cv.userId)
    );
  }

  return cvs.filter((cv) => accessibleIds.has(cv.userId));
}

export async function enrichPublishedCvs(cvs, { avatars = true, names = true } = {}) {
  const users = cvs.map((cv) => cv.user);
  const tasks = [];
  if (avatars) tasks.push(attachResolvedAvatars(users));
  if (names) tasks.push(attachResolvedDisplayNames(users));
  if (tasks.length) await Promise.all(tasks);
  return cvs;
}

export function escapeCsv(value) {
  const text = value == null ? "" : String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}
