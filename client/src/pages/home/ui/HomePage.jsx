import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../features/auth";
import { apiFetch } from "../../../shared/api/api";
import LoadingState from "../../../shared/ui/LoadingState";
import { enumLabel } from "../../../shared/i18n/labels";

function PositionsTable({ title, positions, t, icon, emptyKey }) {
  return (
    <section className="home-panel">
      <div className="home-panel__head">
        <div className="home-panel__title">
          <span className="home-panel__icon" aria-hidden="true">
            <i className={`bi ${icon}`} />
          </span>
          <h2>{title}</h2>
        </div>
        <span className="home-panel__count">{positions.length}</span>
      </div>

      <div className="home-panel__table-wrap">
        <table className="home-table">
          <thead>
            <tr>
              <th scope="col">{t("positions.fields.title")}</th>
              <th scope="col">{t("positions.fields.level")}</th>
              <th scope="col">{t("common.cv")}</th>
            </tr>
          </thead>
          <tbody>
            {!positions.length ? (
              <tr>
                <td colSpan={3}>
                  <div className="home-table__empty">
                    <i className="bi bi-briefcase" aria-hidden="true" />
                    <span>{t(emptyKey)}</span>
                  </div>
                </td>
              </tr>
            ) : (
              positions.map((position) => (
                <tr key={position.id}>
                  <td>
                    <div className="home-job">
                      <span className="home-job__mark" aria-hidden="true">
                        {position.imageUrl ? (
                          <img src={position.imageUrl} alt="" />
                        ) : (
                          (position.company || position.title).charAt(0).toUpperCase()
                        )}
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
  );
}

export default function HomePage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiFetch("/api/dashboard/home")
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!data) return <LoadingState rows={5} />;

  const stats = [
    ["cvsLast24h", data.stats.cvsLast24h, "bi-clock-history"],
    ["totalPositions", data.stats.totalPositions, "bi-briefcase"],
    ["totalCandidates", data.stats.totalCandidates, "bi-person"],
    ["totalRecruiters", data.stats.totalRecruiters, "bi-person-badge"],
    ["totalCvs", data.stats.totalCvs, "bi-file-earmark-person"],
  ];

  return (
    <div className="home-page">
      <header className="home-intro">
        <div className="home-intro__glow" aria-hidden="true" />
        <div className="home-intro__copy">
          <p className="home-intro__brand">
            <img
              className="home-intro__brand-logo"
              src="/talentdesk-logo.svg"
              alt=""
              width="22"
              height="22"
            />
            <span>{t("appName")}</span>
          </p>
          <h1>{t("home.title")}</h1>
          <p className="home-intro__subtitle">{t("home.subtitle")}</p>
          <div className="home-intro__actions">
            <Link className="btn btn-primary" to="/positions">
              <i className="bi bi-briefcase" aria-hidden="true" />
              {t("home.ctaPositions")}
            </Link>
            {!user && (
              <Link className="btn btn-outline-secondary" to="/login">
                <i className="bi bi-box-arrow-in-right" aria-hidden="true" />
                {t("nav.login")}
              </Link>
            )}
            {user?.role === "CANDIDATE" && (
              <Link className="btn btn-outline-secondary" to="/profile">
                <i className="bi bi-person" aria-hidden="true" />
                {t("nav.profile")}
              </Link>
            )}
          </div>
        </div>
        <div className="home-intro__aside" aria-hidden="true">
          <img
            className="home-intro__logo"
            src="/talentdesk-logo.svg"
            alt=""
            width="88"
            height="88"
          />
          <span className="home-intro__orbit" />
        </div>
      </header>

      <div className="home-dashboard">
        <main className="home-dashboard__main">
          <div className="home-split">
            <PositionsTable
              title={t("home.latest")}
              positions={data.latest}
              t={t}
              icon="bi-clock-history"
              emptyKey="home.emptyLatest"
            />
            <PositionsTable
              title={t("home.popular")}
              positions={data.popular}
              t={t}
              icon="bi-fire"
              emptyKey="home.emptyPopular"
            />
          </div>

          <section className="home-tags">
            <div className="home-tags__head">
              <div>
                <p className="home-tags__kicker">{t("home.tagCloudKicker")}</p>
                <h2>{t("home.tagCloud")}</h2>
              </div>
              <Link className="home-tags__link" to="/search">
                {t("home.searchAll")}
                <i className="bi bi-arrow-right" aria-hidden="true" />
              </Link>
            </div>

            {!data.tagCloud.length ? (
              <p className="home-tags__empty">{t("home.emptyTags")}</p>
            ) : (
              <div className="home-tags__list">
                {data.tagCloud.map((tag) => (
                  <Link
                    className="home-tag"
                    key={tag.id}
                    to={`/search?q=${encodeURIComponent(tag.name)}`}
                  >
                    <span>{tag.name}</span>
                    <strong>{tag.count}</strong>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </main>

        <aside className="home-dashboard__aside">
          <section className="home-stats" aria-label={t("home.statistics")}>
            <h2>{t("home.statistics")}</h2>
            <div className="home-stats__list">
              {stats.map(([key, value, icon]) => (
                <div className="home-stat-badge" key={key}>
                  <i className={`bi ${icon}`} aria-hidden="true" />
                  <span>{t(`home.stats.${key}`)}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
