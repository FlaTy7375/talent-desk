import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import UserAvatar from "../../../entities/user/ui/UserAvatar";
import { enumLabel } from "../../../shared/i18n/labels";

export default function SearchResultsPanel({ results, canSeeCvs }) {
  const { t } = useTranslation();

  return (
    <div className={`search-results${canSeeCvs ? "" : " search-results--solo"}`}>
      <section className="search-panel">
        <div className="search-panel__head">
          <div className="search-panel__title">
            <span className="search-panel__icon" aria-hidden="true">
              <i className="bi bi-briefcase" />
            </span>
            <h2>{t("search.positions")}</h2>
          </div>
          <span className="search-panel__count">{results.positions.length}</span>
        </div>

        <div className="search-panel__table-wrap">
          <table className="search-table">
            <thead>
              <tr>
                <th scope="col">{t("positions.fields.title")}</th>
                <th scope="col">{t("positions.fields.level")}</th>
                <th scope="col">{t("common.cv")}</th>
              </tr>
            </thead>
            <tbody>
              {!results.positions.length ? (
                <tr>
                  <td colSpan={3}>
                    <div className="search-table__empty">
                      <i className="bi bi-inbox" aria-hidden="true" />
                      <span>{t("search.empty")}</span>
                    </div>
                  </td>
                </tr>
              ) : (
                results.positions.map((position) => (
                  <tr key={position.id}>
                    <td>
                      <div className="home-job">
                        <span className="home-job__mark" aria-hidden="true">
                          {(position.company || position.title).charAt(0).toUpperCase()}
                        </span>
                        <div>
                          <Link to={`/positions/${position.id}`}>{position.title}</Link>
                          <small>{position.company || "—"}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="home-level">
                        {enumLabel(t, "positionLevels", position.level)}
                      </span>
                    </td>
                    <td>
                      <span className="home-metric">{position.cvCount}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {canSeeCvs && (
        <section className="search-panel">
          <div className="search-panel__head">
            <div className="search-panel__title">
              <span className="search-panel__icon" aria-hidden="true">
                <i className="bi bi-file-earmark-person" />
              </span>
              <h2>{t("search.cvs")}</h2>
            </div>
            <span className="search-panel__count">{results.cvs.length}</span>
          </div>

          <div className="search-panel__table-wrap">
            <table className="search-table">
              <thead>
                <tr>
                  <th scope="col">{t("discussion.candidate")}</th>
                  <th scope="col">{t("positions.title")}</th>
                  <th scope="col">{t("discussion.likes")}</th>
                </tr>
              </thead>
              <tbody>
                {!results.cvs.length ? (
                  <tr>
                    <td colSpan={3}>
                      <div className="search-table__empty">
                        <i className="bi bi-inbox" aria-hidden="true" />
                        <span>{t("search.empty")}</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  results.cvs.map((cv) => (
                    <tr key={cv.id}>
                      <td>
                        <Link className="search-candidate" to={`/cvs/${cv.id}`}>
                          <UserAvatar
                            className="search-candidate__avatar"
                            url={cv.candidate.avatarUrl}
                            name={cv.candidate.name}
                            email={cv.candidate.email}
                          />
                          <span>{cv.candidate.name || cv.candidate.email}</span>
                        </Link>
                      </td>
                      <td>{cv.position.title}</td>
                      <td>
                        <span className="home-metric">{cv.likes}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
