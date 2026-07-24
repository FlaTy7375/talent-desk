import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../../../features/auth";
import { apiFetch } from "../../../shared/api/api";
import ProfileAttributeField from "../../../features/profile-field/ui/ProfileAttributeField";
import ProjectFormModal from "../../../features/project-form/ui/ProjectFormModal";
import LoadingState from "../../../shared/ui/LoadingState";
import UserAvatar from "../../../entities/user/ui/UserAvatar";
import { attributeLabel, enumLabel } from "../../../shared/i18n/labels";

const TABS = ["me", "info", "projects", "cvs"];

function downloadBadgesSvg(badges, t) {
  const rows = (badges || [])
    .map((badge, index) => {
      const y = 36 + index * 52;
      const label = t(`badges.${badge.id}`, { defaultValue: badge.title });
      const status = badge.earned
        ? t("badges.earned")
        : `${badge.value}/${badge.threshold}`;
      const fill = badge.earned ? "#b82933" : "#d5dae2";
      return `
      <rect x="16" y="${y}" width="368" height="44" rx="10" fill="#fff" stroke="#e6e9ee"/>
      <circle cx="40" cy="${y + 22}" r="10" fill="${fill}"/>
      <text x="60" y="${y + 20}" font-family="Segoe UI, sans-serif" font-size="14" font-weight="700" fill="#1a1f27">${label}</text>
      <text x="60" y="${y + 36}" font-family="Segoe UI, sans-serif" font-size="11" fill="#5c6570">${status}</text>
      <rect x="250" y="${y + 18}" width="120" height="8" rx="4" fill="#f1f3f6"/>
      <rect x="250" y="${y + 18}" width="${(120 * badge.progress) / 100}" height="8" rx="4" fill="#b82933"/>`;
    })
    .join("");
  const height = 48 + (badges?.length || 0) * 52;
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="${height}" viewBox="0 0 400 ${height}">
  <rect width="400" height="${height}" fill="#f7f8fa"/>
  <text x="16" y="24" font-family="Segoe UI, sans-serif" font-size="16" font-weight="800" fill="#b82933">TalentDesk · Badges</text>
  ${rows}
</svg>`;
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "talentdesk-badges.svg";
  link.click();
  URL.revokeObjectURL(url);
}

export default function ProfilePage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const { user, accessToken, updateLocalAvatar, updateLocalName } = useAuth();
  const adminUserId =
    user?.role === "ADMIN" ? searchParams.get("userId")?.trim() || null : null;
  const editingOther = Boolean(adminUserId && adminUserId !== user?.id);

  const profileApi = useCallback(
    (path, options = {}) => {
      let url = path;
      if (adminUserId) {
        const sep = path.includes("?") ? "&" : "?";
        url = `${path}${sep}userId=${encodeURIComponent(adminUserId)}`;
      }
      return apiFetch(url, { ...options, token: options.token ?? accessToken });
    },
    [adminUserId, accessToken]
  );

  const [activeTab, setActiveTab] = useState("me");
  const [profile, setProfile] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [dirtyIds, setDirtyIds] = useState(() => new Set());
  const [saveState, setSaveState] = useState("idle");
  const [error, setError] = useState(null);

  const draftsRef = useRef(drafts);
  const dirtyRef = useRef(dirtyIds);
  const profileRef = useRef(profile);
  const savingRef = useRef(false);
  const profileApiRef = useRef(profileApi);

  const [projectModal, setProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [addAttributeId, setAddAttributeId] = useState("");


  useEffect(() => {
    draftsRef.current = drafts;
  }, [drafts]);
  useEffect(() => {
    dirtyRef.current = dirtyIds;
  }, [dirtyIds]);
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);
  useEffect(() => {
    profileApiRef.current = profileApi;
  }, [profileApi]);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setError(null);
    const data = await profileApi("/api/profile");
    setProfile(data);


    const nextDrafts = {};
    [...data.me, ...data.info].forEach((item) => {
      nextDrafts[item.attribute.id] = item.value;
    });
    setDrafts(nextDrafts);
    setDirtyIds(new Set());
    setSaveState("saved");
  }, [accessToken, profileApi]);

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, [load]);

  function findItem(attributeId) {
    const data = profileRef.current;
    return [...(data?.me || []), ...(data?.info || [])].find(
      (item) => item.attribute.id === attributeId
    );
  }

  function currentDisplayName() {
    const items = [...(profileRef.current?.me || []), ...(profileRef.current?.info || [])];
    const first = items.find((item) => item.attribute.name === "First Name");
    const last = items.find((item) => item.attribute.name === "Last Name");
    const parts = [first, last].map((item) => {
      if (!item) return "";
      const value = draftsRef.current[item.attribute.id];
      return typeof value === "string" ? value.trim() : "";
    });
    return parts.filter(Boolean).join(" ") || null;
  }



  const saveDirty = useCallback(async () => {
    if (!accessToken) return true;
    if (dirtyRef.current.size === 0) return true;
    for (let i = 0; i < 40 && savingRef.current; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    if (savingRef.current) return false;

    savingRef.current = true;
    setSaveState("saving");

    const ids = [...dirtyRef.current];
    const successes = [];
    let failed = false;

    for (const attributeId of ids) {
      const item = findItem(attributeId);
      if (!item) continue;
      try {
        const result = await profileApiRef.current(`/api/profile/attributes/${attributeId}`, {
          method: "PUT",
          body: {
            value: draftsRef.current[attributeId],
            version: item.valueVersion,
          },
        });
        successes.push({ attributeId, result });
      } catch (err) {
        failed = true;
        setError(err.message);
        setSaveState("error");
      }
    }

    if (successes.length) {
      setProfile((previous) => {
        function update(items) {
          return items.map((item) => {
            const saved = successes.find(
              (entry) => entry.attributeId === item.attribute.id
            );
            return saved
              ? {
                  ...item,
                  value: saved.result.value,
                  valueVersion: saved.result.version,
                }
              : item;
          });
        }
        const next = { ...previous, me: update(previous.me), info: update(previous.info) };
        profileRef.current = next;
        return next;
      });
      if (!editingOther) {
        for (const { attributeId, result } of successes) {
          const item = findItem(attributeId);
          if (item?.attribute?.name === "Personal Photo") {
            updateLocalAvatar(
              typeof result.value === "string" && result.value ? result.value : null
            );
          }
          if (
            item?.attribute?.name === "First Name" ||
            item?.attribute?.name === "Last Name"
          ) {
            updateLocalName(currentDisplayName());
          }
        }
      }
      setDirtyIds((previous) => {
        const next = new Set(previous);
        successes.forEach(({ attributeId }) => next.delete(attributeId));
        dirtyRef.current = next;
        return next;
      });
      if (!failed && successes.length === ids.length) setSaveState("saved");
    }
    savingRef.current = false;
    return !failed;
  }, [accessToken, editingOther, updateLocalAvatar, updateLocalName]);

  useEffect(() => {
    const intervalId = setInterval(saveDirty, 7000);
    return () => clearInterval(intervalId);
  }, [saveDirty]);

  // Перед уходом со страницы сохраняем несохранённые поля.
  useEffect(() => {
    function flush() {
      if (dirtyRef.current.size) void saveDirty();
    }
    function onVisibility() {
      if (document.visibilityState === "hidden") flush();
    }
    window.addEventListener("beforeunload", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("beforeunload", flush);
      document.removeEventListener("visibilitychange", onVisibility);
      flush();
    };
  }, [saveDirty]);

  function changeValue(attributeId, value) {
    setDrafts((previous) => ({ ...previous, [attributeId]: value }));
    setDirtyIds((previous) => new Set(previous).add(attributeId));
    setSaveState("dirty");
  }

  async function addInfo(attributeId) {
    if (!attributeId) return;
    try {
      await profileApi(`/api/profile/attributes/${attributeId}`, {
        method: "PUT",
        body: { value: null, version: null },
      });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeInfo(attributeId) {
    try {
      await profileApi(`/api/profile/attributes/${attributeId}`, {
        method: "DELETE",
      });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  const availableToAdd = useMemo(() => {
    if (!profile) return [];
    const selected = new Set(profile.info.map((item) => item.attribute.id));
    return profile.availableInfo.filter((attribute) => !selected.has(attribute.id));
  }, [profile]);

  const selectedProject = profile?.projects.find(
    (project) => project.id === selectedProjectId
  );

  const displayName = useMemo(() => {
    if (!profile) return null;
    const items = [...profile.me, ...profile.info];
    const first = items.find((item) => item.attribute.name === "First Name");
    const last = items.find((item) => item.attribute.name === "Last Name");
    const parts = [first, last].map((item) => {
      if (!item) return "";
      const value = drafts[item.attribute.id];
      return typeof value === "string" ? value.trim() : "";
    });
    return parts.filter(Boolean).join(" ") || null;
  }, [profile, drafts]);

  async function deleteProject() {
    if (!selectedProjectId || !window.confirm(t("profile.projects.confirmDelete"))) return;
    try {
      await profileApi(`/api/profile/projects/${selectedProjectId}`, {
        method: "DELETE",
      });
      setSelectedProjectId(null);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!profile) {
    return error ? <div className="alert alert-danger">{error}</div> : <LoadingState rows={4} />;
  }

  const targetUser = profile.user || user;
  const shownName =
    displayName || targetUser?.name || targetUser?.email || t("profile.title");
  const photoItem = profile.me.find((item) => item.attribute.name === "Personal Photo");
  const avatarUrl =
    (typeof drafts[photoItem?.attribute?.id] === "string" &&
      drafts[photoItem.attribute.id]) ||
    targetUser?.avatarUrl;
  const tabMeta = {
    me: { icon: "bi-person", count: profile.me.length },
    info: { icon: "bi-card-list", count: profile.info.length },
    projects: { icon: "bi-kanban", count: profile.projects.length },
    cvs: { icon: "bi-file-earmark-person", count: profile.cvs.length },
  };

  return (
    <div className="profile-page">
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
              onClick={() => saveDirty()}
            >
              <i className="bi bi-floppy" aria-hidden="true" />
              {t("profile.saveNow")}
            </button>
          </div>
        </div>
      </header>

      {error && <div className="alert alert-danger">{error}</div>}

      {profile.badges?.length > 0 && (
        <section className="profile-badges" aria-label={t("badges.title")}>
          <div className="profile-badges__head">
            <h2 className="h6 mb-0">{t("badges.title")}</h2>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() => downloadBadgesSvg(profile.badges, t)}
            >
              <i className="bi bi-download" aria-hidden="true" />
              {t("badges.downloadSvg")}
            </button>
          </div>
          <div className="profile-badges__grid">
            {profile.badges.map((badge) => (
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

      <nav className="profile-tabs" aria-label={t("profile.title")}>
        {TABS.map((tab) => (
          <button
            type="button"
            key={tab}
            className={`profile-tabs__item${activeTab === tab ? " is-active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            <i className={`bi ${tabMeta[tab].icon}`} aria-hidden="true" />
            <span>{t(`profile.tabs.${tab}`)}</span>
            <strong>{tabMeta[tab].count}</strong>
          </button>
        ))}
      </nav>

      <div className="profile-body">
        {(activeTab === "me" || activeTab === "info") && (
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
                        onClick={() => setAddAttributeId(attribute.id)}
                      >
                        <span>{attributeLabel(t, attribute)}</span>
                        <small>
                          {enumLabel(t, "attributeTypes", attribute.type)}
                        </small>
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
                    await addInfo(id);
                    setAddAttributeId("");
                  }}
                >
                  <i className="bi bi-plus-lg" aria-hidden="true" />
                  {t("profile.info.add")}
                </button>
              </div>
            )}

            <div className="profile-fields__list">
              {(activeTab === "me" ? profile.me : profile.info).map((item) => (
                <div className="profile-field" key={item.attribute.id}>
                  <ProfileAttributeField
                    item={item}
                    value={drafts[item.attribute.id]}
                    dirty={dirtyIds.has(item.attribute.id)}
                    token={accessToken}
                    ownerUserId={adminUserId}
                    onImageUploaded={
                      editingOther
                        ? undefined
                        : updateLocalAvatar
                    }
                    onChange={(value) => changeValue(item.attribute.id, value)}
                  />
                  {activeTab === "info" && (
                    <button
                      type="button"
                      className="btn btn-sm btn-link text-danger px-0 mb-0"
                      onClick={() => removeInfo(item.attribute.id)}
                    >
                      <i className="bi bi-x-lg" aria-hidden="true" />
                      {t("profile.info.remove")}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "projects" && (
          <div className="profile-panel">
            <div className="profile-panel__toolbar">
              <div>
                <h2>{t("profile.tabs.projects")}</h2>
                <p>{t("profile.sectionHints.projects")}</p>
              </div>
              <div className="profile-panel__actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setEditingProject(null);
                    setProjectModal(true);
                  }}
                >
                  <i className="bi bi-plus-lg" aria-hidden="true" />
                  {t("profile.projects.create")}
                </button>
                <button
                  type="button"
                  className="btn btn-outline-primary"
                  disabled={!selectedProject}
                  onClick={() => {
                    setEditingProject(selectedProject);
                    setProjectModal(true);
                  }}
                >
                  <i className="bi bi-pencil" aria-hidden="true" />
                  {t("profile.projects.edit")}
                </button>
                <button
                  type="button"
                  className="btn btn-outline-danger"
                  disabled={!selectedProject}
                  onClick={deleteProject}
                >
                  <i className="bi bi-trash3" aria-hidden="true" />
                  {t("profile.projects.delete")}
                </button>
              </div>
            </div>

            <div className="profile-table-wrap">
              <table className="profile-table">
                <thead>
                  <tr>
                    <th scope="col" aria-label="select" />
                    <th scope="col">{t("profile.projects.name")}</th>
                    <th scope="col">{t("profile.projects.period")}</th>
                    <th scope="col">{t("profile.projects.tags")}</th>
                    <th scope="col">{t("profile.version")}</th>
                  </tr>
                </thead>
                <tbody>
                  {!profile.projects.length ? (
                    <tr>
                      <td colSpan={5}>
                        <div className="profile-empty">
                          <i className="bi bi-kanban" aria-hidden="true" />
                          <span>{t("profile.projects.empty")}</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    profile.projects.map((project) => (
                      <tr
                        key={project.id}
                        className={selectedProjectId === project.id ? "is-selected" : ""}
                        onClick={() => setSelectedProjectId(project.id)}
                      >
                        <td>
                          <input
                            type="radio"
                            checked={selectedProjectId === project.id}
                            onChange={() => setSelectedProjectId(project.id)}
                          />
                        </td>
                        <td>
                          <strong>{project.name}</strong>
                        </td>
                        <td>
                          {project.periodStart?.slice(0, 10) || "—"} –{" "}
                          {project.periodEnd?.slice(0, 10) || "—"}
                        </td>
                        <td>{project.tags.join(", ") || "—"}</td>
                        <td>{project.version}</td>
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
                <p>{t("profile.sectionHints.cvs")}</p>
              </div>
              <Link className="btn btn-outline-primary" to="/positions">
                <i className="bi bi-briefcase" aria-hidden="true" />
                {t("profile.cvs.toPositions")}
              </Link>
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
                  {!profile.cvs.length ? (
                    <tr>
                      <td colSpan={3}>
                        <div className="profile-empty">
                          <i className="bi bi-file-earmark-person" aria-hidden="true" />
                          <span>{t("profile.cvs.empty")}</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    profile.cvs.map((cv) => (
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

      <ProjectFormModal
        show={projectModal}
        initial={editingProject}
        suggestions={profile.tagSuggestions}
        token={accessToken}
        ownerUserId={adminUserId}
        onClose={() => setProjectModal(false)}
        onSaved={load}
      />
    </div>
  );
}
