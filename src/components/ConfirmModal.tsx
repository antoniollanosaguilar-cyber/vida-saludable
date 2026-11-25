import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'primary' | 'warning' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  tone = 'warning',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!open) return null;

  const confirmBtnClass =
    tone === 'danger'
      ? 'bg-error text-on-error hover:opacity-90'
      : tone === 'warning'
        ? 'bg-warning text-on-warning hover:opacity-90'
        : 'bg-primary text-on-primary hover:bg-on-primary-container';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-page-margin">
      <div
        aria-hidden="true"
        onClick={onCancel}
        className="fixed inset-0 bg-surface/80 animate-fade-in"
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        className="relative z-10 w-full max-w-[416px] bg-surface-container border border-outline rounded-lg p-gutter-xl flex flex-col gap-gutter-lg animate-sheet-enter"
      >
        <header className="flex items-start justify-between gap-gutter-sm">
          <div className="flex items-center gap-gutter-sm">
            {tone !== 'primary' && (
              <span
                className={`inline-flex items-center justify-center w-9 h-9 rounded-md shrink-0 ${
                  tone === 'danger'
                    ? 'bg-error-container text-error'
                    : 'bg-warning-container text-warning'
                }`}
              >
                <AlertTriangle className="w-5 h-5" aria-hidden="true" />
              </span>
            )}
            <h2 id="confirm-modal-title" className="font-headline text-headline-md text-on-surface">
              {title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onCancel}
            aria-label="Cerrar diálogo"
            className="inline-flex items-center justify-center w-10 h-10 rounded-full text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </header>

        <p className="font-body text-body-md text-on-surface-variant text-pretty">
          {description}
        </p>

        <div className="grid grid-cols-2 gap-gutter-md">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[44px] px-gutter-md rounded-md bg-surface-container-high border border-outline text-on-surface font-label text-label-md transition-colors hover:border-on-surface-variant"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`min-h-[44px] px-gutter-md rounded-md font-label text-label-md transition-colors ${confirmBtnClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
