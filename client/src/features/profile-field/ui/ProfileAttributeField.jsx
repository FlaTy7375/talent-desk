import { useTranslation } from "react-i18next";
import { attributeDescription, attributeLabel } from "../../../shared/i18n/labels";
import { TextField, ImageField } from "./fields";

export default function ProfileAttributeField({
  item,
  value,
  onChange,
  dirty,
  disabled = false,
  token,
  ownerUserId = null,
  onImageUploaded,
}) {
  const { t } = useTranslation();
  const { attribute } = item;
  const description = attributeDescription(t, attribute);
  const common = {
    className: "form-control",
    id: `attribute-${attribute.id}`,
    disabled,
  };

  function control() {
    switch (attribute.type) {
      case "TEXT":
        return (
          <TextField
            id={common.id}
            value={value ?? ""}
            onChange={onChange}
            disabled={disabled}
          />
        );
      case "NUMERIC":
        return (
          <input
            {...common}
            type="number"
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
          />
        );
      case "DATE":
        return (
          <input
            {...common}
            type="date"
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      case "PERIOD":
        return (
          <div className="row g-2">
            <div className="col-sm-6">
              <input
                {...common}
                id={`${common.id}-from`}
                type="date"
                value={value?.from ?? ""}
                onChange={(e) => onChange({ from: e.target.value, to: value?.to ?? "" })}
              />
            </div>
            <div className="col-sm-6">
              <input
                {...common}
                id={`${common.id}-to`}
                type="date"
                value={value?.to ?? ""}
                onChange={(e) => onChange({ from: value?.from ?? "", to: e.target.value })}
              />
            </div>
          </div>
        );
      case "BOOLEAN":
        return (
          <div className="form-check form-switch">
            <input
              className="form-check-input"
              id={common.id}
              type="checkbox"
              checked={Boolean(value)}
              disabled={disabled}
              onChange={(e) => onChange(e.target.checked)}
            />
          </div>
        );
      case "ONE_OF_MANY":
        return (
          <select
            {...common}
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value || null)}
          >
            <option value="">—</option>
            {attribute.options.map((option) => (
              <option key={option.id} value={option.label}>
                {option.label}
              </option>
            ))}
          </select>
        );
      case "IMAGE":
        return (
          <ImageField
            id={common.id}
            value={value ?? ""}
            onChange={onChange}
            disabled={disabled}
            token={token}
            ownerUserId={ownerUserId}
            onImageUploaded={onImageUploaded}
          />
        );
      default:
        return (
          <input
            {...common}
            type="text"
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
          />
        );
    }
  }

  return (
    <div className="profile-control">
      <label className="form-label" htmlFor={`attribute-${attribute.id}`}>
        {attributeLabel(t, attribute)}
        {dirty && (
          <span className="badge text-bg-warning ms-2">{t("profile.save.dirty")}</span>
        )}
      </label>
      {description && (
        <div className="form-text mb-1">{description}</div>
      )}
      {control()}
    </div>
  );
}
