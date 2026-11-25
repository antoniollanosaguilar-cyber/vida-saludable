import Dexie, { type EntityTable } from 'dexie';
import type {
  DailyMetricEntry,
  DayMenuTemplate,
  FoodItem,
  MealCombo,
  MealLogEntry,
  ShoppingCheckItem,
  UserProfile,
  WeekdayIndex,
  WeeklyPlanDay,
  WeightEntry,
} from '../types/models';

export class MacroCutDatabase extends Dexie {
  profile!: EntityTable<UserProfile, 'id'>;
  foods!: EntityTable<FoodItem, 'id'>;
  combos!: EntityTable<MealCombo, 'id'>;
  mealLogs!: EntityTable<MealLogEntry, 'id'>;
  weightLogs!: EntityTable<WeightEntry, 'fecha'>;
  dailyMetrics!: EntityTable<DailyMetricEntry, 'fecha'>;
  dayTemplates!: EntityTable<DayMenuTemplate, 'id'>;
  weeklyPlan!: EntityTable<WeeklyPlanDay, 'dayOfWeek'>;
  shoppingChecks!: EntityTable<ShoppingCheckItem, 'key'>;

  constructor() {
    super('MacroCutDB');
    this.version(1).stores({
      profile: 'id',
      foods: '++id, nombre, categoria, esFavorito',
      combos: '++id, nombre, slotSugerido',
      mealLogs: '++id, fecha, slot',
      weightLogs: 'fecha',
    });
    this.version(2).stores({
      profile: 'id',
      foods: '++id, nombre, categoria, esFavorito, codigoBarras',
      combos: '++id, nombre, slotSugerido',
      mealLogs: '++id, fecha, slot, foodId',
      weightLogs: 'fecha',
      dailyMetrics: 'fecha',
    });
    this.version(3).stores({
      profile: 'id',
      foods: '++id, nombre, categoria, esFavorito, codigoBarras',
      combos: '++id, nombre, slotSugerido',
      mealLogs: '++id, fecha, slot, foodId',
      weightLogs: 'fecha',
      dailyMetrics: 'fecha',
      dayTemplates: '++id, nombre',
      weeklyPlan: 'dayOfWeek',
      shoppingChecks: 'key',
    });
  }
}

export type { WeekdayIndex };
export const db = new MacroCutDatabase();
