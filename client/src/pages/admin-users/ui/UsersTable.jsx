import { useTranslation } from "react-i18next";
import UserAvatar from "../../../entities/user/ui/UserAvatar";
import { enumLabel } from "../../../shared/i18n/labels";

export default function UsersTable({ users, selectedIds, onToggle, onToggleAll }) {
  const { t } = useTranslation();

  return (
    <div className="table-responsive positions-table-wrap">
      <table className="table align-middle positions-table admin-users-table">
        <thead>
          <tr>
            <th scope="col" style={{ width: 40 }}>
              <input
                type="checkbox"
                className="form-check-input"
                checked={users.length > 0 && selectedIds.size === users.length}
                onChange={onToggleAll}
                aria-label={t("adminUsers.selectAll")}
              />
            </th>
            <th scope="col">{t("adminUsers.user")}</th>
            <th scope="col">{t("adminUsers.role")}</th>
            <th scope="col">{t("adminUsers.status")}</th>
            <th scope="col">{t("common.cv")}</th>
            <th scope="col">{t("adminUsers.projects")}</th>
          </tr>
        </thead>
        <tbody>
          {!users.length ? (
            <tr>
              <td colSpan={6} className="positions-empty">
                <i className="bi bi-people" aria-hidden="true" />
                {t("adminUsers.empty")}
              </td>
            </tr>
          ) : (
            users.map((user) => (
              <tr
                key={user.id}
                className={selectedIds.has(user.id) ? "is-selected" : undefined}
                onClick={() => onToggle(user.id)}
              >
                <td onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    className="form-check-input"
                    checked={selectedIds.has(user.id)}
                    onChange={() => onToggle(user.id)}
                  />
                </td>
                <td>
                  <div className="admin-user-cell">
                    <UserAvatar
                      className="admin-user-cell__avatar"
                      url={user.avatarUrl}
                      name={user.name}
                      email={user.email}
                    />
                    <div>
                      <div className="admin-user-cell__name">
                        <span>{user.name || "—"}</span>
                        {user.isCurrentUser && (
                          <span className="you-pill">{t("adminUsers.you")}</span>
                        )}
                      </div>
                      <span className="admin-user-cell__email">{user.email}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={`role-pill role-pill--${user.role.toLowerCase()}`}>
                    <i
                      className={`bi ${
                        user.role === "ADMIN"
                          ? "bi-shield-check"
                          : user.role === "RECRUITER"
                            ? "bi-briefcase"
                            : "bi-person"
                      }`}
                      aria-hidden="true"
                    />
                    {enumLabel(t, "roles", user.role)}
                  </span>
                </td>
                <td>
                  <span
                    className={`access-pill ${
                      user.isBlocked ? "is-restricted" : "is-public"
                    }`}
                  >
                    <i
                      className={`bi ${
                        user.isBlocked ? "bi-slash-circle" : "bi-check-circle"
                      }`}
                      aria-hidden="true"
                    />
                    {user.isBlocked
                      ? t("adminUsers.blocked")
                      : t("adminUsers.active")}
                  </span>
                </td>
                <td>
                  <span className="metric-badge is-accent">
                    <i className="bi bi-file-earmark-person" aria-hidden="true" />
                    {user.cvCount}
                  </span>
                </td>
                <td>
                  <span className="metric-badge">
                    <i className="bi bi-kanban" aria-hidden="true" />
                    {user.projectCount}
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
