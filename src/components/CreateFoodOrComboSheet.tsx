import { useEffect, useMemo, useState } from 'react';
import { Copy, Plus, Trash2, X } from 'lucide-react';
import type {
  BaseUnit,
  ComboIngredient,
  CookState,
  FoodCategory,
  FoodItem,
  MealCombo,
  MealSlot,
} from '../types/models';
import type { ScannedProductDraft } from './BarcodeScannerSheet';
import { ConfirmModal } from './ConfirmModal';
import { calculatePortionMacros } from '../engine/nutritionEngine';
import {
  formatKcal,
  formatMacroG,
  formatUnitQuantity,
  MEAL_SLOT_LABELS,
  MEAL_SLOTS_ORDER,
} from '../utils/formatters';

interface CreateFoodOrComboSheetProps {
  open: boolean;
  foods: FoodItem[];
  initialMode?: 'food' | 'combo';
  editingFood?: FoodItem | null;
  editingCombo?: MealCombo | null;
  prefillFoodDraft?: ScannedProductDraft | null;
  onClose: () => void;
  onSaveFood: (food: Omit<FoodItem, 'id'>, existingId?: number) => Promise<void>;
  onDeleteFood?: (food: FoodItem) => Promise<void>;
  onSaveCombo: (combo: Omit<MealCombo, 'id'>, existingId?: number) => Promise<void>;
  onDeleteCombo?: (combo: MealCombo) => Promise<void>;
  onDuplicateCombo?: (combo: MealCombo) => Promise<void>;
}

const CATEGORY_OPTIONS: { value: FoodCategory; label: string }[] = [
  { value: 'proteina', label: 'Proteína' },
  { value: 'carbohidrato', label: 'Carbohidrato' },
  { value: 'grasa', label: 'Grasa' },
  { value: 'lacteo', label: 'Lácteo' },
  { value: 'fruta_verdura', label: 'Fruta / Verdura' },
  { value: 'otro', label: 'Otro' },
];

export function CreateFoodOrComboSheet({
  open,
  foods,
  initialMode = 'food',
  editingFood = null,
  editingCombo = null,
  prefillFoodDraft = null,
  onClose,
  onSaveFood,
  onDeleteFood,
  onSaveCombo,
  onDeleteCombo,
  onDuplicateCombo,
}: CreateFoodOrComboSheetProps) {
  const [mode, setMode] = useState<'food' | 'combo'>('food');
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  // Food state
  const [foodName, setFoodName] = useState('');
  const [category, setCategory] = useState<FoodCategory>('proteina');
  const [unit, setUnit] = useState<BaseUnit>('g');
  const [refPortion, setRefPortion] = useState('100');
  const [kcal, setKcal] = useState('');
  const [prot, setProt] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fats, setFats] = useState('');
  const [favorite, setFavorite] = useState(true);
  const [supportsCookToggle, setSupportsCookToggle] = useState(false);
  const [estadoBase, setEstadoBase] = useState<CookState>('crudo');
  const [factorCoccion, setFactorCoccion] = useState('0.75');
  const [barcode, setBarcode] = useState<string | undefined>(undefined);

  // Combo state
  const [comboName, setComboName] = useState('');
  const [comboSlot, setComboSlot] = useState<MealSlot>('almuerzo');
  const [selectedFoodId, setSelectedFoodId] = useState<string>('');
  const [ingredientQty, setIngredientQty] = useState<string>('100');
  const [ingredients, setIngredients] = useState<ComboIngredient[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setConfirmDeleteOpen(false);

    if (editingCombo) {
      setMode('combo');
      setComboName(editingCombo.nombre);
      setComboSlot(editingCombo.slotSugerido);
      setIngredients(editingCombo.ingredientes);
      if (foods.length > 0 && foods[0].id !== undefined) {
        setSelectedFoodId(String(foods[0].id));
        setIngredientQty(foods[0].unidadBase === 'unidad' ? '1' : '100');
      }
      return;
    }

    if (editingFood) {
      setMode('food');
      setFoodName(editingFood.nombre);
      setCategory(editingFood.categoria);
      setUnit(editingFood.unidadBase);
      setRefPortion(String(editingFood.porcionReferencia));
      setKcal(String(editingFood.kcal));
      setProt(String(editingFood.proteinaG));
      setCarbs(String(editingFood.carbohidratosG));
      setFats(String(editingFood.grasasG));
      setFavorite(editingFood.esFavorito);
      setSupportsCookToggle(Boolean(editingFood.estadoBase && editingFood.factorCoccion));
      setEstadoBase(editingFood.estadoBase ?? 'crudo');
      setFactorCoccion(String(editingFood.factorCoccion ?? 0.75));
      setBarcode(editingFood.codigoBarras);
      return;
    }

    setMode(prefillFoodDraft ? 'food' : initialMode);
    setFoodName(prefillFoodDraft?.nombre ?? '');
    setCategory('otro');
    setUnit('g');
    setRefPortion('100');
    setKcal(prefillFoodDraft?.kcal !== undefined ? String(prefillFoodDraft.kcal) : '');
    setProt(
      prefillFoodDraft?.proteinaG !== undefined ? String(prefillFoodDraft.proteinaG) : '',
    );
    setCarbs(
      prefillFoodDraft?.carbohidratosG !== undefined
        ? String(prefillFoodDraft.carbohidratosG)
        : '',
    );
    setFats(
      prefillFoodDraft?.grasasG !== undefined ? String(prefillFoodDraft.grasasG) : '',
    );
    setFavorite(true);
    setSupportsCookToggle(false);
    setEstadoBase('crudo');
    setFactorCoccion('0.75');
    setBarcode(prefillFoodDraft?.codigoBarras);

    setComboName('');
    setComboSlot('almuerzo');
    setIngredients([]);
    if (foods.length > 0 && foods[0].id !== undefined) {
      setSelectedFoodId(String(foods[0].id));
      setIngredientQty(foods[0].unidadBase === 'unidad' ? '1' : '100');
    }
  }, [open, foods, initialMode, editingFood, editingCombo, prefillFoodDraft]);

  const selectedFood = useMemo(
    () => foods.find((f) => String(f.id) === selectedFoodId) ?? foods[0],
    [foods, selectedFoodId],
  );

  const comboTotals = useMemo(() => {
    return ingredients.reduce(
      (acc, ing) => ({
        kcal: acc.kcal + ing.kcal,
        prot: Number((acc.prot + ing.proteinaG).toFixed(1)),
        carbs: Number((acc.carbs + ing.carbohidratosG).toFixed(1)),
        fats: Number((acc.fats + ing.grasasG).toFixed(1)),
      }),
      { kcal: 0, prot: 0, carbs: 0, fats: 0 },
    );
  }, [ingredients]);

  if (!open) return null;

  const isEditing = Boolean(editingFood || editingCombo);

  function handleUnitChange(nextUnit: BaseUnit) {
    setUnit(nextUnit);
    setRefPortion(nextUnit === 'unidad' ? '1' : '100');
  }

  function handleAddIngredient() {
    if (!selectedFood) return;
    const qty = Number(ingredientQty.replace(',', '.'));
    if (!Number.isFinite(qty) || qty <= 0) {
      setError('Ingresa una cantidad válida mayor a 0 para el ingrediente.');
      return;
    }

    const calc = calculatePortionMacros(selectedFood, qty);
    setIngredients((prev) => [
      ...prev,
      {
        foodId: selectedFood.id,
        nombre: selectedFood.nombre,
        cantidad: qty,
        unidad: selectedFood.unidadBase,
        kcal: calc.kcal,
        proteinaG: calc.proteinaG,
        carbohidratosG: calc.carbohidratosG,
        grasasG: calc.grasasG,
      },
    ]);
    setError(null);
  }

  async function handleSubmitFood(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = foodName.trim();
    const refVal = Number(refPortion.replace(',', '.'));
    const kcalVal = Number(kcal.replace(',', '.'));
    const protVal = Number((prot || '0').replace(',', '.'));
    const carbsVal = Number((carbs || '0').replace(',', '.'));
    const fatsVal = Number((fats || '0').replace(',', '.'));
    const cookFactorVal = Number(factorCoccion.replace(',', '.'));

    if (trimmed.length < 2) {
      setError('Escribe un nombre para el alimento.');
      return;
    }
    if (!Number.isFinite(refVal) || refVal <= 0) {
      setError('La porción de referencia debe ser mayor a 0.');
      return;
    }
    if (!Number.isFinite(kcalVal) || kcalVal < 0) {
      setError('Ingresa las calorías de la porción de referencia.');
      return;
    }
    if (supportsCookToggle && (!Number.isFinite(cookFactorVal) || cookFactorVal <= 0.2 || cookFactorVal > 6)) {
      setError('El factor cocido/crudo debe estar entre 0.2 y 6 (ej. 0.75 pollo, 2.8 arroz).');
      return;
    }

    setSaving(true);
    try {
      await onSaveFood(
        {
          nombre: trimmed,
          categoria: category,
          unidadBase: unit,
          porcionReferencia: refVal,
          kcal: Math.round(kcalVal),
          proteinaG: Math.max(0, Number(protVal.toFixed(1))),
          carbohidratosG: Math.max(0, Number(carbsVal.toFixed(1))),
          grasasG: Math.max(0, Number(fatsVal.toFixed(1))),
          esFavorito: favorite,
          estadoBase: supportsCookToggle ? estadoBase : undefined,
          factorCoccion: supportsCookToggle ? Number(cookFactorVal.toFixed(2)) : undefined,
          codigoBarras: barcode,
        },
        editingFood?.id,
      );
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmitCombo(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = comboName.trim();
    if (trimmed.length < 2) {
      setError('Escribe un nombre para el combo.');
      return;
    }
    if (ingredients.length === 0) {
      setError('Agrega al menos un ingrediente al combo.');
      return;
    }

    setSaving(true);
    try {
      await onSaveCombo(
        {
          nombre: trimmed,
          slotSugerido: comboSlot,
          ...(editingCombo?.etiqueta ? { etiqueta: editingCombo.etiqueta } : {}),
          ingredientes: ingredients,
          totalKcal: Math.round(comboTotals.kcal),
          totalProteinaG: comboTotals.prot,
          totalCarbsG: comboTotals.carbs,
          totalGrasasG: comboTotals.fats,
        },
        editingCombo?.id,
      );
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const titleText = editingFood
    ? 'Editar alimento'
    : editingCombo
      ? 'Editar combo'
      : prefillFoodDraft
        ? prefillFoodDraft.nombre
          ? 'Revisar producto escaneado'
          : 'Crear producto escaneado'
        : 'Nuevo elemento';

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end justify-center">
        <div
          aria-hidden="true"
          onClick={onClose}
          className="fixed inset-0 bg-surface/75 animate-fade-in"
        />

        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-sheet-title"
          className="relative z-10 w-full max-w-[480px] max-h-[88dvh] overflow-y-auto bg-surface-container border-t border-x border-outline rounded-t-xl px-page-margin pt-gutter-md pb-[max(20px,env(safe-area-inset-bottom))] flex flex-col gap-gutter-lg animate-sheet-enter"
        >
          <div className="w-10 h-1 rounded-full bg-outline mx-auto shrink-0" aria-hidden="true" />

          <header className="flex flex-col gap-gutter-md">
            <div className="flex items-center justify-between gap-gutter-sm">
              <h2 id="create-sheet-title" className="font-headline text-headline-md text-on-surface">
                {titleText}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar formulario"
                className="inline-flex items-center justify-center w-11 h-11 rounded-full text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {!isEditing && !prefillFoodDraft && (
              <div
                role="tablist"
                aria-label="Tipo de elemento"
                className="grid grid-cols-2 gap-gutter-xs p-gutter-xs rounded-md bg-surface-container-high border border-outline"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'food'}
                  onClick={() => {
                    setMode('food');
                    setError(null);
                  }}
                  className={`min-h-[38px] rounded-sm font-label text-label-md transition-colors ${
                    mode === 'food'
                      ? 'bg-primary-container border border-primary text-on-primary-container'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  Crear Alimento
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'combo'}
                  onClick={() => {
                    setMode('combo');
                    setError(null);
                  }}
                  className={`min-h-[38px] rounded-sm font-label text-label-md transition-colors ${
                    mode === 'combo'
                      ? 'bg-primary-container border border-primary text-on-primary-container'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  Crear Combo
                </button>
              </div>
            )}
          </header>

          {mode === 'food' ? (
            <form onSubmit={handleSubmitFood} className="flex flex-col gap-gutter-md">
              {barcode && (
                <p className="font-mono text-mono-sm text-secondary">
                  EAN/UPC: {barcode}
                </p>
              )}

              <div className="flex flex-col gap-gutter-xs">
                <label htmlFor="new-food-name" className="font-label text-label-sm text-on-surface-variant">
                  Nombre del alimento
                </label>
                <input
                  id="new-food-name"
                  type="text"
                  placeholder="Ej. Pechuga de pavo a la plancha"
                  value={foodName}
                  onChange={(e) => setFoodName(e.target.value)}
                  className="w-full min-h-[44px] px-gutter-md rounded-md bg-surface-container-high border border-outline font-body text-body-md text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-gutter-md">
                <div className="flex flex-col gap-gutter-xs">
                  <label htmlFor="new-food-cat" className="font-label text-label-sm text-on-surface-variant">
                    Categoría
                  </label>
                  <select
                    id="new-food-cat"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as FoodCategory)}
                    className="w-full min-h-[44px] px-gutter-md rounded-md bg-surface-container-high border border-outline font-body text-body-md text-on-surface focus:outline-none focus:border-primary"
                  >
                    {CATEGORY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-gutter-xs">
                  <label htmlFor="new-food-unit" className="font-label text-label-sm text-on-surface-variant">
                    Unidad base
                  </label>
                  <select
                    id="new-food-unit"
                    value={unit}
                    onChange={(e) => handleUnitChange(e.target.value as BaseUnit)}
                    className="w-full min-h-[44px] px-gutter-md rounded-md bg-surface-container-high border border-outline font-body text-body-md text-on-surface focus:outline-none focus:border-primary"
                  >
                    <option value="g">Gramos (g)</option>
                    <option value="ml">Mililitros (ml)</option>
                    <option value="unidad">Unidad</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-gutter-md">
                <div className="flex flex-col gap-gutter-xs">
                  <label htmlFor="new-food-ref" className="font-label text-label-sm text-on-surface-variant">
                    Porción ref. ({unit})
                  </label>
                  <input
                    id="new-food-ref"
                    type="number"
                    inputMode="decimal"
                    step="any"
                    value={refPortion}
                    onChange={(e) => setRefPortion(e.target.value)}
                    className="w-full min-h-[44px] px-gutter-md rounded-md bg-surface-container-high border border-outline font-title text-title-md text-on-surface tabular-nums focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="flex flex-col gap-gutter-xs">
                  <label htmlFor="new-food-kcal" className="font-label text-label-sm text-on-surface-variant">
                    Calorías (kcal)
                  </label>
                  <input
                    id="new-food-kcal"
                    type="number"
                    inputMode="decimal"
                    step="any"
                    placeholder="165"
                    value={kcal}
                    onChange={(e) => setKcal(e.target.value)}
                    className="w-full min-h-[44px] px-gutter-md rounded-md bg-surface-container-high border border-outline font-title text-title-md text-secondary tabular-nums focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-gutter-sm">
                <div className="flex flex-col gap-gutter-xs">
                  <label htmlFor="new-food-prot" className="font-label text-label-sm text-primary">
                    Proteína (g)
                  </label>
                  <input
                    id="new-food-prot"
                    type="number"
                    inputMode="decimal"
                    step="any"
                    placeholder="0"
                    value={prot}
                    onChange={(e) => setProt(e.target.value)}
                    className="w-full min-h-[44px] px-gutter-sm rounded-md bg-surface-container-high border border-outline font-title text-title-md text-on-surface tabular-nums focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="flex flex-col gap-gutter-xs">
                  <label htmlFor="new-food-carbs" className="font-label text-label-sm text-on-surface-variant">
                    Carbos (g)
                  </label>
                  <input
                    id="new-food-carbs"
                    type="number"
                    inputMode="decimal"
                    step="any"
                    placeholder="0"
                    value={carbs}
                    onChange={(e) => setCarbs(e.target.value)}
                    className="w-full min-h-[44px] px-gutter-sm rounded-md bg-surface-container-high border border-outline font-title text-title-md text-on-surface tabular-nums focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="flex flex-col gap-gutter-xs">
                  <label htmlFor="new-food-fats" className="font-label text-label-sm text-on-surface-variant">
                    Grasas (g)
                  </label>
                  <input
                    id="new-food-fats"
                    type="number"
                    inputMode="decimal"
                    step="any"
                    placeholder="0"
                    value={fats}
                    onChange={(e) => setFats(e.target.value)}
                    className="w-full min-h-[44px] px-gutter-sm rounded-md bg-surface-container-high border border-outline font-title text-title-md text-on-surface tabular-nums focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Conversión Crudo ↔ Cocido opcional */}
              {unit === 'g' && (
                <div className="bg-surface-container-high border border-outline rounded-md p-gutter-md flex flex-col gap-gutter-sm">
                  <label className="flex items-center gap-gutter-sm cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={supportsCookToggle}
                      onChange={(e) => setSupportsCookToggle(e.target.checked)}
                      className="w-4 h-4 rounded accent-primary bg-surface-container border-outline"
                    />
                    <span className="font-label text-label-sm text-on-surface">
                      Habilitar conversión Crudo ↔ Cocido
                    </span>
                  </label>

                  {supportsCookToggle && (
                    <div className="grid grid-cols-2 gap-gutter-sm pt-gutter-xs">
                      <div className="flex flex-col gap-gutter-xs">
                        <label htmlFor="cook-base" className="font-body text-body-sm text-on-surface-variant">
                          Macros expresados en
                        </label>
                        <select
                          id="cook-base"
                          value={estadoBase}
                          onChange={(e) => setEstadoBase(e.target.value as CookState)}
                          className="min-h-[40px] px-gutter-sm rounded-md bg-surface-container border border-outline font-body text-body-sm text-on-surface"
                        >
                          <option value="crudo">Crudo</option>
                          <option value="cocido">Cocido</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-gutter-xs">
                        <label htmlFor="cook-factor" className="font-body text-body-sm text-on-surface-variant">
                          Factor cocido/crudo
                        </label>
                        <input
                          id="cook-factor"
                          type="number"
                          inputMode="decimal"
                          step="0.05"
                          value={factorCoccion}
                          onChange={(e) => setFactorCoccion(e.target.value)}
                          className="min-h-[40px] px-gutter-sm rounded-md bg-surface-container border border-outline font-title text-body-md text-on-surface tabular-nums"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <label className="flex items-center gap-gutter-sm cursor-pointer select-none min-h-[36px]">
                <input
                  type="checkbox"
                  checked={favorite}
                  onChange={(e) => setFavorite(e.target.checked)}
                  className="w-4 h-4 rounded accent-primary bg-surface-container-high border-outline"
                />
                <span className="font-body text-body-sm text-on-surface-variant">
                  Marcar como favorito en mi catálogo
                </span>
              </label>

              {error && (
                <p className="font-body text-body-sm text-error" role="alert">
                  {error}
                </p>
              )}

              <div className={`grid gap-gutter-sm ${editingFood && onDeleteFood ? 'grid-cols-[auto_1fr]' : 'grid-cols-1'}`}>
                {editingFood && onDeleteFood && (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteOpen(true)}
                    aria-label="Eliminar alimento"
                    className="inline-flex items-center justify-center min-h-[48px] px-gutter-md rounded-md bg-error-container border border-error/40 text-error hover:bg-error hover:text-on-error transition-colors"
                  >
                    <Trash2 className="w-5 h-5" aria-hidden="true" />
                  </button>
                )}
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full min-h-[48px] px-gutter-lg rounded-md bg-primary text-on-primary font-label text-label-lg transition-colors hover:bg-on-primary-container disabled:opacity-40"
                >
                  {saving
                    ? 'Guardando...'
                    : editingFood
                      ? 'Guardar cambios'
                      : 'Guardar alimento'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSubmitCombo} className="flex flex-col gap-gutter-md">
              <div className="flex flex-col gap-gutter-xs">
                <label htmlFor="new-combo-name" className="font-label text-label-sm text-on-surface-variant">
                  Nombre del combo
                </label>
                <input
                  id="new-combo-name"
                  type="text"
                  placeholder="Ej. Cena atún + palta + arroz"
                  value={comboName}
                  onChange={(e) => setComboName(e.target.value)}
                  className="w-full min-h-[44px] px-gutter-md rounded-md bg-surface-container-high border border-outline font-body text-body-md text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex flex-col gap-gutter-xs">
                <span className="font-label text-label-sm text-on-surface-variant">
                  Horario sugerido
                </span>
                <div className="flex items-center gap-gutter-sm overflow-x-auto no-scrollbar">
                  {MEAL_SLOTS_ORDER.map((s) => {
                    const selected = comboSlot === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setComboSlot(s)}
                        className={`shrink-0 min-h-[36px] px-gutter-md rounded-full font-label text-label-md transition-colors ${
                          selected
                            ? 'bg-primary-container border border-primary text-on-primary-container'
                            : 'bg-surface-container-high border border-outline text-on-surface-variant hover:text-on-surface'
                        }`}
                      >
                        {MEAL_SLOT_LABELS[s]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selector de ingredientes */}
              <div className="bg-surface-container-high border border-outline rounded-md p-gutter-md flex flex-col gap-gutter-sm">
                <span className="font-label text-label-sm text-on-surface-variant">
                  Agregar ingrediente del catálogo
                </span>
                <div className="grid grid-cols-[1fr_84px_44px] gap-gutter-sm items-center">
                  <select
                    aria-label="Seleccionar alimento"
                    value={selectedFoodId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedFoodId(id);
                      const found = foods.find((f) => String(f.id) === id);
                      if (found) {
                        setIngredientQty(found.unidadBase === 'unidad' ? '1' : '100');
                      }
                    }}
                    className="min-h-[44px] px-gutter-sm rounded-md bg-surface-container border border-outline font-body text-body-sm text-on-surface focus:outline-none focus:border-primary"
                  >
                    {foods.map((f) => (
                      <option key={f.id} value={String(f.id)}>
                        {f.nombre} ({f.unidadBase})
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min="0.1"
                    aria-label="Cantidad del ingrediente"
                    value={ingredientQty}
                    onChange={(e) => setIngredientQty(e.target.value)}
                    className="min-h-[44px] px-gutter-sm rounded-md bg-surface-container border border-outline text-right font-title text-title-md text-on-surface tabular-nums focus:outline-none focus:border-primary"
                  />

                  <button
                    type="button"
                    onClick={handleAddIngredient}
                    aria-label="Añadir ingrediente al combo"
                    className="inline-flex items-center justify-center w-11 h-11 rounded-md bg-primary-container border border-primary text-on-primary-container hover:bg-primary hover:text-on-primary transition-colors"
                  >
                    <Plus className="w-5 h-5" aria-hidden="true" />
                  </button>
                </div>

                {ingredients.length > 0 && (
                  <div className="flex flex-col gap-gutter-xs pt-gutter-sm border-t border-outline-variant">
                    {ingredients.map((ing, idx) => (
                      <div
                        key={`${ing.nombre}-${idx}`}
                        className="flex items-center justify-between gap-gutter-sm py-1"
                      >
                        <div className="min-w-0">
                          <p className="font-body text-body-sm text-on-surface truncate">
                            {ing.nombre}{' '}
                            <span className="text-on-surface-variant tabular-nums">
                              ({formatUnitQuantity(ing.cantidad, ing.unidad)})
                            </span>
                          </p>
                          <p className="font-body text-body-sm text-on-surface-variant tabular-nums">
                            {formatKcal(ing.kcal)} kcal ·{' '}
                            <span className="text-primary">{formatMacroG(ing.proteinaG)}g P</span>
                          </p>
                        </div>
                        <button
                          type="button"
                          aria-label={`Quitar ${ing.nombre}`}
                          onClick={() =>
                            setIngredients((prev) => prev.filter((_, i) => i !== idx))
                          }
                          className="inline-flex items-center justify-center w-9 h-9 rounded-md text-on-surface-variant hover:bg-error-container hover:text-error transition-colors shrink-0"
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-surface-container-high border border-outline rounded-md px-gutter-md py-gutter-sm text-center font-label text-label-md tabular-nums">
                <span className="text-secondary">{formatKcal(comboTotals.kcal)} kcal</span>
                <span className="text-on-surface-variant mx-1.5">|</span>
                <span className="text-primary">{formatMacroG(comboTotals.prot)}g P</span>
                <span className="text-on-surface-variant mx-1.5">|</span>
                <span className="text-on-surface">{formatMacroG(comboTotals.carbs)}g C</span>
                <span className="text-on-surface-variant mx-1.5">|</span>
                <span className="text-on-surface">{formatMacroG(comboTotals.fats)}g G</span>
              </div>

              {error && (
                <p className="font-body text-body-sm text-error" role="alert">
                  {error}
                </p>
              )}

              <div className="flex items-center gap-gutter-sm">
                {editingCombo && onDeleteCombo && (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteOpen(true)}
                    aria-label="Eliminar combo"
                    className="shrink-0 inline-flex items-center justify-center min-h-[48px] px-gutter-md rounded-md bg-error-container border border-error/40 text-error hover:bg-error hover:text-on-error transition-colors"
                  >
                    <Trash2 className="w-5 h-5" aria-hidden="true" />
                  </button>
                )}
                {editingCombo && onDuplicateCombo && (
                  <button
                    type="button"
                    onClick={async () => {
                      await onDuplicateCombo(editingCombo);
                      onClose();
                    }}
                    aria-label="Duplicar menú"
                    title="Duplicar menú"
                    className="shrink-0 inline-flex items-center justify-center min-h-[48px] px-gutter-md rounded-md bg-surface-container-high border border-outline text-on-surface hover:border-primary hover:text-primary transition-colors"
                  >
                    <Copy className="w-5 h-5" aria-hidden="true" />
                  </button>
                )}
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 min-h-[48px] px-gutter-lg rounded-md bg-primary text-on-primary font-label text-label-lg transition-colors hover:bg-on-primary-container disabled:opacity-40"
                >
                  {saving
                    ? 'Guardando...'
                    : editingCombo
                      ? 'Guardar cambios'
                      : 'Guardar combo de 1 toque'}
                </button>
              </div>
            </form>
          )}
        </section>
      </div>

      <ConfirmModal
        open={confirmDeleteOpen}
        title={editingFood ? 'Eliminar alimento' : 'Eliminar combo'}
        description={
          editingFood
            ? `¿Eliminar "${editingFood.nombre}" de tu catálogo? Los registros históricos de comidas ya guardados no se verán afectados.`
            : editingCombo
              ? `¿Eliminar el combo "${editingCombo.nombre}"?`
              : ''
        }
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        tone="danger"
        onConfirm={async () => {
          setConfirmDeleteOpen(false);
          if (editingFood && onDeleteFood) {
            await onDeleteFood(editingFood);
          } else if (editingCombo && onDeleteCombo) {
            await onDeleteCombo(editingCombo);
          }
          onClose();
        }}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </>
  );
}
