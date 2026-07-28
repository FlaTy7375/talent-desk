import { useTranslation } from "react-i18next";
import PositionFormModal from "../../../features/position-form/ui/PositionFormModal";
import LoadingState from "../../../shared/ui/LoadingState";
import { usePositionsPage } from "../model/usePositionsPage";
import PositionsSidebar from "./PositionsSidebar";
import PositionsTable from "./PositionsTable";

export default function PositionsPage() {
  const { t } = useTranslation();
  const {
    accessToken,
    canManage,
    canCreateCv,
    canSelect,
    attributes,
    selectedIds,
    loading,
    error,
    showForm,
    setShowForm,
    editing,
    accessFilter,
    setAccessFilter,
    filteredPositions,
    selected,
    filterCounts,
    levelCounts,
    focusedPosition,
    toggle,
    openCreate,
    openEdit,
    duplicate,
    remove,
    createOrOpenCv,
    load,
  } = usePositionsPage();

  const filters = [
    { id: "all", label: t("positions.filters.all"), count: filterCounts.all },
    {
      id: "public",
      label: t("positions.public"),
      count: filterCounts.public,
    },
    {
      id: "restricted",
      label: t("positions.restricted"),
      count: filterCounts.restricted,
    },
  ];

  return (
    <div
      className={`positions-board${canSelect ? " positions-board--selectable" : ""}${
        canManage ? " positions-board--manage" : " positions-board--browse"
      }`}
    >
      <PositionsSidebar
        canManage={canManage}
        canCreateCv={canCreateCv}
        accessFilter={accessFilter}
        setAccessFilter={setAccessFilter}
        filters={filters}
        filteredPositions={filteredPositions}
        levelCounts={levelCounts}
        focusedPosition={focusedPosition}
        selected={selected}
        onOpenCreate={openCreate}
        onOpenEdit={openEdit}
        onDuplicate={duplicate}
        onRemove={remove}
        onCreateOrOpenCv={createOrOpenCv}
      />

      <section className="positions-board__main">
        {error && <div className="alert alert-danger">{error}</div>}

        {loading ? (
          <LoadingState rows={6} />
        ) : (
          <PositionsTable
            positions={filteredPositions}
            selectedIds={selectedIds}
            canSelect={canSelect}
            canManage={canManage}
            onToggle={toggle}
          />
        )}
      </section>

      {canManage && (
        <PositionFormModal
          show={showForm}
          initial={editing}
          attributes={attributes}
          token={accessToken}
          onClose={() => setShowForm(false)}
          onSaved={load}
        />
      )}
    </div>
  );
}
