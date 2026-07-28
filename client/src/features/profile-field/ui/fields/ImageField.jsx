import { useState } from "react";
import { useTranslation } from "react-i18next";
import { apiFetch } from "../../../../shared/api/api";

export default function ImageField({ value, onChange, disabled, token, ownerUserId, onImageUploaded, id }) {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

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

  return (
    <div className="avatar-editor">
      <input
        id={`${id}-file`}
        className="visually-hidden"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={disabled || uploading}
        onChange={(e) => uploadImage(e.target.files?.[0])}
      />
      <label
        className={`avatar-dropzone ${isDragging ? "is-dragging" : ""}`}
        htmlFor={`${id}-file`}
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
            <img src={value} alt="" />
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
          className="form-control"
          type="url"
          placeholder="https://..."
          value={value ?? ""}
          onChange={(e) => {
            onChange(e.target.value);
            onImageUploaded?.(e.target.value || null);
          }}
          disabled={disabled}
        />
      </details>
    </div>
  );
}
