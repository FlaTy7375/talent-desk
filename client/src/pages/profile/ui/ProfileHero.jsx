import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import UserAvatar from "../../../entities/user/ui/UserAvatar";
import { enumLabel } from "../../../shared/i18n/labels";

export default function ProfileHero({
  profile,
  user,
  editingOther,
  adminUserId,
  targetUser,
  shownName,
  avatarUrl,
  saveState,
  dirtyIds,
  onSave,
}) {
  const { t } = useTranslation();

  return (
    <>
      {editingOther && (
        <div className="alert alert-danger profile-admin-banner d-flex flex-wrap align-items-center gap-2">
          <i className="bi bi-exclamation-triangle-fill" aria-hidden="true" />
          <span>
            {t("profile.adminEditing", {
              email: targetUser?.email || adminUserId,
            })}
          </span>
          <Link className="btn btn-sm btn-outline-light ms-auto" to="/profile">
            {t("profile.backToOwn")}
          </Link>
        </div>
      )}

      <header className="profile-hero">
        <div className="profile-hero__identity">
          <UserAvatar
            className="profile-hero__avatar"
            url={avatarUrl}
            name={shownName}
            email={targetUser?.email}
          />
          <div className="profile-hero__copy">
            <p className="profile-hero__eyebrow">{t("profile.eyebrow")}</p>
            <h1>{shownName}</h1>
            <p className="profile-hero__meta">
              <span>{targetUser?.email}</span>
              {user?.role && !editingOther && (
                <span className="profile-hero__role">
                  {enumLabel(t, "roles", user.role)}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="profile-hero__actions">
          <div className="profile-hero__summary" aria-hidden="true">
            <div>
              <strong>{profile.projects.length}</strong>
              <span>{t("profile.tabs.projects")}</span>
            </div>
            <div>
              <strong>{profile.cvs.length}</strong>
              <span>{t("profile.tabs.cvs")}</span>
            </div>
            <div>
              <strong>{profile.info.length}</strong>
              <span>{t("profile.tabs.info")}</span>
            </div>
          </div>
          <div className="editor-toolbar">
            <span className={`save-pill save-pill--${saveState}`}>
              <i
                className={`bi ${
                  saveState === "saved"
                    ? "bi-check-circle"
                    : saveState === "saving"
                      ? "bi-arrow-repeat"
                      : saveState === "error"
                        ? "bi-exclamation-circle"
                        : "bi-pencil"
                }`}
                aria-hidden="true"
              />
              {t(`profile.save.${saveState}`)}
            </span>
            <button
              type="button"
              className="btn btn-primary"
              disabled={dirtyIds.size === 0 || saveState === "saving"}
              onClick={onSave}
            >
              <i className="bi bi-floppy" aria-hidden="true" />
              {t("profile.saveNow")}
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
