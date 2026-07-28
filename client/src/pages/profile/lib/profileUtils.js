export function downloadBadgesSvg(badges, t) {
  const rows = (badges || [])
    .map((badge, index) => {
      const y = 36 + index * 52;
      const label = t(`badges.${badge.id}`, { defaultValue: badge.title });
      const status = badge.earned
        ? t("badges.earned")
        : `${badge.value}/${badge.threshold}`;
      const fill = badge.earned ? "#b82933" : "#d5dae2";
      return `
      <rect x="16" y="${y}" width="368" height="44" rx="10" fill="#fff" stroke="#e6e9ee"/>
      <circle cx="40" cy="${y + 22}" r="10" fill="${fill}"/>
      <text x="60" y="${y + 20}" font-family="Segoe UI, sans-serif" font-size="14" font-weight="700" fill="#1a1f27">${label}</text>
      <text x="60" y="${y + 36}" font-family="Segoe UI, sans-serif" font-size="11" fill="#5c6570">${status}</text>
      <rect x="250" y="${y + 18}" width="120" height="8" rx="4" fill="#f1f3f6"/>
      <rect x="250" y="${y + 18}" width="${(120 * badge.progress) / 100}" height="8" rx="4" fill="#b82933"/>`;
    })
    .join("");
  const height = 48 + (badges?.length || 0) * 52;
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="${height}" viewBox="0 0 400 ${height}">
  <rect width="400" height="${height}" fill="#f7f8fa"/>
  <text x="16" y="24" font-family="Segoe UI, sans-serif" font-size="16" font-weight="800" fill="#b82933">TalentDesk · Badges</text>
  ${rows}
</svg>`;
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "talentdesk-badges.svg";
  link.click();
  URL.revokeObjectURL(url);
}

export function getDisplayNameFromItems(items, drafts) {
  const first = items.find((item) => item.attribute.name === "First Name");
  const last = items.find((item) => item.attribute.name === "Last Name");
  const parts = [first, last].map((item) => {
    if (!item) return "";
    const value = drafts[item.attribute.id];
    return typeof value === "string" ? value.trim() : "";
  });
  return parts.filter(Boolean).join(" ") || null;
}
