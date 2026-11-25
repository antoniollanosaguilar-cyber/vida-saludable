import { useEffect, useMemo, useState } from 'react';
import { Flame, X } from 'lucide-react';
import type { CookState, FoodItem, MealSlot } from '../types/models';
import { calculatePortionMacros } from '../engine/nutritionEngine';
import {
  formatKcal,
  formatMacroG,
  formatUnitQuantity,
  MEAL_SLOT_CTA,
  MEAL_SLOT_LABELS,
  MEAL_SLOTS_ORDER,
} from '../utils/formatters';

interface PortionBottomSheetProps {
  food: FoodItem | null;
  initialSlot: MealSlot;
  initialAmount?: number;
  initialCookState?: CookState;
  onClose: () => void;
  onConfirm: (payload: {
    food: FoodItem;
    slot: MealSlot;
    amount: number;
    cookState?: CookState;
    cantidadTexto: string;
    kcal: number;
    proteinaG: number;
    carbohidratosG: number;
    grasasG: number;
  }) => Promise<void>;
}

function getQuickPresets(food: FoodItem): number[] {
  if (food.unidadBase === 'unidad') return [1, 2, 3, 4];
  if (food.unidadBase === 'ml') return [15, 100, 200, 250];
  return [100, 150, 200, 250];
}

function getDefaultAmount(food: FoodItem): number {
  if (food.unidadBase === 'unidad') return 1;
  if (food.unidadBase === 'ml') {
    return food.categoria === 'grasa' ? 15 : 200;
  }
  return food.categoria === 'proteina' ? 150 : 100;
}

export function PortionBottomSheet({
  food,
  initialSlot,
  initialAmount,
  initialCookState,
  onClose,
  onConfirm,
}: PortionBottomSheetProps) {
  const [slot, setSlot] = useState<MealSlot>(initialSlot);
  const [amountInput, setAmountInput] = useState<string>('150');
  const [cookState, setCookState] = useState<CookState>('crudo');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (food) {
      setSlot(initialSlot);
      setAmountInput(
        String(
          initialAmount && initialAmount > 0 ? initialAmount : getDefaultAmount(food),
        ),
      );
      setCookState(initialCookState ?? food.estadoBase ?? 'crudo');
    }
  }, [food, initialSlot, initialAmount, initialCookState]);

  const numericAmount = useMemo(() => {
    const parsed = Number(amountInput.replace(',', '.'));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }, [amountInput]);

  const hasCookToggle = Boolean(food?.estadoBase && food?.factorCoccion);

  const macros = useMemo(() => {
    if (!food) {
      return {
        kcal: 0,
        proteinaG: 0,
        carbohidratosG: 0,
        grasasG: 0,
        equivalentBaseAmount: 0,
      };
    }
    return calculatePortionMacros(
      food,
      numericAmount,
      hasCookToggle ? cookState : undefined,
    );
  }, [food, numericAmount, hasCookToggle, cookState]);

  if (!food) return null;

  const presets = getQuickPresets(food);
  const unitSuffix = food.unidadBase === 'unidad' ? 'u' : food.unidadBase;

  async function handleConfirm() {
    if (!food || numericAmount <= 0) return;
    setSubmitting(true);
    try {
      const stateSuffix =
        hasCookToggle && cookState !== food.estadoBase ? ` (${cookState})` : '';
      await onConfirm({
        food,
        slot,
        amount: numericAmount,
        cookState: hasCookToggle ? cookState : undefined,
        cantidadTexto: `${formatUnitQuantity(numericAmount, food.unidadBase)}${stateSuffix}`,
        kcal: macros.kcal,
        proteinaG: macros.proteinaG,
        carbohidratosG: macros.carbohidratosG,
        grasasG: macros.grasasG,
      });
      onClose();
    } finally {
      setSubmitting(false);
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
        aria-labelledby="portion-sheet-title"
        className="relative z-10 w-full max-w-[480px] bg-surface-container border-t border-x border-outline rounded-t-xl px-page-margin pt-gutter-md pb-[max(20px,env(safe-area-inset-bottom))] flex flex-col gap-gutter-lg animate-sheet-enter"
      >
        <div className="w-10 h-1 rounded-full bg-outline mx-auto" aria-hidden="true" />

        {/* 1. Título y selector de horario */}
        <header className="flex flex-col gap-gutter-md">
          <div className="flex items-center justify-between gap-gutter-sm">
            <div className="min-w-0">
              <h2
                id="portion-sheet-title"
                className="font-headline text-headline-md text-on-surface truncate"
              >
                {food.nombre}
              </h2>
              <p className="font-body text-body-sm text-on-surface-variant tabular-nums">
                Base: {formatUnitQuantity(food.porcionReferencia, food.unidadBase)}
                {food.estadoBase ? ` (${food.estadoBase})` : ''} · {formatKcal(food.kcal)} kcal ·{' '}
                {formatMacroG(food.proteinaG)} g P
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar detalle"
              className="shrink-0 inline-flex items-center justify-center w-11 h-11 rounded-full bg-transparent text-on-surface-variant transition-colors duration-100 hover:bg-surface-container-high hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-95"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          <div
            role="group"
            aria-label="Horario de comida"
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
                  className={`shrink-0 inline-flex items-center justify-center min-h-[36px] px-gutter-md py-gutter-xs rounded-full font-label text-label-md whitespace-nowrap transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    selected
                      ? 'bg-primary-container border border-primary text-on-primary-container'
                      : 'bg-surface-container-high border border-outline text-on-surface-variant hover:border-primary hover:text-on-surface'
                  }`}
                >
                  {MEAL_SLOT_LABELS[itemSlot]}
                </button>
              );
            })}
          </div>
        </header>

        {/* Toggle Crudo ↔ Cocido si aplica */}
        {hasCookToggle && (
          <div className="flex items-center justify-between gap-gutter-sm px-gutter-md py-gutter-sm rounded-md bg-surface-container-high border border-outline">
            <div className="flex items-center gap-gutter-xs min-w-0">
              <Flame className="w-4 h-4 text-warning shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <span className="font-label text-label-sm text-on-surface block">
                  Peso en balanza
                </span>
                {cookState !== food.estadoBase && numericAmount > 0 && (
                  <span className="font-body text-body-sm text-on-surface-variant tabular-nums">
                    ≈ {formatUnitQuantity(macros.equivalentBaseAmount, food.unidadBase)} {food.estadoBase}
                  </span>
                )}
              </div>
            </div>

            <div
              role="group"
              aria-label="Estado de cocción"
              className="inline-flex p-1 rounded-md bg-surface-container border border-outline gap-1 shrink-0"
            >
              {(['crudo', 'cocido'] as CookState[]).map((mode) => {
                const active = cookState === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setCookState(mode)}
                    className={`min-h-[32px] px-gutter-md rounded-sm font-label text-label-sm capitalize transition-colors ${
                      active
                        ? 'bg-primary-container border border-primary text-on-primary-container'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {mode}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. Botones de porción rápida + campo numérico editable */}
        <div className="flex flex-col gap-gutter-md">
          <div role="group" aria-label="Porciones rápidas" className="grid grid-cols-4 gap-gutter-sm">
            {presets.map((preset) => {
              const active = numericAmount === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setAmountInput(String(preset))}
                  className={`min-h-[44px] px-gutter-sm py-gutter-sm rounded-md font-label text-label-md tabular-nums transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    active
                      ? 'bg-primary border border-primary text-on-primary'
                      : 'bg-surface-container-high border border-outline text-on-surface hover:border-primary'
                  }`}
                >
                  {preset}
                  {food.unidadBase === 'unidad' ? ' u' : food.unidadBase}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-gutter-md bg-surface-container-high border border-outline rounded-md px-gutter-md py-gutter-xs focus-within:border-primary">
            <label
              htmlFor="portion-custom-input"
              className="font-label text-label-md text-on-surface-variant whitespace-nowrap"
            >
              Cantidad personalizada
            </label>
            <div className="flex items-center gap-gutter-xs">
              <input
                id="portion-custom-input"
                type="number"
                inputMode="decimal"
                step={food.unidadBase === 'unidad' ? '0.5' : '5'}
                min="0.1"
                max="3000"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                className="w-20 min-h-[40px] bg-transparent border-0 text-right font-title text-title-md text-on-surface tabular-nums focus:outline-none p-0"
              />
              <span className="font-label text-label-md text-on-surface-variant">
                {unitSuffix}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Vista previa en vivo */}
        <div
          aria-live="polite"
          className="bg-surface-container-high border border-outline rounded-md px-gutter-md py-gutter-md flex items-center justify-center"
        >
          <p className="font-label text-label-lg text-on-surface tabular-nums text-center flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
            <span className="text-secondary">{formatKcal(macros.kcal)} kcal</span>
            <span className="text-on-surface-variant" aria-hidden="true">
              |
            </span>
            <span className="text-primary">{formatMacroG(macros.proteinaG)}g Prot</span>
            <span className="text-on-surface-variant" aria-hidden="true">
              |
            </span>
            <span className="text-on-surface">{formatMacroG(macros.carbohidratosG)}g Carb</span>
            <span className="text-on-surface-variant" aria-hidden="true">
              |
            </span>
            <span className="text-on-surface">{formatMacroG(macros.grasasG)}g Grasa</span>
          </p>
        </div>

        {/* 4. CTA principal */}
        <button
          type="button"
          disabled={numericAmount <= 0 || submitting}
          onClick={handleConfirm}
          className="w-full inline-flex items-center justify-center min-h-[48px] px-gutter-lg py-gutter-md rounded-md bg-primary text-on-primary font-label text-label-lg transition-colors duration-100 hover:bg-on-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.99] disabled:opacity-40"
        >
          {submitting ? 'Agregando...' : MEAL_SLOT_CTA[slot]}
        </button>
      </section>
    </div>
  );
}
