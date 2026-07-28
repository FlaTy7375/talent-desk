import { useTranslation } from "react-i18next";

export default function UserPublicProjects({ projects }) {
  const { t } = useTranslation();

  return (
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
  );
}
