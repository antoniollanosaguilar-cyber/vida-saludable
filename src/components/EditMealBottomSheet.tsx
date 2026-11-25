import { useEffect, useMemo, useState } from 'react';
import { Trash2, X } from 'lucide-react';
import type { CookState, FoodItem, MealLogEntry, MealSlot } from '../types/models';
import { calculatePortionMacros } from '../engine/nutritionEngine';
import {
  formatKcal,
  formatMacroG,
  formatUnitQuantity,
  MEAL_SLOT_LABELS,
  MEAL_SLOTS_ORDER,
} from '../utils/formatters';

interface EditMealBottomSheetProps {
  entry: MealLogEntry | null;
  linkedFood: FoodItem | null;
  onClose: () => void;
  onSave: (updated: MealLogEntry) => Promise<void>;
  onDelete: (entry: MealLogEntry) => Promise<void>;
}

function getPresets(food: FoodItem): number[] {
  if (food.unidadBase === 'unidad') return [1, 2, 3, 4];
  if (food.unidadBase === 'ml') return [15, 100, 200, 250];
  return [100, 150, 200, 250];
}

export function EditMealBottomSheet({
  entry,
  linkedFood,
  onClose,
  onSave,
  onDelete,
}: EditMealBottomSheetProps) {
  const [slot, setSlot] = useState<MealSlot>('almuerzo');
  const [amountInput, setAmountInput] = useState('100');
  const [cookState, setCookState] = useState<CookState>('crudo');

  // Direct fields when entry is not linked to a catalog food (e.g. combo or Quick Add)
  const [nombre, setNombre] = useState('');
  const [kcalInput, setKcalInput] = useState('0');
  const [protInput, setProtInput] = useState('0');
  const [carbsInput, setCarbsInput] = useState('0');
  const [fatsInput, setFatsInput] = useState('0');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!entry) return;
    setSlot(entry.slot);
    setNombre(entry.nombre);
    setKcalInput(String(Math.round(entry.kcal)));
    setProtInput(String(entry.proteinaG));
    setCarbsInput(String(entry.carbohidratosG));
    setFatsInput(String(entry.grasasG));

    if (linkedFood) {
      const initialAmt =
        entry.cantidadNum && entry.cantidadNum > 0
          ? entry.cantidadNum
          : linkedFood.porcionReferencia;
      setAmountInput(String(initialAmt));
      setCookState(entry.cookState ?? linkedFood.estadoBase ?? 'crudo');
    }
  }, [entry, linkedFood]);

  const numericAmount = useMemo(() => {
    const parsed = Number(amountInput.replace(',', '.'));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }, [amountInput]);

  const foodMacros = useMemo(() => {
    if (!linkedFood) return null;
    return calculatePortionMacros(linkedFood, numericAmount, cookState);
  }, [linkedFood, numericAmount, cookState]);

  if (!entry) return null;

  const hasCookToggle = Boolean(
    linkedFood && linkedFood.estadoBase && linkedFood.factorCoccion,
  );

  async function handleSave() {
    if (!entry) return;
    setSaving(true);
    try {
      if (linkedFood && foodMacros && numericAmount > 0) {
        const suffix =
          hasCookToggle && cookState !== linkedFood.estadoBase
            ? ` (${cookState})`
            : '';
        await onSave({
          ...entry,
          slot,
          cantidadNum: numericAmount,
          unidad: linkedFood.unidadBase,
          cookState: hasCookToggle ? cookState : undefined,
          cantidadTexto: `${formatUnitQuantity(numericAmount, linkedFood.unidadBase)}${suffix}`,
          kcal: foodMacros.kcal,
          proteinaG: foodMacros.proteinaG,
          carbohidratosG: foodMacros.carbohidratosG,
          grasasG: foodMacros.grasasG,
        });
      } else {
        const k = Math.max(0, Math.round(Number(kcalInput.replace(',', '.')) || 0));
        const p = Math.max(0, Number((Number(protInput.replace(',', '.')) || 0).toFixed(1)));
        const c = Math.max(0, Number((Number(carbsInput.replace(',', '.')) || 0).toFixed(1)));
        const f = Math.max(0, Number((Number(fatsInput.replace(',', '.')) || 0).toFixed(1)));
        await onSave({
          ...entry,
          slot,
          nombre: nombre.trim() || entry.nombre,
          kcal: k,
          proteinaG: p,
          carbohidratosG: c,
          grasasG: f,
        });
      }
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
        aria-labelledby="edit-meal-title"
        className="relative z-10 w-full max-w-[480px] bg-surface-container border-t border-x border-outline rounded-t-xl px-page-margin pt-gutter-md pb-[max(20px,env(safe-area-inset-bottom))] flex flex-col gap-gutter-lg animate-sheet-enter"
      >
        <div className="w-10 h-1 rounded-full bg-outline mx-auto" aria-hidden="true" />

        <header className="flex flex-col gap-gutter-md">
          <div className="flex items-center justify-between gap-gutter-sm">
            <div className="min-w-0">
              <span className="font-label text-label-sm text-primary uppercase tracking-wider">
                Editar registro
              </span>
              <h2
                id="edit-meal-title"
                className="font-headline text-headline-md text-on-surface truncate"
              >
                {entry.nombre}
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar edición"
              className="shrink-0 inline-flex items-center justify-center w-11 h-11 rounded-full text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          <div
            role="group"
            aria-label="Cambiar horario"
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

        {linkedFood && foodMacros ? (
          <div className="flex flex-col gap-gutter-md">
            {hasCookToggle && (
              <div className="flex items-center justify-between gap-gutter-sm">
                <span className="font-label text-label-sm text-on-surface-variant">
                  Peso medido en
                </span>
                <div className="inline-flex p-1 rounded-md bg-surface-container-high border border-outline gap-1">
                  {(['crudo', 'cocido'] as CookState[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setCookState(mode)}
                      className={`min-h-[32px] px-gutter-md rounded-sm font-label text-label-sm capitalize transition-colors ${
                        cookState === mode
                          ? 'bg-primary-container border border-primary text-on-primary-container'
                          : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-4 gap-gutter-sm">
              {getPresets(linkedFood).map((preset) => {
                const active = numericAmount === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAmountInput(String(preset))}
                    className={`min-h-[44px] rounded-md font-label text-label-md tabular-nums transition-colors ${
                      active
                        ? 'bg-primary border border-primary text-on-primary'
                        : 'bg-surface-container-high border border-outline text-on-surface hover:border-primary'
                    }`}
                  >
                    {preset}
                    {linkedFood.unidadBase === 'unidad' ? ' u' : linkedFood.unidadBase}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between gap-gutter-md bg-surface-container-high border border-outline rounded-md px-gutter-md py-gutter-xs focus-within:border-primary">
              <label
                htmlFor="edit-portion-qty"
                className="font-label text-label-md text-on-surface-variant"
              >
                Cantidad
              </label>
              <div className="flex items-center gap-gutter-xs">
                <input
                  id="edit-portion-qty"
                  type="number"
                  inputMode="decimal"
                  step={linkedFood.unidadBase === 'unidad' ? '0.5' : '5'}
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  className="w-20 min-h-[40px] bg-transparent border-0 text-right font-title text-title-md text-on-surface tabular-nums focus:outline-none p-0"
                />
                <span className="font-label text-label-md text-on-surface-variant">
                  {linkedFood.unidadBase === 'unidad' ? 'u' : linkedFood.unidadBase}
                </span>
              </div>
            </div>

            <div className="bg-surface-container-high border border-outline rounded-md px-gutter-md py-gutter-md text-center font-label text-label-lg tabular-nums">
              <span className="text-secondary">{formatKcal(foodMacros.kcal)} kcal</span>
              <span className="text-on-surface-variant mx-1.5">|</span>
              <span className="text-primary">{formatMacroG(foodMacros.proteinaG)}g Prot</span>
              <span className="text-on-surface-variant mx-1.5">|</span>
              <span className="text-on-surface">{formatMacroG(foodMacros.carbohidratosG)}g Carb</span>
              <span className="text-on-surface-variant mx-1.5">|</span>
              <span className="text-on-surface">{formatMacroG(foodMacros.grasasG)}g Grasa</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-gutter-md">
            <div className="flex flex-col gap-gutter-xs">
              <label htmlFor="edit-free-name" className="font-label text-label-sm text-on-surface-variant">
                Nombre
              </label>
              <input
                id="edit-free-name"
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full min-h-[44px] px-gutter-md rounded-md bg-surface-container-high border border-outline font-body text-body-md text-on-surface focus:outline-none focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-gutter-sm">
              <div className="flex flex-col gap-gutter-xs">
                <label htmlFor="edit-free-kcal" className="font-label text-label-sm text-secondary">
                  Calorías (kcal)
                </label>
                <input
                  id="edit-free-kcal"
                  type="number"
                  inputMode="numeric"
                  value={kcalInput}
                  onChange={(e) => setKcalInput(e.target.value)}
                  className="w-full min-h-[44px] px-gutter-md rounded-md bg-surface-container-high border border-outline font-title text-title-md text-secondary tabular-nums focus:outline-none focus:border-primary"
                />
              </div>
              <div className="flex flex-col gap-gutter-xs">
                <label htmlFor="edit-free-prot" className="font-label text-label-sm text-primary">
                  Proteína (g)
                </label>
                <input
                  id="edit-free-prot"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  value={protInput}
                  onChange={(e) => setProtInput(e.target.value)}
                  className="w-full min-h-[44px] px-gutter-md rounded-md bg-surface-container-high border border-outline font-title text-title-md text-primary tabular-nums focus:outline-none focus:border-primary"
                />
              </div>
              <div className="flex flex-col gap-gutter-xs">
                <label htmlFor="edit-free-carbs" className="font-label text-label-sm text-on-surface-variant">
                  Carbohidratos (g)
                </label>
                <input
                  id="edit-free-carbs"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  value={carbsInput}
                  onChange={(e) => setCarbsInput(e.target.value)}
                  className="w-full min-h-[44px] px-gutter-md rounded-md bg-surface-container-high border border-outline font-title text-title-md text-on-surface tabular-nums focus:outline-none focus:border-primary"
                />
              </div>
              <div className="flex flex-col gap-gutter-xs">
                <label htmlFor="edit-free-fats" className="font-label text-label-sm text-on-surface-variant">
                  Grasas (g)
                </label>
                <input
                  id="edit-free-fats"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  value={fatsInput}
                  onChange={(e) => setFatsInput(e.target.value)}
                  className="w-full min-h-[44px] px-gutter-md rounded-md bg-surface-container-high border border-outline font-title text-title-md text-on-surface tabular-nums focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-[auto_1fr] gap-gutter-sm">
          <button
            type="button"
            onClick={async () => {
              await onDelete(entry);
              onClose();
            }}
            aria-label="Eliminar registro"
            className="inline-flex items-center justify-center min-h-[48px] px-gutter-md rounded-md bg-error-container border border-error/40 text-error hover:bg-error hover:text-on-error transition-colors"
          >
            <Trash2 className="w-5 h-5" aria-hidden="true" />
          </button>

          <button
            type="button"
            disabled={saving || (Boolean(linkedFood) && numericAmount <= 0)}
            onClick={handleSave}
            className="w-full min-h-[48px] px-gutter-lg rounded-md bg-primary text-on-primary font-label text-label-lg transition-colors hover:bg-on-primary-container disabled:opacity-40"
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </section>
    </div>
  );
}
