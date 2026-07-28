import { useTranslation } from "react-i18next";
import ProfileAttributeField from "../../../features/profile-field/ui/ProfileAttributeField";
import { attributeLabel, enumLabel } from "../../../shared/i18n/labels";

export default function ProfileFieldsPanel({
  activeTab,
  profile,
  drafts,
  dirtyIds,
  accessToken,
  adminUserId,
  editingOther,
  availableToAdd,
  addAttributeId,
  onAddAttributeIdChange,
  onAddInfo,
  onRemoveInfo,
  onChangeValue,
  updateLocalAvatar,
}) {
  const { t } = useTranslation();
  const items = activeTab === "me" ? profile.me : profile.info;

  return (
    <div className="profile-fields">
      <div className="profile-fields__head">
        <div>
          <h2>{t(`profile.tabs.${activeTab}`)}</h2>
          <p>{t(`profile.sectionHints.${activeTab}`)}</p>
        </div>
      </div>

      {activeTab === "info" && (
        <div className="profile-add">
          <div className="profile-add__picker" role="listbox" aria-label={t("profile.info.choose")}>
            {!availableToAdd.length ? (
              <p className="profile-add__empty">{t("profile.info.choose")}</p>
            ) : (
              availableToAdd.map((attribute) => (
                <button
                  type="button"
                  key={attribute.id}
                  role="option"
                  aria-selected={addAttributeId === attribute.id}
                  className={`profile-add__option${
                    addAttributeId === attribute.id ? " is-active" : ""
                  }`}
                  onClick={() => onAddAttributeIdChange(attribute.id)}
                >
                  <span>{attributeLabel(t, attribute)}</span>
                  <small>{enumLabel(t, "attributeTypes", attribute.type)}</small>
                </button>
              ))
            )}
          </div>
          <button
            type="button"
            className="btn btn-outline-primary"
            disabled={!addAttributeId}
            onClick={async () => {
              const id = addAttributeId;
              if (!id) return;
              await onAddInfo(id);
              onAddAttributeIdChange("");
            }}
          >
            <i className="bi bi-plus-lg" aria-hidden="true" />
            {t("profile.info.add")}
          </button>
        </div>
      )}

      <div className="profile-fields__list">
        {items.map((item) => (
          <div className="profile-field" key={item.attribute.id}>
            <ProfileAttributeField
              item={item}
              value={drafts[item.attribute.id]}
              dirty={dirtyIds.has(item.attribute.id)}
              token={accessToken}
              ownerUserId={adminUserId}
              onImageUploaded={editingOther ? undefined : updateLocalAvatar}
              onChange={(value) => onChangeValue(item.attribute.id, value)}
            />
            {activeTab === "info" && (
              <button
                type="button"
                className="btn btn-sm btn-link text-danger px-0 mb-0"
                onClick={() => onRemoveInfo(item.attribute.id)}
              >
                <i className="bi bi-x-lg" aria-hidden="true" />
                {t("profile.info.remove")}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
