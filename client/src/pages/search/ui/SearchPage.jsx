import { useTranslation } from "react-i18next";
import LoadingState from "../../../shared/ui/LoadingState";
import { useSearchPage } from "../model/useSearchPage";
import SearchResultsPanel from "./SearchResultsPanel";

export default function SearchPage() {
  const { t } = useTranslation();
  const {
    q,
    draft,
    setDraft,
    results,
    loading,
    error,
    total,
    canSeeCvs,
    submitSearch,
  } = useSearchPage();

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
        <SearchResultsPanel results={results} canSeeCvs={canSeeCvs} />
      )}
    </div>
  );
}
