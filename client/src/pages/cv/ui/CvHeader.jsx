import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { enumLabel } from "../../../shared/i18n/labels";

export default function CvHeader({ cv, candidateName, permissions, user, status, dirty, publishing, saving, onPublish, onSave, onRemove, onToggleLike, liking, canDownloadPdf, onDownloadPdf }) {
  const { t } = useTranslation();
  if (!cv) return null;

  return (
    <header className="cv-page__header">
      <div className="cv-page__title">
        <Link to="/profile" className="cv-page__back">
          ← {t("cv.back")}
        </Link>
        <div className="cv-page__heading">
          <h1>{cv.position.title}</h1>
          <span
            className={`status-pill ${
              cv.status === "PUBLISHED" ? "status-pill--published" : "status-pill--draft"
            }`}
          >
            <i
              className={`bi ${
                cv.status === "PUBLISHED" ? "bi-patch-check-fill" : "bi-pencil-square"
              }`}
              aria-hidden="true"
            />
            {enumLabel(t, "cvStatuses", cv.status)}
          </span>
        </div>
        <p className="cv-page__meta">
          {[cv.position.company, candidateName].filter(Boolean).join(" · ")}
        </p>
      </div>

      <div className="cv-page__toolbar">
        {(permissions.canEdit || permissions.canPublish) && (
          <div className="cv-page__group" aria-label={t("cv.primaryActions")}>
            {permissions.canEdit && (
              <button
                type="button"
                className="btn btn-primary"
                disabled={dirty.size === 0 || status === "saving" || publishing}
                onClick={onSave}
              >
                <i className="bi bi-floppy" aria-hidden="true" />
                {t("profile.saveNow")}
              </button>
            )}
            {permissions.canPublish && (
              <button
                type="button"
                className="btn btn-success cv-publish-button"
                disabled={publishing || !cv.complete || status === "saving"}
                onClick={onPublish}
              >
                {publishing ? (
                  <>
                    <span className="auth-button-spinner" aria-hidden="true" />
                    <span className="visually-hidden">{t("cv.publishing")}</span>
                  </>
                ) : (
                  <>
                    <i className="bi bi-send-check" aria-hidden="true" />
                    {cv.status === "PUBLISHED" ? t("cv.republish") : t("cv.publish")}
                  </>
                )}
              </button>
            )}
          </div>
        )}

        <div className="cv-page__group cv-page__group--tools" aria-label={t("cv.tools")}>
          {(permissions?.canLike ||
            ((user.role === "RECRUITER" || user.role === "ADMIN") &&
              cv.status === "PUBLISHED")) && (
            <button
              type="button"
              className={`btn ${cv.likedByMe ? "btn-primary" : "btn-outline-primary"}`}
              onClick={onToggleLike}
              disabled={liking}
              aria-pressed={Boolean(cv.likedByMe)}
            >
              <i
                className={`bi ${cv.likedByMe ? "bi-heart-fill" : "bi-heart"}`}
                aria-hidden="true"
              />
              {cv.likedByMe ? t("cv.unlike") : t("cv.like")} · {cv.likes ?? 0}
            </button>
          )}
          {canDownloadPdf && (
            <button type="button" className="btn btn-outline-secondary" onClick={onDownloadPdf}>
              <i className="bi bi-filetype-pdf" aria-hidden="true" />
              {t("cv.downloadPdf")}
            </button>
          )}
          {permissions.canEdit && (
            <button type="button" className="btn btn-outline-danger" onClick={onRemove}>
              <i className="bi bi-trash3" aria-hidden="true" />
              {t("cv.delete")}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
