import { useState } from "react";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import { apiFetch } from "../../../shared/api/api";
import { attributeDescription, attributeLabel } from "../../../shared/i18n/labels";

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
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const common = {
    className: "form-control",
    id: `attribute-${attribute.id}`,
    disabled,
  };

  async function uploadImage(file) {
    if (!file || disabled) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setUploadError(t("profile.image.invalidType"));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError(t("profile.image.tooLarge"));
      return;
    }
    if (!token) {
      setUploadError(t("profile.image.authRequired"));
      return;
    }

    setUploading(true);
    setUploadError("");
    try {
      const body = new FormData();
      body.append("avatar", file);
      const avatarPath = ownerUserId
        ? `/api/profile/avatar?userId=${encodeURIComponent(ownerUserId)}`
        : "/api/profile/avatar";
      const data = await apiFetch(avatarPath, {
        method: "POST",
        token,
        body,
      });
      onChange(data.url);
      onImageUploaded?.(data.url);
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  }

  function control() {
    switch (attribute.type) {
      case "TEXT":
        return (
          <div className="markdown-field">
            <div className="markdown-field__pane">
              <div className="markdown-field__label">
                <i className="bi bi-markdown" aria-hidden="true" />
                {t("profile.markdown.editor")}
              </div>
              <textarea
                {...common}
                rows={5}
                value={value ?? ""}
                onChange={(e) => onChange(e.target.value)}
                placeholder={t("profile.markdown.placeholder")}
              />
            </div>
            <div className="markdown-field__pane markdown-field__pane--preview">
              <div className="markdown-field__label">
                <i className="bi bi-eye" aria-hidden="true" />
                {t("profile.markdown.preview")}
              </div>
              <div className="markdown-preview">
                {value ? (
                  <ReactMarkdown>{String(value)}</ReactMarkdown>
                ) : (
                  <span className="markdown-preview__empty">
                    {t("profile.markdown.emptyPreview")}
                  </span>
                )}
              </div>
            </div>
          </div>
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
          <div className="avatar-editor">
            <input
              id={`${common.id}-file`}
              className="visually-hidden"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={disabled || uploading}
              onChange={(e) => uploadImage(e.target.files?.[0])}
            />
            <label
              className={`avatar-dropzone ${isDragging ? "is-dragging" : ""}`}
              htmlFor={`${common.id}-file`}
              onDragEnter={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragOver={(e) => e.preventDefault()}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                uploadImage(e.dataTransfer.files?.[0]);
              }}
            >
              <span className="avatar-preview">
                {value ? (
                  <img src={value} alt={attribute.name} />
                ) : (
                  <i className="bi bi-person" aria-hidden="true" />
                )}
              </span>
              <span className="avatar-dropzone__copy">
                <strong>
                  {uploading ? t("profile.image.uploading") : t("profile.image.drop")}
                </strong>
                <small>{t("profile.image.hint")}</small>
              </span>
              <span className="avatar-dropzone__action">
                <i className="bi bi-upload" aria-hidden="true" />
                {t("profile.image.choose")}
              </span>
            </label>

            {uploadError && <div className="form-error">{uploadError}</div>}

            {value && !disabled && (
              <button
                type="button"
                className="avatar-remove"
                onClick={() => {
                  onChange("");
                  onImageUploaded?.(null);
                }}
              >
                <i className="bi bi-trash3" aria-hidden="true" />
                {t("profile.image.remove")}
              </button>
            )}

            <details className="avatar-url">
              <summary>{t("profile.image.useUrl")}</summary>
              <input
                {...common}
                type="url"
                placeholder="https://..."
                value={value ?? ""}
                onChange={(e) => {
                  onChange(e.target.value);
                  if (attribute.name === "Personal Photo") {
                    onImageUploaded?.(e.target.value || null);
                  }
                }}
              />
            </details>
          </div>
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
