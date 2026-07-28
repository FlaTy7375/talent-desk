import { useTranslation } from "react-i18next";

export default function ProfileProjectsPanel({
  profile,
  selectedProjectId,
  selectedProject,
  onSelectProject,
  onCreate,
  onEdit,
  onDelete,
}) {
  const { t } = useTranslation();

  return (
    <div className="profile-panel">
      <div className="profile-panel__toolbar">
        <div>
          <h2>{t("profile.tabs.projects")}</h2>
          <p>{t("profile.sectionHints.projects")}</p>
        </div>
        <div className="profile-panel__actions">
          <button type="button" className="btn btn-primary" onClick={onCreate}>
            <i className="bi bi-plus-lg" aria-hidden="true" />
            {t("profile.projects.create")}
          </button>
          <button
            type="button"
            className="btn btn-outline-primary"
            disabled={!selectedProject}
            onClick={onEdit}
          >
            <i className="bi bi-pencil" aria-hidden="true" />
            {t("profile.projects.edit")}
          </button>
          <button
            type="button"
            className="btn btn-outline-danger"
            disabled={!selectedProject}
            onClick={onDelete}
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
                  onClick={() => onSelectProject(project.id)}
                >
                  <td>
                    <input
                      type="radio"
                      checked={selectedProjectId === project.id}
                      onChange={() => onSelectProject(project.id)}
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
  );
}
