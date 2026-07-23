import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <div className="text-center py-5">
      <h1 className="h3 mb-3">{t("notFound.title")}</h1>
      <Link className="btn btn-primary" to="/">
        <i className="bi bi-house" aria-hidden="true" />
        {t("notFound.back")}
      </Link>
    </div>
  );
}
