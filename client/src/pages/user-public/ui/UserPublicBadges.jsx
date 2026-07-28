import { useTranslation } from "react-i18next";

export default function UserPublicBadges({ badges }) {
  const { t } = useTranslation();

  if (!badges?.length) return null;

  return (
    <section className="profile-badges" aria-label={t("badges.title")}>
      <h2 className="h6 mb-3">{t("badges.title")}</h2>
      <div className="profile-badges__grid">
        {badges.map((badge) => (
          <div
            key={badge.id}
            className={`profile-badge${badge.earned ? " is-earned" : ""}`}
            title={`${badge.value}/${badge.threshold}`}
          >
            <i className={`bi bi-${badge.icon}`} aria-hidden="true" />
            <div>
              <strong>{t(`badges.${badge.id}`, { defaultValue: badge.title })}</strong>
              <span>
                {badge.earned
                  ? t("badges.earned")
                  : t("badges.progress", {
                      value: badge.value,
                      threshold: badge.threshold,
                    })}
              </span>
            </div>
            <div className="profile-badge__bar" aria-hidden="true">
              <span style={{ width: `${badge.progress}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
