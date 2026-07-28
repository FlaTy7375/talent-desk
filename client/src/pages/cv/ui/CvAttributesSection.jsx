import { useTranslation } from "react-i18next";
import ProfileAttributeField from "../../../features/profile-field/ui/ProfileAttributeField";
import { filled } from "../lib/cvUtils";

export default function CvAttributesSection({ attributes, drafts, dirty, permissions, accessToken, onChange, onImageUploaded }) {
  const { t } = useTranslation();
  if (!attributes || attributes.length === 0) return null;

  return (
    <section className="cv-page__panel">
      <div className="cv-page__panel-head">
        <h2>{t("cv.details")}</h2>
      </div>
      <div className="cv-page__panel-body">
        {attributes.map((item) => {
          const empty = !filled(drafts[item.attribute.id]);
          return (
            <div
              key={item.attribute.id}
              className={`cv-page__field ${empty ? "cv-page__field--empty" : ""}`}
            >
              <ProfileAttributeField
                item={item}
                value={drafts[item.attribute.id]}
                dirty={dirty.has(item.attribute.id)}
                disabled={!permissions.canEdit}
                token={accessToken}
                onImageUploaded={onImageUploaded}
                onChange={(value) => onChange(item.attribute.id, value)}
              />
              {empty && <div className="text-danger small">{t("cv.required")}</div>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
