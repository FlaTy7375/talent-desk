import { useTranslation } from "react-i18next";
import { attributeLabel } from "../../../shared/i18n/labels";

export default function PositionSidebar({ position }) {
  const { t } = useTranslation();
  if (!position) return null;

  return (
    <aside className="position-sidebar">
      <section className="position-side-card">
        <h2>{t("positions.templateData")}</h2>
        <dl>
          <div>
            <dt>{t("positions.fields.maxProjects")}</dt>
            <dd>{position.maxProjects}</dd>
          </div>
          <div>
            <dt>{t("positions.attributesCount")}</dt>
            <dd>{position.attributes.length}</dd>
          </div>
          <div>
            <dt>{t("common.cv")}</dt>
            <dd>{position.cvCount}</dd>
          </div>
        </dl>
      </section>

      <section className="position-side-card">
        <h2>{t("positions.fields.attributes")}</h2>
        <div className="detail-badges">
          {position.attributes.map((attribute) => (
            <span key={attribute.id}>
              <i className="bi bi-check2" aria-hidden="true" />
              {attributeLabel(t, attribute)}
            </span>
          ))}
        </div>
      </section>

      {position.projectTags?.length > 0 && (
        <section className="position-side-card">
          <h2>{t("positions.fields.tags")}</h2>
          <div className="tag-badges">
            {position.projectTags.map((tag) => (
              <span className="tag-badge" key={tag.id}>
                {tag.name}
              </span>
            ))}
          </div>
        </section>
      )}
    </aside>
  );
}
