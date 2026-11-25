import type { BaseUnit, MealSlot } from '../types/models';

const SHORT_MONTHS_ES = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
];

export function getTodayDateKey(): string {
  const now = new Date();
  return toDateKey(now);
}

export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
}

export function addDays(dateKey: string, delta: number): string {
  const date = parseDateKey(dateKey);
  date.setDate(date.getDate() + delta);
  return toDateKey(date);
}

export function formatShortDate(dateKey: string): string {
  const date = parseDateKey(dateKey);
  return `${date.getDate()} ${SHORT_MONTHS_ES[date.getMonth()]}`;
}

export function formatHeaderDate(dateKey: string, todayKey: string): string {
  const short = formatShortDate(dateKey);
  if (dateKey === todayKey) return `Hoy, ${short}`;
  if (dateKey === addDays(todayKey, -1)) return `Ayer, ${short}`;
  if (dateKey === addDays(todayKey, 1)) return `Mañana, ${short}`;
  return short;
}

export function formatKcal(value: number): string {
  const rounded = Math.round(value);
  const abs = Math.abs(rounded)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return rounded < 0 ? `-${abs}` : abs;
}

export function formatMacroG(value: number): string {
  const rounded = Number(value.toFixed(1));
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded.toFixed(1).replace('.', ',');
}

export function formatUnitQuantity(amount: number, unit: BaseUnit): string {
  const formatted = Number.isInteger(amount)
    ? String(amount)
    : Number(amount.toFixed(1)).toString().replace('.', ',');

  if (unit === 'unidad') {
    return `${formatted} ${amount === 1 ? 'unidad' : 'unidades'}`;
  }
  return `${formatted} ${unit}`;
}

export const MEAL_SLOT_LABELS: Record<MealSlot, string> = {
  desayuno: 'Desayuno',
  almuerzo: 'Almuerzo',
  once_cena: 'Once/Cena',
  snack: 'Snack',
};

export const MEAL_SLOT_CTA: Record<MealSlot, string> = {
  desayuno: 'Agregar al desayuno',
  almuerzo: 'Agregar al almuerzo',
  once_cena: 'Agregar a once/cena',
  snack: 'Agregar al snack',
};

export const MEAL_SLOTS_ORDER: MealSlot[] = [
  'desayuno',
  'almuerzo',
  'once_cena',
  'snack',
];

export function normalizeSearchText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}
