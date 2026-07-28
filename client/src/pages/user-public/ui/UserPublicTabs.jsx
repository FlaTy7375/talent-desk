import { useTranslation } from "react-i18next";

export default function UserPublicTabs({ tabs, activeTab, setActiveTab }) {
  const { t } = useTranslation();

  return (
    <nav className="profile-tabs" aria-label={t("publicProfile.title")}>
      {tabs.map((tab) => (
        <button
          type="button"
          key={tab.id}
          className={`profile-tabs__item${activeTab === tab.id ? " is-active" : ""}`}
          onClick={() => setActiveTab(tab.id)}
        >
          <i className={`bi ${tab.icon}`} aria-hidden="true" />
          <span>{t(`profile.tabs.${tab.id}`)}</span>
          <strong>{tab.count}</strong>
        </button>
      ))}
    </nav>
  );
}
