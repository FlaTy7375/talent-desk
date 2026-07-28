export const LEVELS = ["JUNIOR", "MIDDLE", "SENIOR", "C_LEVEL"];

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
  projectTags: {
    include: { tag: true },
  },
  _count: { select: { cvs: true } },
};

export function toDto(position) {
  return {
    ...position,
    attributes: position.attributes.map((item) => item.attribute),
    projectTags: position.projectTags.map((item) => item.tag),
    cvCount: position._count?.cvs ?? 0,
    _count: undefined,
  };
}

export function validatePositionBody(body) {
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
