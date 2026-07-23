import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../features/auth";
import { apiFetch } from "../../../shared/api/api";
import ProfileAttributeField from "../../../features/profile-field/ui/ProfileAttributeField";
import LoadingState from "../../../shared/ui/LoadingState";
import UserAvatar from "../../../entities/user/ui/UserAvatar";
import { enumLabel } from "../../../shared/i18n/labels";

export default function UserPublicPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const { accessToken } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("me");

  const load = useCallback(async () => {
    if (!accessToken) return;
    setError(null);
    const result = await apiFetch(`/api/users/${id}`, { token: accessToken });
    setData(result);
  }, [id, accessToken]);

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, [load]);

  const displayName = useMemo(() => {
    if (!data) return null;
    const items = [...data.me, ...data.info];
    const first = items.find((item) => item.attribute.name === "First Name");
    const last = items.find((item) => item.attribute.name === "Last Name");
    const parts = [first, last].map((item) => {
      if (!item || typeof item.value !== "string") return "";
      return item.value.trim();
    });
    return parts.filter(Boolean).join(" ") || data.user.name || data.user.email;
  }, [data]);

  const photoUrl = useMemo(() => {
    if (!data) return null;
    const photo = data.me.find((item) => item.attribute.name === "Personal Photo");
    return (typeof photo?.value === "string" && photo.value) || data.user.avatarUrl;
  }, [data]);

  if (!data) {
    return error ? <div className="alert alert-danger">{error}</div> : <LoadingState rows={4} />;
  }

  const { user, me, info, projects, cvs, badges, permissions } = data;
  const tabs = [
    { id: "me", icon: "bi-person", count: me.length },
    { id: "info", icon: "bi-card-list", count: info.length },
    { id: "projects", icon: "bi-kanban", count: projects.length },
    { id: "cvs", icon: "bi-file-earmark-person", count: cvs.length },
  ];

  return (
    <div className="profile-page">
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
              <strong>{projects.length}</strong>
              <span>{t("profile.tabs.projects")}</span>
            </div>
            <div>
              <strong>{cvs.length}</strong>
              <span>{t("profile.tabs.cvs")}</span>
            </div>
            <div>
              <strong>{info.length}</strong>
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

      {error && <div className="alert alert-danger">{error}</div>}

      {badges?.length > 0 && (
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
      )}

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

      <div className="profile-body">
        {(activeTab === "me" || activeTab === "info") && (
          <div className="profile-fields">
            <div className="profile-fields__head">
              <div>
                <h2>{t(`profile.tabs.${activeTab}`)}</h2>
                <p>{t("publicProfile.readOnlyHint")}</p>
              </div>
            </div>
            <div className="profile-fields__list">
              {(activeTab === "me" ? me : info).map((item) => (
                <div className="profile-field" key={item.attribute.id}>
                  <ProfileAttributeField
                    item={item}
                    value={item.value}
                    dirty={false}
                    disabled
                  />
                </div>
              ))}
              {activeTab === "info" && !info.length && (
                <div className="profile-empty">
                  <i className="bi bi-card-list" aria-hidden="true" />
                  <span>{t("publicProfile.emptyInfo")}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "projects" && (
          <div className="profile-panel">
            <div className="profile-panel__toolbar">
              <div>
                <h2>{t("profile.tabs.projects")}</h2>
                <p>{t("publicProfile.readOnlyHint")}</p>
              </div>
            </div>
            <div className="profile-table-wrap">
              <table className="profile-table">
                <thead>
                  <tr>
                    <th scope="col">{t("profile.projects.name")}</th>
                    <th scope="col">{t("profile.projects.period")}</th>
                    <th scope="col">{t("profile.projects.tags")}</th>
                  </tr>
                </thead>
                <tbody>
                  {!projects.length ? (
                    <tr>
                      <td colSpan={3}>
                        <div className="profile-empty">
                          <i className="bi bi-kanban" aria-hidden="true" />
                          <span>{t("profile.projects.empty")}</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    projects.map((project) => (
                      <tr key={project.id}>
                        <td>
                          <strong>{project.name}</strong>
                        </td>
                        <td>
                          {project.periodStart?.slice(0, 10) || "—"} –{" "}
                          {project.periodEnd?.slice(0, 10) || "—"}
                        </td>
                        <td>{project.tags.join(", ") || "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "cvs" && (
          <div className="profile-panel">
            <div className="profile-panel__toolbar">
              <div>
                <h2>{t("profile.tabs.cvs")}</h2>
                <p>{t("publicProfile.cvsHint")}</p>
              </div>
            </div>
            <div className="profile-table-wrap">
              <table className="profile-table">
                <thead>
                  <tr>
                    <th scope="col">{t("profile.cvs.position")}</th>
                    <th scope="col">{t("profile.cvs.status")}</th>
                    <th scope="col">{t("profile.cvs.likes")}</th>
                  </tr>
                </thead>
                <tbody>
                  {!cvs.length ? (
                    <tr>
                      <td colSpan={3}>
                        <div className="profile-empty">
                          <i className="bi bi-file-earmark-person" aria-hidden="true" />
                          <span>{t("profile.cvs.empty")}</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    cvs.map((cv) => (
                      <tr key={cv.id}>
                        <td>
                          <Link to={`/cvs/${cv.id}`}>{cv.position.title}</Link>
                        </td>
                        <td>
                          <span className={`profile-cv-status is-${cv.status.toLowerCase()}`}>
                            {enumLabel(t, "cvStatuses", cv.status)}
                          </span>
                        </td>
                        <td>
                          <span className="home-metric">{cv._count.likes}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
