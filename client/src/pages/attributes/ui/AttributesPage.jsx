import { useTranslation } from "react-i18next";
import { useAuth } from "../../../features/auth";
import AttributeFormModal from "../../../features/attribute-form/ui/AttributeFormModal";
import LoadingState from "../../../shared/ui/LoadingState";
import { categoryLabel } from "../../../shared/i18n/labels";
import { useAttributesPage } from "../model/useAttributesPage";
import AttributesTable from "./AttributesTable";

export default function AttributesPage() {
  const { t } = useTranslation();
  const { accessToken } = useAuth();
  const {
    attributes,
    recent,
    categories,
    loading,
    error,
    q,
    setQ,
    categoryId,
    setCategoryId,
    selectedIds,
    modalOpen,
    setModalOpen,
    editing,
    setEditing,
    selectedCount,
    summary,
    toggleOne,
    toggleAll,
    openCreate,
    openEdit,
    handleDelete,
    load,
  } = useAttributesPage();

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
                  setEditing(a);
                  setModalOpen(true);
                }}
              >
                <span className={`type-dot type-dot--${a.type.toLowerCase()}`} />
                {a.name}
              </button>
            ))}
          </div>
        </section>
      )}

      {loading ? (
        <LoadingState rows={5} />
      ) : (
        <AttributesTable
          attributes={attributes}
          selectedIds={selectedIds}
          onToggleOne={toggleOne}
          onToggleAll={toggleAll}
        />
      )}

      <AttributeFormModal
        show={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={load}
        initial={editing}
        categories={categories}
        token={accessToken}
      />
    </div>
  );
}
