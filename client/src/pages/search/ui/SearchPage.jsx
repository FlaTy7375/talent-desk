import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../features/auth";
import { apiFetch } from "../../../shared/api/api";
import LoadingState from "../../../shared/ui/LoadingState";
import UserAvatar from "../../../entities/user/ui/UserAvatar";
import { enumLabel } from "../../../shared/i18n/labels";

export default function SearchPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { accessToken, user } = useAuth();
  const [params] = useSearchParams();
  const q = params.get("q")?.trim() || "";
  const [draft, setDraft] = useState(q);
  const [results, setResults] = useState({ positions: [], cvs: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setDraft(q);
  }, [q]);

  useEffect(() => {
    if (!q) {
      setResults({ positions: [], cvs: [] });
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    apiFetch(`/api/dashboard/search?q=${encodeURIComponent(q)}`, {
      token: accessToken || undefined,
    })
      .then(setResults)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [q, accessToken]);

  function submitSearch(event) {
    event.preventDefault();
    const next = draft.trim();
    navigate(next ? `/search?q=${encodeURIComponent(next)}` : "/search");
  }

  const total = results.positions.length + results.cvs.length;
  const canSeeCvs = user?.role === "RECRUITER" || user?.role === "ADMIN";

  return (
    <div className="search-page">
      <header className="search-hero">
        <div className="search-hero__copy">
          <p className="search-hero__eyebrow">{t("search.eyebrow")}</p>
          <h1>{t("search.title")}</h1>
          <p className="search-hero__subtitle">{t("search.subtitle")}</p>
        </div>

        <form className="search-hero__form" onSubmit={submitSearch}>
          <label className="search-hero__field">
            <i className="bi bi-search" aria-hidden="true" />
            <input
              type="search"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={t("header.searchPlaceholder")}
              aria-label={t("search.query")}
            />
          </label>
          <button type="submit" className="btn btn-primary">
            {t("header.search")}
          </button>
        </form>
      </header>

      {error && <div className="alert alert-danger">{error}</div>}

      {!q && (
        <div className="search-empty-state">
          <i className="bi bi-search" aria-hidden="true" />
          <strong>{t("search.promptTitle")}</strong>
          <p>{t("search.promptBody")}</p>
        </div>
      )}

      {q && (
        <div className="search-summary">
          <div>
            <span className="search-summary__label">{t("search.query")}</span>
            <strong>«{q}»</strong>
          </div>
          {!loading && (
            <span className="search-summary__count">
              {t("search.found", { count: total })}
            </span>
          )}
        </div>
      )}

      {loading && <LoadingState rows={4} />}

      {!loading && q && (
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
      )}
    </div>
  );
}
