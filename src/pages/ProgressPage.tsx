import { useEffect, useMemo, useState } from 'react';
import { Flame, Sparkles, Target, Trash2 } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { db } from '../db/database';
import type { DailyTargets, UserProfile, WeightEntry } from '../types/models';
import {
  buildWeightSeries,
  evaluateWeeklyWeightTrend,
  filterWeightSeriesByDays,
} from '../engine/weightAnalytics';
import {
  computeWeeklyAdherence,
  estimateGoalProjection,
} from '../engine/adherenceAnalytics';
import { formatHeaderDate, formatKcal } from '../utils/formatters';

interface ProgressPageProps {
  todayKey: string;
  profile: UserProfile;
  targets: DailyTargets;
  onSaveWeight: (fecha: string, pesoKg: number, syncProfile: boolean) => Promise<void>;
  onDeleteWeight: (entry: WeightEntry) => Promise<void>;
  onApplyCoachDeficit: (newDeficitKcal: number, reason: string) => Promise<void>;
}

type RangeDays = 14 | 30 | 90;

export function ProgressPage({
  todayKey,
  profile,
  targets,
  onSaveWeight,
  onDeleteWeight,
  onApplyCoachDeficit,
}: ProgressPageProps) {
  const [rangeDays, setRangeDays] = useState<RangeDays>(30);
  const [showCalorieBars, setShowCalorieBars] = useState(false);
  const [syncProfile, setSyncProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);

  const weightEntries = useLiveQuery(() => db.weightLogs.orderBy('fecha').toArray(), []) ?? [];
  const allMealLogs = useLiveQuery(() => db.mealLogs.toArray(), []) ?? [];

  const todayEntry = useMemo(
    () => weightEntries.find((w) => w.fecha === todayKey),
    [weightEntries, todayKey],
  );

  const latestWeight =
    todayEntry?.pesoKg ??
    weightEntries[weightEntries.length - 1]?.pesoKg ??
    profile.pesoKg;

  const [weightInput, setWeightInput] = useState(String(latestWeight));

  useEffect(() => {
    setWeightInput(String(latestWeight));
  }, [latestWeight]);

  const kcalByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of allMealLogs) {
      map.set(m.fecha, (map.get(m.fecha) ?? 0) + m.kcal);
    }
    return map;
  }, [allMealLogs]);

  const fullSeries = useMemo(() => buildWeightSeries(weightEntries), [weightEntries]);
  const chartData = useMemo(() => {
    const filtered = filterWeightSeriesByDays(fullSeries, rangeDays, todayKey);
    return filtered.map((pt) => ({
      ...pt,
      kcalDia: Math.round(kcalByDate.get(pt.fecha) ?? 0),
    }));
  }, [fullSeries, rangeDays, todayKey, kcalByDate]);

  const evaluation = useMemo(
    () => evaluateWeeklyWeightTrend(weightEntries),
    [weightEntries],
  );

  const adherence = useMemo(
    () => computeWeeklyAdherence(allMealLogs, targets, todayKey),
    [allMealLogs, targets, todayKey],
  );

  const projection = useMemo(
    () =>
      estimateGoalProjection(
        latestWeight,
        profile.pesoMetaKg,
        evaluation.weeklyDeltaKg,
        targets.perdidaSemanalEstimadaKg,
        todayKey,
      ),
    [
      latestWeight,
      profile.pesoMetaKg,
      evaluation.weeklyDeltaKg,
      targets.perdidaSemanalEstimadaKg,
      todayKey,
    ],
  );

  const coachSuggestion = useMemo(() => {
    if (evaluation.status === 'stall' && !targets.alcanzoPisoSeguro && profile.deficitKcal < 600) {
      const nextDeficit = Math.min(600, profile.deficitKcal + 100);
      return {
        nextDeficit,
        label: `Aplicar ajuste sugerido (+${nextDeficit - profile.deficitKcal} kcal déficit → ${nextDeficit} kcal)`,
        reason: 'estancamiento de 2 semanas',
      };
    }
    if (evaluation.status === 'fast' && profile.deficitKcal > 200) {
      const nextDeficit = Math.max(200, profile.deficitKcal - 100);
      return {
        nextDeficit,
        label: `Aplicar ajuste sugerido (-${profile.deficitKcal - nextDeficit} kcal déficit → ${nextDeficit} kcal)`,
        reason: 'bajada demasiado rápida',
      };
    }
    return null;
  }, [evaluation.status, profile.deficitKcal, targets.alcanzoPisoSeguro]);

  const recentDesc = useMemo(
    () => [...weightEntries].reverse().slice(0, 14),
    [weightEntries],
  );

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const parsed = Number(weightInput.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed < 30 || parsed > 300) {
      setInputError('Ingresa un peso entre 30 y 300 kg.');
      return;
    }

    setSaving(true);
    setInputError(null);
    try {
      await onSaveWeight(todayKey, Number(parsed.toFixed(1)), syncProfile);
      setSavedFeedback(true);
      window.setTimeout(() => setSavedFeedback(false), 1200);
    } finally {
      setSaving(false);
    }
  }

  const badgeClass =
    evaluation.tone === 'emerald'
      ? 'bg-primary-container border-primary text-on-primary-container'
      : evaluation.tone === 'amber'
        ? 'bg-warning-container border-warning text-on-warning-container'
        : evaluation.tone === 'cyan'
          ? 'bg-secondary-container border-secondary text-on-secondary-container'
          : 'bg-surface-container-high border-outline text-on-surface-variant';

  const balancePositive = adherence.weeklyCalorieBalance > 0;

  return (
    <div className="flex flex-col pb-24">
      <main className="flex-1 flex flex-col gap-section px-page-margin pt-gutter-lg">
        {/* 1. Registro rápido de peso */}
        <section aria-labelledby="heading-peso-hoy">
          <article className="bg-surface-container border border-outline rounded-lg p-gutter-xl flex flex-col gap-gutter-md">
            <h1 id="heading-peso-hoy" className="font-title text-title-md text-on-surface">
              ¿Cuánto pesas hoy en ayunas?
            </h1>

            <form onSubmit={handleSave} className="flex flex-col gap-gutter-md">
              <div className="flex items-center justify-between gap-gutter-md">
                <div className="flex-1 flex items-baseline gap-gutter-xs bg-surface-container-high border border-outline rounded-md px-gutter-md py-gutter-xs focus-within:border-primary">
                  <label htmlFor="progress-weight-input" className="sr-only">
                    Peso corporal en kilogramos
                  </label>
                  <input
                    id="progress-weight-input"
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    min="30"
                    max="300"
                    value={weightInput}
                    onChange={(e) => {
                      setWeightInput(e.target.value);
                      setInputError(null);
                    }}
                    className="w-24 min-h-[44px] bg-transparent border-0 font-display text-display-lg-mobile text-on-surface tabular-nums focus:outline-none p-0"
                  />
                  <span className="font-label text-label-lg text-on-surface-variant">kg</span>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="shrink-0 inline-flex items-center justify-center min-h-[48px] px-gutter-xl py-gutter-sm rounded-md bg-primary text-on-primary font-label text-label-lg transition-colors duration-100 hover:bg-on-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-95 disabled:opacity-50"
                >
                  {savedFeedback ? 'Guardado' : 'Guardar'}
                </button>
              </div>

              <label className="flex items-center gap-gutter-sm cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={syncProfile}
                  onChange={(e) => setSyncProfile(e.target.checked)}
                  className="w-4 h-4 rounded accent-primary bg-surface-container-high border-outline"
                />
                <span className="font-body text-body-sm text-on-surface-variant">
                  Sincronizar peso actual en Ajustes (actualiza metas diarias)
                </span>
              </label>

              {inputError && (
                <p className="font-body text-body-sm text-error" role="alert">
                  {inputError}
                </p>
              )}
            </form>
          </article>
        </section>

        {/* 2. Resumen semanal de adherencia */}
        <section aria-labelledby="heading-adherencia">
          <article className="bg-surface-container border border-outline rounded-lg p-gutter-xl flex flex-col gap-gutter-md">
            <header className="flex items-center justify-between gap-gutter-sm">
              <h2 id="heading-adherencia" className="font-title text-title-md text-on-surface">
                Adherencia semanal (7 días)
              </h2>
              <span className="inline-flex items-center gap-1 px-gutter-sm py-0.5 rounded-full bg-primary-container border border-primary/50 font-label text-label-sm text-on-primary-container tabular-nums">
                <Flame className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                Racha: {adherence.proteinStreak}d
              </span>
            </header>

            <div className="grid grid-cols-3 gap-gutter-sm text-center bg-surface-container-high border border-outline rounded-md p-gutter-md">
              <div className="flex flex-col gap-gutter-xs">
                <span className="font-label text-label-sm text-on-surface-variant">
                  Prom. kcal
                </span>
                <span className="font-title text-title-md text-secondary tabular-nums">
                  {adherence.loggedDaysCount > 0 ? formatKcal(adherence.avgKcal) : '—'}
                </span>
                <span className="font-body text-[11px] text-on-surface-variant tabular-nums">
                  meta {formatKcal(targets.caloriasObjetivo)}
                </span>
              </div>

              <div className="flex flex-col gap-gutter-xs">
                <span className="font-label text-label-sm text-on-surface-variant">
                  Prom. proteína
                </span>
                <span className="font-title text-title-md text-primary tabular-nums">
                  {adherence.loggedDaysCount > 0 ? `${adherence.avgProteinG} g` : '—'}
                </span>
                <span className="font-body text-[11px] text-on-surface-variant tabular-nums">
                  {adherence.proteinDaysHit}/7 días ≥90%
                </span>
              </div>

              <div className="flex flex-col gap-gutter-xs">
                <span className="font-label text-label-sm text-on-surface-variant">
                  Balance 7d
                </span>
                <span
                  className={`font-title text-title-md tabular-nums ${
                    adherence.loggedDaysCount === 0
                      ? 'text-on-surface-variant'
                      : balancePositive
                        ? 'text-warning'
                        : 'text-primary'
                  }`}
                >
                  {adherence.loggedDaysCount > 0
                    ? `${balancePositive ? '+' : ''}${formatKcal(adherence.weeklyCalorieBalance)}`
                    : '—'}
                </span>
                <span className="font-body text-[11px] text-on-surface-variant">
                  {adherence.loggedDaysCount === 0
                    ? 'sin registros'
                    : balancePositive
                      ? 'sobre meta'
                      : 'en déficit'}
                </span>
              </div>
            </div>

            {/* 7 indicadores diarios */}
            <div className="grid grid-cols-7 gap-gutter-xs pt-gutter-xs">
              {adherence.days.map((d) => {
                const pillStyle = !d.hasLogs
                  ? 'bg-track border-outline-variant text-on-surface-variant'
                  : d.proteinHit && d.kcalOnBudget
                    ? 'bg-primary-container border-primary text-on-primary-container'
                    : d.proteinHit
                      ? 'bg-primary-container/60 border-primary/50 text-primary'
                      : 'bg-secondary-container/60 border-secondary/50 text-secondary';

                return (
                  <div
                    key={d.fecha}
                    title={`${d.label}: ${formatKcal(d.kcal)} kcal · ${Math.round(d.proteinaG)} g prot`}
                    className={`flex flex-col items-center justify-center py-1.5 rounded-sm border text-center ${pillStyle}`}
                  >
                    <span className="font-label text-[10px] tabular-nums">
                      {d.label.split(' ')[0]}
                    </span>
                    <span className="font-mono text-[10px] tabular-nums">
                      {d.hasLogs ? `${Math.round(d.proteinaG)}g` : '·'}
                    </span>
                  </div>
                );
              })}
            </div>
          </article>
        </section>

        {/* 3. Gráfico principal Recharts + Calorías + Meta */}
        <section aria-labelledby="heading-tendencia">
          <article className="bg-surface-container border border-outline rounded-lg p-gutter-xl flex flex-col gap-gutter-lg">
            <header className="flex flex-wrap items-center justify-between gap-gutter-sm">
              <h2 id="heading-tendencia" className="font-title text-title-md text-on-surface">
                Tendencia ({rangeDays}d)
              </h2>

              <div className="flex items-center gap-gutter-xs">
                <button
                  type="button"
                  aria-pressed={showCalorieBars}
                  onClick={() => setShowCalorieBars((v) => !v)}
                  className={`min-h-[34px] px-gutter-sm rounded-md border font-label text-label-sm transition-colors ${
                    showCalorieBars
                      ? 'bg-secondary-container border-secondary text-on-secondary-container'
                      : 'bg-surface-container-high border-outline text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  + Kcal
                </button>

                <div
                  role="group"
                  aria-label="Rango de tiempo"
                  className="inline-flex items-center gap-gutter-xs p-1 rounded-md bg-surface-container-high border border-outline"
                >
                  {([14, 30, 90] as RangeDays[]).map((days) => {
                    const active = rangeDays === days;
                    return (
                      <button
                        key={days}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setRangeDays(days)}
                        className={`min-h-[30px] px-gutter-sm rounded-sm font-label text-label-sm transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                          active
                            ? 'bg-surface-container border border-outline text-on-surface'
                            : 'bg-transparent text-on-surface-variant hover:text-on-surface'
                        }`}
                      >
                        {days}D
                      </button>
                    );
                  })}
                </div>
              </div>
            </header>

            <div className="flex flex-col gap-gutter-sm">
              {chartData.length === 0 ? (
                <div className="h-[196px] rounded-md bg-surface-container-high/50 border border-outline-variant flex flex-col items-center justify-center px-gutter-lg text-center gap-gutter-xs">
                  <p className="font-body text-body-md text-on-surface-variant">
                    Aún no hay pesajes en este período.
                  </p>
                  <p className="font-body text-body-sm text-on-surface-variant">
                    Guarda tu primer registro arriba para comenzar a graficar tu promedio móvil.
                  </p>
                </div>
              ) : (
                <div className="w-full h-[212px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={chartData}
                      margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
                    >
                      <CartesianGrid vertical={false} stroke="#1B212A" strokeDasharray="0" />
                      <XAxis
                        dataKey="label"
                        tick={{ fill: '#94A3B8', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        minTickGap={24}
                      />
                      <YAxis
                        yAxisId="weight"
                        domain={['dataMin - 0.5', 'dataMax + 0.5']}
                        tick={{
                          fill: '#94A3B8',
                          fontSize: 11,
                          fontFamily: 'Reddit Mono, monospace',
                        }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(val: number) => val.toFixed(1)}
                      />
                      {showCalorieBars && (
                        <YAxis
                          yAxisId="kcal"
                          orientation="right"
                          hide
                          domain={[0, Math.max(targets.caloriasObjetivo * 1.4, 3200)]}
                        />
                      )}
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1C222B',
                          borderColor: '#232A34',
                          borderRadius: '12px',
                          fontSize: '12px',
                          color: '#F1F5F9',
                        }}
                        labelStyle={{ color: '#94A3B8', marginBottom: '4px' }}
                        formatter={(value, name) => {
                          if (name === 'kcalDia') {
                            return [`${formatKcal(Number(value))} kcal`, 'Calorías día'];
                          }
                          return [
                            `${Number(value).toFixed(1)} kg`,
                            name === 'movingAvg7d' ? 'Promedio móvil 7d' : 'Peso diario',
                          ];
                        }}
                      />
                      {showCalorieBars && (
                        <Bar
                          yAxisId="kcal"
                          dataKey="kcalDia"
                          name="kcalDia"
                          fill="#38BDF8"
                          fillOpacity={0.22}
                          radius={[4, 4, 0, 0]}
                          maxBarSize={14}
                          isAnimationActive={false}
                        />
                      )}
                      {profile.pesoMetaKg && (
                        <ReferenceLine
                          yAxisId="weight"
                          y={profile.pesoMetaKg}
                          stroke="#10B981"
                          strokeOpacity={0.45}
                          strokeDasharray="4 4"
                        />
                      )}
                      <Line
                        yAxisId="weight"
                        type="linear"
                        dataKey="pesoKg"
                        name="pesoKg"
                        stroke="#232A34"
                        strokeWidth={1.25}
                        dot={{ r: 3, fill: '#94A3B8', strokeWidth: 0 }}
                        activeDot={{
                          r: 4.5,
                          fill: '#38BDF8',
                          stroke: '#0B0E11',
                          strokeWidth: 1.5,
                        }}
                        isAnimationActive={false}
                      />
                      <Line
                        yAxisId="weight"
                        type="monotone"
                        dataKey="movingAvg7d"
                        name="movingAvg7d"
                        stroke="#10B981"
                        strokeWidth={2.5}
                        dot={false}
                        activeDot={{
                          r: 5,
                          fill: '#10B981',
                          stroke: '#0B0E11',
                          strokeWidth: 2,
                        }}
                        isAnimationActive={false}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Leyenda */}
              <div className="flex flex-wrap items-center justify-center gap-gutter-md pt-gutter-xs border-t border-outline-variant">
                <div className="flex items-center gap-gutter-xs">
                  <span
                    className="w-2 h-2 rounded-full bg-on-surface-variant inline-block"
                    aria-hidden="true"
                  />
                  <span className="font-body text-body-sm text-on-surface-variant">
                    Peso diario
                  </span>
                </div>
                <div className="flex items-center gap-gutter-xs">
                  <span
                    className="w-4 h-0.5 rounded-full bg-primary inline-block"
                    aria-hidden="true"
                  />
                  <span className="font-label text-label-sm text-on-surface">
                    Promedio 7d
                  </span>
                </div>
                {showCalorieBars && (
                  <div className="flex items-center gap-gutter-xs">
                    <span
                      className="w-2.5 h-2.5 rounded-sm bg-secondary/40 border border-secondary/70 inline-block"
                      aria-hidden="true"
                    />
                    <span className="font-body text-body-sm text-secondary">Calorías</span>
                  </div>
                )}
              </div>

              {/* Proyección de meta de peso */}
              {projection && (
                <div className="flex items-center justify-between gap-gutter-sm px-gutter-md py-gutter-sm rounded-md bg-surface-container-high border border-outline-variant">
                  <span className="inline-flex items-center gap-1.5 font-body text-body-sm text-on-surface-variant">
                    <Target className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                    Meta {projection.targetWeightKg.toFixed(1)} kg (faltan {projection.remainingKg} kg)
                  </span>
                  <span className="font-label text-label-sm text-primary tabular-nums whitespace-nowrap">
                    ~{projection.weeksEstimated} sem · {projection.estimatedDateLabel}
                  </span>
                </div>
              )}
            </div>
          </article>
        </section>

        {/* 4. Evaluación semanal + Coach offline */}
        <section aria-labelledby="heading-evaluacion">
          <article className="bg-surface-container border border-outline rounded-lg p-gutter-xl flex flex-col gap-gutter-md">
            <h2 id="heading-evaluacion" className="font-title text-title-md text-on-surface">
              Evaluación semanal
            </h2>

            <div className="flex flex-wrap items-center gap-gutter-md">
              <span className="font-display text-display-lg-mobile text-on-surface tabular-nums">
                {evaluation.headline}
              </span>

              <span
                className={`inline-flex items-center px-gutter-md py-gutter-xs rounded-full border font-label text-label-sm ${badgeClass}`}
              >
                {evaluation.badge}
              </span>
            </div>

            <p className="font-body text-body-sm text-on-surface-variant text-pretty">
              {evaluation.description}
            </p>

            {coachSuggestion && (
              <button
                type="button"
                onClick={() =>
                  void onApplyCoachDeficit(
                    coachSuggestion.nextDeficit,
                    coachSuggestion.reason,
                  )
                }
                className="w-full inline-flex items-center justify-center gap-gutter-sm min-h-[44px] px-gutter-md rounded-md bg-warning-container border border-warning text-on-warning-container font-label text-label-md transition-colors hover:bg-warning hover:text-on-warning active:scale-[0.99]"
              >
                <Sparkles className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{coachSuggestion.label}</span>
              </button>
            )}
          </article>
        </section>

        {/* 5. Últimos pesajes */}
        <section aria-labelledby="heading-pesajes" className="flex flex-col gap-gutter-md">
          <div className="flex items-center justify-between gap-gutter-sm">
            <h2 id="heading-pesajes" className="font-headline text-headline-md text-on-surface">
              Últimos pesajes
            </h2>
            <span className="font-body text-body-sm text-on-surface-variant tabular-nums">
              {weightEntries.length} {weightEntries.length === 1 ? 'registro' : 'registros'}
            </span>
          </div>

          {recentDesc.length === 0 ? (
            <div className="bg-surface-container border border-outline rounded-lg px-gutter-lg py-gutter-lg">
              <p className="font-body text-body-sm text-on-surface-variant">
                Sin pesajes registrados todavía.
              </p>
            </div>
          ) : (
            <div className="bg-surface-container border border-outline rounded-lg divide-y divide-outline-variant overflow-hidden">
              {recentDesc.map((entry, idx) => (
                <div
                  key={entry.fecha}
                  className="flex items-center justify-between gap-gutter-sm px-gutter-lg py-gutter-md"
                >
                  <span
                    className={`font-body text-body-md ${
                      idx === 0 ? 'text-on-surface' : 'text-on-surface-variant'
                    }`}
                  >
                    {formatHeaderDate(entry.fecha, todayKey)}
                  </span>

                  <div className="flex items-center gap-gutter-sm">
                    <span
                      className={`font-label text-label-lg tabular-nums ${
                        idx === 0 ? 'text-primary' : 'text-on-surface'
                      }`}
                    >
                      {entry.pesoKg.toFixed(1)} kg
                    </span>
                    <button
                      type="button"
                      aria-label={`Eliminar pesaje del ${entry.fecha}`}
                      onClick={() => void onDeleteWeight(entry)}
                      className="inline-flex items-center justify-center w-10 h-10 rounded-md text-on-surface-variant hover:bg-error-container hover:text-error transition-colors"
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
