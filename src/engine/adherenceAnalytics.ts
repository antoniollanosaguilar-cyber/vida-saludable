import type { DailyTargets, MealLogEntry } from '../types/models';
import { addDays, formatShortDate } from '../utils/formatters';

export interface DailyAdherencePoint {
  fecha: string;
  label: string;
  kcal: number;
  proteinaG: number;
  hasLogs: boolean;
  proteinHit: boolean;
  kcalOnBudget: boolean;
}

export interface WeeklyAdherenceSummary {
  days: DailyAdherencePoint[];
  loggedDaysCount: number;
  avgKcal: number;
  avgProteinG: number;
  proteinDaysHit: number;
  proteinStreak: number;
  weeklyCalorieBalance: number;
}

export function computeWeeklyAdherence(
  mealLogs: MealLogEntry[],
  targets: DailyTargets,
  todayKey: string,
): WeeklyAdherenceSummary {
  const byDate = new Map<string, { kcal: number; prot: number; count: number }>();

  for (const log of mealLogs) {
    const prev = byDate.get(log.fecha) ?? { kcal: 0, prot: 0, count: 0 };
    prev.kcal += log.kcal;
    prev.prot += log.proteinaG;
    prev.count += 1;
    byDate.set(log.fecha, prev);
  }

  const days: DailyAdherencePoint[] = [];
  for (let offset = -6; offset <= 0; offset++) {
    const fecha = addDays(todayKey, offset);
    const agg = byDate.get(fecha);
    const hasLogs = Boolean(agg && agg.count > 0);
    const kcal = Math.round(agg?.kcal ?? 0);
    const proteinaG = Number((agg?.prot ?? 0).toFixed(1));
    const proteinHit = hasLogs && targets.proteinaG > 0 && proteinaG >= targets.proteinaG * 0.9;
    const kcalOnBudget =
      hasLogs && targets.caloriasObjetivo > 0 && kcal <= targets.caloriasObjetivo * 1.05;

    days.push({
      fecha,
      label: formatShortDate(fecha),
      kcal,
      proteinaG,
      hasLogs,
      proteinHit,
      kcalOnBudget,
    });
  }

  const loggedDays = days.filter((d) => d.hasLogs);
  const loggedDaysCount = loggedDays.length;

  const avgKcal =
    loggedDaysCount > 0
      ? Math.round(loggedDays.reduce((s, d) => s + d.kcal, 0) / loggedDaysCount)
      : 0;

  const avgProteinG =
    loggedDaysCount > 0
      ? Math.round(loggedDays.reduce((s, d) => s + d.proteinaG, 0) / loggedDaysCount)
      : 0;

  const proteinDaysHit = loggedDays.filter((d) => d.proteinHit).length;

  // Racha actual de proteína (contando hacia atrás desde hoy o ayer si hoy aún está en curso)
  let proteinStreak = 0;
  const startIdx = days[days.length - 1].hasLogs ? days.length - 1 : days.length - 2;
  for (let i = startIdx; i >= 0; i--) {
    if (days[i].proteinHit) {
      proteinStreak += 1;
    } else {
      break;
    }
  }

  // Balance calórico acumulado en los días con registro (negativo = en déficit respecto a la meta)
  const weeklyCalorieBalance = loggedDays.reduce(
    (sum, d) => sum + (d.kcal - targets.caloriasObjetivo),
    0,
  );

  return {
    days,
    loggedDaysCount,
    avgKcal,
    avgProteinG,
    proteinDaysHit,
    proteinStreak,
    weeklyCalorieBalance: Math.round(weeklyCalorieBalance),
  };
}

export interface GoalProjection {
  targetWeightKg: number;
  remainingKg: number;
  weeksEstimated: number;
  estimatedDateLabel: string;
  rateSource: 'real' | 'plan';
  weeklyRateKg: number;
}

export function estimateGoalProjection(
  currentWeightKg: number,
  targetWeightKg: number | undefined,
  realWeeklyDeltaKg: number | null,
  plannedWeeklyLossKg: number,
  todayKey: string,
): GoalProjection | null {
  if (!targetWeightKg || targetWeightKg <= 0) return null;
  const remainingKg = Number((currentWeightKg - targetWeightKg).toFixed(1));
  if (remainingKg <= 0.1) return null;

  const useReal = realWeeklyDeltaKg !== null && realWeeklyDeltaKg <= -0.15;
  const weeklyLoss = useReal ? Math.abs(realWeeklyDeltaKg) : plannedWeeklyLossKg;
  if (weeklyLoss <= 0.05) return null;

  const weeksEstimated = Number((remainingKg / weeklyLoss).toFixed(1));
  const daysToGoal = Math.min(730, Math.round(weeksEstimated * 7));
  const estimatedDateKey = addDays(todayKey, daysToGoal);

  return {
    targetWeightKg,
    remainingKg,
    weeksEstimated,
    estimatedDateLabel: formatShortDate(estimatedDateKey),
    rateSource: useReal ? 'real' : 'plan',
    weeklyRateKg: Number(weeklyLoss.toFixed(2)),
  };
}
