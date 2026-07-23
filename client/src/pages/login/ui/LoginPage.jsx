import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../../features/auth";

export default function LoginPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const {
    user,
    loading,
    error,
    loginWithGoogle,
    loginWithGithub,
    loginWithEmail,
    registerWithEmail,
    clearError,
  } = useAuth();
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");


  const from = location.state?.from || "/";

  if (!loading && user) {
    return <Navigate to={from} replace />;
  }

  function changeMode(nextMode) {
    setMode(nextMode);
    setMessage("");
    clearError();
  }

  async function submitEmail(e) {
    e.preventDefault();
    setSubmitting(true);
    setMessage("");
    try {
      if (mode === "register") {
        const result = await registerWithEmail({ name, email, password });
        if (result.needsConfirmation) {
          setMessage(t("login.confirmationSent"));
        }
      } else {
        await loginWithEmail(email, password);
      }
    } catch {

    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-shell">
      <section className="auth-card">
        <aside className="auth-aside">
          <img src="/talentdesk-logo.svg" alt="" width="52" height="52" />
          <div>
            <span className="auth-aside__brand">talentdesk</span>
            <h2>{t("login.promoTitle")}</h2>
            <p>{t("login.promoText")}</p>
          </div>
          <ul>
            {["profile", "cv", "positions"].map((benefit) => (
              <li key={benefit}>
                <i className="bi bi-check2" aria-hidden="true" />
                {t(`login.benefits.${benefit}`)}
              </li>
            ))}
          </ul>
        </aside>

        <div className="auth-panel">
          <div className="auth-tabs" role="tablist">
            <button
              type="button"
              className={mode === "login" ? "active" : ""}
              onClick={() => changeMode("login")}
            >
              {t("login.signInTab")}
            </button>
            <button
              type="button"
              className={mode === "register" ? "active" : ""}
              onClick={() => changeMode("register")}
            >
              {t("login.signUpTab")}
            </button>
          </div>

          <h1>{mode === "login" ? t("login.title") : t("login.registerTitle")}</h1>
          <p className="auth-panel__hint">
            {mode === "login" ? t("login.hint") : t("login.registerHint")}
          </p>

          {error && <div className="auth-message auth-message--error">{error}</div>}
          {message && <div className="auth-message auth-message--success">{message}</div>}

          <form className="auth-form" onSubmit={submitEmail}>
            {mode === "register" && (
              <label className="auth-field">
                <span>{t("login.name")}</span>
                <span className="auth-field__control">
                  <i className="bi bi-person" aria-hidden="true" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t("login.placeholders.name")}
                    autoComplete="name"
                    required
                  />
                </span>
              </label>
            )}

            <label className="auth-field">
              <span>{t("login.email")}</span>
              <span className="auth-field__control">
                <i className="bi bi-envelope" aria-hidden="true" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("login.placeholders.email")}
                  autoComplete="email"
                  required
                />
              </span>
            </label>

            <label className="auth-field">
              <span>{t("login.password")}</span>
              <span className="auth-field__control">
                <i className="bi bi-lock" aria-hidden="true" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("login.placeholders.password")}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={t("login.togglePassword")}
                >
                  <i
                    className={`bi ${showPassword ? "bi-eye-slash" : "bi-eye"}`}
                    aria-hidden="true"
                  />
                </button>
              </span>
            </label>

            <button className="btn btn-primary auth-submit" type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <span className="auth-button-spinner" aria-hidden="true" />
                  <span className="visually-hidden">{t("login.working")}</span>
                </>
              ) : (
                <>
                  <i
                    className={`bi ${mode === "login" ? "bi-box-arrow-in-right" : "bi-person-plus"}`}
                    aria-hidden="true"
                  />
                  {mode === "login" ? t("login.submit") : t("login.registerSubmit")}
                </>
              )}
            </button>
          </form>

          <div className="auth-divider">
            <span>{t("login.or")}</span>
          </div>

          <div className="auth-socials">
            <button type="button" onClick={loginWithGoogle} disabled={submitting}>
              <i className="bi bi-google" aria-hidden="true" />
              Google
            </button>
            <button type="button" onClick={loginWithGithub} disabled={submitting}>
              <i className="bi bi-github" aria-hidden="true" />
              GitHub
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
