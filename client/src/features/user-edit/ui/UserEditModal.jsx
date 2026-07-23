import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { apiFetch } from "../../../shared/api/api";
import { enumLabel } from "../../../shared/i18n/labels";
import UserAvatar from "../../../entities/user/ui/UserAvatar";

const ROLES = ["CANDIDATE", "RECRUITER", "ADMIN"];

export default function UserEditModal({ show, user, token, onClose, onSaved }) {
  const { t } = useTranslation();
  const [role, setRole] = useState("CANDIDATE");
  const [isBlocked, setIsBlocked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!show || !user) return;
    setRole(user.role);
    setIsBlocked(user.isBlocked);
    setError(null);
  }, [show, user]);

  if (!show || !user) return null;

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const data = await apiFetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        token,
        body: {
          role,
          isBlocked,
          version: user.version,
        },
      });
      await onSaved(data.user);
      onClose();
    } catch (err) {
      setError(err.status === 409 ? t("adminUsers.conflict") : err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="modal show d-block app-modal"
      onClick={onClose}
    >
      <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content admin-user-modal">
          <form onSubmit={submit}>
            <div className="modal-header">
              <div className="admin-user-modal__title">
                <UserAvatar
                  className="admin-user-cell__avatar"
                  url={user.avatarUrl}
                  name={user.name}
                  email={user.email}
                />
                <div>
                  <h2 className="modal-title h5 mb-0">{t("adminUsers.edit")}</h2>
                  <p className="admin-user-modal__email mb-0">{user.email}</p>
                </div>
              </div>
              <button type="button" className="btn-close" onClick={onClose} />
            </div>
            <div className="modal-body">
              {error && <div className="alert alert-danger">{error}</div>}

              <div className="admin-user-modal__identity">
                <strong>{user.name || user.email}</strong>
                {user.isCurrentUser && (
                  <span className="you-pill">{t("adminUsers.you")}</span>
                )}
              </div>

              <div className="mb-3">
                <label className="form-label" htmlFor="admin-user-role">
                  {t("adminUsers.role")}
                </label>
                <select
                  id="admin-user-role"
                  className="form-select"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  {ROLES.map((item) => (
                    <option key={item} value={item}>
                      {enumLabel(t, "roles", item)}
                    </option>
                  ))}
                </select>
              </div>

              <label className="admin-block-switch" htmlFor="admin-user-blocked">
                <span>
                  <strong>{t("adminUsers.blocked")}</strong>
                  <small>{t("adminUsers.blockedHint")}</small>
                </span>
                <input
                  id="admin-user-blocked"
                  type="checkbox"
                  checked={isBlocked}
                  onChange={(e) => setIsBlocked(e.target.checked)}
                />
              </label>

              {user.isCurrentUser && role !== "ADMIN" && (
                <div className="alert alert-warning mt-3 mb-0">
                  {t("adminUsers.selfDemoteWarning")}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
                <i className="bi bi-x-lg" aria-hidden="true" />
                {t("adminUsers.cancel")}
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? (
                  <span className="auth-button-spinner" aria-hidden="true" />
                ) : (
                  <i className="bi bi-check2" aria-hidden="true" />
                )}
                {saving ? t("common.loading") : t("adminUsers.save")}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
