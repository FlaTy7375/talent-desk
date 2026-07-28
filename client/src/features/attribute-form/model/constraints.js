export const emptyConstraints = {
  required: false,
  minLength: "",
  maxLength: "",
  pattern: "",
  min: "",
  max: "",
};

export function constraintsFromAttribute(attribute) {
  const raw = attribute?.constraints;
  if (!raw || typeof raw !== "object") return { ...emptyConstraints };
  return {
    required: Boolean(raw.required),
    minLength: raw.minLength != null ? String(raw.minLength) : "",
    maxLength: raw.maxLength != null ? String(raw.maxLength) : "",
    pattern: raw.pattern != null ? String(raw.pattern) : "",
    min: raw.min != null ? String(raw.min) : "",
    max: raw.max != null ? String(raw.max) : "",
  };
}

export function buildConstraintsPayload(form) {
  const c = form.constraints || emptyConstraints;
  const out = {};
  if (c.required) out.required = true;

  if (form.type === "STRING" || form.type === "TEXT") {
    if (c.minLength !== "" && c.minLength != null) out.minLength = Number(c.minLength);
    if (c.maxLength !== "" && c.maxLength != null) out.maxLength = Number(c.maxLength);
    if (c.pattern?.trim()) out.pattern = c.pattern.trim();
  }
  if (form.type === "NUMERIC") {
    if (c.min !== "" && c.min != null) out.min = Number(c.min);
    if (c.max !== "" && c.max != null) out.max = Number(c.max);
  }

  return Object.keys(out).length ? out : null;
}
