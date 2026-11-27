export type Sex = 'M' | 'F';

export type ActivityFactor = 1.2 | 1.375 | 1.55 | 1.725;

export type FoodCategory =
  | 'proteina'
  | 'carbohidrato'
  | 'grasa'
  | 'lacteo'
  | 'fruta_verdura'
  | 'otro';

export type BaseUnit = 'g' | 'ml' | 'unidad';

export type MealSlot = 'desayuno' | 'almuerzo' | 'once_cena' | 'snack';

export type CookState = 'crudo' | 'cocido';

export type WeekdayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Lunes ... 6 = Domingo

export interface UserProfile {
  id: 'default';
  pesoKg: number;
  estaturaCm: number;
  edad: number;
  sexo: Sex;
  factorActividad: ActivityFactor;
  deficitKcal: number;
  proteinaGPorKg: number;
  grasaGPorKg: number;
  pesoMetaKg?: number;
  metaAguaMl?: number;
  metaPasos?: number;
  mostrarHabitosHoy?: boolean;
  seedPacksApplied?: string[];
  updatedAt: number;
}

export interface DailyTargets {
  tmbKcal: number;
  tdeeKcal: number;
  pisoSeguroKcal: number;
  caloriasObjetivo: number;
  proteinaG: number;
  grasasG: number;
  carbohidratosG: number;
  perdidaSemanalEstimadaKg: number;
  alcanzoPisoSeguro: boolean;
}

export interface FoodItem {
  id?: number;
  nombre: string;
  categoria: FoodCategory;
  unidadBase: BaseUnit;
  porcionReferencia: number;
  kcal: number;
  proteinaG: number;
  carbohidratosG: number;
  grasasG: number;
  esFavorito: boolean;
  /** Estado en que están expresados los macros base */
  estadoBase?: CookState;
  /** Rendimiento cocido/crudo (ej. pollo: 0.75, arroz: 2.8) */
  factorCoccion?: number;
  codigoBarras?: string;
}

export interface ComboIngredient {
  foodId?: number;
  nombre: string;
  cantidad: number;
  unidad: BaseUnit;
  kcal: number;
  proteinaG: number;
  carbohidratosG: number;
  grasasG: number;
}

export interface MealCombo {
  id?: number;
  nombre: string;
  slotSugerido: MealSlot;
  etiqueta?: string;
  ingredientes: ComboIngredient[];
  totalKcal: number;
  totalProteinaG: number;
  totalCarbsG: number;
  totalGrasasG: number;
}

export interface DayTemplateEntry {
  slot: MealSlot;
  nombre: string;
  cantidadTexto: string;
  kcal: number;
  proteinaG: number;
  carbohidratosG: number;
  grasasG: number;
  foodId?: number;
  cantidadNum?: number;
  unidad?: BaseUnit;
  cookState?: CookState;
  ingredientes?: ComboIngredient[];
}

export interface DayMenuTemplate {
  id?: number;
  nombre: string;
  descripcion?: string;
  entries: DayTemplateEntry[];
  totalKcal: number;
  totalProteinaG: number;
  totalCarbsG: number;
  totalGrasasG: number;
  createdAt: number;
}

export interface WeeklyPlanAssignment {
  id: string;
  slot: MealSlot;
  comboId?: number;
  nombre: string;
  kcal: number;
  proteinaG: number;
  carbohidratosG: number;
  grasasG: number;
  ingredientes: ComboIngredient[];
}

export interface WeeklyPlanDay {
  dayOfWeek: WeekdayIndex; // primary key 0..6
  assignments: WeeklyPlanAssignment[];
}

export interface ShoppingCheckItem {
  key: string; // primary key: normalized ingredient key
  checked: boolean;
}

export interface MealLogEntry {
  id?: number;
  fecha: string; // YYYY-MM-DD
  slot: MealSlot;
  nombre: string;
  cantidadTexto: string;
  kcal: number;
  proteinaG: number;
  carbohidratosG: number;
  grasasG: number;
  createdAt: number;
  foodId?: number;
  cantidadNum?: number;
  unidad?: BaseUnit;
  cookState?: CookState;
}

export interface WeightEntry {
  fecha: string; // YYYY-MM-DD primary key
  pesoKg: number;
  nota?: string;
}

export interface DailyMetricEntry {
  fecha: string; // YYYY-MM-DD primary key
  aguaMl: number;
  pasos: number;
}

export interface BackupData {
  version: number;
  exportedAt: string;
  app: 'Samsara' | 'MacroCut';
  profile: UserProfile[];
  foods: FoodItem[];
  combos: MealCombo[];
  mealLogs: MealLogEntry[];
  weightLogs: WeightEntry[];
  dailyMetrics?: DailyMetricEntry[];
  dayTemplates?: DayMenuTemplate[];
  weeklyPlan?: WeeklyPlanDay[];
  shoppingChecks?: ShoppingCheckItem[];
}
