import { useTranslation } from "react-i18next";

export default function ConfirmModal({
  show,
  title,
  message,
  confirmLabel,
  cancelLabel,
  confirmVariant = "danger",
  onConfirm,
  onCancel,
}) {
  const { t } = useTranslation();
  if (!show) return null;

  return (
    <div
      className="modal show d-block app-modal confirm-modal"
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        e.stopPropagation();
        onCancel();
      }}
    >
      <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content">
          <div className="modal-header">
            <h2 className="modal-title h5">{title}</h2>
            <button
              type="button"
              className="btn-close"
              onClick={onCancel}
              aria-label={cancelLabel || t("common.cancel")}
            />
          </div>
          <div className="modal-body">
            <p className="mb-0">{message}</p>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline-secondary" onClick={onCancel}>
              {cancelLabel || t("common.cancel")}
            </button>
            <button
              type="button"
              className={`btn btn-${confirmVariant}`}
              onClick={onConfirm}
              autoFocus
            >
              {confirmLabel || t("common.confirm")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
