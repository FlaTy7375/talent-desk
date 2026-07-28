import { useTranslation } from "react-i18next";
import { attributeLabel, categoryLabel, enumLabel } from "../../../shared/i18n/labels";
import { operatorsFor } from "../model/constants";

export default function PositionAttributesSection({
  attributes,
  form,
  onToggleAttribute,
}) {
  const { t } = useTranslation();

  return (
    <>
      <hr />
      <h3 className="h6">{t("positions.fields.attributes")}</h3>
      <div className="row g-2 mb-3">
        {attributes.map((attribute) => (
          <div className="col-md-6" key={attribute.id}>
            <label className="form-check border rounded p-2 ps-5 d-block">
              <input
                className="form-check-input"
                type="checkbox"
                checked={form.attributeIds.includes(attribute.id)}
                onChange={() => onToggleAttribute(attribute.id)}
              />
              <span className="fw-medium">{attributeLabel(t, attribute)}</span>
              <small className="d-block text-body-secondary">
                {enumLabel(t, "attributeTypes", attribute.type)} ·{" "}
                {categoryLabel(t, attribute.category)}
              </small>
            </label>
          </div>
        ))}
      </div>
    </>
  );
}

export function PositionAccessRulesSection({
  form,
  selectedAttributes,
  onFieldChange,
  onAddRule,
  onUpdateRule,
  onRemoveRule,
}) {
  const { t } = useTranslation();

  return (
    <>
      <div className="form-check form-switch mb-3">
        <input
          className="form-check-input"
          type="checkbox"
          id="position-public"
          checked={form.isPublic}
          onChange={(e) => onFieldChange("isPublic", e.target.checked)}
        />
        <label className="form-check-label" htmlFor="position-public">
          {t("positions.fields.public")}
        </label>
      </div>

      {!form.isPublic && (
        <section>
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h3 className="h6 mb-0">{t("positions.fields.rules")}</h3>
            <button
              type="button"
              className="btn btn-sm btn-outline-primary"
              onClick={onAddRule}
              disabled={!selectedAttributes.length}
            >
              <i className="bi bi-plus-lg" aria-hidden="true" />
              {t("positions.addRule")}
            </button>
          </div>

          {!selectedAttributes.length && (
            <p className="small text-body-secondary">
              {t("positions.selectAttributesFirst")}
            </p>
          )}

          {form.accessRules.map((rule, index) => {
            const attribute =
              selectedAttributes.find((item) => item.id === rule.attributeId) ||
              selectedAttributes[0];
            if (!attribute) return null;
            return (
              <div className="row g-2 mb-2" key={`${rule.attributeId}-${index}`}>
                <div className="col-md-5">
                  <select
                    className="form-select"
                    value={rule.attributeId}
                    onChange={(e) => {
                      const next = selectedAttributes.find(
                        (item) => item.id === e.target.value
                      );
                      onUpdateRule(index, {
                        attributeId: next.id,
                        operator: operatorsFor(next.type)[0],
                        value: next.type === "BOOLEAN" ? true : "",
                      });
                    }}
                  >
                    {selectedAttributes.map((item) => (
                      <option key={item.id} value={item.id}>
                        {attributeLabel(t, item)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-2">
                  <select
                    className="form-select"
                    value={rule.operator}
                    onChange={(e) => onUpdateRule(index, { operator: e.target.value })}
                  >
                    {operatorsFor(attribute.type).map((operator) => (
                      <option key={operator} value={operator}>
                        {enumLabel(t, "operators", operator)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-4">
                  {attribute.type === "BOOLEAN" ? (
                    <select
                      className="form-select"
                      value={String(rule.value)}
                      onChange={(e) =>
                        onUpdateRule(index, { value: e.target.value === "true" })
                      }
                    >
                      <option value="true">{t("common.yes")}</option>
                      <option value="false">{t("common.no")}</option>
                    </select>
                  ) : attribute.type === "ONE_OF_MANY" ? (
                    <select
                      className="form-select"
                      value={rule.value}
                      onChange={(e) => onUpdateRule(index, { value: e.target.value })}
                    >
                      <option value="">—</option>
                      {attribute.options?.map((option) => (
                        <option key={option.id} value={option.label}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className="form-control"
                      type={attribute.type === "NUMERIC" ? "number" : "text"}
                      value={rule.value}
                      onChange={(e) =>
                        onUpdateRule(index, {
                          value:
                            attribute.type === "NUMERIC"
                              ? Number(e.target.value)
                              : e.target.value,
                        })
                      }
                      required
                    />
                  )}
                </div>
                <div className="col-md-1">
                  <button
                    type="button"
                    className="btn btn-outline-danger icon-only w-100"
                    onClick={() => onRemoveRule(index)}
                    aria-label={t("positions.removeRule")}
                  >
                    <i className="bi bi-trash3" aria-hidden="true" />
                  </button>
                </div>
              </div>
            );
          })}
        </section>
      )}
    </>
  );
}
