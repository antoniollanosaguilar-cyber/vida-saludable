import { useMemo, useRef, useState } from 'react';
import {
  BookmarkPlus,
  ChevronLeft,
  ChevronRight,
  Copy,
  Droplets,
  Footprints,
  Minus,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import type {
  ComboIngredient,
  DailyTargets,
  MealLogEntry,
  MealSlot,
  UserProfile,
} from '../types/models';
import { MacroRing } from '../components/MacroRing';
import { SamsaraMark } from '../components/SamsaraBrand';
import { SwipeableRow } from '../components/SwipeableRow';
import { EditMealBottomSheet } from '../components/EditMealBottomSheet';
import {
  SaveTemplateModal,
  type SaveTemplateMode,
} from '../components/SaveTemplateModal';
import {
  addDays,
  formatHeaderDate,
  formatKcal,
  formatMacroG,
  MEAL_SLOT_LABELS,
  MEAL_SLOTS_ORDER,
} from '../utils/formatters';

interface TodayPageProps {
  selectedDate: string;
  todayKey: string;
  profile: UserProfile;
  targets: DailyTargets;
  onChangeDate: (dateKey: string) => void;
  onOpenQuickWeight: () => void;
  onAddForSlot: (slot: MealSlot) => void;
  onCopyMealsFromYesterday: (entries: MealLogEntry[], label: string) => Promise<void>;
  onUpdateMeal: (updated: MealLogEntry) => Promise<void>;
  onDeleteMeal: (entry: MealLogEntry) => Promise<void>;
  onUpdateDailyMetric: (fecha: string, patch: { aguaMl?: number; pasos?: number }) => Promise<void>;
  onNotify: (text: string, tone?: 'success' | 'warning' | 'error' | 'info') => void;
}

export function TodayPage({
  selectedDate,
  todayKey,
  profile,
  targets,
  onChangeDate,
  onOpenQuickWeight,
  onAddForSlot,
  onCopyMealsFromYesterday,
  onUpdateMeal,
  onDeleteMeal,
  onUpdateDailyMetric,
  onNotify,
}: TodayPageProps) {
  const [editingEntry, setEditingEntry] = useState<MealLogEntry | null>(null);
  const [saveModalMode, setSaveModalMode] = useState<SaveTemplateMode | null>(null);
  const [editingSteps, setEditingSteps] = useState(false);
  const [stepsDraft, setStepsDraft] = useState('');

  const prevDateKey = useMemo(() => addDays(selectedDate, -1), [selectedDate]);

  const dayLogs = useLiveQuery(
    () => db.mealLogs.where('fecha').equals(selectedDate).sortBy('createdAt'),
    [selectedDate],
  );
  const yesterdayLogs = useLiveQuery(
    () => db.mealLogs.where('fecha').equals(prevDateKey).sortBy('createdAt'),
    [prevDateKey],
  );
  const allFoods = useLiveQuery(() => db.foods.toArray(), []) ?? [];
  const allCombos = useLiveQuery(() => db.combos.toArray(), []) ?? [];
  const dailyMetric = useLiveQuery(
    () => db.dailyMetrics.get(selectedDate),
    [selectedDate],
  );

  // Swipe horizontal para cambiar de día
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);

  function handleDayTouchStart(e: React.TouchEvent<HTMLDivElement>) {
    if (e.touches.length !== 1) return;
    const target = e.target as HTMLElement | null;
    if (target?.closest('[data-no-day-swipe="true"]')) {
      swipeStartRef.current = null;
      return;
    }
    swipeStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  }

  function handleDayTouchEnd(e: React.TouchEvent<HTMLDivElement>) {
    if (!swipeStartRef.current || e.changedTouches.length !== 1) return;
    const dx = e.changedTouches[0].clientX - swipeStartRef.current.x;
    const dy = e.changedTouches[0].clientY - swipeStartRef.current.y;
    swipeStartRef.current = null;

    if (Math.abs(dx) >= 72 && Math.abs(dx) > Math.abs(dy) * 1.7) {
      if (dx > 0) {
        onChangeDate(addDays(selectedDate, -1));
      } else {
        onChangeDate(addDays(selectedDate, 1));
      }
    }
  }

  const logs = dayLogs ?? [];
  const prevLogs = yesterdayLogs ?? [];

  const totals = useMemo(() => {
    return logs.reduce(
      (acc, entry) => ({
        kcal: acc.kcal + entry.kcal,
        proteinaG: acc.proteinaG + entry.proteinaG,
        carbohidratosG: acc.carbohidratosG + entry.carbohidratosG,
        grasasG: acc.grasasG + entry.grasasG,
      }),
      { kcal: 0, proteinaG: 0, carbohidratosG: 0, grasasG: 0 },
    );
  }, [logs]);

  const logsBySlot = useMemo(() => {
    const grouped: Record<MealSlot, MealLogEntry[]> = {
      desayuno: [],
      almuerzo: [],
      once_cena: [],
      snack: [],
    };
    for (const item of logs) {
      if (grouped[item.slot]) {
        grouped[item.slot].push(item);
      }
    }
    return grouped;
  }, [logs]);

  const prevLogsBySlot = useMemo(() => {
    const grouped: Record<MealSlot, MealLogEntry[]> = {
      desayuno: [],
      almuerzo: [],
      once_cena: [],
      snack: [],
    };
    for (const item of prevLogs) {
      if (grouped[item.slot]) {
        grouped[item.slot].push(item);
      }
    }
    return grouped;
  }, [prevLogs]);

  const linkedEditingFood = useMemo(() => {
    if (!editingEntry) return null;
    if (editingEntry.foodId !== undefined) {
      const byId = allFoods.find((f) => f.id === editingEntry.foodId);
      if (byId) return byId;
    }
    return allFoods.find((f) => f.nombre === editingEntry.nombre) ?? null;
  }, [editingEntry, allFoods]);

  const kcalRemaining = targets.caloriasObjetivo - Math.round(totals.kcal);
  const isOverCalories = kcalRemaining < 0;
  const kcalProgress =
    targets.caloriasObjetivo > 0 ? totals.kcal / targets.caloriasObjetivo : 0;

  const proteinPct =
    targets.proteinaG > 0
      ? Math.round((totals.proteinaG / targets.proteinaG) * 100)
      : 0;
  const proteinProgress =
    targets.proteinaG > 0 ? totals.proteinaG / targets.proteinaG : 0;

  const carbsPct =
    targets.carbohidratosG > 0
      ? Math.min(100, (totals.carbohidratosG / targets.carbohidratosG) * 100)
      : 0;
  const fatsPct =
    targets.grasasG > 0
      ? Math.min(100, (totals.grasasG / targets.grasasG) * 100)
      : 0;

  const carbsOver =
    targets.carbohidratosG > 0 && totals.carbohidratosG > targets.carbohidratosG * 1.1;
  const fatsOver =
    targets.grasasG > 0 && totals.grasasG > targets.grasasG * 1.1;

  const aguaMl = dailyMetric?.aguaMl ?? 0;
  const pasos = dailyMetric?.pasos ?? 0;
  const metaAguaMl = profile.metaAguaMl ?? 2500;
  const metaPasos = profile.metaPasos ?? 8000;
  const showHabits = profile.mostrarHabitosHoy !== false;

  const waterPct = Math.min(100, metaAguaMl > 0 ? (aguaMl / metaAguaMl) * 100 : 0);
  const stepsPct = Math.min(100, metaPasos > 0 ? (pasos / metaPasos) * 100 : 0);

  function extractIngredientsFromEntries(entries: MealLogEntry[]): ComboIngredient[] {
    const comboByName = new Map(allCombos.map((c) => [c.nombre, c]));
    const foodById = new Map(allFoods.map((f) => [f.id, f]));
    const result: ComboIngredient[] = [];

    for (const entry of entries) {
      const matchedCombo = comboByName.get(entry.nombre);
      if (matchedCombo && matchedCombo.ingredientes.length > 0) {
        result.push(...matchedCombo.ingredientes.map((i) => ({ ...i })));
      } else {
        const matchedFood = entry.foodId !== undefined ? foodById.get(entry.foodId) : undefined;
        result.push({
          foodId: matchedFood?.id ?? entry.foodId,
          nombre: entry.nombre,
          cantidad: entry.cantidadNum ?? matchedFood?.porcionReferencia ?? 1,
          unidad: entry.unidad ?? matchedFood?.unidadBase ?? 'unidad',
          kcal: entry.kcal,
          proteinaG: entry.proteinaG,
          carbohidratosG: entry.carbohidratosG,
          grasasG: entry.grasasG,
        });
      }
    }
    return result;
  }

  function openSaveSlotAsMenu(slot: MealSlot, slotItems: MealLogEntry[]) {
    if (slotItems.length === 0) return;
    const slotKcal = Math.round(slotItems.reduce((s, e) => s + e.kcal, 0));
    const slotProt = Number(slotItems.reduce((s, e) => s + e.proteinaG, 0).toFixed(1));
    const slotCarbs = Number(slotItems.reduce((s, e) => s + e.carbohidratosG, 0).toFixed(1));
    const slotFats = Number(slotItems.reduce((s, e) => s + e.grasasG, 0).toFixed(1));
    const defaultName =
      slotItems.length === 1
        ? `${MEAL_SLOT_LABELS[slot]} · ${slotItems[0].nombre}`
        : `${MEAL_SLOT_LABELS[slot]} · ${slotItems.slice(0, 2).map((i) => i.nombre).join(' + ')}`;

    setSaveModalMode({
      kind: 'slot-to-combo',
      slot,
      defaultName,
      summaryText: slotItems.map((i) => `${i.nombre} (${i.cantidadTexto})`).join(' · '),
      totalKcal: slotKcal,
      totalProtG: slotProt,
      totalCarbsG: slotCarbs,
      totalFatsG: slotFats,
      onSubmit: async (nombre) => {
        const ingredientes = extractIngredientsFromEntries(slotItems);
        await db.combos.add({
          nombre,
          slotSugerido: slot,
          ingredientes,
          totalKcal: slotKcal,
          totalProteinaG: slotProt,
          totalCarbsG: slotCarbs,
          totalGrasasG: slotFats,
        });
        onNotify(`Menú "${nombre}" guardado en Menús y Registrar.`);
      },
    });
  }

  function openSaveDayAsTemplate() {
    if (logs.length === 0) return;
    setSaveModalMode({
      kind: 'day-to-template',
      defaultName: `Día ${formatHeaderDate(selectedDate, todayKey)}`,
      entriesCount: logs.length,
      totalKcal: Math.round(totals.kcal),
      totalProtG: Number(totals.proteinaG.toFixed(1)),
      totalCarbsG: Number(totals.carbohidratosG.toFixed(1)),
      totalFatsG: Number(totals.grasasG.toFixed(1)),
      onSubmit: async (nombre, descripcion) => {
        const entries = logs.map((l) => ({
          slot: l.slot,
          nombre: l.nombre,
          cantidadTexto: l.cantidadTexto,
          kcal: l.kcal,
          proteinaG: l.proteinaG,
          carbohidratosG: l.carbohidratosG,
          grasasG: l.grasasG,
          foodId: l.foodId,
          cantidadNum: l.cantidadNum,
          unidad: l.unidad,
          cookState: l.cookState,
          ingredientes: extractIngredientsFromEntries([l]),
        }));
        await db.dayTemplates.add({
          nombre,
          descripcion: descripcion || undefined,
          entries,
          totalKcal: Math.round(totals.kcal),
          totalProteinaG: Number(totals.proteinaG.toFixed(1)),
          totalCarbsG: Number(totals.carbohidratosG.toFixed(1)),
          totalGrasasG: Number(totals.grasasG.toFixed(1)),
          createdAt: Date.now(),
        });
        onNotify(`Día "${nombre}" guardado como plantilla.`);
      },
    });
  }

  return (
    <div
      className="flex flex-col pb-24"
      onTouchStart={handleDayTouchStart}
      onTouchEnd={handleDayTouchEnd}
    >
      {/* 1. Encabezado compacto */}
      <header className="sticky top-0 z-20 bg-surface border-b border-outline-variant px-page-margin py-gutter-sm">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-gutter-xs">
          <div className="flex items-center">
            {selectedDate !== todayKey ? (
              <button
                type="button"
                onClick={() => onChangeDate(todayKey)}
                className="min-h-[36px] px-gutter-sm rounded-full bg-surface-container border border-outline font-label text-label-sm text-primary hover:border-primary transition-colors"
              >
                Ir a hoy
              </button>
            ) : (
              <div
                className="inline-flex items-center gap-1.5 pl-0.5 select-none"
                aria-label="Samsara"
              >
                <SamsaraMark size={26} />
              </div>
            )}
          </div>

          <nav aria-label="Selector de fecha" className="flex items-center justify-center gap-gutter-xs">
            <button
              type="button"
              aria-label="Día anterior"
              onClick={() => onChangeDate(addDays(selectedDate, -1))}
              className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-transparent text-on-surface-variant transition-colors duration-100 hover:bg-surface-container-high hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-95"
            >
              <ChevronLeft className="w-5 h-5" aria-hidden="true" />
            </button>

            <span className="font-title text-title-md text-on-surface tabular-nums whitespace-nowrap px-gutter-xs">
              {formatHeaderDate(selectedDate, todayKey)}
            </span>

            <button
              type="button"
              aria-label="Día siguiente"
              onClick={() => onChangeDate(addDays(selectedDate, 1))}
              className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-transparent text-on-surface-variant transition-colors duration-100 hover:bg-surface-container-high hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-95"
            >
              <ChevronRight className="w-5 h-5" aria-hidden="true" />
            </button>
          </nav>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={onOpenQuickWeight}
              className="inline-flex items-center justify-center min-h-[44px] px-gutter-md py-gutter-sm rounded-full bg-surface-container border border-outline text-on-surface font-label text-label-md whitespace-nowrap transition-colors duration-100 hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-95"
            >
              + Peso
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col gap-section px-page-margin pt-gutter-lg">
        {/* 2 & 3. Tarjeta principal de resumen diario */}
        <section aria-label="Resumen diario de calorías y macros">
          <article className="bg-surface-container border border-outline rounded-lg p-gutter-xl flex flex-col gap-gutter-xl">
            <div className="grid grid-cols-2 gap-gutter-lg items-start">
              <MacroRing
                progress={kcalProgress}
                strokeClass={isOverCalories ? 'stroke-warning' : 'stroke-secondary'}
                centerPrimary={
                  isOverCalories
                    ? `+${formatKcal(Math.abs(kcalRemaining))}`
                    : formatKcal(kcalRemaining)
                }
                centerPrimaryClass={isOverCalories ? 'text-warning' : 'text-on-surface'}
                centerSecondary={isOverCalories ? 'kcal extra' : 'kcal restantes'}
                centerSecondaryClass={isOverCalories ? 'text-warning' : 'text-secondary'}
                title={isOverCalories ? 'Sobre objetivo' : 'Calorías restantes'}
                subtitle={`de ${formatKcal(targets.caloriasObjetivo)} kcal objetivo`}
                ariaLabel={`Calorías consumidas ${Math.round(totals.kcal)} de ${targets.caloriasObjetivo}`}
              />

              <MacroRing
                progress={proteinProgress}
                strokeClass="stroke-primary"
                centerPrimary={`${proteinPct}%`}
                centerPrimaryClass="text-primary"
                centerSecondary={`${Math.round(totals.proteinaG)} / ${targets.proteinaG} g`}
                centerSecondaryClass="text-on-surface-variant"
                title="Proteína"
                subtitle={`${Math.round(totals.proteinaG)} / ${targets.proteinaG} g (${proteinPct}%)`}
                subtitleClass="text-primary"
                ariaLabel={`Proteína consumida ${Math.round(totals.proteinaG)} de ${targets.proteinaG} gramos`}
              />
            </div>

            {/* Barras horizontales compactas: Carbohidratos y Grasas */}
            <div className="border-t border-outline-variant pt-gutter-lg flex flex-col gap-gutter-md">
              <div className="flex flex-col gap-gutter-xs">
                <div className="flex items-center justify-between gap-gutter-sm">
                  <span className="font-label text-label-md text-on-surface-variant">
                    Carbohidratos
                  </span>
                  <span
                    className={`font-label text-label-md tabular-nums ${
                      carbsOver ? 'text-warning' : 'text-on-surface'
                    }`}
                  >
                    {Math.round(totals.carbohidratosG)} / {targets.carbohidratosG} g
                  </span>
                </div>
                <div
                  className="w-full h-1.5 rounded-full bg-track overflow-hidden"
                  role="progressbar"
                  aria-label="Carbohidratos"
                  aria-valuenow={Math.round(totals.carbohidratosG)}
                  aria-valuemin={0}
                  aria-valuemax={targets.carbohidratosG}
                >
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      carbsOver ? 'bg-warning' : 'bg-on-surface-variant'
                    }`}
                    style={{ width: `${carbsPct}%` }}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-gutter-xs">
                <div className="flex items-center justify-between gap-gutter-sm">
                  <span className="font-label text-label-md text-on-surface-variant">Grasas</span>
                  <span
                    className={`font-label text-label-md tabular-nums ${
                      fatsOver ? 'text-warning' : 'text-on-surface'
                    }`}
                  >
                    {Math.round(totals.grasasG)} / {targets.grasasG} g
                  </span>
                </div>
                <div
                  className="w-full h-1.5 rounded-full bg-track overflow-hidden"
                  role="progressbar"
                  aria-label="Grasas"
                  aria-valuenow={Math.round(totals.grasasG)}
                  aria-valuemin={0}
                  aria-valuemax={targets.grasasG}
                >
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      fatsOver ? 'bg-warning' : 'bg-on-surface-variant'
                    }`}
                    style={{ width: `${fatsPct}%` }}
                  />
                </div>
              </div>
            </div>
          </article>
        </section>

        {/* Hidratación y pasos ultra-minimalistas (opcional) */}
        {showHabits && (
          <section aria-label="Hidratación y pasos diarios">
            <div className="grid grid-cols-2 gap-gutter-md">
              {/* Agua */}
              <article className="bg-surface-container border border-outline rounded-lg p-gutter-md flex flex-col gap-gutter-sm">
                <div className="flex items-center justify-between gap-gutter-xs">
                  <span className="inline-flex items-center gap-1.5 font-label text-label-md text-on-surface">
                    <Droplets className="w-4 h-4 text-secondary" aria-hidden="true" />
                    Agua
                  </span>
                  <span className="font-mono text-mono-sm text-secondary tabular-nums">
                    {(aguaMl / 1000).toFixed(2).replace(/\.?0+$/, '')} / {(metaAguaMl / 1000).toFixed(1)} L
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-track overflow-hidden">
                  <div
                    className="h-full rounded-full bg-secondary transition-all duration-300"
                    style={{ width: `${waterPct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between gap-gutter-xs pt-0.5">
                  <button
                    type="button"
                    aria-label="Restar 250 ml de agua"
                    disabled={aguaMl <= 0}
                    onClick={() =>
                      void onUpdateDailyMetric(selectedDate, {
                        aguaMl: Math.max(0, aguaMl - 250),
                      })
                    }
                    className="inline-flex items-center justify-center w-9 h-9 rounded-md bg-surface-container-high border border-outline text-on-surface-variant hover:text-on-surface disabled:opacity-30"
                  >
                    <Minus className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      void onUpdateDailyMetric(selectedDate, { aguaMl: aguaMl + 250 })
                    }
                    className="flex-1 min-h-[36px] px-gutter-sm rounded-md bg-surface-container-high border border-outline font-label text-label-sm text-on-surface hover:border-secondary hover:text-secondary transition-colors tabular-nums"
                  >
                    +250 ml
                  </button>
                </div>
              </article>

              {/* Pasos */}
              <article className="bg-surface-container border border-outline rounded-lg p-gutter-md flex flex-col gap-gutter-sm">
                <div className="flex items-center justify-between gap-gutter-xs">
                  <span className="inline-flex items-center gap-1.5 font-label text-label-md text-on-surface">
                    <Footprints className="w-4 h-4 text-primary" aria-hidden="true" />
                    Pasos
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setStepsDraft(String(pasos));
                      setEditingSteps((v) => !v);
                    }}
                    className="font-mono text-mono-sm text-primary tabular-nums hover:underline"
                    title="Tocar para ingresar pasos exactos"
                  >
                    {formatKcal(pasos)} / {formatKcal(metaPasos)}
                  </button>
                </div>
                <div className="w-full h-1.5 rounded-full bg-track overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${stepsPct}%` }}
                  />
                </div>
                {editingSteps ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const val = Math.max(0, Math.round(Number(stepsDraft) || 0));
                      void onUpdateDailyMetric(selectedDate, { pasos: val });
                      setEditingSteps(false);
                    }}
                    className="flex items-center gap-1 pt-0.5"
                  >
                    <input
                      type="number"
                      inputMode="numeric"
                      autoFocus
                      value={stepsDraft}
                      onChange={(e) => setStepsDraft(e.target.value)}
                      className="w-full min-h-[36px] px-2 rounded-md bg-surface-container-high border border-primary font-mono text-mono-sm text-on-surface tabular-nums focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="min-h-[36px] px-2.5 rounded-md bg-primary text-on-primary font-label text-label-sm"
                    >
                      OK
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center justify-between gap-gutter-xs pt-0.5">
                    <button
                      type="button"
                      aria-label="Restar 500 pasos"
                      disabled={pasos <= 0}
                      onClick={() =>
                        void onUpdateDailyMetric(selectedDate, {
                          pasos: Math.max(0, pasos - 500),
                        })
                      }
                      className="inline-flex items-center justify-center w-9 h-9 rounded-md bg-surface-container-high border border-outline text-on-surface-variant hover:text-on-surface disabled:opacity-30"
                    >
                      <Minus className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void onUpdateDailyMetric(selectedDate, { pasos: pasos + 1000 })
                      }
                      className="flex-1 min-h-[36px] px-gutter-sm rounded-md bg-surface-container-high border border-outline font-label text-label-sm text-on-surface hover:border-primary hover:text-primary transition-colors tabular-nums"
                    >
                      +1.000
                    </button>
                  </div>
                )}
              </article>
            </div>
          </section>
        )}

        {/* 4. Sección Comidas del día */}
        <section aria-labelledby="heading-comidas" className="flex flex-col gap-gutter-md">
          <div className="flex items-center justify-between gap-gutter-sm">
            <div>
              <h2 id="heading-comidas" className="font-headline text-headline-md text-on-surface">
                {selectedDate === todayKey ? 'Comidas de hoy' : 'Comidas del día'}
              </h2>
              <span className="font-body text-body-sm text-on-surface-variant tabular-nums">
                {formatKcal(totals.kcal)} kcal consumidas
              </span>
            </div>

            <div className="flex items-center gap-gutter-xs shrink-0">
              {logs.length > 0 && (
                <button
                  type="button"
                  onClick={openSaveDayAsTemplate}
                  className="inline-flex items-center gap-1 min-h-[38px] px-gutter-sm rounded-full bg-surface-container border border-outline text-on-surface-variant font-label text-label-sm hover:border-primary hover:text-primary transition-colors active:scale-95"
                >
                  <BookmarkPlus className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Guardar día</span>
                </button>
              )}
              {prevLogs.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    void onCopyMealsFromYesterday(prevLogs, 'todas las comidas de ayer')
                  }
                  className="inline-flex items-center gap-1 min-h-[38px] px-gutter-sm rounded-full bg-surface-container border border-outline text-on-surface-variant font-label text-label-sm hover:border-primary hover:text-primary transition-colors active:scale-95"
                >
                  <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Copiar ayer</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-gutter-md">
            {MEAL_SLOTS_ORDER.map((slot) => {
              const slotItems = logsBySlot[slot];
              const prevSlotItems = prevLogsBySlot[slot];
              const slotKcal = slotItems.reduce((sum, i) => sum + i.kcal, 0);

              if (slotItems.length === 0) {
                return (
                  <article
                    key={slot}
                    className="bg-surface-container border border-outline rounded-lg px-gutter-lg py-gutter-md flex items-center justify-between gap-gutter-sm"
                  >
                    <div className="flex flex-col gap-gutter-xs min-w-0">
                      <h3 className="font-title text-title-md text-on-surface">
                        {MEAL_SLOT_LABELS[slot]}
                      </h3>
                      <span className="font-body text-body-sm text-on-surface-variant">
                        Sin registros
                      </span>
                    </div>

                    <div className="flex items-center gap-gutter-xs shrink-0">
                      {prevSlotItems.length > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            void onCopyMealsFromYesterday(
                              prevSlotItems,
                              `${MEAL_SLOT_LABELS[slot].toLowerCase()} de ayer`,
                            )
                          }
                          aria-label={`Repetir ${MEAL_SLOT_LABELS[slot]} de ayer`}
                          className="inline-flex items-center gap-1 min-h-[40px] px-gutter-sm rounded-md bg-surface-container-high border border-outline text-on-surface-variant font-label text-label-sm hover:border-primary hover:text-primary transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Ayer</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onAddForSlot(slot)}
                        className="inline-flex items-center gap-1 min-h-[44px] px-gutter-md rounded-md bg-transparent text-on-surface-variant font-label text-label-md transition-colors duration-100 hover:bg-surface-container-high hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-95"
                      >
                        <Plus className="w-[18px] h-[18px]" aria-hidden="true" />
                        <span>Agregar</span>
                      </button>
                    </div>
                  </article>
                );
              }

              return (
                <article
                  key={slot}
                  className="bg-surface-container border border-outline rounded-lg p-gutter-lg flex flex-col gap-gutter-md"
                >
                  <header className="flex items-center justify-between gap-gutter-sm">
                    <h3 className="font-title text-title-md text-on-surface">
                      {MEAL_SLOT_LABELS[slot]}
                    </h3>
                    <span className="font-label text-label-md text-on-surface-variant tabular-nums">
                      {formatKcal(slotKcal)} kcal
                    </span>
                  </header>

                  <div className="flex flex-col gap-gutter-sm" data-no-day-swipe="true">
                    {slotItems.map((entry) => (
                      <SwipeableRow
                        key={entry.id}
                        onDelete={() => void onDeleteMeal(entry)}
                      >
                        <div className="flex items-center justify-between gap-gutter-sm p-gutter-md rounded-md bg-surface-container-high border border-outline-variant">
                          <button
                            type="button"
                            onClick={() => setEditingEntry(entry)}
                            className="flex-1 flex flex-col gap-gutter-xs min-w-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
                          >
                            <span className="font-body text-body-md text-on-surface truncate flex items-center gap-1.5">
                              <span className="truncate">{entry.nombre}</span>
                              <Pencil
                                className="w-3 h-3 text-on-surface-variant/60 shrink-0"
                                aria-hidden="true"
                              />
                            </span>
                            <div className="flex flex-wrap items-center gap-gutter-sm">
                              <span className="font-body text-body-sm text-on-surface-variant tabular-nums">
                                {entry.cantidadTexto}
                              </span>
                              <span
                                className="font-body text-body-sm text-on-surface-variant"
                                aria-hidden="true"
                              >
                                ·
                              </span>
                              <span className="font-body text-body-sm text-on-surface-variant tabular-nums">
                                {formatKcal(entry.kcal)} kcal
                              </span>
                              <span
                                className="font-body text-body-sm text-on-surface-variant"
                                aria-hidden="true"
                              >
                                ·
                              </span>
                              <span className="font-label text-label-md text-primary tabular-nums">
                                {formatMacroG(entry.proteinaG)} g prot
                              </span>
                            </div>
                          </button>

                          <button
                            type="button"
                            aria-label={`Eliminar ${entry.nombre}`}
                            onClick={() => void onDeleteMeal(entry)}
                            className="shrink-0 inline-flex items-center justify-center w-11 h-11 rounded-md bg-transparent text-on-surface-variant transition-colors duration-100 hover:bg-error-container hover:text-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error active:scale-95"
                          >
                            <Trash2 className="w-[18px] h-[18px]" aria-hidden="true" />
                          </button>
                        </div>
                      </SwipeableRow>
                    ))}
                  </div>

                  <footer className="pt-gutter-xs border-t border-outline-variant flex items-center justify-between gap-gutter-sm">
                    <button
                      type="button"
                      onClick={() => openSaveSlotAsMenu(slot, slotItems)}
                      className="inline-flex items-center gap-1.5 min-h-[44px] px-gutter-sm rounded-md bg-transparent text-on-surface-variant font-label text-label-sm transition-colors duration-100 hover:bg-surface-container-high hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-95"
                    >
                      <BookmarkPlus className="w-4 h-4" aria-hidden="true" />
                      <span>Guardar menú</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onAddForSlot(slot)}
                      className="inline-flex items-center gap-1 min-h-[44px] px-gutter-md rounded-md bg-transparent text-on-surface-variant font-label text-label-md transition-colors duration-100 hover:bg-surface-container-high hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-95"
                    >
                      <Plus className="w-[18px] h-[18px]" aria-hidden="true" />
                      <span>Agregar</span>
                    </button>
                  </footer>
                </article>
              );
            })}
          </div>
        </section>
      </main>

      <EditMealBottomSheet
        entry={editingEntry}
        linkedFood={linkedEditingFood}
        onClose={() => setEditingEntry(null)}
        onSave={onUpdateMeal}
        onDelete={onDeleteMeal}
      />

      <SaveTemplateModal
        mode={saveModalMode}
        onClose={() => setSaveModalMode(null)}
      />
    </div>
  );
}
