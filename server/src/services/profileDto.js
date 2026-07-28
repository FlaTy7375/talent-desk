import { Prisma } from "@prisma/client";

export const ATTRIBUTE_INCLUDE = {
  category: true,
  options: { orderBy: { sortOrder: "asc" } },
};

export const PROJECT_INCLUDE = {
  tags: { include: { tag: true } },
};

export function projectDto(project) {
  return {
    ...project,
    tags: project.tags.map((link) => link.tag.name),
  };
}

export function jsonValue(value) {
  return value === null || value === undefined ? Prisma.JsonNull : value;
}

const BADGE_RULES = [
  { id: "first-project", title: "First Project", threshold: 1, field: "projects", icon: "kanban" },
  { id: "projects-10", title: "10 Projects", threshold: 10, field: "projects", icon: "collection" },
  { id: "first-cv", title: "First CV", threshold: 1, field: "cvs", icon: "file-earmark-person" },
  { id: "cvs-5", title: "5 CVs", threshold: 5, field: "cvs", icon: "files" },
  { id: "likes-25", title: "25 Likes", threshold: 25, field: "likes", icon: "heart" },
];

export function buildBadges({ projectCount, cvCount, likeTotal }) {
  const values = { projects: projectCount, cvs: cvCount, likes: likeTotal };
  return BADGE_RULES.map((rule) => {
    const value = values[rule.field];
    return {
      id: rule.id,
      title: rule.title,
      threshold: rule.threshold,
      value,
      icon: rule.icon,
      earned: value >= rule.threshold,
      progress: Math.min(100, Math.round((value / rule.threshold) * 100)),
    };
  });
}
