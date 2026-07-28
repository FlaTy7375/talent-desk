import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import UserAvatar from "../../../entities/user/ui/UserAvatar";
import { enumLabel } from "../../../shared/i18n/labels";

export default function UserPublicHero({
  user,
  displayName,
  photoUrl,
  projectsCount,
  cvsCount,
  infoCount,
  permissions,
}) {
  const { t } = useTranslation();

  return (
    <header className="profile-hero">
      <div className="profile-hero__identity">
        <UserAvatar
          className="profile-hero__avatar"
          url={photoUrl}
          name={displayName}
          email={user.email}
        />
        <div className="profile-hero__copy">
          <p className="profile-hero__eyebrow">{t("publicProfile.eyebrow")}</p>
          <h1>{displayName}</h1>
          <p className="profile-hero__meta">
            <span>{user.email}</span>
            {user.role && (
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
            <strong>{projectsCount}</strong>
            <span>{t("profile.tabs.projects")}</span>
          </div>
          <div>
            <strong>{cvsCount}</strong>
            <span>{t("profile.tabs.cvs")}</span>
          </div>
          <div>
            <strong>{infoCount}</strong>
            <span>{t("profile.tabs.info")}</span>
          </div>
        </div>
        {permissions.canEdit && permissions.isAdminView && (
          <Link className="btn btn-primary" to={`/profile?userId=${user.id}`}>
            <i className="bi bi-pencil" aria-hidden="true" />
            {t("publicProfile.editAsAdmin")}
          </Link>
        )}
      </div>
    </header>
  );
}
