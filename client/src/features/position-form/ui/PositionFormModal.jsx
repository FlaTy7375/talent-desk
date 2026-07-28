import { useTranslation } from "react-i18next";
import ConfirmModal from "../../../shared/ui/ConfirmModal";
import { usePositionForm } from "../model/usePositionForm";
import PositionBasicFields from "./PositionBasicFields";
import PositionAttributesSection, {
  PositionAccessRulesSection,
} from "./PositionAttributesSection";

export default function PositionFormModal({
  show,
  initial,
  attributes,
  token,
  onClose,
  onSaved,
}) {
  const { t } = useTranslation();
  const {
    form,
    saving,
    error,
    uploadingImage,
    confirmClose,
    setConfirmClose,
    selectedAttributes,
    setField,
    toggleAttribute,
    addRule,
    updateRule,
    removeRule,
    handleImagePick,
    requestClose,
    discardAndClose,
    submit,
    pendingImageRef,
  } = usePositionForm({ show, initial, attributes, token, onClose, onSaved });

  if (!show) return null;

  return (
    <div
      className="modal show d-block"
      tabIndex={-1}
      style={{ background: "rgba(0,0,0,.45)", overflowY: "auto" }}
      onClick={requestClose}
    >
      <div
        className="modal-dialog modal-lg modal-dialog-scrollable"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="modal-content"
          style={{ maxHeight: "calc(100vh - 2rem)" }}
        >
          <form onSubmit={submit} className="d-flex flex-column overflow-hidden">
            <div className="modal-header">
              <h2 className="modal-title h5">
                {initial ? t("positions.edit") : t("positions.create")}
              </h2>
              <button type="button" className="btn-close" onClick={requestClose} />
            </div>

            <div className="modal-body overflow-auto">
              {error && <div className="alert alert-danger">{error}</div>}

              <PositionBasicFields
                form={form}
                initial={initial}
                saving={saving}
                uploadingImage={uploadingImage}
                onFieldChange={setField}
                onImagePick={handleImagePick}
                onClearImage={() => {
                  pendingImageRef.current = null;
                  setField("imageUrl", "");
                }}
              />

              <PositionAttributesSection
                attributes={attributes}
                form={form}
                onToggleAttribute={toggleAttribute}
              />

              <PositionAccessRulesSection
                form={form}
                selectedAttributes={selectedAttributes}
                onFieldChange={setField}
                onAddRule={addRule}
                onUpdateRule={updateRule}
                onRemoveRule={removeRule}
              />
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={requestClose}>
                <i className="bi bi-x-lg" aria-hidden="true" />
                {t("positions.cancel")}
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {!saving && <i className="bi bi-check2" aria-hidden="true" />}
                {saving ? "…" : t("positions.save")}
              </button>
            </div>
          </form>
        </div>
      </div>

      <ConfirmModal
        show={confirmClose}
        title={t("positions.unsavedTitle")}
        message={t("positions.unsavedConfirm")}
        confirmLabel={t("positions.unsavedDiscard")}
        cancelLabel={t("positions.unsavedStay")}
        confirmVariant="danger"
        onConfirm={discardAndClose}
        onCancel={() => setConfirmClose(false)}
      />
    </div>
  );
}
