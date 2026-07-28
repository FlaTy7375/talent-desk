import { useTranslation } from "react-i18next";
import { useAuth } from "../../../features/auth";
import LoadingState from "../../../shared/ui/LoadingState";
import { useCvPage } from "../model/useCvPage";
import CvHeader from "./CvHeader";
import CvAttributesSection from "./CvAttributesSection";
import CvProjectsSection from "./CvProjectsSection";

export default function CvPage() {
  const { t } = useTranslation();
  const { user, accessToken, updateLocalAvatar } = useAuth();
  const {
    cv,
    permissions,
    drafts,
    dirty,
    status,
    error,
    publishing,
    liking,
    candidateName,
    canDownloadPdf,
    saveDirty,
    change,
    publish,
    remove,
    toggleLike,
    downloadPdf,
  } = useCvPage();

  if (error && !cv) return <div className="alert alert-danger">{error}</div>;
  if (!cv) return <LoadingState rows={5} />;

  return (
    <article className="cv-page">
      <CvHeader
        cv={cv}
        candidateName={candidateName}
        permissions={permissions}
        user={user}
        status={status}
        dirty={dirty}
        publishing={publishing}
        saving={status === "saving"}
        onPublish={publish}
        onSave={() => saveDirty()}
        onRemove={remove}
        onToggleLike={toggleLike}
        liking={liking}
        canDownloadPdf={canDownloadPdf}
        onDownloadPdf={downloadPdf}
      />

      {error && <div className="alert alert-danger">{error}</div>}
      {permissions.canEdit && (
        <p className="save-hint">
          <span className={`save-pill save-pill--${status}`}>
            <i className="bi bi-cloud-check" aria-hidden="true" />
            {t(`profile.save.${status}`)}
          </span>
          <span>{t("cv.autosaveHint")}</span>
        </p>
      )}

      <CvAttributesSection
        attributes={cv.attributes}
        drafts={drafts}
        dirty={dirty}
        permissions={permissions}
        accessToken={accessToken}
        onChange={change}
        onImageUploaded={updateLocalAvatar}
      />

      <CvProjectsSection position={cv.position} projects={cv.projects} />
    </article>
  );
}
