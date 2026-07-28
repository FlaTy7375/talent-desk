import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../features/auth";
import { apiFetch } from "../../../shared/api/api";
import UserEditModal from "../../../features/user-edit/ui/UserEditModal";
import LoadingState from "../../../shared/ui/LoadingState";
import UsersTable from "./UsersTable";

export default function AdminUsersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user: currentUser, accessToken, logout, refreshUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const suffix = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : "";
      const data = await apiFetch(`/api/admin/users${suffix}`, {
        token: accessToken,
      });
      setUsers(data.users || []);
      setSelectedIds(new Set());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [query, accessToken]);

  useEffect(() => {
    const timer = setTimeout(load, 350);
    return () => clearTimeout(timer);
  }, [load]);

  const selected = useMemo(
    () => users.filter((user) => selectedIds.has(user.id)),
    [users, selectedIds]
  );

  const summary = useMemo(() => {
    const blocked = users.filter((user) => user.isBlocked).length;
    const admins = users.filter((user) => user.role === "ADMIN").length;
    const recruiters = users.filter((user) => user.role === "RECRUITER").length;
    return {
      total: users.length,
      blocked,
      admins,
      recruiters,
      candidates: users.length - admins - recruiters,
    };
  }, [users]);

  function toggle(id) {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selectedIds.size === users.length) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(users.map((user) => user.id)));
  }

  async function afterSaved(updated) {
    if (updated.id === currentUser.id) {
      if (updated.isBlocked) {
        await logout();
        navigate("/");
        return;
      }
      await refreshUser();
    }
    await load();
  }

  async function remove() {
    if (!selected.length) return;
    if (!window.confirm(t("adminUsers.confirmDelete", { count: selected.length }))) return;

    try {
      const deletingSelf = selectedIds.has(currentUser.id);
      const data = await apiFetch("/api/admin/users", {
        method: "DELETE",
        token: accessToken,
        body: { ids: [...selectedIds] },
      });
      if (data.failures?.length) {
        setError(
          data.failures.map((failure) => `${failure.email}: ${failure.error}`).join("; ")
        );
      }
      if (deletingSelf && data.deletedIds?.includes(currentUser.id)) {
        await logout();
        navigate("/");
        return;
      }
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="admin-users-page">
      <header className="admin-users-hero">
        <div>
          <p className="admin-users-hero__eyebrow">
            <i className="bi bi-shield-lock" aria-hidden="true" />
            {t("adminUsers.eyebrow")}
          </p>
          <h1>{t("adminUsers.title")}</h1>
          <p className="admin-users-hero__subtitle">{t("adminUsers.subtitle")}</p>
        </div>
        <div className="admin-users-summary" aria-label={t("adminUsers.summary")}>
          <div>
            <strong>{summary.total}</strong>
            <span>{t("adminUsers.stats.total")}</span>
          </div>
          <div>
            <strong>{summary.candidates}</strong>
            <span>{enumLabel(t, "roles", "CANDIDATE")}</span>
          </div>
          <div>
            <strong>{summary.recruiters}</strong>
            <span>{enumLabel(t, "roles", "RECRUITER")}</span>
          </div>
          <div>
            <strong>{summary.blocked}</strong>
            <span>{t("adminUsers.blocked")}</span>
          </div>
        </div>
      </header>

      <div className="admin-users-toolbar">
        <div className="admin-users-toolbar__actions">
          <button
            type="button"
            className="btn btn-outline-primary"
            disabled={selected.length !== 1}
            onClick={() => setEditing(selected[0])}
          >
            <i className="bi bi-pencil" aria-hidden="true" />
            {t("adminUsers.edit")}
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary"
            disabled={selected.length !== 1}
            onClick={() => navigate(`/profile?userId=${selected[0].id}`)}
          >
            <i className="bi bi-person-vcard" aria-hidden="true" />
            {t("adminUsers.openProfile")}
          </button>
          <button
            type="button"
            className="btn btn-outline-danger"
            disabled={!selected.length}
            onClick={remove}
          >
            <i className="bi bi-trash3" aria-hidden="true" />
            {t("adminUsers.delete")}
            {selected.length > 0 && <span className="count-badge">{selected.length}</span>}
          </button>
        </div>

        <label className="admin-users-search">
          <i className="bi bi-search" aria-hidden="true" />
          <input
            type="search"
            placeholder={t("adminUsers.search")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <LoadingState rows={5} />
      ) : (
        <UsersTable
          users={users}
          selectedIds={selectedIds}
          onToggle={toggle}
          onToggleAll={toggleAll}
        />
      )}

      <UserEditModal
        show={Boolean(editing)}
        user={editing}
        token={accessToken}
        onClose={() => setEditing(null)}
        onSaved={afterSaved}
      />
    </div>
  );
}
