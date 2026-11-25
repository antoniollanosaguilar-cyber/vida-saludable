import type {
  BaseUnit,
  FoodCategory,
  FoodItem,
  MealCombo,
  MealSlot,
  WeekdayIndex,
  WeeklyPlanDay,
} from '../types/models';
import { normalizeSearchText } from '../utils/formatters';

export interface MacroDistribution {
  protPct: number;
  carbsPct: number;
  fatsPct: number;
  isHighProtein: boolean;
}

export function getMacroDistribution(
  proteinaG: number,
  carbohidratosG: number,
  grasasG: number,
): MacroDistribution {
  const protKcal = Math.max(0, proteinaG) * 4;
  const carbsKcal = Math.max(0, carbohidratosG) * 4;
  const fatsKcal = Math.max(0, grasasG) * 9;
  const total = protKcal + carbsKcal + fatsKcal;

  if (total <= 0) {
    return { protPct: 0, carbsPct: 0, fatsPct: 0, isHighProtein: false };
  }

  const protRatio = protKcal / total;
  const protPct = Math.round(protRatio * 100);
  const carbsPct = Math.round((carbsKcal / total) * 100);
  const fatsPct = Math.max(0, 100 - protPct - carbsPct);

  return {
    protPct,
    carbsPct,
    fatsPct,
    isHighProtein: protRatio >= 0.35,
  };
}

export type FitBadgeTone = 'emerald' | 'cyan' | 'neutral';

export interface RecommendedMenu {
  combo: MealCombo;
  suggestedScale: number;
  scaledKcal: number;
  scaledProtG: number;
  scaledCarbsG: number;
  scaledFatsG: number;
  badgeText: string;
  badgeTone: FitBadgeTone;
  score: number;
  isHighProtein: boolean;
}

const SCALE_CANDIDATES = [0.5, 0.75, 1, 1.25, 1.5];

export function recommendMenusForRemaining(
  combos: MealCombo[],
  remainingKcal: number,
  remainingProtG: number,
  preferredSlot?: MealSlot | null,
): RecommendedMenu[] {
  if (combos.length === 0) return [];

  const targetKcal = Math.max(150, remainingKcal);
  const needProtein = remainingProtG > 10;

  return combos
    .map((combo) => {
      const dist = getMacroDistribution(
        combo.totalProteinaG,
        combo.totalCarbsG,
        combo.totalGrasasG,
      );

      let bestScale = 1;
      if (remainingKcal > 120 && combo.totalKcal > 0) {
        let bestDiff = Infinity;
        for (const s of SCALE_CANDIDATES) {
          const k = combo.totalKcal * s;
          const overshootPenalty = k > remainingKcal + 80 ? 220 : 0;
          const diff = Math.abs(k - targetKcal) + overshootPenalty;
          if (diff < bestDiff) {
            bestDiff = diff;
            bestScale = s;
          }
        }
      }

      // Si 1x ya calza bien dentro del presupuesto restante, priorizar 1x sobre escalar
      const diff1x = Math.abs(combo.totalKcal - targetKcal);
      const fits1x = combo.totalKcal <= remainingKcal + 80;
      if (fits1x && diff1x <= 160) {
        bestScale = 1;
      }

      const scaledKcal = Math.round(combo.totalKcal * bestScale);
      const scaledProtG = Number((combo.totalProteinaG * bestScale).toFixed(1));
      const scaledCarbsG = Number((combo.totalCarbsG * bestScale).toFixed(1));
      const scaledFatsG = Number((combo.totalGrasasG * bestScale).toFixed(1));

      let badgeText = 'Cabe en tu meta';
      let badgeTone: FitBadgeTone = 'neutral';
      let score = 50;

      if (remainingKcal <= 0) {
        badgeText = dist.isHighProtein ? 'Alto en proteína' : 'Opción ligera';
        badgeTone = dist.isHighProtein ? 'emerald' : 'neutral';
        score = dist.isHighProtein ? 70 - combo.totalKcal / 40 : 30 - combo.totalKcal / 40;
      } else if (bestScale === 1 && fits1x && diff1x <= 150) {
        badgeText = 'Calza exacto';
        badgeTone = 'emerald';
        score = 100 - diff1x * 0.2;
      } else if (bestScale !== 1 && scaledKcal <= remainingKcal + 80) {
        badgeText = `Sugerido ${bestScale}×`;
        badgeTone = 'cyan';
        score = 84 - Math.abs(scaledKcal - targetKcal) * 0.15;
      } else if (fits1x && dist.isHighProtein) {
        badgeText = 'Alto en proteína';
        badgeTone = 'emerald';
        score = 88 - diff1x * 0.1;
      } else if (fits1x) {
        badgeText = 'Cabe en tu meta';
        badgeTone = 'cyan';
        score = 72 - diff1x * 0.1;
      } else {
        badgeText = `Sugerido ${bestScale}×`;
        badgeTone = 'neutral';
        score = 40 - Math.abs(scaledKcal - targetKcal) * 0.1;
      }

      if (needProtein && dist.isHighProtein) {
        score += 12;
      }
      if (preferredSlot && combo.slotSugerido === preferredSlot) {
        score += 14;
      }

      return {
        combo,
        suggestedScale: bestScale,
        scaledKcal,
        scaledProtG,
        scaledCarbsG,
        scaledFatsG,
        badgeText,
        badgeTone,
        score,
        isHighProtein: dist.isHighProtein,
      };
    })
    .sort((a, b) => b.score - a.score);
}

export interface ShoppingListItem {
  key: string;
  nombre: string;
  unidad: BaseUnit;
  totalCantidad: number;
  formattedCantidad: string;
  categoria: FoodCategory;
  usesCount: number;
}

export interface ShoppingListGroup {
  categoria: FoodCategory;
  label: string;
  items: ShoppingListItem[];
}

export const CATEGORY_GROUP_LABELS: Record<FoodCategory, string> = {
  proteina: 'Proteínas',
  carbohidrato: 'Carbohidratos',
  grasa: 'Grasas saludables',
  lacteo: 'Lácteos',
  fruta_verdura: 'Frutas y verduras',
  otro: 'Otros',
};

const CATEGORY_ORDER: FoodCategory[] = [
  'proteina',
  'carbohidrato',
  'lacteo',
  'grasa',
  'fruta_verdura',
  'otro',
];

export function formatShoppingQuantity(amount: number, unit: BaseUnit): string {
  const safe = Math.max(0, amount);
  if (unit === 'g') {
    if (safe >= 1000) {
      return `${(safe / 1000).toFixed(2).replace(/\.?0+$/, '').replace('.', ',')} kg`;
    }
    return `${Math.round(safe)} g`;
  }
  if (unit === 'ml') {
    if (safe >= 1000) {
      return `${(safe / 1000).toFixed(2).replace(/\.?0+$/, '').replace('.', ',')} L`;
    }
    return `${Math.round(safe)} ml`;
  }
  const rounded = Number(safe.toFixed(1));
  const txt = Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toFixed(1).replace('.', ',');
  return `${txt} ${rounded === 1 ? 'unidad' : 'unidades'}`;
}

export function buildWeeklyShoppingList(
  weeklyDays: WeeklyPlanDay[],
  combos: MealCombo[],
  foods: FoodItem[],
): ShoppingListGroup[] {
  const comboById = new Map(combos.map((c) => [c.id, c]));
  const foodById = new Map(foods.map((f) => [f.id, f]));
  const foodByName = new Map(foods.map((f) => [normalizeSearchText(f.nombre), f]));

  const aggregated = new Map<
    string,
    {
      nombre: string;
      unidad: BaseUnit;
      totalCantidad: number;
      categoria: FoodCategory;
      usesCount: number;
    }
  >();

  for (const day of weeklyDays) {
    for (const assignment of day.assignments) {
      const liveCombo =
        assignment.comboId !== undefined ? comboById.get(assignment.comboId) : undefined;
      const ingredientes = liveCombo?.ingredientes ?? assignment.ingredientes ?? [];

      for (const ing of ingredientes) {
        const normName = normalizeSearchText(ing.nombre);
        const key = `${normName}__${ing.unidad}`;

        const matchedFood =
          (ing.foodId !== undefined ? foodById.get(ing.foodId) : undefined) ??
          foodByName.get(normName);

        const existing = aggregated.get(key);
        if (existing) {
          existing.totalCantidad += ing.cantidad;
          existing.usesCount += 1;
        } else {
          aggregated.set(key, {
            nombre: ing.nombre,
            unidad: ing.unidad,
            totalCantidad: ing.cantidad,
            categoria: matchedFood?.categoria ?? 'otro',
            usesCount: 1,
          });
        }
      }
    }
  }

  const grouped = new Map<FoodCategory, ShoppingListItem[]>();
  for (const [key, item] of aggregated.entries()) {
    const list = grouped.get(item.categoria) ?? [];
    list.push({
      key,
      nombre: item.nombre,
      unidad: item.unidad,
      totalCantidad: Number(item.totalCantidad.toFixed(1)),
      formattedCantidad: formatShoppingQuantity(item.totalCantidad, item.unidad),
      categoria: item.categoria,
      usesCount: item.usesCount,
    });
    grouped.set(item.categoria, list);
  }

  const result: ShoppingListGroup[] = [];
  for (const cat of CATEGORY_ORDER) {
    const items = grouped.get(cat);
    if (items && items.length > 0) {
      items.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
      result.push({
        categoria: cat,
        label: CATEGORY_GROUP_LABELS[cat],
        items,
      });
    }
  }

  return result;
}

export const WEEKDAYS_META: { index: WeekdayIndex; short: string; label: string }[] = [
  { index: 0, short: 'L', label: 'Lunes' },
  { index: 1, short: 'M', label: 'Martes' },
  { index: 2, short: 'X', label: 'Miércoles' },
  { index: 3, short: 'J', label: 'Jueves' },
  { index: 4, short: 'V', label: 'Viernes' },
  { index: 5, short: 'S', label: 'Sábado' },
  { index: 6, short: 'D', label: 'Domingo' },
];

export function getTodayWeekdayIndex(): WeekdayIndex {
  const jsDay = new Date().getDay(); // 0=Sun..6=Sat
  return ((jsDay + 6) % 7) as WeekdayIndex;
}
