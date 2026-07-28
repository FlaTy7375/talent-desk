import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../../features/auth";
import { apiFetch } from "../../../shared/api/api";
import LoadingState from "../../../shared/ui/LoadingState";
import UserPublicHero from "./UserPublicHero";
import UserPublicTabs from "./UserPublicTabs";
import UserPublicBadges from "./UserPublicBadges";
import UserPublicFields from "./UserPublicFields";
import UserPublicProjects from "./UserPublicProjects";
import UserPublicCvs from "./UserPublicCvs";

export default function UserPublicPage() {
  const { id } = useParams();
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
      <UserPublicHero
        user={user}
        displayName={displayName}
        photoUrl={photoUrl}
        projectsCount={projects.length}
        cvsCount={cvs.length}
        infoCount={info.length}
        permissions={permissions}
      />

      {error && <div className="alert alert-danger">{error}</div>}

      <UserPublicBadges badges={badges} />

      <UserPublicTabs tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="profile-body">
        {(activeTab === "me" || activeTab === "info") && (
          <UserPublicFields items={activeTab === "me" ? me : info} tabId={activeTab} />
        )}

        {activeTab === "projects" && <UserPublicProjects projects={projects} />}

        {activeTab === "cvs" && <UserPublicCvs cvs={cvs} />}
      </div>
    </div>
  );
}
