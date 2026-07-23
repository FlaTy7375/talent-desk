import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../features/auth";
import { apiFetch } from "../../../shared/api/api";
import AttributeFormModal from "../../../features/attribute-form/ui/AttributeFormModal";
import LoadingState from "../../../shared/ui/LoadingState";
import {
  attributeDescription,
  attributeLabel,
  categoryLabel,
  enumLabel,
} from "../../../shared/i18n/labels";

export default function AttributesPage() {
  const { t } = useTranslation();
  const { accessToken } = useAuth();

  const [attributes, setAttributes] = useState([]);
  const [recent, setRecent] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [q, setQ] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (categoryId) params.set("categoryId", categoryId);

      const [listData, recentData, catData] = await Promise.all([
        apiFetch(`/api/attributes?${params.toString()}`, { token: accessToken }),
        apiFetch("/api/attributes?recent=1", { token: accessToken }),
        apiFetch("/api/meta/categories", { token: accessToken }),
      ]);

      setAttributes(listData.attributes || []);
      setRecent(recentData.attributes || []);
      setCategories(catData.categories || []);
      setSelectedIds(new Set());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [accessToken, q, categoryId]);

  useEffect(() => {
    const timer = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, q]);

  const selectedCount = selectedIds.size;

  const selectedAttributes = useMemo(
    () => attributes.filter((a) => selectedIds.has(a.id)),
    [attributes, selectedIds]
  );

  const summary = useMemo(() => {
    const system = attributes.filter((item) => item.isSystem).length;
    return {
      total: attributes.length,
      system,
      custom: attributes.length - system,
      categories: new Set(attributes.map((item) => item.category?.id).filter(Boolean))
        .size,
    };
  }, [attributes]);

  function toggleOne(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selectedIds.size === attributes.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(attributes.map((a) => a.id)));
    }
  }

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit() {
    if (selectedAttributes.length !== 1) return;
    setEditing(selectedAttributes[0]);
    setModalOpen(true);
  }

  async function handleDelete() {
    if (!selectedCount) return;
    const names = selectedAttributes.map((a) => a.name).join(", ");
    if (!window.confirm(t("attributes.confirmDelete", { names }))) return;

    try {
      await apiFetch("/api/attributes", {
        method: "DELETE",
        token: accessToken,
        body: { ids: [...selectedIds] },
      });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSaved() {
    await load();
  }

  return (
    <div className="attributes-page">
      <header className="attributes-hero">
        <div>
          <p className="attributes-hero__eyebrow">
            <i className="bi bi-sliders2" aria-hidden="true" />
            {t("attributes.eyebrow")}
          </p>
          <h1>{t("attributes.title")}</h1>
          <p className="attributes-hero__subtitle">{t("attributes.subtitle")}</p>
        </div>
        <div className="attributes-summary" aria-label={t("attributes.summary")}>
          <div>
            <strong>{summary.total}</strong>
            <span>{t("attributes.stats.total")}</span>
          </div>
          <div>
            <strong>{summary.custom}</strong>
            <span>{t("attributes.stats.custom")}</span>
          </div>
          <div>
            <strong>{summary.system}</strong>
            <span>{t("attributes.stats.system")}</span>
          </div>
          <div>
            <strong>{summary.categories}</strong>
            <span>{t("attributes.stats.categories")}</span>
          </div>
        </div>
      </header>

      <div className="attributes-toolbar">
        <div className="attributes-toolbar__actions">
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            <i className="bi bi-plus-lg" aria-hidden="true" />
            {t("attributes.create")}
          </button>
          <button
            type="button"
            className="btn btn-outline-primary"
            onClick={openEdit}
            disabled={selectedCount !== 1}
          >
            <i className="bi bi-pencil" aria-hidden="true" />
            {t("attributes.edit")}
          </button>
          <button
            type="button"
            className="btn btn-outline-danger"
            onClick={handleDelete}
            disabled={selectedCount === 0}
          >
            <i className="bi bi-trash3" aria-hidden="true" />
            {t("attributes.delete")}
            {selectedCount > 0 && <span className="count-badge">{selectedCount}</span>}
          </button>
        </div>

        <div className="attributes-filters">
          <label className="attributes-search">
            <i className="bi bi-search" aria-hidden="true" />
            <input
              type="search"
              placeholder={t("attributes.searchPrefix")}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </label>
          <select
            className="form-select attributes-category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            aria-label={t("attributes.fields.category")}
          >
            <option value="">{t("attributes.allCategories")}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {categoryLabel(t, c)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {recent.length > 0 && (
        <section className="attributes-recent">
          <div className="attributes-recent__heading">
            <i className="bi bi-clock-history" aria-hidden="true" />
            <h2>{t("attributes.recent")}</h2>
          </div>
          <div className="attributes-recent__list">
            {recent.map((a) => (
              <button
                key={a.id}
                type="button"
                className="recent-chip"
                onClick={() => {
                  setSelectedIds(new Set([a.id]));
                  setEditing(a);
                  setModalOpen(true);
                }}
              >
                <span className={`type-dot type-dot--${a.type.toLowerCase()}`} />
                {attributeLabel(t, a)}
              </button>
            ))}
          </div>
        </section>
      )}

      {loading ? (
        <LoadingState rows={5} />
      ) : (
        <div className="table-responsive positions-table-wrap">
          <table className="table align-middle positions-table attributes-table">
            <thead>
              <tr>
                <th scope="col" style={{ width: 40 }}>
                  <input
                    type="checkbox"
                    className="form-check-input"
                    checked={
                      attributes.length > 0 && selectedIds.size === attributes.length
                    }
                    onChange={toggleAll}
                    aria-label={t("attributes.selectAll")}
                  />
                </th>
                <th scope="col">{t("attributes.fields.name")}</th>
                <th scope="col">{t("attributes.fields.type")}</th>
                <th scope="col">{t("attributes.fields.category")}</th>
                <th scope="col">{t("attributes.fields.system")}</th>
              </tr>
            </thead>
            <tbody>
              {attributes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="positions-empty">
                    <i className="bi bi-sliders2" aria-hidden="true" />
                    {t("attributes.empty")}
                  </td>
                </tr>
              ) : (
                attributes.map((a) => (
                  <tr
                    key={a.id}
                    className={selectedIds.has(a.id) ? "is-selected" : undefined}
                    onClick={() => toggleOne(a.id)}
                  >
                    <td onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={selectedIds.has(a.id)}
                        onChange={() => toggleOne(a.id)}
                      />
                    </td>
                    <td>
                      <div className="attribute-name-cell">
                        <strong>{attributeLabel(t, a)}</strong>
                        {attributeDescription(t, a) ? (
                          <span>{attributeDescription(t, a)}</span>
                        ) : null}
                      </div>
                    </td>
                    <td>
                      <span className={`type-pill type-pill--${a.type.toLowerCase()}`}>
                        {enumLabel(t, "attributeTypes", a.type)}
                      </span>
                    </td>
                    <td>
                      <span className="soft-badge">
                        {categoryLabel(t, a.category)}
                      </span>
                    </td>
                    <td>
                      {a.isSystem ? (
                        <span className="system-pill">
                          <i className="bi bi-lock" aria-hidden="true" />
                          {t("attributes.systemShort")}
                        </span>
                      ) : (
                        <span className="text-body-secondary">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <AttributeFormModal
        show={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
        initial={editing}
        categories={categories}
        token={accessToken}
      />
    </div>
  );
}
