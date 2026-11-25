import { useMemo, useState } from 'react';
import {
  Check,
  Clock,
  Pencil,
  Plus,
  ScanBarcode,
  Search,
  Star,
  X,
  Zap,
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import type {
  CookState,
  FoodCategory,
  FoodItem,
  MealCombo,
  MealSlot,
} from '../types/models';
import { calculatePortionMacros } from '../engine/nutritionEngine';
import { PortionBottomSheet } from '../components/PortionBottomSheet';
import { CreateFoodOrComboSheet } from '../components/CreateFoodOrComboSheet';
import { QuickAddBottomSheet } from '../components/QuickAddBottomSheet';
import {
  BarcodeScannerSheet,
  type ScannedProductDraft,
} from '../components/BarcodeScannerSheet';
import {
  formatHeaderDate,
  formatKcal,
  formatMacroG,
  formatUnitQuantity,
  MEAL_SLOT_LABELS,
  normalizeSearchText,
} from '../utils/formatters';

type FilterChipId =
  | 'favoritos'
  | 'proteina'
  | 'carbohidrato'
  | 'grasa'
  | 'lacteo'
  | 'todos';

const FILTER_CHIPS: { id: FilterChipId; label: string; category?: FoodCategory }[] = [
  { id: 'favoritos', label: 'Favoritos' },
  { id: 'proteina', label: 'Proteínas', category: 'proteina' },
  { id: 'carbohidrato', label: 'Carbos', category: 'carbohidrato' },
  { id: 'grasa', label: 'Grasas', category: 'grasa' },
  { id: 'lacteo', label: 'Lácteos', category: 'lacteo' },
  { id: 'todos', label: 'Todos' },
];

function getDefaultSlotByTime(): MealSlot {
  const hour = new Date().getHours();
  if (hour < 11) return 'desayuno';
  if (hour < 16) return 'almuerzo';
  if (hour < 19) return 'snack';
  return 'once_cena';
}

interface RecentFoodItem {
  food: FoodItem;
  lastAmount: number;
  lastCookState?: CookState;
  lastCantidadTexto: string;
  lastKcal: number;
  lastProt: number;
}

interface LogPageProps {
  selectedDate: string;
  todayKey: string;
  preselectedSlot: MealSlot | null;
  onClearPreselectedSlot: () => void;
  onLogCombo: (combo: MealCombo, slot: MealSlot) => Promise<void>;
  onLogFood: (payload: {
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
  onQuickAdd: (payload: {
    nombre: string;
    slot: MealSlot;
    kcal: number;
    proteinaG: number;
    carbohidratosG: number;
    grasasG: number;
  }) => Promise<void>;
  onNotify: (text: string, tone?: 'success' | 'warning' | 'error' | 'info') => void;
}

export function LogPage({
  selectedDate,
  todayKey,
  preselectedSlot,
  onClearPreselectedSlot,
  onLogCombo,
  onLogFood,
  onQuickAdd,
  onNotify,
}: LogPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterChipId>('favoritos');

  const [selectedFoodState, setSelectedFoodState] = useState<{
    food: FoodItem;
    initialAmount?: number;
    initialCookState?: CookState;
  } | null>(null);

  const [createSheetOpen, setCreateSheetOpen] = useState(false);
  const [editingFood, setEditingFood] = useState<FoodItem | null>(null);
  const [editingCombo, setEditingCombo] = useState<MealCombo | null>(null);
  const [scannedDraft, setScannedDraft] = useState<ScannedProductDraft | null>(null);

  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [recentAddedKey, setRecentAddedKey] = useState<string | null>(null);

  const foods = useLiveQuery(() => db.foods.orderBy('nombre').toArray(), []) ?? [];
  const combos = useLiveQuery(() => db.combos.toArray(), []) ?? [];
  const recentMealLogs =
    useLiveQuery(
      () => db.mealLogs.orderBy('id').reverse().limit(80).toArray(),
      [],
    ) ?? [];

  const normalizedQuery = normalizeSearchText(searchQuery);

  const recentFoods = useMemo<RecentFoodItem[]>(() => {
    if (foods.length === 0 || recentMealLogs.length === 0) return [];
    const foodById = new Map(foods.map((f) => [f.id, f]));
    const foodByName = new Map(foods.map((f) => [f.nombre, f]));
    const seen = new Set<number>();
    const result: RecentFoodItem[] = [];

    for (const log of recentMealLogs) {
      const matched =
        (log.foodId !== undefined ? foodById.get(log.foodId) : undefined) ??
        foodByName.get(log.nombre);
      if (!matched || matched.id === undefined || seen.has(matched.id)) continue;

      seen.add(matched.id);
      const lastAmount =
        log.cantidadNum && log.cantidadNum > 0
          ? log.cantidadNum
          : matched.porcionReferencia;
      const calc = calculatePortionMacros(matched, lastAmount, log.cookState);
      const stateSuffix =
        matched.factorCoccion && log.cookState && log.cookState !== matched.estadoBase
          ? ` (${log.cookState})`
          : '';

      result.push({
        food: matched,
        lastAmount,
        lastCookState: log.cookState,
        lastCantidadTexto: `${formatUnitQuantity(lastAmount, matched.unidadBase)}${stateSuffix}`,
        lastKcal: calc.kcal,
        lastProt: calc.proteinaG,
      });

      if (result.length >= 6) break;
    }

    return result;
  }, [foods, recentMealLogs]);

  const filteredCombos = useMemo(() => {
    if (!normalizedQuery) return combos;
    return combos.filter((combo) => {
      const hay = normalizeSearchText(
        `${combo.nombre} ${combo.ingredientes.map((i) => i.nombre).join(' ')}`,
      );
      return hay.includes(normalizedQuery);
    });
  }, [combos, normalizedQuery]);

  const filteredFoods = useMemo(() => {
    return foods.filter((food) => {
      if (normalizedQuery) {
        return normalizeSearchText(food.nombre).includes(normalizedQuery);
      }
      if (activeFilter === 'favoritos') return food.esFavorito;
      if (activeFilter === 'todos') return true;
      return food.categoria === activeFilter;
    });
  }, [foods, activeFilter, normalizedQuery]);

  function flashAdded(key: string) {
    setRecentAddedKey(key);
    window.setTimeout(() => {
      setRecentAddedKey((curr) => (curr === key ? null : curr));
    }, 850);
  }

  async function handleToggleFavorite(food: FoodItem) {
    if (food.id === undefined) return;
    await db.foods.update(food.id, { esFavorito: !food.esFavorito });
  }

  async function handleQuickAddCombo(combo: MealCombo) {
    const slot = preselectedSlot ?? combo.slotSugerido;
    await onLogCombo(combo, slot);
    if (combo.id !== undefined) {
      flashAdded(`combo-${combo.id}`);
    }
  }

  async function handleQuickAddRecent(item: RecentFoodItem) {
    const slot = preselectedSlot ?? getDefaultSlotByTime();
    const calc = calculatePortionMacros(item.food, item.lastAmount, item.lastCookState);
    await onLogFood({
      food: item.food,
      slot,
      amount: item.lastAmount,
      cookState: item.lastCookState,
      cantidadTexto: item.lastCantidadTexto,
      kcal: calc.kcal,
      proteinaG: calc.proteinaG,
      carbohidratosG: calc.carbohidratosG,
      grasasG: calc.grasasG,
    });
    if (item.food.id !== undefined) {
      flashAdded(`recent-${item.food.id}`);
    }
  }

  async function handleSaveFood(food: Omit<FoodItem, 'id'>, existingId?: number) {
    if (existingId !== undefined) {
      await db.foods.update(existingId, food);
      onNotify(`"${food.nombre}" actualizado.`);
    } else {
      await db.foods.add(food);
      onNotify(`"${food.nombre}" añadido a tu catálogo.`);
    }
  }

  async function handleDeleteFood(food: FoodItem) {
    if (food.id === undefined) return;
    await db.foods.delete(food.id);
    onNotify(`"${food.nombre}" eliminado del catálogo.`, 'info');
  }

  async function handleSaveCombo(combo: Omit<MealCombo, 'id'>, existingId?: number) {
    if (existingId !== undefined) {
      await db.combos.update(existingId, combo);
      onNotify(`Combo "${combo.nombre}" actualizado.`);
    } else {
      await db.combos.add(combo);
      onNotify(`Combo "${combo.nombre}" guardado.`);
    }
  }

  async function handleDeleteCombo(combo: MealCombo) {
    if (combo.id === undefined) return;
    await db.combos.delete(combo.id);
    onNotify(`Combo "${combo.nombre}" eliminado.`, 'info');
  }

  const effectiveSheetSlot = preselectedSlot ?? getDefaultSlotByTime();

  return (
    <div className="flex flex-col pb-24">
      {/* 1. Barra de búsqueda fija + escáner + chips + Quick Add */}
      <header className="sticky top-0 z-20 bg-surface border-b border-outline-variant px-page-margin py-gutter-md flex flex-col gap-gutter-md">
        <div className="flex items-center gap-gutter-sm">
          <div className="relative flex-1 flex items-center">
            <Search
              className="w-5 h-5 text-on-surface-variant absolute left-gutter-md pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="food-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar alimento o combo..."
              aria-label="Buscar alimento o combo"
              className="w-full min-h-[44px] pl-10 pr-10 py-gutter-sm rounded-md bg-surface-container border border-outline text-on-surface font-body text-body-md placeholder:text-on-surface-variant focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors duration-100"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Limpiar búsqueda"
                className="absolute right-1.5 inline-flex items-center justify-center w-9 h-9 rounded-md text-on-surface-variant hover:text-on-surface"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setScannerOpen(true)}
            aria-label="Escanear código de barras"
            title="Escanear código de barras"
            className="shrink-0 inline-flex items-center justify-center w-11 h-11 rounded-md bg-surface-container border border-outline text-on-surface-variant hover:border-primary hover:text-primary transition-colors active:scale-95"
          >
            <ScanBarcode className="w-5 h-5" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() => setQuickAddOpen(true)}
            aria-label="Quick Add de macros"
            title="Quick Add (entrada rápida)"
            className="shrink-0 inline-flex items-center justify-center w-11 h-11 rounded-md bg-secondary-container/60 border border-secondary/50 text-secondary hover:bg-secondary-container transition-colors active:scale-95"
          >
            <Zap className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div
          role="group"
          aria-label="Filtros de alimentos"
          className="flex items-center gap-gutter-sm overflow-x-auto no-scrollbar"
        >
          {FILTER_CHIPS.map((chip) => {
            const active = activeFilter === chip.id && !normalizedQuery;
            return (
              <button
                key={chip.id}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setActiveFilter(chip.id);
                  if (searchQuery) setSearchQuery('');
                }}
                className={`shrink-0 inline-flex items-center justify-center min-h-[36px] px-gutter-md py-gutter-xs rounded-full font-label text-label-md whitespace-nowrap transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  active
                    ? 'bg-primary-container border border-primary text-on-primary-container'
                    : 'bg-surface-container border border-outline text-on-surface-variant hover:border-primary hover:text-on-surface'
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        {preselectedSlot && (
          <div className="flex items-center justify-between gap-gutter-sm px-gutter-md py-gutter-xs rounded-md bg-primary-container/50 border border-primary/40">
            <span className="font-body text-body-sm text-on-primary-container">
              Registrando en{' '}
              <strong className="font-semibold">{MEAL_SLOT_LABELS[preselectedSlot]}</strong> ·{' '}
              {formatHeaderDate(selectedDate, todayKey)}
            </span>
            <button
              type="button"
              onClick={onClearPreselectedSlot}
              aria-label="Quitar filtro de horario"
              className="text-on-primary-container hover:text-on-surface p-1"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        )}
      </header>

      <main className="flex-1 flex flex-col gap-section px-page-margin pt-gutter-lg">
        {/* Alimentos recientes (última porción recordada) */}
        {!normalizedQuery && recentFoods.length > 0 && (
          <section aria-labelledby="heading-recientes" className="flex flex-col gap-gutter-sm">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-on-surface-variant" aria-hidden="true" />
              <h2 id="heading-recientes" className="font-title text-title-md text-on-surface">
                Recientes
              </h2>
            </div>

            <div className="flex items-stretch gap-gutter-sm overflow-x-auto no-scrollbar pb-1">
              {recentFoods.map((item) => {
                const added = recentAddedKey === `recent-${item.food.id}`;
                return (
                  <article
                    key={item.food.id}
                    className="shrink-0 w-[178px] bg-surface-container border border-outline rounded-lg p-gutter-md flex flex-col justify-between gap-gutter-sm"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedFoodState({
                          food: item.food,
                          initialAmount: item.lastAmount,
                          initialCookState: item.lastCookState,
                        })
                      }
                      className="text-left flex flex-col gap-0.5 min-w-0"
                    >
                      <span className="font-label text-label-md text-on-surface truncate">
                        {item.food.nombre}
                      </span>
                      <span className="font-body text-body-sm text-on-surface-variant tabular-nums">
                        {item.lastCantidadTexto}
                      </span>
                    </button>

                    <div className="flex items-end justify-between gap-gutter-xs">
                      <div className="flex flex-col tabular-nums">
                        <span className="font-body text-body-sm text-on-surface-variant">
                          {formatKcal(item.lastKcal)} kcal
                        </span>
                        <span className="font-label text-label-sm text-primary">
                          {formatMacroG(item.lastProt)} g P
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleQuickAddRecent(item)}
                        aria-label={`Repetir ${item.food.nombre} (${item.lastCantidadTexto})`}
                        className={`inline-flex items-center justify-center w-9 h-9 rounded-full border transition-colors active:scale-95 ${
                          added
                            ? 'bg-primary-container border-primary text-on-primary-container'
                            : 'bg-surface-container-high border-outline text-on-surface hover:border-primary hover:text-primary'
                        }`}
                      >
                        {added ? (
                          <Check className="w-4 h-4" aria-hidden="true" />
                        ) : (
                          <Plus className="w-4 h-4" aria-hidden="true" />
                        )}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* 2. Combos de 1 toque (cuadrícula 2x2) */}
        {filteredCombos.length > 0 && (
          <section aria-labelledby="heading-combos" className="flex flex-col gap-gutter-md">
            <div className="flex items-center justify-between gap-gutter-sm">
              <h2 id="heading-combos" className="font-headline text-headline-md text-on-surface">
                Combos de 1 toque
              </h2>
              <span className="font-body text-body-sm text-on-surface-variant">
                {formatHeaderDate(selectedDate, todayKey)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-gutter-md items-stretch">
              {filteredCombos.map((combo) => {
                const justAdded = recentAddedKey === `combo-${combo.id}`;
                return (
                  <article
                    key={combo.id}
                    className="h-full bg-surface-container border border-outline rounded-lg p-gutter-md flex flex-col justify-between gap-gutter-md transition-colors duration-100 hover:bg-surface-container-high"
                  >
                    <div className="flex items-start justify-between gap-gutter-xs">
                      <div className="flex flex-col gap-gutter-xs min-w-0">
                        <h3 className="font-title text-title-md text-on-surface text-balance">
                          {combo.nombre}
                        </h3>
                        <span className="font-label text-label-sm text-on-surface-variant">
                          {MEAL_SLOT_LABELS[preselectedSlot ?? combo.slotSugerido]}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setEditingFood(null);
                          setScannedDraft(null);
                          setEditingCombo(combo);
                          setCreateSheetOpen(true);
                        }}
                        aria-label={`Editar combo ${combo.nombre}`}
                        className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>

                    <div className="flex items-end justify-between gap-gutter-xs">
                      <div className="flex flex-col gap-gutter-xs">
                        <span className="font-body text-body-sm text-on-surface-variant tabular-nums">
                          {formatKcal(combo.totalKcal)} kcal
                        </span>
                        <span className="font-label text-label-md text-primary tabular-nums">
                          {Math.round(combo.totalProteinaG)} g prot
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => void handleQuickAddCombo(combo)}
                        aria-label={`Agregar ${combo.nombre}`}
                        className={`shrink-0 inline-flex items-center justify-center w-11 h-11 rounded-full border transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-95 ${
                          justAdded
                            ? 'bg-primary-container border-primary text-on-primary-container'
                            : 'bg-surface-container-high border-outline text-on-surface hover:border-primary hover:bg-primary-container hover:text-on-primary-container'
                        }`}
                      >
                        {justAdded ? (
                          <Check className="w-5 h-5" aria-hidden="true" />
                        ) : (
                          <Plus className="w-5 h-5" aria-hidden="true" />
                        )}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* 3. Mi catálogo */}
        <section aria-labelledby="heading-catalogo" className="flex flex-col gap-gutter-md">
          <div className="flex items-center justify-between gap-gutter-sm">
            <h2 id="heading-catalogo" className="font-headline text-headline-md text-on-surface">
              Mi catálogo
            </h2>
            <span className="font-body text-body-sm text-on-surface-variant tabular-nums">
              {filteredFoods.length} {filteredFoods.length === 1 ? 'alimento' : 'alimentos'}
            </span>
          </div>

          {filteredFoods.length === 0 ? (
            <div className="bg-surface-container border border-outline rounded-lg p-gutter-xl text-center flex flex-col items-center gap-gutter-sm">
              <p className="font-body text-body-md text-on-surface-variant">
                No se encontraron alimentos con ese criterio.
              </p>
              {activeFilter === 'favoritos' && !normalizedQuery && (
                <button
                  type="button"
                  onClick={() => setActiveFilter('todos')}
                  className="min-h-[40px] px-gutter-md rounded-md bg-surface-container-high border border-outline font-label text-label-md text-primary"
                >
                  Ver todo el catálogo
                </button>
              )}
            </div>
          ) : (
            <div className="bg-surface-container border border-outline rounded-lg divide-y divide-outline-variant overflow-hidden">
              {filteredFoods.map((food) => (
                <div
                  key={food.id}
                  className="flex items-center justify-between gap-gutter-xs px-gutter-md py-gutter-md transition-colors duration-100 hover:bg-surface-container-high"
                >
                  <button
                    type="button"
                    aria-label={
                      food.esFavorito
                        ? `Quitar ${food.nombre} de favoritos`
                        : `Marcar ${food.nombre} como favorito`
                    }
                    onClick={() => void handleToggleFavorite(food)}
                    className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-full text-on-surface-variant hover:text-warning transition-colors"
                  >
                    <Star
                      className={`w-[18px] h-[18px] ${
                        food.esFavorito ? 'fill-warning text-warning' : ''
                      }`}
                      aria-hidden="true"
                    />
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedFoodState({ food })}
                    className="flex-1 min-w-0 text-left flex flex-col gap-gutter-xs py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-body text-body-md text-on-surface truncate">
                        {food.nombre}
                      </span>
                      {food.factorCoccion && (
                        <span className="shrink-0 px-1.5 py-0.5 rounded bg-surface-container-high border border-outline font-label text-[10px] text-on-surface-variant">
                          C/C
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-gutter-xs">
                      <span className="font-body text-body-sm text-on-surface-variant tabular-nums">
                        {formatUnitQuantity(food.porcionReferencia, food.unidadBase)}
                      </span>
                      <span className="font-body text-body-sm text-on-surface-variant" aria-hidden="true">
                        ·
                      </span>
                      <span className="font-body text-body-sm text-on-surface-variant tabular-nums">
                        {formatKcal(food.kcal)} kcal
                      </span>
                      <span className="font-body text-body-sm text-on-surface-variant" aria-hidden="true">
                        ·
                      </span>
                      <span className="font-label text-label-md text-primary tabular-nums">
                        {formatMacroG(food.proteinaG)} g P
                      </span>
                      <span className="font-body text-body-sm text-on-surface-variant tabular-nums">
                        · {formatMacroG(food.carbohidratosG)} g C · {formatMacroG(food.grasasG)} g G
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingCombo(null);
                      setScannedDraft(null);
                      setEditingFood(food);
                      setCreateSheetOpen(true);
                    }}
                    aria-label={`Editar ${food.nombre}`}
                    className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
                  >
                    <Pencil className="w-4 h-4" aria-hidden="true" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedFoodState({ food })}
                    aria-label={`Elegir porción de ${food.nombre}`}
                    className="shrink-0 inline-flex items-center justify-center w-11 h-11 rounded-full bg-surface-container-high border border-outline text-on-surface transition-colors duration-100 hover:border-primary hover:bg-primary-container hover:text-on-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-95"
                  >
                    <Plus className="w-5 h-5" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 4. Botón secundario al final */}
        <div className="pt-gutter-xs">
          <button
            type="button"
            onClick={() => {
              setEditingFood(null);
              setEditingCombo(null);
              setScannedDraft(null);
              setCreateSheetOpen(true);
            }}
            className="w-full inline-flex items-center justify-center min-h-[48px] px-gutter-lg py-gutter-md rounded-md bg-surface-container border border-outline text-on-surface font-label text-label-lg transition-colors duration-100 hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.99]"
          >
            + Crear nuevo alimento o combo
          </button>
        </div>
      </main>

      <PortionBottomSheet
        food={selectedFoodState?.food ?? null}
        initialSlot={effectiveSheetSlot}
        initialAmount={selectedFoodState?.initialAmount}
        initialCookState={selectedFoodState?.initialCookState}
        onClose={() => setSelectedFoodState(null)}
        onConfirm={async (payload) => {
          await onLogFood(payload);
        }}
      />

      <CreateFoodOrComboSheet
        open={createSheetOpen}
        foods={foods}
        editingFood={editingFood}
        editingCombo={editingCombo}
        prefillFoodDraft={scannedDraft}
        onClose={() => {
          setCreateSheetOpen(false);
          setEditingFood(null);
          setEditingCombo(null);
          setScannedDraft(null);
        }}
        onSaveFood={handleSaveFood}
        onDeleteFood={handleDeleteFood}
        onSaveCombo={handleSaveCombo}
        onDeleteCombo={handleDeleteCombo}
      />

      <QuickAddBottomSheet
        open={quickAddOpen}
        initialSlot={effectiveSheetSlot}
        onClose={() => setQuickAddOpen(false)}
        onConfirm={onQuickAdd}
      />

      <BarcodeScannerSheet
        open={scannerOpen}
        existingFoods={foods}
        onClose={() => setScannerOpen(false)}
        onFoundExistingFood={(food) => {
          onNotify(`Encontrado en tu catálogo: ${food.nombre}`);
          setSelectedFoodState({ food });
        }}
        onProductResolved={(draft) => {
          setEditingFood(null);
          setEditingCombo(null);
          setScannedDraft(draft);
          setCreateSheetOpen(true);
        }}
      />
    </div>
  );
}
