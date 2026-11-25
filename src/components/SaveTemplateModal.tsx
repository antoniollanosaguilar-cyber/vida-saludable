import { useEffect, useMemo, useState } from 'react';
import { BookmarkPlus, Plus, Trash2, X } from 'lucide-react';
import type {
  DayMenuTemplate,
  DayTemplateEntry,
  MealCombo,
  MealSlot,
} from '../types/models';
import {
  formatKcal,
  formatMacroG,
  MEAL_SLOT_LABELS,
  MEAL_SLOTS_ORDER,
} from '../utils/formatters';

export type SaveTemplateMode =
  | {
      kind: 'slot-to-combo';
      slot: MealSlot;
      defaultName: string;
      summaryText: string;
      totalKcal: number;
      totalProtG: number;
      totalCarbsG: number;
      totalFatsG: number;
      onSubmit: (name: string) => Promise<void>;
    }
  | {
      kind: 'day-to-template';
      defaultName: string;
      entriesCount: number;
      totalKcal: number;
      totalProtG: number;
      totalCarbsG: number;
      totalFatsG: number;
      onSubmit: (name: string, description: string) => Promise<void>;
    }
  | {
      kind: 'build-day-template';
      combos: MealCombo[];
      editingTemplate?: DayMenuTemplate | null;
      onSubmit: (template: Omit<DayMenuTemplate, 'id'>, existingId?: number) => Promise<void>;
    };

interface SaveTemplateModalProps {
  mode: SaveTemplateMode | null;
  onClose: () => void;
}

export function SaveTemplateModal({ mode, onClose }: SaveTemplateModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedEntries, setSelectedEntries] = useState<DayTemplateEntry[]>([]);
  const [pickerSlot, setPickerSlot] = useState<MealSlot>('desayuno');
  const [pickerComboId, setPickerComboId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!mode) return;
    setError(null);

    if (mode.kind === 'slot-to-combo') {
      setName(mode.defaultName);
      setDescription('');
    } else if (mode.kind === 'day-to-template') {
      setName(mode.defaultName);
      setDescription('');
    } else {
      setName(mode.editingTemplate?.nombre ?? '');
      setDescription(mode.editingTemplate?.descripcion ?? '');
      setSelectedEntries(mode.editingTemplate?.entries ?? []);
      if (mode.combos.length > 0 && mode.combos[0].id !== undefined) {
        setPickerComboId(String(mode.combos[0].id));
        setPickerSlot(mode.combos[0].slotSugerido);
      }
    }
  }, [mode]);

  const builderTotals = useMemo(() => {
    return selectedEntries.reduce(
      (acc, e) => ({
        kcal: acc.kcal + e.kcal,
        prot: Number((acc.prot + e.proteinaG).toFixed(1)),
        carbs: Number((acc.carbs + e.carbohidratosG).toFixed(1)),
        fats: Number((acc.fats + e.grasasG).toFixed(1)),
      }),
      { kcal: 0, prot: 0, carbs: 0, fats: 0 },
    );
  }, [selectedEntries]);

  if (!mode) return null;

  function handleAddComboToDay() {
    if (mode?.kind !== 'build-day-template') return;
    const combo = mode.combos.find((c) => String(c.id) === pickerComboId);
    if (!combo) return;

    setSelectedEntries((prev) => [
      ...prev,
      {
        slot: pickerSlot,
        nombre: combo.nombre,
        cantidadTexto: `Menú (${combo.ingredientes.length} ing.)`,
        kcal: combo.totalKcal,
        proteinaG: combo.totalProteinaG,
        carbohidratosG: combo.totalCarbsG,
        grasasG: combo.totalGrasasG,
        ingredientes: combo.ingredientes,
      },
    ]);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!mode) return;
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError('Escribe un nombre (mínimo 2 caracteres).');
      return;
    }

    if (mode.kind === 'build-day-template' && selectedEntries.length === 0) {
      setError('Agrega al menos un menú al día.');
      return;
    }

    setSaving(true);
    try {
      if (mode.kind === 'slot-to-combo') {
        await mode.onSubmit(trimmed);
      } else if (mode.kind === 'day-to-template') {
        await mode.onSubmit(trimmed, description.trim());
      } else {
        await mode.onSubmit(
          {
            nombre: trimmed,
            descripcion: description.trim() || undefined,
            entries: selectedEntries,
            totalKcal: Math.round(builderTotals.kcal),
            totalProteinaG: builderTotals.prot,
            totalCarbsG: builderTotals.carbs,
            totalGrasasG: builderTotals.fats,
            createdAt: mode.editingTemplate?.createdAt ?? Date.now(),
          },
          mode.editingTemplate?.id,
        );
      }
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const title =
    mode.kind === 'slot-to-combo'
      ? `Guardar ${MEAL_SLOT_LABELS[mode.slot]} como menú`
      : mode.kind === 'day-to-template'
        ? 'Guardar día completo'
        : mode.editingTemplate
          ? 'Editar plantilla de día'
          : 'Armar plantilla de día';

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
        aria-labelledby="save-template-title"
        className="relative z-10 w-full max-w-[480px] max-h-[88dvh] overflow-y-auto bg-surface-container border-t sm:border border-outline rounded-t-xl sm:rounded-lg px-page-margin pt-gutter-md pb-[max(20px,env(safe-area-inset-bottom))] flex flex-col gap-gutter-lg animate-sheet-enter"
      >
        <div className="w-10 h-1 rounded-full bg-outline mx-auto sm:hidden" aria-hidden="true" />

        <header className="flex items-center justify-between gap-gutter-sm">
          <div className="flex items-center gap-gutter-sm">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-md bg-primary-container text-primary">
              <BookmarkPlus className="w-5 h-5" aria-hidden="true" />
            </span>
            <h2 id="save-template-title" className="font-headline text-headline-md text-on-surface">
              {title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar diálogo"
            className="inline-flex items-center justify-center w-10 h-10 rounded-full text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex flex-col gap-gutter-md">
          <div className="flex flex-col gap-gutter-xs">
            <label htmlFor="tpl-name" className="font-label text-label-sm text-on-surface-variant">
              Nombre
            </label>
            <input
              id="tpl-name"
              type="text"
              autoFocus
              placeholder={
                mode.kind === 'slot-to-combo'
                  ? 'Ej. Almuerzo pollo + arroz + palta'
                  : 'Ej. Día de entreno alto en proteína'
              }
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              className="w-full min-h-[44px] px-gutter-md rounded-md bg-surface-container-high border border-outline font-body text-body-md text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary"
            />
          </div>

          {mode.kind !== 'slot-to-combo' && (
            <div className="flex flex-col gap-gutter-xs">
              <label htmlFor="tpl-desc" className="font-label text-label-sm text-on-surface-variant">
                Nota o contexto (opcional)
              </label>
              <input
                id="tpl-desc"
                type="text"
                placeholder="Ej. Día oficina / Día pierna"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full min-h-[44px] px-gutter-md rounded-md bg-surface-container-high border border-outline font-body text-body-md text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary"
              />
            </div>
          )}

          {mode.kind === 'build-day-template' && (
            <div className="bg-surface-container-high border border-outline rounded-md p-gutter-md flex flex-col gap-gutter-sm">
              <span className="font-label text-label-sm text-on-surface-variant">
                Agregar menús al día
              </span>

              <div className="grid grid-cols-[108px_1fr_44px] gap-gutter-xs items-center">
                <select
                  aria-label="Horario"
                  value={pickerSlot}
                  onChange={(e) => setPickerSlot(e.target.value as MealSlot)}
                  className="min-h-[42px] px-2 rounded-md bg-surface-container border border-outline font-body text-body-sm text-on-surface"
                >
                  {MEAL_SLOTS_ORDER.map((s) => (
                    <option key={s} value={s}>
                      {MEAL_SLOT_LABELS[s]}
                    </option>
                  ))}
                </select>

                <select
                  aria-label="Seleccionar menú"
                  value={pickerComboId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setPickerComboId(id);
                    const found = mode.combos.find((c) => String(c.id) === id);
                    if (found) setPickerSlot(found.slotSugerido);
                  }}
                  className="min-h-[42px] px-2 rounded-md bg-surface-container border border-outline font-body text-body-sm text-on-surface"
                >
                  {mode.combos.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.nombre} ({c.totalKcal} kcal)
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleAddComboToDay}
                  aria-label="Añadir menú al día"
                  className="inline-flex items-center justify-center w-11 h-[42px] rounded-md bg-primary-container border border-primary text-on-primary-container hover:bg-primary hover:text-on-primary transition-colors"
                >
                  <Plus className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>

              {selectedEntries.length > 0 && (
                <div className="flex flex-col gap-1 pt-gutter-sm border-t border-outline-variant">
                  {selectedEntries.map((entry, idx) => (
                    <div
                      key={`${entry.nombre}-${idx}`}
                      className="flex items-center justify-between gap-gutter-sm py-1"
                    >
                      <div className="min-w-0">
                        <span className="font-label text-[11px] text-primary mr-1.5">
                          {MEAL_SLOT_LABELS[entry.slot]}
                        </span>
                        <span className="font-body text-body-sm text-on-surface">
                          {entry.nombre}
                        </span>
                        <p className="font-body text-[11px] text-on-surface-variant tabular-nums">
                          {formatKcal(entry.kcal)} kcal · {formatMacroG(entry.proteinaG)}g P
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-label={`Quitar ${entry.nombre}`}
                        onClick={() =>
                          setSelectedEntries((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="inline-flex items-center justify-center w-9 h-9 rounded-md text-on-surface-variant hover:bg-error-container hover:text-error shrink-0"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Resumen de macros */}
          <div className="bg-surface-container-high border border-outline rounded-md px-gutter-md py-gutter-sm text-center font-label text-label-md tabular-nums">
            {mode.kind === 'slot-to-combo' ? (
              <>
                <span className="text-secondary">{formatKcal(mode.totalKcal)} kcal</span>
                <span className="text-on-surface-variant mx-1.5">|</span>
                <span className="text-primary">{formatMacroG(mode.totalProtG)}g P</span>
                <span className="text-on-surface-variant mx-1.5">|</span>
                <span className="text-on-surface">{formatMacroG(mode.totalCarbsG)}g C</span>
                <span className="text-on-surface-variant mx-1.5">|</span>
                <span className="text-on-surface">{formatMacroG(mode.totalFatsG)}g G</span>
                <p className="font-body text-body-sm text-on-surface-variant mt-1">
                  {mode.summaryText}
                </p>
              </>
            ) : mode.kind === 'day-to-template' ? (
              <>
                <span className="text-secondary">{formatKcal(mode.totalKcal)} kcal</span>
                <span className="text-on-surface-variant mx-1.5">|</span>
                <span className="text-primary">{formatMacroG(mode.totalProtG)}g P</span>
                <span className="text-on-surface-variant mx-1.5">|</span>
                <span className="text-on-surface">{formatMacroG(mode.totalCarbsG)}g C</span>
                <span className="text-on-surface-variant mx-1.5">|</span>
                <span className="text-on-surface">{formatMacroG(mode.totalFatsG)}g G</span>
                <p className="font-body text-body-sm text-on-surface-variant mt-1">
                  {mode.entriesCount} registros incluidos
                </p>
              </>
            ) : (
              <>
                <span className="text-secondary">{formatKcal(builderTotals.kcal)} kcal</span>
                <span className="text-on-surface-variant mx-1.5">|</span>
                <span className="text-primary">{formatMacroG(builderTotals.prot)}g P</span>
                <span className="text-on-surface-variant mx-1.5">|</span>
                <span className="text-on-surface">{formatMacroG(builderTotals.carbs)}g C</span>
                <span className="text-on-surface-variant mx-1.5">|</span>
                <span className="text-on-surface">{formatMacroG(builderTotals.fats)}g G</span>
              </>
            )}
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
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </form>
      </section>
    </div>
  );
}
