import i18n from "../i18n";

const ERROR_MAP = [
  { match: /version conflict/i, key: "errors.versionConflict" },
  { match: /not found/i, key: "errors.notFound" },
  { match: /^forbidden$/i, key: "errors.forbidden" },
  { match: /invalid token|no token|unauthorized/i, key: "errors.unauthorized" },
  { match: /sign in to view this position/i, key: "errors.signInRequired" },
  { match: /position is not accessible/i, key: "errors.positionNotAccessible" },
  { match: /SUPABASE_SECRET_KEY/i, key: "errors.storageNotConfigured" },
  { match: /Choose a JPG, PNG, or WebP/i, key: "errors.chooseImage" },
];

export function localizeApiError(message) {
  const text = String(message || "").trim();
  if (!text) return i18n.t("errors.generic");
  const hit = ERROR_MAP.find((entry) => entry.match.test(text));
  return hit ? i18n.t(hit.key) : text;
}
