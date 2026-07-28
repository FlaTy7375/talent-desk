import { useTranslation } from "react-i18next";

export default function ConstraintsSection({ constraints, type, isSystem, onConstraintChange }) {
  const { t } = useTranslation();
  const showTextConstraints = type === "STRING" || type === "TEXT";
  const showNumericConstraints = type === "NUMERIC";

  if (isSystem) return null;

  return (
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
          checked={Boolean(constraints.required)}
          onChange={(e) => onConstraintChange("required", e.target.checked)}
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
              value={constraints.minLength}
              onChange={(e) => onConstraintChange("minLength", e.target.value)}
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
              value={constraints.maxLength}
              onChange={(e) => onConstraintChange("maxLength", e.target.value)}
            />
          </div>
          <div className="col-md-4">
            <label className="form-label">
              {t("attributes.constraints.pattern")}
            </label>
            <input
              className="form-control"
              value={constraints.pattern}
              onChange={(e) => onConstraintChange("pattern", e.target.value)}
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
              value={constraints.min}
              onChange={(e) => onConstraintChange("min", e.target.value)}
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">{t("attributes.constraints.max")}</label>
            <input
              className="form-control"
              type="number"
              value={constraints.max}
              onChange={(e) => onConstraintChange("max", e.target.value)}
            />
          </div>
        </div>
      )}
    </section>
  );
}
