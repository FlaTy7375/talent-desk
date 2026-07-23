import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../features/auth";
import { useTranslation } from "react-i18next";

export default function AuthCallbackPage() {
  const { user, loading, error } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    if (loading) return;
    if (user) {
      navigate("/", { replace: true });
    }
  }, [loading, user, navigate]);

  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        {error}
      </div>
    );
  }

  return (
    <div className="auth-callback" role="status" aria-live="polite">
      <div className="auth-callback__loader">
        <img src="/talentdesk-logo.svg" alt="" width="54" height="54" />
        <span />
      </div>
      <span className="visually-hidden">{t("auth.completing")}</span>
    </div>
  );
}
