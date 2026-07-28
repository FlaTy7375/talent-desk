export function filled(value) {
  if (value === null || value === undefined || value === "") return false;
  if (typeof value === "object") return Object.values(value).every(filled);
  return true;
}

export function getCandidateName(cv, drafts) {
  const attrs = cv.attributes || [];
  const first = attrs.find((entry) => entry.attribute.name === "First Name");
  const last = attrs.find((entry) => entry.attribute.name === "Last Name");
  const parts = [first, last].map((entry) => {
    if (!entry) return "";
    const value = drafts?.[entry.attribute.id] ?? entry.value;
    return typeof value === "string" ? value.trim() : "";
  });
  return parts.filter(Boolean).join(" ") || cv.user.name || cv.user.email;
}
