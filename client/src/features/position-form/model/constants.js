export const LEVELS = ["", "JUNIOR", "MIDDLE", "SENIOR", "C_LEVEL"];

export const EMPTY_FORM = {
  title: "",
  shortDescription: "",
  company: "",
  level: "",
  isPublic: true,
  maxProjects: 3,
  imageUrl: "",
  attributeIds: [],
  tagsText: "",
  accessRules: [],
};

export function operatorsFor(type) {
  if (type === "NUMERIC" || type === "DATE") return ["eq", "gt", "gte", "lt", "lte"];
  if (type === "BOOLEAN") return ["eq"];
  if (type === "STRING" || type === "TEXT") return ["eq", "contains"];
  if (type === "ONE_OF_MANY") return ["eq"];
  return ["eq"];
}

export function snapshot(form) {
  return JSON.stringify(form);
}

export function formFromInitial(initial) {
  if (!initial) return { ...EMPTY_FORM };
  return {
    title: initial.title || "",
    shortDescription: initial.shortDescription || "",
    company: initial.company || "",
    level: initial.level || "",
    isPublic: initial.isPublic,
    maxProjects: initial.maxProjects ?? 3,
    imageUrl: initial.imageUrl || "",
    attributeIds: (initial.attributes || []).map((a) => a.id),
    tagsText: (initial.projectTags || []).map((tag) => tag.name).join(", "),
    accessRules: Array.isArray(initial.accessRules) ? initial.accessRules : [],
  };
}
