import Modal from './Modal.jsx';

/** Confirm/cancel dialog. `children` carries the details (who/what/how much). */
export default function ConfirmationDialog({
  title, children, confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  tone = 'primary', confirmDisabled = false, onConfirm, onCancel,
}) {
  return (
    <Modal title={title} onClose={onCancel}>
      <div className="space-y-3 text-sm text-ink">{children}</div>
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" className="btn-ghost" onClick={onCancel}>{cancelLabel}</button>
        <button
          type="button"
          className={tone === 'danger' ? 'btn-danger' : 'btn-primary'}
          disabled={confirmDisabled}
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
