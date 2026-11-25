import { useEffect, useState } from 'react';
import { X, Zap } from 'lucide-react';
import type { MealSlot } from '../types/models';
import {
  MEAL_SLOT_CTA,
  MEAL_SLOT_LABELS,
  MEAL_SLOTS_ORDER,
} from '../utils/formatters';

interface QuickAddBottomSheetProps {
  open: boolean;
  initialSlot: MealSlot;
  onClose: () => void;
  onConfirm: (payload: {
    nombre: string;
    slot: MealSlot;
    kcal: number;
    proteinaG: number;
    carbohidratosG: number;
    grasasG: number;
  }) => Promise<void>;
}

export function QuickAddBottomSheet({
  open,
  initialSlot,
  onClose,
  onConfirm,
}: QuickAddBottomSheetProps) {
  const [slot, setSlot] = useState<MealSlot>(initialSlot);
  const [nombre, setNombre] = useState('');
  const [kcal, setKcal] = useState('');
  const [proteina, setProteina] = useState('');
  const [carbs, setCarbs] = useState('');
  const [grasas, setGrasas] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setSlot(initialSlot);
      setNombre('');
      setKcal('');
      setProteina('');
      setCarbs('');
      setGrasas('');
      setError(null);
    }
  }, [open, initialSlot]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const kcalVal = Number(kcal.replace(',', '.'));
    const protVal = Number((proteina || '0').replace(',', '.'));
    const carbsVal = Number((carbs || '0').replace(',', '.'));
    const fatsVal = Number((grasas || '0').replace(',', '.'));

    if (!Number.isFinite(kcalVal) || kcalVal <= 0) {
      setError('Ingresa las calorías estimadas (mayor a 0).');
      return;
    }

    setSaving(true);
    try {
      await onConfirm({
        nombre: nombre.trim() || 'Registro rápido',
        slot,
        kcal: Math.round(kcalVal),
        proteinaG: Math.max(0, Number((Number.isFinite(protVal) ? protVal : 0).toFixed(1))),
        carbohidratosG: Math.max(
          0,
          Number((Number.isFinite(carbsVal) ? carbsVal : 0).toFixed(1)),
        ),
        grasasG: Math.max(0, Number((Number.isFinite(fatsVal) ? fatsVal : 0).toFixed(1))),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        aria-hidden="true"
        onClick={onClose}
        className="fixed inset-0 bg-surface/75 animate-fade-in"
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-add-title"
        className="relative z-10 w-full max-w-[480px] bg-surface-container border-t border-x border-outline rounded-t-xl px-page-margin pt-gutter-md pb-[max(20px,env(safe-area-inset-bottom))] flex flex-col gap-gutter-lg animate-sheet-enter"
      >
        <div className="w-10 h-1 rounded-full bg-outline mx-auto" aria-hidden="true" />

        <header className="flex flex-col gap-gutter-md">
          <div className="flex items-center justify-between gap-gutter-sm">
            <div className="flex items-center gap-gutter-sm">
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-md bg-secondary-container text-secondary">
                <Zap className="w-5 h-5" aria-hidden="true" />
              </span>
              <div>
                <h2 id="quick-add-title" className="font-headline text-headline-md text-on-surface">
                  Quick Add de macros
                </h2>
                <p className="font-body text-body-sm text-on-surface-variant">
                  Ideal para comidas fuera de casa sin crear alimento
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar entrada rápida"
              className="inline-flex items-center justify-center w-11 h-11 rounded-full text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          <div
            role="group"
            aria-label="Horario"
            className="flex items-center gap-gutter-sm overflow-x-auto no-scrollbar"
          >
            {MEAL_SLOTS_ORDER.map((itemSlot) => {
              const selected = slot === itemSlot;
              return (
                <button
                  key={itemSlot}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setSlot(itemSlot)}
                  className={`shrink-0 min-h-[36px] px-gutter-md rounded-full font-label text-label-md transition-colors ${
                    selected
                      ? 'bg-primary-container border border-primary text-on-primary-container'
                      : 'bg-surface-container-high border border-outline text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {MEAL_SLOT_LABELS[itemSlot]}
                </button>
              );
            })}
          </div>
        </header>

        <form onSubmit={handleSubmit} className="flex flex-col gap-gutter-md">
          <div className="flex flex-col gap-gutter-xs">
            <label htmlFor="qa-name" className="font-label text-label-sm text-on-surface-variant">
              Descripción (opcional)
            </label>
            <input
              id="qa-name"
              type="text"
              placeholder="Ej. Almuerzo fuera / Asado"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full min-h-[44px] px-gutter-md rounded-md bg-surface-container-high border border-outline font-body text-body-md text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-gutter-md">
            <div className="flex flex-col gap-gutter-xs">
              <label htmlFor="qa-kcal" className="font-label text-label-sm text-secondary">
                Calorías (kcal) *
              </label>
              <input
                id="qa-kcal"
                type="number"
                inputMode="numeric"
                autoFocus
                placeholder="650"
                value={kcal}
                onChange={(e) => {
                  setKcal(e.target.value);
                  setError(null);
                }}
                className="w-full min-h-[46px] px-gutter-md rounded-md bg-surface-container-high border border-outline font-display text-headline-md text-secondary tabular-nums focus:outline-none focus:border-secondary"
              />
            </div>

            <div className="flex flex-col gap-gutter-xs">
              <label htmlFor="qa-prot" className="font-label text-label-sm text-primary">
                Proteína (g)
              </label>
              <input
                id="qa-prot"
                type="number"
                inputMode="decimal"
                step="any"
                placeholder="45"
                value={proteina}
                onChange={(e) => setProteina(e.target.value)}
                className="w-full min-h-[46px] px-gutter-md rounded-md bg-surface-container-high border border-outline font-display text-headline-md text-primary tabular-nums focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-gutter-md">
            <div className="flex flex-col gap-gutter-xs">
              <label htmlFor="qa-carbs" className="font-label text-label-sm text-on-surface-variant">
                Carbohidratos (g, opc.)
              </label>
              <input
                id="qa-carbs"
                type="number"
                inputMode="decimal"
                step="any"
                placeholder="0"
                value={carbs}
                onChange={(e) => setCarbs(e.target.value)}
                className="w-full min-h-[44px] px-gutter-md rounded-md bg-surface-container-high border border-outline font-title text-title-md text-on-surface tabular-nums focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex flex-col gap-gutter-xs">
              <label htmlFor="qa-fats" className="font-label text-label-sm text-on-surface-variant">
                Grasas (g, opc.)
              </label>
              <input
                id="qa-fats"
                type="number"
                inputMode="decimal"
                step="any"
                placeholder="0"
                value={grasas}
                onChange={(e) => setGrasas(e.target.value)}
                className="w-full min-h-[44px] px-gutter-md rounded-md bg-surface-container-high border border-outline font-title text-title-md text-on-surface tabular-nums focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {error && (
            <p className="font-body text-body-sm text-error" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full min-h-[48px] px-gutter-lg rounded-md bg-primary text-on-primary font-label text-label-lg transition-colors hover:bg-on-primary-container disabled:opacity-40"
          >
            {saving ? 'Registrando...' : MEAL_SLOT_CTA[slot]}
          </button>
        </form>
      </section>
    </div>
  );
}
