import { useTranslation } from "react-i18next";
import { enumLabel } from "../../../shared/i18n/labels";

export default function PositionHero({ position, manager }) {
  const { t } = useTranslation();
  if (!position) return null;

  return (
    <header className="position-hero">
      <span className="position-hero__logo">
        {position.imageUrl ? (
          <img src={position.imageUrl} alt="" />
        ) : (
          (position.company || position.title).charAt(0).toUpperCase()
        )}
      </span>
      <div className="position-hero__content">
        <span className="position-hero__company">{position.company || "—"}</span>
        <h1>{position.title}</h1>
        <p className="position-hero__description">
          {position.shortDescription || t("positions.noDescription")}
        </p>
        <div className="position-meta">
          {position.level && (
            <span>
              <i className="bi bi-bar-chart" aria-hidden="true" />
              {enumLabel(t, "positionLevels", position.level)}
            </span>
          )}
          <span>
            <i className="bi bi-file-earmark-person" aria-hidden="true" />
            {position.cvCount} {t("common.cv")}
          </span>
          {manager && (
            <span
              title={
                position.isPublic ? t("positions.public") : t("positions.restricted")
              }
            >
              <i
                className={`bi ${position.isPublic ? "bi-globe2" : "bi-lock"}`}
                aria-hidden="true"
              />
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
