import type { WeightEntry } from '../types/models';
import { addDays, formatShortDate, parseDateKey } from '../utils/formatters';

export interface WeightSeriesPoint {
  fecha: string;
  label: string;
  pesoKg: number;
  movingAvg7d: number;
}

export type WeeklyEvaluationStatus = 'baseline' | 'optimal' | 'fast' | 'stall' | 'mild';

export interface WeeklyEvaluation {
  status: WeeklyEvaluationStatus;
  tone: 'neutral' | 'emerald' | 'amber' | 'cyan';
  badge: string;
  headline: string;
  description: string;
  weeklyDeltaKg: number | null;
  recentAvgKg: number | null;
  previousAvgKg: number | null;
  recentCount: number;
  previousCount: number;
}

function diffDays(dateA: string, dateB: string): number {
  const a = parseDateKey(dateA).getTime();
  const b = parseDateKey(dateB).getTime();
  return Math.round((b - a) / 86_400_000);
}

export function buildWeightSeries(entries: WeightEntry[]): WeightSeriesPoint[] {
  const sorted = [...entries].sort((a, b) => a.fecha.localeCompare(b.fecha));

  return sorted.map((entry, idx) => {
    const windowWeights: number[] = [];
    for (let i = idx; i >= 0; i--) {
      const candidate = sorted[i];
      const delta = diffDays(candidate.fecha, entry.fecha);
      if (delta >= 0 && delta <= 6) {
        windowWeights.push(candidate.pesoKg);
      } else if (delta > 6) {
        break;
      }
    }

    const avg =
      windowWeights.reduce((sum, w) => sum + w, 0) / Math.max(1, windowWeights.length);

    return {
      fecha: entry.fecha,
      label: formatShortDate(entry.fecha),
      pesoKg: Number(entry.pesoKg.toFixed(1)),
      movingAvg7d: Number(avg.toFixed(2)),
    };
  });
}

export function filterWeightSeriesByDays(
  series: WeightSeriesPoint[],
  days: 14 | 30 | 90,
  todayKey: string,
): WeightSeriesPoint[] {
  if (series.length === 0) return [];
  const latestFecha = series[series.length - 1].fecha;
  const anchor = latestFecha > todayKey ? latestFecha : todayKey;
  const cutoff = addDays(anchor, -(days - 1));
  return series.filter((pt) => pt.fecha >= cutoff);
}

function average(nums: number[]): number {
  return nums.reduce((acc, v) => acc + v, 0) / nums.length;
}

export function evaluateWeeklyWeightTrend(entries: WeightEntry[]): WeeklyEvaluation {
  if (entries.length === 0) {
    return {
      status: 'baseline',
      tone: 'neutral',
      badge: 'Registrando línea base',
      headline: 'Sin datos suficientes',
      description:
        'Registra tu peso en ayunas al menos 4 días por semana durante 2 semanas para calcular tu ritmo real.',
      weeklyDeltaKg: null,
      recentAvgKg: null,
      previousAvgKg: null,
      recentCount: 0,
      previousCount: 0,
    };
  }

  const sorted = [...entries].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const latestDate = sorted[sorted.length - 1].fecha;

  const recentStart = addDays(latestDate, -6);
  const prevEnd = addDays(latestDate, -7);
  const prevStart = addDays(latestDate, -13);
  const olderEnd = addDays(latestDate, -14);
  const olderStart = addDays(latestDate, -20);

  const recentBlock = sorted.filter(
    (e) => e.fecha >= recentStart && e.fecha <= latestDate,
  );
  const previousBlock = sorted.filter(
    (e) => e.fecha >= prevStart && e.fecha <= prevEnd,
  );
  const olderBlock = sorted.filter(
    (e) => e.fecha >= olderStart && e.fecha <= olderEnd,
  );

  if (recentBlock.length < 4 || previousBlock.length < 4) {
    return {
      status: 'baseline',
      tone: 'neutral',
      badge: 'Registrando línea base',
      headline: 'En recopilación',
      description: `Necesitas al menos 4 pesajes en los últimos 7 días (${recentBlock.length}/4) y 4 en los 7 días previos (${previousBlock.length}/4) para evaluar tu tendencia semanal.`,
      weeklyDeltaKg: null,
      recentAvgKg:
        recentBlock.length > 0
          ? Number(average(recentBlock.map((e) => e.pesoKg)).toFixed(2))
          : null,
      previousAvgKg:
        previousBlock.length > 0
          ? Number(average(previousBlock.map((e) => e.pesoKg)).toFixed(2))
          : null,
      recentCount: recentBlock.length,
      previousCount: previousBlock.length,
    };
  }

  const recentAvg = average(recentBlock.map((e) => e.pesoKg));
  const prevAvg = average(previousBlock.map((e) => e.pesoKg));
  const weeklyDeltaKg = Number((recentAvg - prevAvg).toFixed(2));

  const signedRate = `${weeklyDeltaKg > 0 ? '+' : ''}${weeklyDeltaKg.toFixed(2)} kg/semana`;

  if (weeklyDeltaKg < -0.8) {
    return {
      status: 'fast',
      tone: 'amber',
      badge: 'Bajando rápido: protege tu masa muscular',
      headline: signedRate,
      description:
        'El descenso supera los 0,8 kg/semana. Asegura tu meta de proteína o reduce ligeramente el déficit para evitar perder masa magra.',
      weeklyDeltaKg,
      recentAvgKg: Number(recentAvg.toFixed(2)),
      previousAvgKg: Number(prevAvg.toFixed(2)),
      recentCount: recentBlock.length,
      previousCount: previousBlock.length,
    };
  }

  if (weeklyDeltaKg <= -0.3 && weeklyDeltaKg >= -0.8) {
    return {
      status: 'optimal',
      tone: 'emerald',
      badge: 'Ritmo óptimo para proteger músculo',
      headline: signedRate,
      description:
        'Tu variación media de los últimos 7 días se mantiene en el rango ideal (-0,3 a -0,8 kg/sem) de déficit sostenible.',
      weeklyDeltaKg,
      recentAvgKg: Number(recentAvg.toFixed(2)),
      previousAvgKg: Number(prevAvg.toFixed(2)),
      recentCount: recentBlock.length,
      previousCount: previousBlock.length,
    };
  }

  const hasOlderWeek = olderBlock.length >= 4;
  const olderDelta = hasOlderWeek
    ? Number((prevAvg - average(olderBlock.map((e) => e.pesoKg))).toFixed(2))
    : null;

  const isTwoWeekStall =
    weeklyDeltaKg > -0.15 && (!hasOlderWeek || (olderDelta !== null && olderDelta > -0.15));

  if (isTwoWeekStall) {
    return {
      status: 'stall',
      tone: 'amber',
      badge: 'Posible estancamiento: considera ajustar 100–150 kcal o revisar registros',
      headline: signedRate,
      description:
        'El promedio móvil lleva 2 semanas bajando menos de 0,15 kg/semana. Revisa aceites, porciones o ajusta tu déficit en 100–150 kcal.',
      weeklyDeltaKg,
      recentAvgKg: Number(recentAvg.toFixed(2)),
      previousAvgKg: Number(prevAvg.toFixed(2)),
      recentCount: recentBlock.length,
      previousCount: previousBlock.length,
    };
  }

  return {
    status: 'mild',
    tone: 'cyan',
    badge: 'Descenso gradual y controlado',
    headline: signedRate,
    description:
      'El peso desciende de forma suave. Mantén la constancia una semana más antes de modificar calorías.',
    weeklyDeltaKg,
    recentAvgKg: Number(recentAvg.toFixed(2)),
    previousAvgKg: Number(prevAvg.toFixed(2)),
    recentCount: recentBlock.length,
    previousCount: previousBlock.length,
  };
}
