import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { apiFetch } from "../../../shared/api/api";
import { categoryLabel, enumLabel } from "../../../shared/i18n/labels";

const TYPES = [
  "STRING",
  "TEXT",
  "IMAGE",
  "NUMERIC",
  "DATE",
  "PERIOD",
  "BOOLEAN",
  "ONE_OF_MANY",
];

const emptyConstraints = {
  required: false,
  minLength: "",
  maxLength: "",
  pattern: "",
  min: "",
  max: "",
};

const emptyForm = {
  name: "",
  description: "",
  type: "STRING",
  categoryId: "",
  optionsText: "",
  constraints: { ...emptyConstraints },
};

function constraintsFromAttribute(attribute) {
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

function buildConstraintsPayload(form) {
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

export default function AttributeFormModal({
  show,
  onClose,
  onSaved,
  initial,
  categories,
  token,
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [conflict, setConflict] = useState(false);

  const isEdit = Boolean(initial);
  const isSystem = Boolean(initial?.isSystem);
  const showTextConstraints = form.type === "STRING" || form.type === "TEXT";
  const showNumericConstraints = form.type === "NUMERIC";

  useEffect(() => {
    if (!show) return;
    setError(null);
    setConflict(false);
    if (initial) {
      setForm({
        name: initial.name || "",
        description: initial.description || "",
        type: initial.type || "STRING",
        categoryId: initial.categoryId || initial.category?.id || "",
        optionsText: (initial.options || []).map((o) => o.label).join("\n"),
        constraints: constraintsFromAttribute(initial),
      });
    } else {
      setForm({
        ...emptyForm,
        categoryId: categories[0]?.id || "",
        constraints: { ...emptyConstraints },
      });
    }
  }, [show, initial, categories]);

  if (!show) return null;

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setConstraint(key, value) {
    setForm((prev) => ({
      ...prev,
      constraints: { ...prev.constraints, [key]: value },
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setConflict(false);

    const options = form.optionsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const constraints = isSystem ? undefined : buildConstraintsPayload(form);

    try {
      if (isEdit) {
        const payload = {
          version: initial.version,
          description: form.description,
        };
        if (!isSystem) {
          payload.name = form.name;
          payload.type = form.type;
          payload.categoryId = form.categoryId;
          payload.constraints = constraints;
          if (form.type === "ONE_OF_MANY") {
            payload.options = options;
          } else {
            payload.options = [];
          }
        }

        const data = await apiFetch(`/api/attributes/${initial.id}`, {
          method: "PATCH",
          token,
          body: payload,
        });
        onSaved(data.attribute);
      } else {
        const data = await apiFetch("/api/attributes", {
          method: "POST",
          token,
          body: {
            name: form.name,
            description: form.description,
            type: form.type,
            categoryId: form.categoryId,
            options: form.type === "ONE_OF_MANY" ? options : [],
            constraints,
          },
        });
        onSaved(data.attribute);
      }
      onClose();
    } catch (err) {
      if (err.status === 409 && err.body?.error === "Version conflict") {
        // Версия не совпала — предложим перезагрузить форму.
        setConflict(true);
        setError(err.message);
      } else {
        setError(err.message);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="modal show d-block app-modal"
      tabIndex={-1}
      role="dialog"
      style={{ overflowY: "auto" }}
      onClick={onClose}
    >
      <div
        className="modal-dialog modal-dialog-scrollable"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content" style={{ maxHeight: "calc(100vh - 2rem)" }}>
          <form
            onSubmit={handleSubmit}
            className="d-flex flex-column overflow-hidden h-100"
          >
            <div className="modal-header">
              <h2 className="modal-title h5">
                {isEdit ? t("attributes.edit") : t("attributes.create")}
              </h2>
              <button
                type="button"
                className="btn-close"
                onClick={onClose}
                aria-label={t("attributes.cancel")}
              />
            </div>

            <div className="modal-body overflow-auto">
              {error && (
                <div className={`alert ${conflict ? "alert-warning" : "alert-danger"}`}>
                  {error}
                  {conflict && (
                    <div className="mt-2">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => {
                          onClose();

                          onSaved(null);
                        }}
                      >
                        <i className="bi bi-arrow-clockwise" aria-hidden="true" />
                        {t("attributes.reload")}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {isSystem && (
                <p className="small text-body-secondary">{t("attributes.systemHint")}</p>
              )}

              <div className="mb-3">
                <label className="form-label">{t("attributes.fields.name")}</label>
                <input
                  className="form-control"
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  required
                  disabled={isSystem}
                />
              </div>

              <div className="mb-3">
                <label className="form-label">{t("attributes.fields.description")}</label>
                <textarea
                  className="form-control"
                  rows={2}
                  value={form.description}
                  onChange={(e) => setField("description", e.target.value)}
                />
              </div>

              <div className="mb-3">
                <label className="form-label">{t("attributes.fields.category")}</label>
                <select
                  className="form-select"
                  value={form.categoryId}
                  onChange={(e) => setField("categoryId", e.target.value)}
                  required
                  disabled={isSystem}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {categoryLabel(t, c)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label">{t("attributes.fields.type")}</label>
                <select
                  className="form-select"
                  value={form.type}
                  onChange={(e) => setField("type", e.target.value)}
                  disabled={isSystem}
                >
                  {TYPES.map((type) => (
                    <option key={type} value={type}>
                      {enumLabel(t, "attributeTypes", type)}
                    </option>
                  ))}
                </select>
              </div>

              {form.type === "ONE_OF_MANY" && !isSystem && (
                <div className="mb-3">
                  <label className="form-label">{t("attributes.fields.options")}</label>
                  <textarea
                    className="form-control"
                    rows={4}
                    value={form.optionsText}
                    onChange={(e) => setField("optionsText", e.target.value)}
                    placeholder={t("attributes.fields.optionsPlaceholder")}
                    required
                  />
                </div>
              )}

              {!isSystem && (
                <section className="border rounded p-3 mb-3">
                  <h3 className="h6">{t("attributes.constraints.title")}</h3>
                  <p className="small text-body-secondary mb-3">
                    {t("attributes.constraints.hint")}
                  </p>

                  <div className="form-check mb-3">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="attr-required"
                      checked={Boolean(form.constraints.required)}
                      onChange={(e) => setConstraint("required", e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="attr-required">
                      {t("attributes.constraints.required")}
                    </label>
                  </div>

                  {showTextConstraints && (
                    <div className="row g-2">
                      <div className="col-md-4">
                        <label className="form-label">
                          {t("attributes.constraints.minLength")}
                        </label>
                        <input
                          className="form-control"
                          type="number"
                          min="0"
                          value={form.constraints.minLength}
                          onChange={(e) => setConstraint("minLength", e.target.value)}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">
                          {t("attributes.constraints.maxLength")}
                        </label>
                        <input
                          className="form-control"
                          type="number"
                          min="0"
                          value={form.constraints.maxLength}
                          onChange={(e) => setConstraint("maxLength", e.target.value)}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">
                          {t("attributes.constraints.pattern")}
                        </label>
                        <input
                          className="form-control"
                          value={form.constraints.pattern}
                          onChange={(e) => setConstraint("pattern", e.target.value)}
                          placeholder="^[A-Za-z]+$"
                        />
                      </div>
                    </div>
                  )}

                  {showNumericConstraints && (
                    <div className="row g-2">
                      <div className="col-md-6">
                        <label className="form-label">{t("attributes.constraints.min")}</label>
                        <input
                          className="form-control"
                          type="number"
                          value={form.constraints.min}
                          onChange={(e) => setConstraint("min", e.target.value)}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">{t("attributes.constraints.max")}</label>
                        <input
                          className="form-control"
                          type="number"
                          value={form.constraints.max}
                          onChange={(e) => setConstraint("max", e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </section>
              )}

              {isEdit && (
                <p className="small text-body-secondary mb-0">
                  {t("attributes.version")}: {initial.version}
                </p>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
                <i className="bi bi-x-lg" aria-hidden="true" />
                {t("attributes.cancel")}
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {!saving && <i className="bi bi-check2" aria-hidden="true" />}
                {saving ? "…" : t("attributes.save")}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
