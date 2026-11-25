import { useEffect, useMemo, useState } from 'react';
import { Copy, Pencil, RotateCcw, X } from 'lucide-react';
import type { ComboIngredient, MealCombo, MealSlot } from '../types/models';
import { getMacroDistribution } from '../engine/menuEngine';
import { MacroSplitBar } from './MacroSplitBar';
import {
  formatKcal,
  formatMacroG,
  MEAL_SLOT_CTA,
  MEAL_SLOT_LABELS,
  MEAL_SLOTS_ORDER,
} from '../utils/formatters';

interface ComboDetailSheetProps {
  combo: MealCombo | null;
  initialSlot?: MealSlot;
  initialScale?: number;
  onClose: () => void;
  onConfirm: (payload: {
    combo: MealCombo;
    slot: MealSlot;
    scaleLabel: string;
    kcal: number;
    proteinaG: number;
    carbohidratosG: number;
    grasasG: number;
  }) => Promise<void>;
  onDuplicate?: (combo: MealCombo) => Promise<void>;
  onEdit?: (combo: MealCombo) => void;
}

const SCALE_PRESETS = [0.5, 0.75, 1, 1.25, 1.5];

interface EditableIngredientRow {
  base: ComboIngredient;
  qtyText: string;
}

function roundQty(val: number, unit: ComboIngredient['unidad']): number {
  if (unit === 'unidad') {
    return Number((Math.round(val * 2) / 2).toFixed(1));
  }
  return Math.max(0, Math.round(val));
}

export function ComboDetailSheet({
  combo,
  initialSlot,
  initialScale = 1,
  onClose,
  onConfirm,
  onDuplicate,
  onEdit,
}: ComboDetailSheetProps) {
  const [slot, setSlot] = useState<MealSlot>('almuerzo');
  const [scale, setScale] = useState<number>(1);
  const [rows, setRows] = useState<EditableIngredientRow[]>([]);
  const [customEdited, setCustomEdited] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!combo) return;
    setSlot(initialSlot ?? combo.slotSugerido);
    const safeScale = initialScale > 0 ? initialScale : 1;
    setScale(safeScale);
    setCustomEdited(false);
    setRows(
      combo.ingredientes.map((ing) => ({
        base: ing,
        qtyText: String(roundQty(ing.cantidad * safeScale, ing.unidad)),
      })),
    );
  }, [combo, initialSlot, initialScale]);

  const computedRows = useMemo(() => {
    return rows.map((row) => {
      const parsed = Number(row.qtyText.replace(',', '.'));
      const qty = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
      const ratio = row.base.cantidad > 0 ? qty / row.base.cantidad : 0;
      return {
        ...row,
        qty,
        kcal: Math.round(row.base.kcal * ratio),
        proteinaG: Number((row.base.proteinaG * ratio).toFixed(1)),
        carbohidratosG: Number((row.base.carbohidratosG * ratio).toFixed(1)),
        grasasG: Number((row.base.grasasG * ratio).toFixed(1)),
      };
    });
  }, [rows]);

  const totals = useMemo(() => {
    if (!combo) return { kcal: 0, prot: 0, carbs: 0, fats: 0 };
    if (computedRows.length === 0) {
      return {
        kcal: Math.round(combo.totalKcal * scale),
        prot: Number((combo.totalProteinaG * scale).toFixed(1)),
        carbs: Number((combo.totalCarbsG * scale).toFixed(1)),
        fats: Number((combo.totalGrasasG * scale).toFixed(1)),
      };
    }
    return computedRows.reduce(
      (acc, r) => ({
        kcal: acc.kcal + r.kcal,
        prot: Number((acc.prot + r.proteinaG).toFixed(1)),
        carbs: Number((acc.carbs + r.carbohidratosG).toFixed(1)),
        fats: Number((acc.fats + r.grasasG).toFixed(1)),
      }),
      { kcal: 0, prot: 0, carbs: 0, fats: 0 },
    );
  }, [combo, computedRows, scale]);

  if (!combo) return null;

  const dist = getMacroDistribution(totals.prot, totals.carbs, totals.fats);

  function applyScale(nextScale: number) {
    if (!combo) return;
    setScale(nextScale);
    setCustomEdited(false);
    setRows(
      combo.ingredientes.map((ing) => ({
        base: ing,
        qtyText: String(roundQty(ing.cantidad * nextScale, ing.unidad)),
      })),
    );
  }

  function handleIngredientChange(idx: number, nextVal: string) {
    setCustomEdited(true);
    setRows((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, qtyText: nextVal } : row)),
    );
  }

  async function handleConfirm() {
    if (!combo) return;
    setSubmitting(true);
    try {
      const activeCount = computedRows.filter((r) => r.qty > 0).length;
      const scaleLabel = customEdited
        ? `Menú ajustado (${activeCount || combo.ingredientes.length} ing.)`
        : scale !== 1
          ? `Menú ${scale}× (${combo.ingredientes.length} ing.)`
          : `Menú (${combo.ingredientes.length} ing.)`;

      await onConfirm({
        combo,
        slot,
        scaleLabel,
        kcal: Math.round(totals.kcal),
        proteinaG: totals.prot,
        carbohidratosG: totals.carbs,
        grasasG: totals.fats,
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
        aria-labelledby="combo-detail-title"
        className="relative z-10 w-full max-w-[480px] max-h-[88dvh] overflow-y-auto bg-surface-container border-t border-x border-outline rounded-t-xl px-page-margin pt-gutter-md pb-[max(20px,env(safe-area-inset-bottom))] flex flex-col gap-gutter-lg animate-sheet-enter"
      >
        <div className="w-10 h-1 rounded-full bg-outline mx-auto shrink-0" aria-hidden="true" />

        {/* Encabezado */}
        <header className="flex flex-col gap-gutter-md">
          <div className="flex items-start justify-between gap-gutter-sm">
            <div className="min-w-0 flex flex-col gap-1">
              <div className="flex items-center gap-gutter-xs flex-wrap">
                <h2
                  id="combo-detail-title"
                  className="font-headline text-headline-md text-on-surface text-balance"
                >
                  {combo.nombre}
                </h2>
                {dist.isHighProtein && (
                  <span className="px-2 py-0.5 rounded-full bg-primary-container border border-primary/50 font-label text-[10px] text-on-primary-container">
                    Alto en P
                  </span>
                )}
              </div>
              <span className="font-body text-body-sm text-on-surface-variant">
                Ajusta la porción solo para hoy (tu plantilla original no cambia)
              </span>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {onDuplicate && (
                <button
                  type="button"
                  onClick={async () => {
                    await onDuplicate(combo);
                    onClose();
                  }}
                  aria-label="Duplicar menú"
                  title="Duplicar menú"
                  className="inline-flex items-center justify-center w-10 h-10 rounded-full text-on-surface-variant hover:bg-surface-container-high hover:text-primary transition-colors"
                >
                  <Copy className="w-[18px] h-[18px]" aria-hidden="true" />
                </button>
              )}
              {onEdit && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEdit(combo);
                  }}
                  aria-label="Editar plantilla del menú"
                  title="Editar plantilla"
                  className="inline-flex items-center justify-center w-10 h-10 rounded-full text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
                >
                  <Pencil className="w-[18px] h-[18px]" aria-hidden="true" />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar detalle de menú"
                className="inline-flex items-center justify-center w-10 h-10 rounded-full text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Selector de horario */}
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

        {/* Escalador rápido 0.5x – 1.5x */}
        <div className="flex flex-col gap-gutter-sm">
          <div className="flex items-center justify-between">
            <span className="font-label text-label-sm text-on-surface-variant">
              Escalar porción del menú
            </span>
            {(customEdited || scale !== 1) && (
              <button
                type="button"
                onClick={() => applyScale(1)}
                className="inline-flex items-center gap-1 font-label text-label-sm text-primary hover:underline"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Restablecer 1×</span>
              </button>
            )}
          </div>

          <div role="group" aria-label="Escala del menú" className="grid grid-cols-5 gap-gutter-xs">
            {SCALE_PRESETS.map((preset) => {
              const active = !customEdited && scale === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  aria-pressed={active}
                  onClick={() => applyScale(preset)}
                  className={`min-h-[42px] rounded-md font-label text-label-md tabular-nums transition-colors ${
                    active
                      ? 'bg-primary border border-primary text-on-primary'
                      : 'bg-surface-container-high border border-outline text-on-surface hover:border-primary'
                  }`}
                >
                  {preset}×
                </button>
              );
            })}
          </div>
        </div>

        {/* Desglose editable por ingrediente */}
        {computedRows.length > 0 && (
          <div className="bg-surface-container-high border border-outline rounded-md divide-y divide-outline-variant overflow-hidden">
            {computedRows.map((row, idx) => (
              <div
                key={`${row.base.nombre}-${idx}`}
                className="flex items-center justify-between gap-gutter-sm px-gutter-md py-gutter-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-body text-body-md text-on-surface truncate">
                    {row.base.nombre}
                  </p>
                  <p className="font-body text-body-sm text-on-surface-variant tabular-nums">
                    {formatKcal(row.kcal)} kcal ·{' '}
                    <span className="text-primary">{formatMacroG(row.proteinaG)}g P</span> ·{' '}
                    {formatMacroG(row.carbohidratosG)}g C · {formatMacroG(row.grasasG)}g G
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0 bg-surface-container border border-outline rounded-md px-2 focus-within:border-primary">
                  <input
                    type="number"
                    inputMode="decimal"
                    step={row.base.unidad === 'unidad' ? '0.5' : '5'}
                    min="0"
                    aria-label={`Cantidad de ${row.base.nombre}`}
                    value={row.qtyText}
                    onChange={(e) => handleIngredientChange(idx, e.target.value)}
                    className="w-16 min-h-[38px] bg-transparent border-0 text-right font-title text-body-md text-on-surface tabular-nums focus:outline-none p-0"
                  />
                  <span className="font-label text-label-sm text-on-surface-variant">
                    {row.base.unidad === 'unidad' ? 'u' : row.base.unidad}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Vista previa en vivo */}
        <div className="bg-surface-container-high border border-outline rounded-md p-gutter-md flex flex-col gap-gutter-sm">
          <p className="font-label text-label-lg text-on-surface tabular-nums text-center flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
            <span className="text-secondary">{formatKcal(totals.kcal)} kcal</span>
            <span className="text-on-surface-variant" aria-hidden="true">
              |
            </span>
            <span className="text-primary">{formatMacroG(totals.prot)}g Prot</span>
            <span className="text-on-surface-variant" aria-hidden="true">
              |
            </span>
            <span className="text-on-surface">{formatMacroG(totals.carbs)}g Carb</span>
            <span className="text-on-surface-variant" aria-hidden="true">
              |
            </span>
            <span className="text-on-surface">{formatMacroG(totals.fats)}g Grasa</span>
          </p>
          <MacroSplitBar
            proteinaG={totals.prot}
            carbohidratosG={totals.carbs}
            grasasG={totals.fats}
            showLabels
          />
        </div>

        {/* CTA principal */}
        <button
          type="button"
          disabled={submitting || totals.kcal <= 0}
          onClick={() => void handleConfirm()}
          className="w-full min-h-[48px] px-gutter-lg rounded-md bg-primary text-on-primary font-label text-label-lg transition-colors hover:bg-on-primary-container disabled:opacity-40"
        >
          {submitting ? 'Agregando...' : MEAL_SLOT_CTA[slot]}
        </button>
      </section>
    </div>
  );
}
