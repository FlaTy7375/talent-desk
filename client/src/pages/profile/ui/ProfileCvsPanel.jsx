import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { enumLabel } from "../../../shared/i18n/labels";

export default function ProfileCvsPanel({ profile }) {
  const { t } = useTranslation();

  return (
    <div className="profile-panel">
      <div className="profile-panel__toolbar">
        <div>
          <h2>{t("profile.tabs.cvs")}</h2>
          <p>{t("profile.sectionHints.cvs")}</p>
        </div>
        <Link className="btn btn-outline-primary" to="/positions">
          <i className="bi bi-briefcase" aria-hidden="true" />
          {t("profile.cvs.toPositions")}
        </Link>
      </div>

      <div className="profile-table-wrap">
        <table className="profile-table">
          <thead>
            <tr>
              <th scope="col">{t("profile.cvs.position")}</th>
              <th scope="col">{t("profile.cvs.status")}</th>
              <th scope="col">{t("profile.cvs.likes")}</th>
            </tr>
          </thead>
          <tbody>
            {!profile.cvs.length ? (
              <tr>
                <td colSpan={3}>
                  <div className="profile-empty">
                    <i className="bi bi-file-earmark-person" aria-hidden="true" />
                    <span>{t("profile.cvs.empty")}</span>
                  </div>
                </td>
              </tr>
            ) : (
              profile.cvs.map((cv) => (
                <tr key={cv.id}>
                  <td>
                    <Link to={`/cvs/${cv.id}`}>{cv.position.title}</Link>
                  </td>
                  <td>
                    <span className={`profile-cv-status is-${cv.status.toLowerCase()}`}>
                      {enumLabel(t, "cvStatuses", cv.status)}
                    </span>
                  </td>
                  <td>
                    <span className="home-metric">{cv._count.likes}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
