import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: number;
  text: string;
  tone?: 'success' | 'warning' | 'error' | 'info';
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastHostProps {
  toast: ToastMessage | null;
  onDismiss: () => void;
}

export function ToastHost({ toast, onDismiss }: ToastHostProps) {
  if (!toast) return null;

  const tone = toast.tone ?? 'success';
  const borderClass =
    tone === 'warning'
      ? 'border-warning'
      : tone === 'error'
        ? 'border-error'
        : tone === 'info'
          ? 'border-secondary'
          : 'border-primary';

  const Icon =
    tone === 'warning' || tone === 'error'
      ? AlertTriangle
      : tone === 'info'
        ? Info
        : CheckCircle2;

  const iconClass =
    tone === 'warning'
      ? 'text-warning'
      : tone === 'error'
        ? 'text-error'
        : tone === 'info'
          ? 'text-secondary'
          : 'text-primary';

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-[82px] left-0 right-0 z-50 flex justify-center px-page-margin pointer-events-none"
    >
      <div
        className={`pointer-events-auto w-full max-w-[448px] bg-surface-container-high border ${borderClass} rounded-md px-gutter-md py-gutter-sm flex items-center justify-between gap-gutter-sm animate-sheet-enter`}
      >
        <div className="flex items-center gap-gutter-sm min-w-0">
          <Icon className={`w-4 h-4 shrink-0 ${iconClass}`} aria-hidden="true" />
          <span className="font-body text-body-md text-on-surface truncate">
            {toast.text}
          </span>
        </div>

        <div className="flex items-center gap-gutter-xs shrink-0">
          {toast.actionLabel && toast.onAction && (
            <button
              type="button"
              onClick={() => {
                toast.onAction?.();
                onDismiss();
              }}
              className="min-h-[36px] px-gutter-sm rounded-sm bg-primary-container border border-primary text-on-primary-container font-label text-label-md transition-colors duration-100 hover:bg-primary hover:text-on-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {toast.actionLabel}
            </button>
          )}
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Cerrar notificación"
            className="inline-flex items-center justify-center w-9 h-9 rounded-sm text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
