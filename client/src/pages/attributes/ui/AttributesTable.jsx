import { useTranslation } from "react-i18next";
import {
  attributeDescription,
  attributeLabel,
  categoryLabel,
  enumLabel,
} from "../../../shared/i18n/labels";

export default function AttributesTable({
  attributes,
  selectedIds,
  onToggleOne,
  onToggleAll,
}) {
  const { t } = useTranslation();

  return (
    <div className="table-responsive positions-table-wrap">
      <table className="table align-middle positions-table attributes-table">
        <thead>
          <tr>
            <th scope="col" style={{ width: 40 }}>
              <input
                type="checkbox"
                className="form-check-input"
                checked={
                  attributes.length > 0 && selectedIds.size === attributes.length
                }
                onChange={onToggleAll}
                aria-label={t("attributes.selectAll")}
              />
            </th>
            <th scope="col">{t("attributes.fields.name")}</th>
            <th scope="col">{t("attributes.fields.type")}</th>
            <th scope="col">{t("attributes.fields.category")}</th>
            <th scope="col">{t("attributes.fields.system")}</th>
          </tr>
        </thead>
        <tbody>
          {attributes.length === 0 ? (
            <tr>
              <td colSpan={5} className="positions-empty">
                <i className="bi bi-sliders2" aria-hidden="true" />
                {t("attributes.empty")}
              </td>
            </tr>
          ) : (
            attributes.map((a) => (
              <tr
                key={a.id}
                className={selectedIds.has(a.id) ? "is-selected" : undefined}
                onClick={() => onToggleOne(a.id)}
              >
                <td onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    className="form-check-input"
                    checked={selectedIds.has(a.id)}
                    onChange={() => onToggleOne(a.id)}
                  />
                </td>
                <td>
                  <div className="attribute-name-cell">
                    <strong>{attributeLabel(t, a)}</strong>
                    {attributeDescription(t, a) ? (
                      <span>{attributeDescription(t, a)}</span>
                    ) : null}
                  </div>
                </td>
                <td>
                  <span className={`type-pill type-pill--${a.type.toLowerCase()}`}>
                    {enumLabel(t, "attributeTypes", a.type)}
                  </span>
                </td>
                <td>
                  <span className="soft-badge">
                    {categoryLabel(t, a.category)}
                  </span>
                </td>
                <td>
                  {a.isSystem ? (
                    <span className="system-pill">
                      <i className="bi bi-lock" aria-hidden="true" />
                      {t("attributes.systemShort")}
                    </span>
                  ) : (
                    <span className="text-body-secondary">—</span>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
