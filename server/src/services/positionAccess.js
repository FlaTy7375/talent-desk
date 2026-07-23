import prisma from "../lib/prisma.js";

function compare(actual, operator, expected) {
  if (actual === null || actual === undefined) return false;
  // Для правил доступа числа и даты приводим к одному виду.
  function ordered(value) {
    if (typeof value === "number") return value;
    if (value !== "" && Number.isFinite(Number(value))) return Number(value);
    const timestamp = Date.parse(value);
    return Number.isNaN(timestamp) ? String(value) : timestamp;
  }
  const left = ordered(actual);
  const right = ordered(expected);
  switch (operator) {
    case "eq":
      return actual === expected || String(actual) === String(expected);
    case "contains":
      return String(actual).toLowerCase().includes(String(expected).toLowerCase());
    case "gt":
      return left > right;
    case "gte":
      return left >= right;
    case "lt":
      return left < right;
    case "lte":
      return left <= right;
    default:
      return false;
  }
}

export function evaluatePositionAccess(position, valueMap) {
  if (position.isPublic) return true;
  const rules = Array.isArray(position.accessRules) ? position.accessRules : [];
  if (!rules.length) return false;
  return rules.every((rule) =>
    compare(valueMap.get(rule.attributeId), rule.operator, rule.value)
  );
}

export async function canAccessPosition(userId, position) {
  if (position.isPublic) return true;
  const rules = Array.isArray(position.accessRules) ? position.accessRules : [];
  if (!rules.length) return false;

  const attributeIds = [...new Set(rules.map((rule) => rule.attributeId))];
  const values = await prisma.attributeValue.findMany({
    where: { userId, attributeId: { in: attributeIds } },
  });
  const map = new Map(values.map((item) => [item.attributeId, item.value]));
  return evaluatePositionAccess(position, map);
}

export function isFilled(value) {
  if (value === null || value === undefined || value === "") return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") {
    return Object.values(value).every(
      (part) => part !== null && part !== undefined && part !== ""
    );
  }
  return true;
}
