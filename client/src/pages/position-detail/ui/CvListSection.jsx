import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import UserAvatar from "../../../entities/user/ui/UserAvatar";

export default function CvListSection({ cvs, position, likingId, onToggleLike, onExportCsv }) {
  const { t } = useTranslation();

  return (
    <section className="position-section">
      <div className="position-section__heading">
        <span>
          <i className="bi bi-people" aria-hidden="true" />
          <h2>{t("discussion.submittedCvs")}</h2>
        </span>
        <div className="d-flex align-items-center gap-2">
          <span className="count-badge">{cvs.length}</span>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            disabled={!cvs.length}
            onClick={onExportCsv}
          >
            <i className="bi bi-filetype-csv" aria-hidden="true" />
            {t("positions.exportCsv")}
          </button>
        </div>
      </div>
      <div className="table-responsive">
        <table className="table table-hover position-cv-table">
          <thead>
            <tr>
              <th>{t("discussion.candidate")}</th>
              <th>{t("discussion.updated")}</th>
              <th>{t("discussion.likes")}</th>
            </tr>
          </thead>
          <tbody>
            {!cvs.length ? (
              <tr>
                <td colSpan={3} className="text-body-secondary">
                  {t("discussion.noCvs")}
                </td>
              </tr>
            ) : (
              cvs.map((cv) => (
                <tr key={cv.id}>
                  <td>
                    <div className="candidate-cell">
                      <UserAvatar
                        url={cv.candidate.avatarUrl}
                        name={cv.candidate.name}
                        email={cv.candidate.email}
                      />
                      <div>
                        <Link to={`/users/${cv.candidate.id}`}>
                          {cv.candidate.name || cv.candidate.email}
                        </Link>
                        <small>
                          <Link to={`/cvs/${cv.id}`}>{t("positions.openCv")}</Link>
                          {cv.candidate.name ? ` · ${cv.candidate.email}` : null}
                        </small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <time className="date-badge" dateTime={cv.updatedAt}>
                      <i className="bi bi-clock" aria-hidden="true" />
                      {new Date(cv.updatedAt).toLocaleDateString()}
                    </time>
                  </td>
                  <td>
                    <button
                      type="button"
                      className={`likes-badge likes-badge--button ${
                        cv.likedByMe ? "is-liked" : ""
                      }`}
                      onClick={() => onToggleLike(cv)}
                      disabled={likingId === cv.id}
                      aria-pressed={Boolean(cv.likedByMe)}
                      title={cv.likedByMe ? t("cv.unlike") : t("cv.like")}
                    >
                      <i
                        className={`bi ${
                          cv.likedByMe ? "bi-heart-fill" : "bi-heart"
                        }`}
                        aria-hidden="true"
                      />
                      {cv.likes ?? 0}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
