import { useTranslation } from "react-i18next";
import ProfileAttributeField from "../../../features/profile-field/ui/ProfileAttributeField";

export default function UserPublicFields({ items, tabId }) {
  const { t } = useTranslation();

  return (
    <div className="profile-fields">
      <div className="profile-fields__head">
        <div>
          <h2>{t(`profile.tabs.${tabId}`)}</h2>
          <p>{t("publicProfile.readOnlyHint")}</p>
        </div>
      </div>
      <div className="profile-fields__list">
        {items.map((item) => (
          <div className="profile-field" key={item.attribute.id}>
            <ProfileAttributeField
              item={item}
              value={item.value}
              dirty={false}
              disabled
            />
          </div>
        ))}
        {tabId === "info" && !items.length && (
          <div className="profile-empty">
            <i className="bi bi-card-list" aria-hidden="true" />
            <span>{t("publicProfile.emptyInfo")}</span>
          </div>
        )}
      </div>
    </div>
  );
}
