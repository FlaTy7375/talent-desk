import { useTranslation } from "react-i18next";

export default function LoadingState({ rows = 4, compact = false }) {
  const { t } = useTranslation();
  return (
    <div
      className={`loading-state ${compact ? "loading-state--compact" : ""}`}
      role="status"
      aria-live="polite"
    >
      <span className="visually-hidden">{t("common.loading")}</span>
      <div className="loading-state__heading" />
      {Array.from({ length: rows }, (_, index) => (
        <div className="loading-state__row" key={index}>
          <span className="loading-state__avatar" />
          <span className="loading-state__lines">
            <span />
            <span />
          </span>
        </div>
      ))}
    </div>
  );
}
