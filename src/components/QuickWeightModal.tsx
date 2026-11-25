import { useEffect, useState } from 'react';
import { Scale, X } from 'lucide-react';
import { formatHeaderDate } from '../utils/formatters';

interface QuickWeightModalProps {
  open: boolean;
  dateKey: string;
  todayKey: string;
  initialWeightKg: number;
  onClose: () => void;
  onSave: (pesoKg: number, syncProfile: boolean) => Promise<void>;
}

export function QuickWeightModal({
  open,
  dateKey,
  todayKey,
  initialWeightKg,
  onClose,
  onSave,
}: QuickWeightModalProps) {
  const [value, setValue] = useState(String(initialWeightKg));
  const [syncProfile, setSyncProfile] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setValue(initialWeightKg ? String(initialWeightKg) : '');
      setSyncProfile(true);
      setError(null);
    }
  }, [open, initialWeightKg]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = Number(value.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed < 30 || parsed > 300) {
      setError('Ingresa un peso válido entre 30 y 300 kg.');
      return;
    }

    setSaving(true);
    try {
      await onSave(Number(parsed.toFixed(1)), syncProfile);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        aria-hidden="true"
        onClick={onClose}
        className="fixed inset-0 bg-surface/75 animate-fade-in"
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-weight-title"
        className="relative z-10 w-full max-w-[480px] bg-surface-container border-t sm:border border-outline rounded-t-xl sm:rounded-lg px-page-margin pt-gutter-md pb-gutter-xl flex flex-col gap-gutter-lg animate-sheet-enter"
      >
        <div className="w-10 h-1 rounded-full bg-outline mx-auto sm:hidden" aria-hidden="true" />

        <header className="flex items-center justify-between gap-gutter-sm">
          <div className="flex items-center gap-gutter-sm">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-md bg-primary-container text-primary">
              <Scale className="w-5 h-5" aria-hidden="true" />
            </span>
            <div className="flex flex-col">
              <h2 id="quick-weight-title" className="font-headline text-headline-md text-on-surface">
                Registrar peso
              </h2>
              <span className="font-body text-body-sm text-on-surface-variant">
                {formatHeaderDate(dateKey, todayKey)} · En ayunas
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal de peso"
            className="inline-flex items-center justify-center w-11 h-11 rounded-full text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex flex-col gap-gutter-md">
          <div className="flex items-baseline justify-between gap-gutter-sm bg-surface-container-high border border-outline rounded-md px-gutter-md py-gutter-sm focus-within:border-primary">
            <label htmlFor="quick-weight-input" className="font-label text-label-md text-on-surface-variant">
              Peso corporal
            </label>
            <div className="flex items-baseline gap-gutter-xs">
              <input
                id="quick-weight-input"
                type="number"
                inputMode="decimal"
                step="0.1"
                min="30"
                max="300"
                autoFocus
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  setError(null);
                }}
                className="w-24 min-h-[44px] bg-transparent border-0 text-right font-display text-display-lg-mobile text-on-surface tabular-nums focus:outline-none"
              />
              <span className="font-label text-label-lg text-on-surface-variant">kg</span>
            </div>
          </div>

          <label className="flex items-center gap-gutter-sm cursor-pointer select-none min-h-[36px]">
            <input
              type="checkbox"
              checked={syncProfile}
              onChange={(e) => setSyncProfile(e.target.checked)}
              className="w-4 h-4 rounded accent-primary bg-surface-container-high border-outline"
            />
            <span className="font-body text-body-sm text-on-surface-variant">
              Actualizar también mi peso base en Ajustes (recalcula metas)
            </span>
          </label>

          {error && (
            <p className="font-body text-body-sm text-error" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full min-h-[48px] px-gutter-lg rounded-md bg-primary text-on-primary font-label text-label-lg transition-colors hover:bg-on-primary-container disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar pesaje'}
          </button>
        </form>
      </section>
    </div>
  );
}
