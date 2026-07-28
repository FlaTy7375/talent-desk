import { useTranslation } from "react-i18next";
import { LEVELS } from "../model/constants";
import { enumLabel } from "../../../shared/i18n/labels";

export default function PositionBasicFields({
  form,
  initial,
  saving,
  uploadingImage,
  onFieldChange,
  onImagePick,
  onClearImage,
}) {
  const { t } = useTranslation();

  return (
    <div className="row g-3">
      <div className="col-md-8">
        <label className="form-label">{t("positions.fields.title")}</label>
        <input
          className="form-control"
          value={form.title}
          onChange={(e) => onFieldChange("title", e.target.value)}
          required
        />
      </div>
      <div className="col-md-4">
        <label className="form-label">{t("positions.fields.level")}</label>
        <select
          className="form-select"
          value={form.level}
          onChange={(e) => onFieldChange("level", e.target.value)}
        >
          {LEVELS.map((level) => (
            <option key={level || "none"} value={level}>
              {enumLabel(t, "positionLevels", level)}
            </option>
          ))}
        </select>
      </div>

      <div className="col-md-6">
        <label className="form-label">{t("positions.fields.company")}</label>
        <input
          className="form-control"
          value={form.company}
          onChange={(e) => onFieldChange("company", e.target.value)}
        />
      </div>
      <div className="col-md-6">
        <label className="form-label">{t("positions.fields.maxProjects")}</label>
        <input
          className="form-control"
          type="number"
          min="0"
          value={form.maxProjects}
          onChange={(e) => onFieldChange("maxProjects", e.target.value)}
          required
        />
      </div>

      <div className="col-12">
        <label className="form-label">{t("positions.fields.image")}</label>
        <div className="position-image-field">
          <div className="position-image-field__preview">
            {form.imageUrl ? (
              <img src={form.imageUrl} alt="" />
            ) : (
              <span>{(form.company || form.title || "?").charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="position-image-field__actions">
            <label className="btn btn-outline-secondary btn-sm mb-0">
              <i className="bi bi-image" aria-hidden="true" />
              {uploadingImage
                ? t("positions.image.uploading")
                : t("positions.image.choose")}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                disabled={uploadingImage || saving}
                onChange={(e) => {
                  onImagePick(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
            {form.imageUrl && (
              <button
                type="button"
                className="btn btn-outline-danger btn-sm"
                disabled={uploadingImage || saving}
                onClick={onClearImage}
              >
                {t("positions.image.remove")}
              </button>
            )}
            <small className="text-body-secondary d-block">
              {t("positions.image.hint")}
            </small>
          </div>
        </div>
      </div>

      <div className="col-12">
        <label className="form-label">{t("positions.fields.description")}</label>
        <textarea
          className="form-control"
          rows={3}
          value={form.shortDescription}
          onChange={(e) => onFieldChange("shortDescription", e.target.value)}
        />
      </div>

      <div className="col-12">
        <label className="form-label">{t("positions.fields.tags")}</label>
        <input
          className="form-control"
          value={form.tagsText}
          onChange={(e) => onFieldChange("tagsText", e.target.value)}
          placeholder="React, Node.js, PostgreSQL"
        />
        <div className="form-text">{t("positions.tagsHint")}</div>
      </div>

      {initial && (
        <div className="col-12">
          <p className="small text-body-secondary mb-0">
            {t("positions.version")}: {initial.version}
          </p>
        </div>
      )}
    </div>
  );
}
