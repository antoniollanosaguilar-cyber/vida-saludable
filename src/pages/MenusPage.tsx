import { useMemo, useState } from 'react';
import {
  BookmarkPlus,
  CalendarCheck2,
  Check,
  ClipboardCopy,
  Copy,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  ShoppingCart,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import type {
  DailyTargets,
  DayMenuTemplate,
  MealCombo,
  MealLogEntry,
  MealSlot,
  WeekdayIndex,
  WeeklyPlanAssignment,
} from '../types/models';
import {
  buildWeeklyShoppingList,
  getMacroDistribution,
  getTodayWeekdayIndex,
  recommendMenusForRemaining,
  WEEKDAYS_META,
} from '../engine/menuEngine';
import { MacroSplitBar } from '../components/MacroSplitBar';
import { ComboDetailSheet } from '../components/ComboDetailSheet';
import { CreateFoodOrComboSheet } from '../components/CreateFoodOrComboSheet';
import { ConfirmModal } from '../components/ConfirmModal';
import {
  SaveTemplateModal,
  type SaveTemplateMode,
} from '../components/SaveTemplateModal';
import {
  formatHeaderDate,
  formatKcal,
  MEAL_SLOT_LABELS,
  MEAL_SLOTS_ORDER,
} from '../utils/formatters';

type MenusSubTab = 'combos' | 'days' | 'week';
type SlotFilter = 'todos' | MealSlot;

function getDefaultSlotByTime(): MealSlot {
  const hour = new Date().getHours();
  if (hour < 11) return 'desayuno';
  if (hour < 16) return 'almuerzo';
  if (hour < 19) return 'snack';
  return 'once_cena';
}

interface MenusPageProps {
  selectedDate: string;
  todayKey: string;
  targets: DailyTargets;
  onLogCombo: (
    combo: MealCombo,
    slot: MealSlot,
    override?: {
      scaleLabel?: string;
      kcal?: number;
      proteinaG?: number;
      carbohidratosG?: number;
      grasasG?: number;
    },
  ) => Promise<void>;
  onApplyDayTemplate: (template: DayMenuTemplate) => Promise<void>;
  onApplyWeeklyDayToDate: (
    assignments: WeeklyPlanAssignment[],
    dayLabel: string,
  ) => Promise<void>;
  onNotify: (text: string, tone?: 'success' | 'warning' | 'error' | 'info') => void;
}

export function MenusPage({
  selectedDate,
  todayKey,
  targets,
  onLogCombo,
  onApplyDayTemplate,
  onApplyWeeklyDayToDate,
  onNotify,
}: MenusPageProps) {
  const [subTab, setSubTab] = useState<MenusSubTab>('combos');
  const [slotFilter, setSlotFilter] = useState<SlotFilter>('todos');
  const [selectedWeekday, setSelectedWeekday] = useState<WeekdayIndex>(() =>
    getTodayWeekdayIndex(),
  );

  // Modals & sheets
  const [inspectCombo, setInspectCombo] = useState<{
    combo: MealCombo;
    initialScale?: number;
  } | null>(null);
  const [createSheetOpen, setCreateSheetOpen] = useState(false);
  const [editingCombo, setEditingCombo] = useState<MealCombo | null>(null);
  const [saveTemplateMode, setSaveTemplateMode] = useState<SaveTemplateMode | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<DayMenuTemplate | null>(null);
  const [assigningSlot, setAssigningSlot] = useState<MealSlot | null>(null);
  const [recentFlashKey, setRecentFlashKey] = useState<string | null>(null);

  const foods = useLiveQuery(() => db.foods.orderBy('nombre').toArray(), []) ?? [];
  const combos = useLiveQuery(() => db.combos.toArray(), []) ?? [];
  const dayTemplates = useLiveQuery(() => db.dayTemplates.toArray(), []) ?? [];
  const weeklyPlanDays = useLiveQuery(() => db.weeklyPlan.toArray(), []) ?? [];
  const shoppingChecks = useLiveQuery(() => db.shoppingChecks.toArray(), []) ?? [];
  const selectedDateLogs =
    useLiveQuery(
      () => db.mealLogs.where('fecha').equals(selectedDate).sortBy('createdAt'),
      [selectedDate],
    ) ?? [];

  const currentSlotByTime = getDefaultSlotByTime();

  const dayTotals = useMemo(() => {
    return selectedDateLogs.reduce(
      (acc, l) => ({
        kcal: acc.kcal + l.kcal,
        prot: acc.prot + l.proteinaG,
        carbs: acc.carbs + l.carbohidratosG,
        fats: acc.fats + l.grasasG,
      }),
      { kcal: 0, prot: 0, carbs: 0, fats: 0 },
    );
  }, [selectedDateLogs]);

  const remainingKcal = Math.round(targets.caloriasObjetivo - dayTotals.kcal);
  const remainingProtG = Math.round(targets.proteinaG - dayTotals.prot);

  const recommendations = useMemo(
    () =>
      recommendMenusForRemaining(
        combos,
        remainingKcal,
        remainingProtG,
        currentSlotByTime,
      ).slice(0, 3),
    [combos, remainingKcal, remainingProtG, currentSlotByTime],
  );

  const sortedFilteredCombos = useMemo(() => {
    const list =
      slotFilter === 'todos'
        ? [...combos]
        : combos.filter((c) => c.slotSugerido === slotFilter);

    // Prioriza el horario actual arriba cuando se muestran todos
    if (slotFilter === 'todos') {
      list.sort((a, b) => {
        const aMatch = a.slotSugerido === currentSlotByTime ? 0 : 1;
        const bMatch = b.slotSugerido === currentSlotByTime ? 0 : 1;
        if (aMatch !== bMatch) return aMatch - bMatch;
        return a.nombre.localeCompare(b.nombre, 'es');
      });
    }
    return list;
  }, [combos, slotFilter, currentSlotByTime]);

  const weeklyPlanMap = useMemo(() => {
    const map = new Map<WeekdayIndex, WeeklyPlanAssignment[]>();
    for (const d of weeklyPlanDays) {
      map.set(d.dayOfWeek, d.assignments);
    }
    return map;
  }, [weeklyPlanDays]);

  const selectedDayAssignments = weeklyPlanMap.get(selectedWeekday) ?? [];
  const selectedDayTotals = useMemo(() => {
    return selectedDayAssignments.reduce(
      (acc, a) => ({
        kcal: acc.kcal + a.kcal,
        prot: Number((acc.prot + a.proteinaG).toFixed(1)),
        carbs: Number((acc.carbs + a.carbohidratosG).toFixed(1)),
        fats: Number((acc.fats + a.grasasG).toFixed(1)),
      }),
      { kcal: 0, prot: 0, carbs: 0, fats: 0 },
    );
  }, [selectedDayAssignments]);

  const shoppingGroups = useMemo(
    () => buildWeeklyShoppingList(weeklyPlanDays, combos, foods),
    [weeklyPlanDays, combos, foods],
  );

  const checkedMap = useMemo(() => {
    const m = new Map<string, boolean>();
    for (const c of shoppingChecks) {
      if (c.checked) m.set(c.key, true);
    }
    return m;
  }, [shoppingChecks]);

  const shoppingStats = useMemo(() => {
    let total = 0;
    let checked = 0;
    for (const g of shoppingGroups) {
      for (const i of g.items) {
        total += 1;
        if (checkedMap.get(i.key)) checked += 1;
      }
    }
    return { total, checked };
  }, [shoppingGroups, checkedMap]);

  function flash(key: string) {
    setRecentFlashKey(key);
    window.setTimeout(() => {
      setRecentFlashKey((curr) => (curr === key ? null : curr));
    }, 850);
  }

  async function handleDuplicateCombo(combo: MealCombo) {
    await db.combos.add({
      nombre: `${combo.nombre} (copia)`,
      slotSugerido: combo.slotSugerido,
      ingredientes: combo.ingredientes.map((i) => ({ ...i })),
      totalKcal: combo.totalKcal,
      totalProteinaG: combo.totalProteinaG,
      totalCarbsG: combo.totalCarbsG,
      totalGrasasG: combo.totalGrasasG,
    });
    onNotify(`Duplicado: "${combo.nombre} (copia)"`);
  }

  async function handleDuplicateTemplate(tpl: DayMenuTemplate) {
    await db.dayTemplates.add({
      nombre: `${tpl.nombre} (copia)`,
      descripcion: tpl.descripcion,
      entries: tpl.entries.map((e) => ({ ...e })),
      totalKcal: tpl.totalKcal,
      totalProteinaG: tpl.totalProteinaG,
      totalCarbsG: tpl.totalCarbsG,
      totalGrasasG: tpl.totalGrasasG,
      createdAt: Date.now(),
    });
    onNotify(`Plantilla duplicada: "${tpl.nombre} (copia)"`);
  }

  async function handleAssignComboToWeekday(combo: MealCombo, slot: MealSlot) {
    const current = weeklyPlanMap.get(selectedWeekday) ?? [];
    const nextAssignment: WeeklyPlanAssignment = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      slot,
      comboId: combo.id,
      nombre: combo.nombre,
      kcal: combo.totalKcal,
      proteinaG: combo.totalProteinaG,
      carbohidratosG: combo.totalCarbsG,
      grasasG: combo.totalGrasasG,
      ingredientes: combo.ingredientes,
    };
    await db.weeklyPlan.put({
      dayOfWeek: selectedWeekday,
      assignments: [...current, nextAssignment],
    });
    setAssigningSlot(null);
    onNotify(`"${combo.nombre}" asignado a ${WEEKDAYS_META[selectedWeekday].label}`);
  }

  async function handleApplyTemplateToWeekday(tpl: DayMenuTemplate) {
    const mapped: WeeklyPlanAssignment[] = tpl.entries.map((e, idx) => ({
      id: `${Date.now()}-${idx}`,
      slot: e.slot,
      nombre: e.nombre,
      kcal: e.kcal,
      proteinaG: e.proteinaG,
      carbohidratosG: e.carbohidratosG,
      grasasG: e.grasasG,
      ingredientes: e.ingredientes ?? [
        {
          foodId: e.foodId,
          nombre: e.nombre,
          cantidad: e.cantidadNum ?? 1,
          unidad: e.unidad ?? 'unidad',
          kcal: e.kcal,
          proteinaG: e.proteinaG,
          carbohidratosG: e.carbohidratosG,
          grasasG: e.grasasG,
        },
      ],
    }));
    await db.weeklyPlan.put({
      dayOfWeek: selectedWeekday,
      assignments: mapped,
    });
    onNotify(`Plantilla "${tpl.nombre}" aplicada a ${WEEKDAYS_META[selectedWeekday].label}`);
  }

  async function handleRemoveAssignment(assignmentId: string) {
    const current = weeklyPlanMap.get(selectedWeekday) ?? [];
    await db.weeklyPlan.put({
      dayOfWeek: selectedWeekday,
      assignments: current.filter((a) => a.id !== assignmentId),
    });
  }

  async function handleToggleShoppingCheck(key: string) {
    const next = !checkedMap.get(key);
    await db.shoppingChecks.put({ key, checked: next });
  }

  async function handleClearShoppingChecks() {
    await db.shoppingChecks.clear();
    onNotify('Marcas de lista de compras reiniciadas.', 'info');
  }

  async function handleCopyShoppingList() {
    if (shoppingGroups.length === 0) return;
    const lines: string[] = ['Lista de compras semanal — Samsara', ''];
    for (const group of shoppingGroups) {
      lines.push(`• ${group.label}:`);
      for (const item of group.items) {
        const mark = checkedMap.get(item.key) ? '[x]' : '[ ]';
        lines.push(`  ${mark} ${item.nombre}: ${item.formattedCantidad}`);
      }
      lines.push('');
    }
    try {
      await navigator.clipboard.writeText(lines.join('\n').trim());
      onNotify('Lista de compras copiada al portapapeles.');
    } catch {
      onNotify('No se pudo copiar automáticamente en este navegador.', 'warning');
    }
  }

  function openSaveCurrentDayModal() {
    if (selectedDateLogs.length === 0) {
      onNotify('Registra al menos una comida en el día para guardarlo como plantilla.', 'info');
      return;
    }

    const foodById = new Map(foods.map((f) => [f.id, f]));
    const comboByName = new Map(combos.map((c) => [c.nombre, c]));

    setSaveTemplateMode({
      kind: 'day-to-template',
      defaultName: `Plan ${formatHeaderDate(selectedDate, todayKey)}`,
      entriesCount: selectedDateLogs.length,
      totalKcal: Math.round(dayTotals.kcal),
      totalProtG: Number(dayTotals.prot.toFixed(1)),
      totalCarbsG: Number(dayTotals.carbs.toFixed(1)),
      totalFatsG: Number(dayTotals.fats.toFixed(1)),
      onSubmit: async (nombre, descripcion) => {
        const entries = selectedDateLogs.map((l: MealLogEntry) => {
          const matchedCombo = comboByName.get(l.nombre);
          const matchedFood = l.foodId !== undefined ? foodById.get(l.foodId) : undefined;
          return {
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
            ingredientes:
              matchedCombo?.ingredientes ??
              (matchedFood
                ? [
                    {
                      foodId: matchedFood.id,
                      nombre: matchedFood.nombre,
                      cantidad: l.cantidadNum ?? matchedFood.porcionReferencia,
                      unidad: matchedFood.unidadBase,
                      kcal: l.kcal,
                      proteinaG: l.proteinaG,
                      carbohidratosG: l.carbohidratosG,
                      grasasG: l.grasasG,
                    },
                  ]
                : undefined),
          };
        });

        await db.dayTemplates.add({
          nombre,
          descripcion: descripcion || undefined,
          entries,
          totalKcal: Math.round(dayTotals.kcal),
          totalProteinaG: Number(dayTotals.prot.toFixed(1)),
          totalCarbsG: Number(dayTotals.carbs.toFixed(1)),
          totalGrasasG: Number(dayTotals.fats.toFixed(1)),
          createdAt: Date.now(),
        });
        onNotify(`Plantilla de día "${nombre}" guardada.`);
      },
    });
  }

  return (
    <div className="flex flex-col pb-24">
      {/* Header sticky con sub-tabs */}
      <header className="sticky top-0 z-20 bg-surface border-b border-outline-variant px-page-margin py-gutter-md flex flex-col gap-gutter-md">
        <div className="flex items-center justify-between gap-gutter-sm">
          <div>
            <h1 className="font-headline text-headline-md text-on-surface">Menús</h1>
            <p className="font-body text-body-sm text-on-surface-variant">
              Plantillas, sugerencias y plan semanal · {formatHeaderDate(selectedDate, todayKey)}
            </p>
          </div>
        </div>

        <div
          role="tablist"
          aria-label="Secciones de menús"
          className="grid grid-cols-3 gap-gutter-xs p-1 rounded-md bg-surface-container border border-outline"
        >
          {(
            [
              { id: 'combos', label: 'Mis menús' },
              { id: 'days', label: 'Días' },
              { id: 'week', label: 'Semana' },
            ] as { id: MenusSubTab; label: string }[]
          ).map((tab) => {
            const active = subTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                type="button"
                aria-selected={active}
                onClick={() => setSubTab(tab.id)}
                className={`min-h-[38px] rounded-sm font-label text-label-md transition-colors ${
                  active
                    ? 'bg-primary-container border border-primary text-on-primary-container'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </header>

      <main className="flex-1 flex flex-col gap-section px-page-margin pt-gutter-lg">
        {/* ================= SUB-TAB 1: MIS MENÚS ================= */}
        {subTab === 'combos' && (
          <>
            {/* Recomendador inteligente "¿Qué encaja hoy?" */}
            {recommendations.length > 0 && (
              <section aria-labelledby="heading-encaja" className="flex flex-col gap-gutter-md">
                <article className="bg-surface-container border border-outline rounded-lg p-gutter-lg flex flex-col gap-gutter-md">
                  <header className="flex items-start justify-between gap-gutter-sm">
                    <div className="flex items-center gap-gutter-sm">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-primary-container text-primary shrink-0">
                        <Sparkles className="w-4 h-4" aria-hidden="true" />
                      </span>
                      <div>
                        <h2 id="heading-encaja" className="font-title text-title-md text-on-surface">
                          ¿Qué encaja hoy?
                        </h2>
                        <p className="font-body text-body-sm text-on-surface-variant tabular-nums">
                          {remainingKcal > 0
                            ? `Te faltan ${formatKcal(remainingKcal)} kcal y ${Math.max(0, remainingProtG)} g de proteína`
                            : `Meta calórica alcanzada · Faltan ${Math.max(0, remainingProtG)} g P`}
                        </p>
                      </div>
                    </div>
                  </header>

                  <div className="flex flex-col gap-gutter-sm">
                    {recommendations.map((rec) => {
                      const badgeCls =
                        rec.badgeTone === 'emerald'
                          ? 'bg-primary-container border-primary/60 text-on-primary-container'
                          : rec.badgeTone === 'cyan'
                            ? 'bg-secondary-container border-secondary/60 text-on-secondary-container'
                            : 'bg-surface-container-high border-outline text-on-surface-variant';
                      const flashed = recentFlashKey === `rec-${rec.combo.id}`;

                      return (
                        <div
                          key={rec.combo.id}
                          className="flex items-center justify-between gap-gutter-sm p-gutter-md rounded-md bg-surface-container-high border border-outline-variant"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setInspectCombo({
                                combo: rec.combo,
                                initialScale: rec.suggestedScale,
                              })
                            }
                            className="flex-1 min-w-0 text-left flex flex-col gap-1"
                          >
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-label text-label-md text-on-surface truncate">
                                {rec.combo.nombre}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full border font-label text-[10px] ${badgeCls}`}
                              >
                                {rec.badgeText}
                              </span>
                            </div>
                            <span className="font-body text-body-sm text-on-surface-variant tabular-nums">
                              {formatKcal(rec.scaledKcal)} kcal ·{' '}
                              <span className="text-primary font-semibold">
                                {Math.round(rec.scaledProtG)} g P
                              </span>{' '}
                              · {MEAL_SLOT_LABELS[rec.combo.slotSugerido]}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={async () => {
                              await onLogCombo(rec.combo, rec.combo.slotSugerido, {
                                scaleLabel:
                                  rec.suggestedScale !== 1
                                    ? `Menú ${rec.suggestedScale}× (${rec.combo.ingredientes.length} ing.)`
                                    : undefined,
                                kcal: rec.scaledKcal,
                                proteinaG: rec.scaledProtG,
                                carbohidratosG: rec.scaledCarbsG,
                                grasasG: rec.scaledFatsG,
                              });
                              flash(`rec-${rec.combo.id}`);
                            }}
                            aria-label={`Agregar ${rec.combo.nombre}`}
                            className={`shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full border transition-colors active:scale-95 ${
                              flashed
                                ? 'bg-primary-container border-primary text-on-primary-container'
                                : 'bg-surface-container border-outline text-on-surface hover:border-primary hover:text-primary'
                            }`}
                          >
                            {flashed ? (
                              <Check className="w-4 h-4" aria-hidden="true" />
                            ) : (
                              <Plus className="w-4 h-4" aria-hidden="true" />
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </article>
              </section>
            )}

            {/* Filtros por horario */}
            <section aria-labelledby="heading-mis-menus" className="flex flex-col gap-gutter-md">
              <div className="flex items-center justify-between gap-gutter-sm">
                <h2 id="heading-mis-menus" className="font-headline text-headline-md text-on-surface">
                  Todos mis menús
                </h2>
                <span className="font-body text-body-sm text-on-surface-variant tabular-nums">
                  {sortedFilteredCombos.length}
                </span>
              </div>

              <div
                role="group"
                aria-label="Filtrar menús por horario"
                className="flex items-center gap-gutter-sm overflow-x-auto no-scrollbar"
              >
                {(['todos', ...MEAL_SLOTS_ORDER] as SlotFilter[]).map((slot) => {
                  const active = slotFilter === slot;
                  return (
                    <button
                      key={slot}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setSlotFilter(slot)}
                      className={`shrink-0 min-h-[36px] px-gutter-md rounded-full font-label text-label-md transition-colors ${
                        active
                          ? 'bg-primary-container border border-primary text-on-primary-container'
                          : 'bg-surface-container border border-outline text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      {slot === 'todos' ? 'Todos' : MEAL_SLOT_LABELS[slot]}
                    </button>
                  );
                })}
              </div>

              {sortedFilteredCombos.length === 0 ? (
                <div className="bg-surface-container border border-outline rounded-lg p-gutter-xl text-center">
                  <p className="font-body text-body-md text-on-surface-variant">
                    Aún no tienes menús en este horario.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-gutter-md">
                  {sortedFilteredCombos.map((combo) => {
                    const dist = getMacroDistribution(
                      combo.totalProteinaG,
                      combo.totalCarbsG,
                      combo.totalGrasasG,
                    );
                    const flashed = recentFlashKey === `menu-${combo.id}`;

                    return (
                      <article
                        key={combo.id}
                        className="bg-surface-container border border-outline rounded-lg p-gutter-lg flex flex-col gap-gutter-md"
                      >
                        <div className="flex items-start justify-between gap-gutter-sm">
                          <button
                            type="button"
                            onClick={() => setInspectCombo({ combo })}
                            className="flex-1 min-w-0 text-left flex flex-col gap-1"
                          >
                            <div className="flex items-center gap-gutter-xs flex-wrap">
                              <h3 className="font-title text-title-md text-on-surface">
                                {combo.nombre}
                              </h3>
                              {dist.isHighProtein && (
                                <span className="px-2 py-0.5 rounded-full bg-primary-container border border-primary/50 font-label text-[10px] text-on-primary-container">
                                  Alto en P
                                </span>
                              )}
                            </div>

                            <span className="font-label text-label-sm text-on-surface-variant">
                              {MEAL_SLOT_LABELS[combo.slotSugerido]} · {combo.ingredientes.length}{' '}
                              {combo.ingredientes.length === 1 ? 'ingrediente' : 'ingredientes'}
                            </span>

                            <p className="font-body text-body-sm text-on-surface-variant truncate">
                              {combo.ingredientes.map((i) => i.nombre).join(' + ')}
                            </p>
                          </button>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => void handleDuplicateCombo(combo)}
                              aria-label={`Duplicar ${combo.nombre}`}
                              title="Duplicar menú"
                              className="inline-flex items-center justify-center w-9 h-9 rounded-md text-on-surface-variant hover:bg-surface-container-high hover:text-primary transition-colors"
                            >
                              <Copy className="w-4 h-4" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCombo(combo);
                                setCreateSheetOpen(true);
                              }}
                              aria-label={`Editar ${combo.nombre}`}
                              title="Editar menú"
                              className="inline-flex items-center justify-center w-9 h-9 rounded-md text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
                            >
                              <Pencil className="w-4 h-4" aria-hidden="true" />
                            </button>
                          </div>
                        </div>

                        <MacroSplitBar
                          proteinaG={combo.totalProteinaG}
                          carbohidratosG={combo.totalCarbsG}
                          grasasG={combo.totalGrasasG}
                        />

                        <div className="flex items-center justify-between gap-gutter-sm">
                          <button
                            type="button"
                            onClick={() => setInspectCombo({ combo })}
                            className="flex flex-wrap items-center gap-gutter-xs font-label text-label-md tabular-nums"
                          >
                            <span className="text-secondary">
                              {formatKcal(combo.totalKcal)} kcal
                            </span>
                            <span className="text-on-surface-variant">·</span>
                            <span className="text-primary">
                              {Math.round(combo.totalProteinaG)} g P
                            </span>
                            <span className="font-body text-body-sm text-on-surface-variant">
                              · {Math.round(combo.totalCarbsG)} C · {Math.round(combo.totalGrasasG)} G
                            </span>
                          </button>

                          <div className="flex items-center gap-gutter-xs shrink-0">
                            <button
                              type="button"
                              onClick={() => setInspectCombo({ combo })}
                              className="min-h-[38px] px-gutter-sm rounded-md bg-surface-container-high border border-outline font-label text-label-sm text-on-surface-variant hover:border-primary hover:text-on-surface transition-colors"
                            >
                              Ajustar
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                await onLogCombo(combo, combo.slotSugerido);
                                flash(`menu-${combo.id}`);
                              }}
                              aria-label={`Agregar ${combo.nombre} en 1 toque`}
                              className={`inline-flex items-center justify-center w-10 h-10 rounded-full border transition-colors active:scale-95 ${
                                flashed
                                  ? 'bg-primary-container border-primary text-on-primary-container'
                                  : 'bg-primary text-on-primary border-primary hover:bg-on-primary-container'
                              }`}
                            >
                              {flashed ? (
                                <Check className="w-5 h-5" aria-hidden="true" />
                              ) : (
                                <Plus className="w-5 h-5" aria-hidden="true" />
                              )}
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setEditingCombo(null);
                  setCreateSheetOpen(true);
                }}
                className="w-full min-h-[48px] px-gutter-lg rounded-md bg-surface-container border border-outline text-on-surface font-label text-label-lg hover:border-primary hover:text-primary transition-colors"
              >
                + Crear nuevo menú
              </button>
            </section>
          </>
        )}

        {/* ================= SUB-TAB 2: PLANTILLAS DE DÍA COMPLETO ================= */}
        {subTab === 'days' && (
          <section aria-labelledby="heading-plantillas-dia" className="flex flex-col gap-gutter-md">
            <div className="flex items-center justify-between gap-gutter-sm">
              <h2 id="heading-plantillas-dia" className="font-headline text-headline-md text-on-surface">
                Menús de día completo
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-gutter-sm">
              <button
                type="button"
                onClick={openSaveCurrentDayModal}
                className="min-h-[44px] px-gutter-md rounded-md bg-surface-container border border-outline font-label text-label-md text-on-surface inline-flex items-center justify-center gap-1.5 hover:border-primary hover:text-primary transition-colors"
              >
                <BookmarkPlus className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Guardar día actual</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setSaveTemplateMode({
                    kind: 'build-day-template',
                    combos,
                    onSubmit: async (tpl) => {
                      await db.dayTemplates.add(tpl);
                      onNotify(`Plantilla "${tpl.nombre}" creada.`);
                    },
                  })
                }
                className="min-h-[44px] px-gutter-md rounded-md bg-primary-container border border-primary font-label text-label-md text-on-primary-container inline-flex items-center justify-center gap-1.5 hover:bg-primary hover:text-on-primary transition-colors"
              >
                <Plus className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Armar día</span>
              </button>
            </div>

            {dayTemplates.length === 0 ? (
              <div className="bg-surface-container border border-outline rounded-lg p-gutter-xl text-center flex flex-col gap-gutter-xs">
                <p className="font-body text-body-md text-on-surface-variant">
                  Aún no tienes plantillas de día completo.
                </p>
                <p className="font-body text-body-sm text-on-surface-variant">
                  Guarda tu día actual o arma una plantilla combinando tus menús para aplicarla en 1 toque.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-gutter-md">
                {dayTemplates.map((tpl) => {
                  const dist = getMacroDistribution(
                    tpl.totalProteinaG,
                    tpl.totalCarbsG,
                    tpl.totalGrasasG,
                  );

                  return (
                    <article
                      key={tpl.id}
                      className="bg-surface-container border border-outline rounded-lg p-gutter-lg flex flex-col gap-gutter-md"
                    >
                      <header className="flex items-start justify-between gap-gutter-sm">
                        <div className="min-w-0">
                          <div className="flex items-center gap-gutter-xs flex-wrap">
                            <h3 className="font-title text-title-md text-on-surface">
                              {tpl.nombre}
                            </h3>
                            {dist.isHighProtein && (
                              <span className="px-2 py-0.5 rounded-full bg-primary-container border border-primary/50 font-label text-[10px] text-on-primary-container">
                                Alto en P
                              </span>
                            )}
                          </div>
                          {tpl.descripcion && (
                            <p className="font-body text-body-sm text-on-surface-variant">
                              {tpl.descripcion}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => void handleDuplicateTemplate(tpl)}
                            aria-label={`Duplicar plantilla ${tpl.nombre}`}
                            className="inline-flex items-center justify-center w-9 h-9 rounded-md text-on-surface-variant hover:bg-surface-container-high hover:text-primary"
                          >
                            <Copy className="w-4 h-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setSaveTemplateMode({
                                kind: 'build-day-template',
                                combos,
                                editingTemplate: tpl,
                                onSubmit: async (updated, existingId) => {
                                  if (existingId !== undefined) {
                                    await db.dayTemplates.update(existingId, updated);
                                    onNotify(`Plantilla "${updated.nombre}" actualizada.`);
                                  }
                                },
                              })
                            }
                            aria-label={`Editar plantilla ${tpl.nombre}`}
                            className="inline-flex items-center justify-center w-9 h-9 rounded-md text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                          >
                            <Pencil className="w-4 h-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setTemplateToDelete(tpl)}
                            aria-label={`Eliminar plantilla ${tpl.nombre}`}
                            className="inline-flex items-center justify-center w-9 h-9 rounded-md text-on-surface-variant hover:bg-error-container hover:text-error"
                          >
                            <Trash2 className="w-4 h-4" aria-hidden="true" />
                          </button>
                        </div>
                      </header>

                      <div className="flex flex-wrap items-center gap-gutter-xs font-label text-label-md tabular-nums">
                        <span className="text-secondary">{formatKcal(tpl.totalKcal)} kcal</span>
                        <span className="text-on-surface-variant">·</span>
                        <span className="text-primary">{Math.round(tpl.totalProteinaG)} g P</span>
                        <span className="font-body text-body-sm text-on-surface-variant">
                          · {Math.round(tpl.totalCarbsG)} g C · {Math.round(tpl.totalGrasasG)} g G
                        </span>
                      </div>

                      <MacroSplitBar
                        proteinaG={tpl.totalProteinaG}
                        carbohidratosG={tpl.totalCarbsG}
                        grasasG={tpl.totalGrasasG}
                      />

                      <div className="bg-surface-container-high border border-outline-variant rounded-md divide-y divide-outline-variant">
                        {tpl.entries.map((entry, idx) => (
                          <div
                            key={`${entry.nombre}-${idx}`}
                            className="flex items-center justify-between gap-gutter-sm px-gutter-md py-gutter-sm"
                          >
                            <div className="min-w-0">
                              <span className="font-label text-[11px] text-primary mr-1.5">
                                {MEAL_SLOT_LABELS[entry.slot]}
                              </span>
                              <span className="font-body text-body-sm text-on-surface">
                                {entry.nombre}
                              </span>
                            </div>
                            <span className="font-body text-body-sm text-on-surface-variant tabular-nums shrink-0">
                              {formatKcal(entry.kcal)} kcal
                            </span>
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => void onApplyDayTemplate(tpl)}
                        className="w-full min-h-[44px] px-gutter-md rounded-md bg-primary text-on-primary font-label text-label-md inline-flex items-center justify-center gap-1.5 hover:bg-on-primary-container transition-colors active:scale-[0.99]"
                      >
                        <Play className="w-4 h-4" aria-hidden="true" />
                        <span>Cargar en {formatHeaderDate(selectedDate, todayKey)}</span>
                      </button>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ================= SUB-TAB 3: PLANIFICADOR SEMANAL + LISTA DE COMPRAS ================= */}
        {subTab === 'week' && (
          <>
            {/* Planificador semanal */}
            <section aria-labelledby="heading-plan-semanal" className="flex flex-col gap-gutter-md">
              <div className="flex items-center justify-between gap-gutter-sm">
                <h2 id="heading-plan-semanal" className="font-headline text-headline-md text-on-surface">
                  Planificador semanal
                </h2>
                <span className="font-body text-body-sm text-on-surface-variant">
                  {WEEKDAYS_META[selectedWeekday].label}
                </span>
              </div>

              {/* Barra L M X J V S D */}
              <div
                role="tablist"
                aria-label="Días de la semana"
                className="grid grid-cols-7 gap-gutter-xs"
              >
                {WEEKDAYS_META.map((wd) => {
                  const active = selectedWeekday === wd.index;
                  const items = weeklyPlanMap.get(wd.index) ?? [];
                  const dayKcal = items.reduce((s, a) => s + a.kcal, 0);

                  return (
                    <button
                      key={wd.index}
                      role="tab"
                      type="button"
                      aria-selected={active}
                      onClick={() => {
                        setSelectedWeekday(wd.index);
                        setAssigningSlot(null);
                      }}
                      className={`min-h-[56px] rounded-md border flex flex-col items-center justify-center gap-0.5 transition-colors ${
                        active
                          ? 'bg-primary-container border-primary text-on-primary-container'
                          : items.length > 0
                            ? 'bg-surface-container border-outline text-on-surface hover:border-primary'
                            : 'bg-surface-container border-outline-variant text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      <span className="font-title text-body-md">{wd.short}</span>
                      <span className="font-mono text-[10px] tabular-nums">
                        {dayKcal > 0 ? `${(dayKcal / 1000).toFixed(1)}k` : '·'}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Tarjeta del día seleccionado */}
              <article className="bg-surface-container border border-outline rounded-lg p-gutter-lg flex flex-col gap-gutter-md">
                <header className="flex flex-wrap items-center justify-between gap-gutter-sm">
                  <div>
                    <h3 className="font-title text-title-md text-on-surface">
                      {WEEKDAYS_META[selectedWeekday].label}
                    </h3>
                    <p className="font-body text-body-sm text-on-surface-variant tabular-nums">
                      {formatKcal(selectedDayTotals.kcal)} / {formatKcal(targets.caloriasObjetivo)} kcal ·{' '}
                      <span className="text-primary font-semibold">
                        {Math.round(selectedDayTotals.prot)} / {targets.proteinaG} g P
                      </span>
                    </p>
                  </div>

                  {selectedDayAssignments.length > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        void onApplyWeeklyDayToDate(
                          selectedDayAssignments,
                          WEEKDAYS_META[selectedWeekday].label,
                        )
                      }
                      className="inline-flex items-center gap-1 min-h-[38px] px-gutter-md rounded-md bg-primary text-on-primary font-label text-label-sm hover:bg-on-primary-container transition-colors"
                    >
                      <CalendarCheck2 className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Cargar hoy</span>
                    </button>
                  )}
                </header>

                {/* Aplicar plantilla completa al día de la semana */}
                {dayTemplates.length > 0 && (
                  <div className="flex items-center gap-gutter-xs overflow-x-auto no-scrollbar">
                    <span className="font-label text-label-sm text-on-surface-variant shrink-0">
                      Aplicar día:
                    </span>
                    {dayTemplates.map((tpl) => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => void handleApplyTemplateToWeekday(tpl)}
                        className="shrink-0 min-h-[32px] px-gutter-sm rounded-full bg-surface-container-high border border-outline font-label text-label-sm text-on-surface hover:border-primary hover:text-primary transition-colors"
                      >
                        {tpl.nombre}
                      </button>
                    ))}
                  </div>
                )}

                {/* Slots del día */}
                <div className="flex flex-col gap-gutter-sm">
                  {MEAL_SLOTS_ORDER.map((slot) => {
                    const slotItems = selectedDayAssignments.filter((a) => a.slot === slot);
                    const isPicking = assigningSlot === slot;

                    return (
                      <div
                        key={slot}
                        className="bg-surface-container-high border border-outline-variant rounded-md p-gutter-md flex flex-col gap-gutter-sm"
                      >
                        <div className="flex items-center justify-between gap-gutter-sm">
                          <span className="font-label text-label-md text-on-surface">
                            {MEAL_SLOT_LABELS[slot]}
                          </span>
                          <button
                            type="button"
                            onClick={() => setAssigningSlot(isPicking ? null : slot)}
                            className="inline-flex items-center gap-1 min-h-[32px] px-gutter-sm rounded-sm text-primary font-label text-label-sm hover:bg-primary-container/50 transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>{isPicking ? 'Cerrar' : 'Asignar'}</span>
                          </button>
                        </div>

                        {slotItems.length > 0 && (
                          <div className="flex flex-col gap-1.5">
                            {slotItems.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between gap-gutter-sm bg-surface-container border border-outline rounded-sm px-gutter-sm py-1.5"
                              >
                                <div className="min-w-0">
                                  <p className="font-body text-body-sm text-on-surface truncate">
                                    {item.nombre}
                                  </p>
                                  <p className="font-body text-[11px] text-on-surface-variant tabular-nums">
                                    {formatKcal(item.kcal)} kcal ·{' '}
                                    <span className="text-primary">
                                      {Math.round(item.proteinaG)} g P
                                    </span>
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  aria-label={`Quitar ${item.nombre}`}
                                  onClick={() => void handleRemoveAssignment(item.id)}
                                  className="inline-flex items-center justify-center w-8 h-8 rounded-sm text-on-surface-variant hover:bg-error-container hover:text-error shrink-0"
                                >
                                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {isPicking && (
                          <div className="flex flex-col gap-1 pt-gutter-xs border-t border-outline">
                            {combos.map((c) => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => void handleAssignComboToWeekday(c, slot)}
                                className="flex items-center justify-between gap-gutter-sm px-gutter-sm py-2 rounded-sm bg-surface-container hover:bg-primary-container/40 text-left transition-colors"
                              >
                                <span className="font-body text-body-sm text-on-surface truncate">
                                  {c.nombre}
                                </span>
                                <span className="font-mono text-[11px] text-primary tabular-nums shrink-0">
                                  {formatKcal(c.totalKcal)} kcal · {Math.round(c.totalProteinaG)}g P
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </article>
            </section>

            {/* Lista de compras automática */}
            <section aria-labelledby="heading-compras" className="flex flex-col gap-gutter-md">
              <div className="flex items-center justify-between gap-gutter-sm">
                <div className="flex items-center gap-gutter-xs">
                  <ShoppingCart className="w-5 h-5 text-primary" aria-hidden="true" />
                  <h2 id="heading-compras" className="font-headline text-headline-md text-on-surface">
                    Lista de compras
                  </h2>
                </div>

                {shoppingStats.total > 0 && (
                  <span className="font-mono text-mono-sm text-primary tabular-nums">
                    {shoppingStats.checked}/{shoppingStats.total}
                  </span>
                )}
              </div>

              {shoppingGroups.length === 0 ? (
                <div className="bg-surface-container border border-outline rounded-lg p-gutter-xl text-center flex flex-col gap-gutter-xs">
                  <p className="font-body text-body-md text-on-surface-variant">
                    Tu lista de compras se genera automáticamente desde el plan semanal.
                  </p>
                  <p className="font-body text-body-sm text-on-surface-variant">
                    Asigna menús o aplica una plantilla de día arriba para consolidar gramos y unidades.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-gutter-sm">
                    <button
                      type="button"
                      onClick={() => void handleCopyShoppingList()}
                      className="flex-1 min-h-[42px] px-gutter-md rounded-md bg-surface-container border border-outline font-label text-label-md text-on-surface inline-flex items-center justify-center gap-1.5 hover:border-primary hover:text-primary transition-colors"
                    >
                      <ClipboardCopy className="w-4 h-4" aria-hidden="true" />
                      <span>Copiar lista</span>
                    </button>
                    {shoppingStats.checked > 0 && (
                      <button
                        type="button"
                        onClick={() => void handleClearShoppingChecks()}
                        className="min-h-[42px] px-gutter-md rounded-md bg-surface-container border border-outline font-label text-label-sm text-on-surface-variant inline-flex items-center justify-center gap-1.5 hover:text-on-surface"
                      >
                        <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Limpiar</span>
                      </button>
                    )}
                  </div>

                  <div className="flex flex-col gap-gutter-md">
                    {shoppingGroups.map((group) => (
                      <article
                        key={group.categoria}
                        className="bg-surface-container border border-outline rounded-lg overflow-hidden"
                      >
                        <header className="px-gutter-lg py-gutter-sm bg-surface-container-high border-b border-outline-variant flex items-center justify-between">
                          <h3 className="font-label text-label-md text-on-surface">
                            {group.label}
                          </h3>
                          <span className="font-body text-body-sm text-on-surface-variant tabular-nums">
                            {group.items.length}
                          </span>
                        </header>

                        <div className="divide-y divide-outline-variant">
                          {group.items.map((item) => {
                            const isChecked = Boolean(checkedMap.get(item.key));
                            return (
                              <label
                                key={item.key}
                                className="flex items-center justify-between gap-gutter-sm px-gutter-lg py-gutter-md cursor-pointer select-none hover:bg-surface-container-high/60 transition-colors"
                              >
                                <div className="flex items-center gap-gutter-md min-w-0">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => void handleToggleShoppingCheck(item.key)}
                                    className="w-5 h-5 rounded accent-primary bg-surface-container-high border-outline shrink-0"
                                  />
                                  <div className="min-w-0">
                                    <span
                                      className={`font-body text-body-md block truncate ${
                                        isChecked
                                          ? 'line-through text-on-surface-variant'
                                          : 'text-on-surface'
                                      }`}
                                    >
                                      {item.nombre}
                                    </span>
                                    <span className="font-body text-[11px] text-on-surface-variant tabular-nums">
                                      en {item.usesCount}{' '}
                                      {item.usesCount === 1 ? 'comida' : 'comidas'}
                                    </span>
                                  </div>
                                </div>

                                <span
                                  className={`font-mono text-mono-sm tabular-nums shrink-0 ${
                                    isChecked
                                      ? 'line-through text-on-surface-variant'
                                      : 'text-primary'
                                  }`}
                                >
                                  {item.formattedCantidad}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </article>
                    ))}
                  </div>
                </>
              )}
            </section>
          </>
        )}
      </main>

      <ComboDetailSheet
        combo={inspectCombo?.combo ?? null}
        initialScale={inspectCombo?.initialScale}
        onClose={() => setInspectCombo(null)}
        onConfirm={async (payload) => {
          await onLogCombo(payload.combo, payload.slot, {
            scaleLabel: payload.scaleLabel,
            kcal: payload.kcal,
            proteinaG: payload.proteinaG,
            carbohidratosG: payload.carbohidratosG,
            grasasG: payload.grasasG,
          });
        }}
        onDuplicate={handleDuplicateCombo}
        onEdit={(combo) => {
          setEditingCombo(combo);
          setCreateSheetOpen(true);
        }}
      />

      <CreateFoodOrComboSheet
        open={createSheetOpen}
        foods={foods}
        initialMode="combo"
        editingCombo={editingCombo}
        onClose={() => {
          setCreateSheetOpen(false);
          setEditingCombo(null);
        }}
        onSaveFood={async (food, existingId) => {
          if (existingId !== undefined) {
            await db.foods.update(existingId, food);
          } else {
            await db.foods.add(food);
          }
          onNotify(`Alimento "${food.nombre}" guardado.`);
        }}
        onSaveCombo={async (combo, existingId) => {
          if (existingId !== undefined) {
            await db.combos.update(existingId, combo);
            onNotify(`Menú "${combo.nombre}" actualizado.`);
          } else {
            await db.combos.add(combo);
            onNotify(`Menú "${combo.nombre}" creado.`);
          }
        }}
        onDeleteCombo={async (combo) => {
          if (combo.id !== undefined) {
            await db.combos.delete(combo.id);
            onNotify(`Menú "${combo.nombre}" eliminado.`, 'info');
          }
        }}
        onDuplicateCombo={handleDuplicateCombo}
      />

      <SaveTemplateModal
        mode={saveTemplateMode}
        onClose={() => setSaveTemplateMode(null)}
      />

      <ConfirmModal
        open={templateToDelete !== null}
        title="Eliminar plantilla de día"
        description={
          templateToDelete
            ? `¿Eliminar "${templateToDelete.nombre}"? Tus comidas ya registradas en el historial no cambiarán.`
            : ''
        }
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        tone="danger"
        onConfirm={async () => {
          if (templateToDelete?.id !== undefined) {
            await db.dayTemplates.delete(templateToDelete.id);
            onNotify(`Plantilla "${templateToDelete.nombre}" eliminada.`, 'info');
          }
          setTemplateToDelete(null);
        }}
        onCancel={() => setTemplateToDelete(null)}
      />
    </div>
  );
}
