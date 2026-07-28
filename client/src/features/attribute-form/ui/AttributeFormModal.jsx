import { useTranslation } from "react-i18next";
import { categoryLabel, enumLabel } from "../../../shared/i18n/labels";
import { ATTRIBUTE_TYPES } from "../model/constants";
import { useAttributeForm } from "../model/useAttributeForm";
import ConstraintsSection from "./ConstraintsSection";

export default function AttributeFormModal({
  show,
  onClose,
  onSaved,
  initial,
  categories,
  token,
}) {
  const { t } = useTranslation();

  const {
    form,
    saving,
    error,
    conflict,
    isEdit,
    isSystem,
    setField,
    setConstraint,
    handleSubmit,
  } = useAttributeForm({
    show,
    initial,
    categories,
    token,
    onSaved,
    onClose,
  });

  if (!show) return null;

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
                  {ATTRIBUTE_TYPES.map((type) => (
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

              <ConstraintsSection
                constraints={form.constraints}
                type={form.type}
                isSystem={isSystem}
                onConstraintChange={setConstraint}
              />

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
