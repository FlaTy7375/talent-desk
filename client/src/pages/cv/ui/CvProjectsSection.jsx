import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";

export default function CvProjectsSection({ position, projects }) {
  const { t } = useTranslation();
  if (!projects || projects.length === 0) return null;

  return (
    <section className="cv-page__panel">
      <div className="cv-page__panel-head">
        <h2>{t("cv.projects")}</h2>
        <p>
          {t("cv.projectFilter")}: {position?.projectTags?.join(", ") || "—"}
        </p>
      </div>
      <div className="cv-page__panel-body">
        {!projects.length ? (
          <p className="text-body-secondary mb-0">{t("cv.noProjects")}</p>
        ) : (
          projects.map((project) => (
            <div key={project.id} className="cv-page__project">
              <h3>{project.name}</h3>
              <p className="cv-page__project-meta">
                {project.periodStart?.slice(0, 10) || "—"} –{" "}
                {project.periodEnd?.slice(0, 10) || "—"} · {project.tags.join(", ")}
              </p>
              <ReactMarkdown>{project.description}</ReactMarkdown>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
