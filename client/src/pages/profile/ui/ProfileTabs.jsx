import { useTranslation } from "react-i18next";
import { PROFILE_TABS, TAB_META } from "../lib/constants";

export default function ProfileTabs({ profile, activeTab, onTabChange }) {
  const { t } = useTranslation();

  const counts = {
    me: profile.me.length,
    info: profile.info.length,
    projects: profile.projects.length,
    cvs: profile.cvs.length,
  };

  return (
    <nav className="profile-tabs" aria-label={t("profile.title")}>
      {PROFILE_TABS.map((tab) => (
        <button
          type="button"
          key={tab}
          className={`profile-tabs__item${activeTab === tab ? " is-active" : ""}`}
          onClick={() => onTabChange(tab)}
        >
          <i className={`bi ${TAB_META[tab].icon}`} aria-hidden="true" />
          <span>{t(`profile.tabs.${tab}`)}</span>
          <strong>{counts[tab]}</strong>
        </button>
      ))}
    </nav>
  );
}
