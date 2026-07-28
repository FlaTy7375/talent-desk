import { useTranslation } from "react-i18next";
import { useAuth } from "../../../features/auth";
import ProjectFormModal from "../../../features/project-form/ui/ProjectFormModal";
import LoadingState from "../../../shared/ui/LoadingState";
import { useProfilePage } from "../model/useProfilePage";
import ProfileHero from "./ProfileHero";
import ProfileBadgesSection from "./ProfileBadgesSection";
import ProfileTabs from "./ProfileTabs";
import ProfileFieldsPanel from "./ProfileFieldsPanel";
import ProfileProjectsPanel from "./ProfileProjectsPanel";
import ProfileCvsPanel from "./ProfileCvsPanel";

export default function ProfilePage() {
  const { t } = useTranslation();
  const { updateLocalAvatar } = useAuth();
  const {
    user,
    accessToken,
    adminUserId,
    editingOther,
    profile,
    error,
    activeTab,
    setActiveTab,
    drafts,
    dirtyIds,
    saveState,
    saveDirty,
    changeValue,
    addInfo,
    removeInfo,
    availableToAdd,
    addAttributeId,
    setAddAttributeId,
    projectModal,
    setProjectModal,
    editingProject,
    setEditingProject,
    selectedProjectId,
    setSelectedProjectId,
    selectedProject,
    displayName,
    deleteProject,
    load,
  } = useProfilePage();

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

  async function handleDeleteProject() {
    if (!window.confirm(t("profile.projects.confirmDelete"))) return;
    await deleteProject();
  }

  return (
    <div className="profile-page">
      <ProfileHero
        profile={profile}
        user={user}
        editingOther={editingOther}
        adminUserId={adminUserId}
        targetUser={targetUser}
        shownName={shownName}
        avatarUrl={avatarUrl}
        saveState={saveState}
        dirtyIds={dirtyIds}
        onSave={() => saveDirty()}
      />

      {error && <div className="alert alert-danger">{error}</div>}

      <ProfileBadgesSection badges={profile.badges} />
      <ProfileTabs profile={profile} activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="profile-body">
        {(activeTab === "me" || activeTab === "info") && (
          <ProfileFieldsPanel
            activeTab={activeTab}
            profile={profile}
            drafts={drafts}
            dirtyIds={dirtyIds}
            accessToken={accessToken}
            adminUserId={adminUserId}
            editingOther={editingOther}
            availableToAdd={availableToAdd}
            addAttributeId={addAttributeId}
            onAddAttributeIdChange={setAddAttributeId}
            onAddInfo={addInfo}
            onRemoveInfo={removeInfo}
            onChangeValue={changeValue}
            updateLocalAvatar={updateLocalAvatar}
          />
        )}

        {activeTab === "projects" && (
          <ProfileProjectsPanel
            profile={profile}
            selectedProjectId={selectedProjectId}
            selectedProject={selectedProject}
            onSelectProject={setSelectedProjectId}
            onCreate={() => {
              setEditingProject(null);
              setProjectModal(true);
            }}
            onEdit={() => {
              setEditingProject(selectedProject);
              setProjectModal(true);
            }}
            onDelete={handleDeleteProject}
          />
        )}

        {activeTab === "cvs" && <ProfileCvsPanel profile={profile} />}
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
