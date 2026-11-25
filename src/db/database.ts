import Dexie, { type EntityTable } from 'dexie';
import type {
  DailyMetricEntry,
  FoodItem,
  MealCombo,
  MealLogEntry,
  UserProfile,
  WeightEntry,
} from '../types/models';

export class MacroCutDatabase extends Dexie {
  profile!: EntityTable<UserProfile, 'id'>;
  foods!: EntityTable<FoodItem, 'id'>;
  combos!: EntityTable<MealCombo, 'id'>;
  mealLogs!: EntityTable<MealLogEntry, 'id'>;
  weightLogs!: EntityTable<WeightEntry, 'fecha'>;
  dailyMetrics!: EntityTable<DailyMetricEntry, 'fecha'>;

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
  }
}

export const db = new MacroCutDatabase();
