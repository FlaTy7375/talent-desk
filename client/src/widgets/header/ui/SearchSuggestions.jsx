import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { enumLabel } from "../../../shared/i18n/labels";

export default function SearchSuggestions({ query, suggestions, suggestionsOpen, suggestionsLoading, onClose }) {
  const { t } = useTranslation();

  if (!suggestionsOpen || query.trim().length < 2) return null;

  return (
    <div className="search-suggestions">
      {suggestionsLoading ? (
        <div className="search-suggestions__loading" aria-label={t("header.searching")}>
          {[0, 1, 2].map((item) => (
            <span key={item} />
          ))}
        </div>
      ) : (
        <>
          {suggestions.positions.length > 0 && (
            <div className="suggestion-group">
              <div className="suggestion-group__title">{t("search.positions")}</div>
              {suggestions.positions.map((position) => (
                <Link
                  className="suggestion-item"
                  to={`/positions/${position.id}`}
                  onClick={onClose}
                  key={position.id}
                >
                  <span className="suggestion-item__icon">
                    <i className="bi bi-briefcase" aria-hidden="true" />
                  </span>
                  <span className="suggestion-item__copy">
                    <strong>{position.title}</strong>
                    <small>
                      {[
                        position.company,
                        position.level
                          ? enumLabel(t, "positionLevels", position.level)
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </small>
                  </span>
                  <i className="bi bi-chevron-right" aria-hidden="true" />
                </Link>
              ))}
            </div>
          )}

          {suggestions.cvs.length > 0 && (
            <div className="suggestion-group">
              <div className="suggestion-group__title">{t("search.cvs")}</div>
              {suggestions.cvs.map((cv) => (
                <Link
                  className="suggestion-item"
                  to={`/cvs/${cv.id}`}
                  onClick={onClose}
                  key={cv.id}
                >
                  <span className="suggestion-item__icon">
                    <i className="bi bi-file-earmark-person" aria-hidden="true" />
                  </span>
                  <span className="suggestion-item__copy">
                    <strong>{cv.candidate.name || cv.candidate.email}</strong>
                    <small>{cv.position.title}</small>
                  </span>
                  <i className="bi bi-chevron-right" aria-hidden="true" />
                </Link>
              ))}
            </div>
          )}

          {!suggestions.positions.length && !suggestions.cvs.length && (
            <div className="search-suggestions__empty">
              <i className="bi bi-search" aria-hidden="true" />
              {t("header.noSuggestions")}
            </div>
          )}
        </>
      )}

      <Link
        className="search-suggestions__all"
        to={`/search?q=${encodeURIComponent(query.trim())}`}
        onClick={onClose}
      >
        {t("header.viewAll")}
        <i className="bi bi-arrow-right" aria-hidden="true" />
      </Link>
    </div>
  );
}
