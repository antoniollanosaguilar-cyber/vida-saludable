import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Download, Upload } from 'lucide-react';
import { db } from '../db/database';
import type {
  ActivityFactor,
  BackupData,
  DailyTargets,
  Sex,
  UserProfile,
} from '../types/models';
import { ConfirmModal } from '../components/ConfirmModal';
import { SamsaraLogo } from '../components/SamsaraBrand';
import { formatKcal, getTodayDateKey } from '../utils/formatters';

interface SettingsPageProps {
  profile: UserProfile;
  targets: DailyTargets;
  onUpdateProfile: (patch: Partial<UserProfile>) => Promise<void>;
  onNotify: (text: string, tone?: 'success' | 'warning' | 'error' | 'info') => void;
}

const ACTIVITY_OPTIONS: { value: ActivityFactor; label: string }[] = [
  { value: 1.2, label: 'Sedentario (sin entrenamiento)' },
  { value: 1.375, label: 'Fuerza 1-2 días/sem' },
  { value: 1.55, label: 'Fuerza 3-4 días/sem' },
  { value: 1.725, label: 'Fuerza 5-6 días/sem' },
];

function isValidBackupPayload(data: unknown): data is BackupData {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  if (
    !Array.isArray(obj.profile) ||
    !Array.isArray(obj.foods) ||
    !Array.isArray(obj.combos) ||
    !Array.isArray(obj.mealLogs) ||
    !Array.isArray(obj.weightLogs)
  ) {
    return false;
  }

  const validProfile = obj.profile.every(
    (p) =>
      p &&
      typeof p === 'object' &&
      typeof (p as UserProfile).pesoKg === 'number' &&
      typeof (p as UserProfile).estaturaCm === 'number' &&
      typeof (p as UserProfile).edad === 'number',
  );
  if (!validProfile) return false;

  const validFoods = obj.foods.every(
    (f) =>
      f &&
      typeof f === 'object' &&
      typeof (f as { nombre?: unknown }).nombre === 'string' &&
      typeof (f as { kcal?: unknown }).kcal === 'number',
  );
  if (!validFoods) return false;

  const validWeights = obj.weightLogs.every(
    (w) =>
      w &&
      typeof w === 'object' &&
      typeof (w as { fecha?: unknown }).fecha === 'string' &&
      typeof (w as { pesoKg?: unknown }).pesoKg === 'number',
  );
  return validWeights;
}

export function SettingsPage({
  profile,
  targets,
  onUpdateProfile,
  onNotify,
}: SettingsPageProps) {
  const [pesoText, setPesoText] = useState(String(profile.pesoKg));
  const [estaturaText, setEstaturaText] = useState(String(profile.estaturaCm));
  const [edadText, setEdadText] = useState(String(profile.edad));
  const [pesoMetaText, setPesoMetaText] = useState(
    profile.pesoMetaKg ? String(profile.pesoMetaKg) : '',
  );
  const [aguaMetaText, setAguaMetaText] = useState(String(profile.metaAguaMl ?? 2500));
  const [pasosMetaText, setPasosMetaText] = useState(String(profile.metaPasos ?? 8000));

  const [pendingBackup, setPendingBackup] = useState<BackupData | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setPesoText(String(profile.pesoKg));
    setEstaturaText(String(profile.estaturaCm));
    setEdadText(String(profile.edad));
    setPesoMetaText(profile.pesoMetaKg ? String(profile.pesoMetaKg) : '');
    setAguaMetaText(String(profile.metaAguaMl ?? 2500));
    setPasosMetaText(String(profile.metaPasos ?? 8000));
  }, [
    profile.pesoKg,
    profile.estaturaCm,
    profile.edad,
    profile.pesoMetaKg,
    profile.metaAguaMl,
    profile.metaPasos,
  ]);

  function handleNumericChange(
    raw: string,
    setter: (v: string) => void,
    field: 'pesoKg' | 'estaturaCm' | 'edad' | 'metaAguaMl' | 'metaPasos',
    min: number,
    max: number,
  ) {
    setter(raw);
    const parsed = Number(raw.replace(',', '.'));
    if (Number.isFinite(parsed) && parsed >= min && parsed <= max) {
      void onUpdateProfile({ [field]: parsed });
    }
  }

  async function handleExportJson() {
    const [
      profileRows,
      foods,
      combos,
      mealLogs,
      weightLogs,
      dailyMetrics,
      dayTemplates,
      weeklyPlan,
      shoppingChecks,
    ] = await Promise.all([
      db.profile.toArray(),
      db.foods.toArray(),
      db.combos.toArray(),
      db.mealLogs.toArray(),
      db.weightLogs.toArray(),
      db.dailyMetrics.toArray(),
      db.dayTemplates.toArray(),
      db.weeklyPlan.toArray(),
      db.shoppingChecks.toArray(),
    ]);

    const payload: BackupData = {
      version: 3,
      exportedAt: new Date().toISOString(),
      app: 'Samsara',
      profile: profileRows,
      foods,
      combos,
      mealLogs,
      weightLogs,
      dailyMetrics,
      dayTemplates,
      weeklyPlan,
      shoppingChecks,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `samsara-respaldo-${getTodayDateKey()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    onNotify('Respaldo JSON exportado correctamente.');
  }

  async function handleSelectImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    try {
      const text = await file.text();
      const parsed: unknown = JSON.parse(text);
      if (!isValidBackupPayload(parsed)) {
        onNotify('El archivo no tiene el formato válido de respaldo Samsara.', 'error');
        return;
      }
      setPendingBackup(parsed);
    } catch {
      onNotify('No se pudo leer el archivo JSON. Verifica que no esté dañado.', 'error');
    }
  }

  async function handleConfirmRestore() {
    if (!pendingBackup) return;
    const backup = pendingBackup;
    setPendingBackup(null);

    try {
      await db.transaction(
        'rw',
        [
          db.profile,
          db.foods,
          db.combos,
          db.mealLogs,
          db.weightLogs,
          db.dailyMetrics,
          db.dayTemplates,
          db.weeklyPlan,
          db.shoppingChecks,
        ],
        async () => {
          await Promise.all([
            db.profile.clear(),
            db.foods.clear(),
            db.combos.clear(),
            db.mealLogs.clear(),
            db.weightLogs.clear(),
            db.dailyMetrics.clear(),
            db.dayTemplates.clear(),
            db.weeklyPlan.clear(),
            db.shoppingChecks.clear(),
          ]);

          if (backup.profile.length > 0) {
            await db.profile.bulkPut(
              backup.profile.map((p) => ({ ...p, id: 'default' as const })),
            );
          }
          if (backup.foods.length > 0) {
            await db.foods.bulkPut(backup.foods);
          }
          if (backup.combos.length > 0) {
            await db.combos.bulkPut(backup.combos);
          }
          if (backup.mealLogs.length > 0) {
            await db.mealLogs.bulkPut(backup.mealLogs);
          }
          if (backup.weightLogs.length > 0) {
            await db.weightLogs.bulkPut(backup.weightLogs);
          }
          if (Array.isArray(backup.dailyMetrics) && backup.dailyMetrics.length > 0) {
            await db.dailyMetrics.bulkPut(backup.dailyMetrics);
          }
          if (Array.isArray(backup.dayTemplates) && backup.dayTemplates.length > 0) {
            await db.dayTemplates.bulkPut(backup.dayTemplates);
          }
          if (Array.isArray(backup.weeklyPlan) && backup.weeklyPlan.length > 0) {
            await db.weeklyPlan.bulkPut(backup.weeklyPlan);
          }
          if (Array.isArray(backup.shoppingChecks) && backup.shoppingChecks.length > 0) {
            await db.shoppingChecks.bulkPut(backup.shoppingChecks);
          }
        },
      );
      onNotify('Respaldo restaurado correctamente.');
    } catch {
      onNotify('Error al restaurar los datos en IndexedDB.', 'error');
    }
  }

  const showHabits = profile.mostrarHabitosHoy !== false;

  return (
    <div className="flex flex-col pb-24">
      <main className="flex-1 flex flex-col gap-section px-page-margin pt-gutter-lg">
        {/* 1. Datos base */}
        <section aria-labelledby="heading-datos-base" className="flex flex-col gap-gutter-md">
          <h1 id="heading-datos-base" className="font-headline text-headline-md text-on-surface">
            Datos base
          </h1>

          <article className="bg-surface-container border border-outline rounded-lg p-gutter-lg flex flex-col gap-gutter-md">
            <div className="grid grid-cols-2 gap-gutter-md">
              <div className="flex flex-col gap-gutter-xs">
                <label htmlFor="base-weight" className="font-label text-label-sm text-on-surface-variant">
                  Peso actual (kg)
                </label>
                <input
                  id="base-weight"
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min="30"
                  max="300"
                  value={pesoText}
                  onChange={(e) =>
                    handleNumericChange(e.target.value, setPesoText, 'pesoKg', 30, 300)
                  }
                  onBlur={() => setPesoText(String(profile.pesoKg))}
                  className="w-full min-h-[44px] px-gutter-md py-gutter-sm rounded-md bg-surface-container-high border border-outline font-title text-title-md text-on-surface tabular-nums focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex flex-col gap-gutter-xs">
                <label htmlFor="target-weight" className="font-label text-label-sm text-on-surface-variant">
                  Peso meta (kg, opc.)
                </label>
                <input
                  id="target-weight"
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min="30"
                  max="250"
                  placeholder="80.0"
                  value={pesoMetaText}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPesoMetaText(val);
                    if (val.trim() === '') {
                      void onUpdateProfile({ pesoMetaKg: undefined });
                      return;
                    }
                    const parsed = Number(val.replace(',', '.'));
                    if (Number.isFinite(parsed) && parsed >= 30 && parsed <= 250) {
                      void onUpdateProfile({ pesoMetaKg: parsed });
                    }
                  }}
                  className="w-full min-h-[44px] px-gutter-md py-gutter-sm rounded-md bg-surface-container-high border border-outline font-title text-title-md text-primary tabular-nums placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex flex-col gap-gutter-xs">
                <label htmlFor="base-height" className="font-label text-label-sm text-on-surface-variant">
                  Estatura (cm)
                </label>
                <input
                  id="base-height"
                  type="number"
                  inputMode="numeric"
                  min="120"
                  max="230"
                  value={estaturaText}
                  onChange={(e) =>
                    handleNumericChange(e.target.value, setEstaturaText, 'estaturaCm', 120, 230)
                  }
                  onBlur={() => setEstaturaText(String(profile.estaturaCm))}
                  className="w-full min-h-[44px] px-gutter-md py-gutter-sm rounded-md bg-surface-container-high border border-outline font-title text-title-md text-on-surface tabular-nums focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex flex-col gap-gutter-xs">
                <label htmlFor="base-age" className="font-label text-label-sm text-on-surface-variant">
                  Edad
                </label>
                <input
                  id="base-age"
                  type="number"
                  inputMode="numeric"
                  min="14"
                  max="100"
                  value={edadText}
                  onChange={(e) =>
                    handleNumericChange(e.target.value, setEdadText, 'edad', 14, 100)
                  }
                  onBlur={() => setEdadText(String(profile.edad))}
                  className="w-full min-h-[44px] px-gutter-md py-gutter-sm rounded-md bg-surface-container-high border border-outline font-title text-title-md text-on-surface tabular-nums focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-[120px_1fr] gap-gutter-md pt-gutter-xs">
              <div className="flex flex-col gap-gutter-xs">
                <span className="font-label text-label-sm text-on-surface-variant">Sexo</span>
                <div
                  role="group"
                  aria-label="Sexo biológico"
                  className="grid grid-cols-2 gap-gutter-xs p-gutter-xs rounded-md bg-surface-container-high border border-outline min-h-[44px]"
                >
                  {(['M', 'F'] as Sex[]).map((s) => {
                    const active = profile.sexo === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        aria-pressed={active}
                        onClick={() => void onUpdateProfile({ sexo: s })}
                        className={`rounded-sm font-label text-label-md transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                          active
                            ? 'bg-primary-container border border-primary text-on-primary-container'
                            : 'bg-transparent text-on-surface-variant hover:text-on-surface'
                        }`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-gutter-xs">
                <label htmlFor="activity-level" className="font-label text-label-sm text-on-surface-variant">
                  Nivel de actividad
                </label>
                <select
                  id="activity-level"
                  value={String(profile.factorActividad)}
                  onChange={(e) =>
                    void onUpdateProfile({
                      factorActividad: Number(e.target.value) as ActivityFactor,
                    })
                  }
                  className="w-full min-h-[44px] px-gutter-md py-gutter-sm rounded-md bg-surface-container-high border border-outline font-body text-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  {ACTIVITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={String(opt.value)}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </article>
        </section>

        {/* 2. Motor de metas */}
        <section aria-labelledby="heading-motor" className="flex flex-col gap-gutter-md">
          <h2 id="heading-motor" className="font-headline text-headline-md text-on-surface">
            Motor de metas
          </h2>

          <article className="bg-surface-container border border-outline rounded-lg p-gutter-lg flex flex-col gap-gutter-lg">
            {/* Deslizador 1: Déficit calórico */}
            <div className="flex flex-col gap-gutter-sm">
              <div className="flex items-center justify-between gap-gutter-sm">
                <label htmlFor="deficit-slider" className="font-label text-label-md text-on-surface">
                  Déficit calórico diario
                </label>
                <span className="font-label text-label-md text-secondary tabular-nums">
                  {profile.deficitKcal} kcal
                </span>
              </div>
              <input
                id="deficit-slider"
                type="range"
                min={200}
                max={600}
                step={25}
                value={profile.deficitKcal}
                onChange={(e) =>
                  void onUpdateProfile({ deficitKcal: Number(e.target.value) })
                }
                className="w-full h-2 rounded-full bg-track cursor-pointer"
              />
              <div className="flex items-center justify-between">
                <span className="font-body text-body-sm text-on-surface-variant tabular-nums">
                  200 kcal
                </span>
                <span className="font-body text-body-sm text-on-surface-variant tabular-nums">
                  600 kcal
                </span>
              </div>
            </div>

            {/* Deslizador 2: Proteína objetivo */}
            <div className="flex flex-col gap-gutter-sm pt-gutter-sm border-t border-outline-variant">
              <div className="flex items-center justify-between gap-gutter-sm">
                <label htmlFor="protein-slider" className="font-label text-label-md text-on-surface">
                  Proteína objetivo
                </label>
                <span className="font-label text-label-md text-primary tabular-nums">
                  {profile.proteinaGPorKg.toFixed(1)} g/kg
                </span>
              </div>
              <input
                id="protein-slider"
                type="range"
                min={1.6}
                max={2.4}
                step={0.1}
                value={profile.proteinaGPorKg}
                onChange={(e) =>
                  void onUpdateProfile({
                    proteinaGPorKg: Number(Number(e.target.value).toFixed(1)),
                  })
                }
                className="w-full h-2 rounded-full bg-track cursor-pointer"
              />
              <div className="flex items-center justify-between">
                <span className="font-body text-body-sm text-on-surface-variant tabular-nums">
                  1.6 g/kg
                </span>
                <span className="font-body text-body-sm text-on-surface-variant tabular-nums">
                  2.4 g/kg
                </span>
              </div>
            </div>

            {/* Aviso ámbar si alcanza piso seguro */}
            {targets.alcanzoPisoSeguro && (
              <div
                role="status"
                className="flex items-start gap-gutter-sm p-gutter-md rounded-md bg-warning-container border border-warning text-on-warning-container"
              >
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-warning" aria-hidden="true" />
                <p className="font-body text-body-sm text-pretty">
                  Tu déficit alcanzó el piso seguro ({formatKcal(targets.pisoSeguroKcal)} kcal).
                  Se protegió el objetivo calórico para evitar pérdida excesiva de masa muscular.
                </p>
              </div>
            )}

            {/* Tarjeta resumen en vivo */}
            <div className="bg-surface-container-high border border-outline rounded-md p-gutter-md flex flex-col gap-gutter-md">
              <div className="grid grid-cols-3 gap-gutter-sm text-center">
                <div className="flex flex-col gap-gutter-xs">
                  <span className="font-label text-label-sm text-on-surface-variant">
                    TDEE estimado
                  </span>
                  <span className="font-title text-title-md text-on-surface tabular-nums">
                    {formatKcal(targets.tdeeKcal)} kcal
                  </span>
                </div>

                <div className="flex flex-col gap-gutter-xs">
                  <span className="font-label text-label-sm text-on-surface-variant">
                    Calorías meta
                  </span>
                  <span
                    className={`font-title text-title-md tabular-nums ${
                      targets.alcanzoPisoSeguro ? 'text-warning' : 'text-secondary'
                    }`}
                  >
                    {formatKcal(targets.caloriasObjetivo)} kcal
                  </span>
                </div>

                <div className="flex flex-col gap-gutter-xs">
                  <span className="font-label text-label-sm text-on-surface-variant">
                    Piso seguro (TMB)
                  </span>
                  <span className="font-title text-title-md text-on-surface tabular-nums">
                    {formatKcal(targets.pisoSeguroKcal)} kcal
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-gutter-sm text-center pt-gutter-md border-t border-outline-variant">
                <div className="flex flex-col gap-gutter-xs">
                  <span className="font-label text-label-sm text-on-surface-variant">
                    Proteína
                  </span>
                  <span className="font-title text-title-md text-primary tabular-nums">
                    {targets.proteinaG} g
                  </span>
                </div>

                <div className="flex flex-col gap-gutter-xs">
                  <span className="font-label text-label-sm text-on-surface-variant">
                    Carbohidratos
                  </span>
                  <span className="font-title text-title-md text-on-surface tabular-nums">
                    {targets.carbohidratosG} g
                  </span>
                </div>

                <div className="flex flex-col gap-gutter-xs">
                  <span className="font-label text-label-sm text-on-surface-variant">Grasas</span>
                  <span className="font-title text-title-md text-on-surface tabular-nums">
                    {targets.grasasG} g
                  </span>
                </div>
              </div>

              <div className="pt-gutter-sm border-t border-outline-variant text-center">
                <span className="font-body text-body-sm text-on-surface-variant tabular-nums">
                  Ritmo estimado: ~{targets.perdidaSemanalEstimadaKg.toFixed(2)} kg/semana
                </span>
              </div>
            </div>
          </article>
        </section>

        {/* 3. Hidratación y pasos diarios */}
        <section aria-labelledby="heading-habitos" className="flex flex-col gap-gutter-md">
          <h2 id="heading-habitos" className="font-headline text-headline-md text-on-surface">
            Hidratación y pasos
          </h2>

          <article className="bg-surface-container border border-outline rounded-lg p-gutter-lg flex flex-col gap-gutter-md">
            <label className="flex items-center justify-between gap-gutter-md cursor-pointer select-none">
              <span className="font-label text-label-md text-on-surface">
                Mostrar barra compacta en "Hoy"
              </span>
              <input
                type="checkbox"
                checked={showHabits}
                onChange={(e) =>
                  void onUpdateProfile({ mostrarHabitosHoy: e.target.checked })
                }
                className="w-5 h-5 rounded accent-primary bg-surface-container-high border-outline"
              />
            </label>

            {showHabits && (
              <div className="grid grid-cols-2 gap-gutter-md pt-gutter-sm border-t border-outline-variant">
                <div className="flex flex-col gap-gutter-xs">
                  <label htmlFor="meta-agua" className="font-label text-label-sm text-on-surface-variant">
                    Meta agua (ml)
                  </label>
                  <input
                    id="meta-agua"
                    type="number"
                    inputMode="numeric"
                    step="250"
                    min="500"
                    max="8000"
                    value={aguaMetaText}
                    onChange={(e) =>
                      handleNumericChange(e.target.value, setAguaMetaText, 'metaAguaMl', 500, 8000)
                    }
                    onBlur={() => setAguaMetaText(String(profile.metaAguaMl ?? 2500))}
                    className="w-full min-h-[44px] px-gutter-md rounded-md bg-surface-container-high border border-outline font-title text-title-md text-secondary tabular-nums focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="flex flex-col gap-gutter-xs">
                  <label htmlFor="meta-pasos" className="font-label text-label-sm text-on-surface-variant">
                    Meta pasos diarios
                  </label>
                  <input
                    id="meta-pasos"
                    type="number"
                    inputMode="numeric"
                    step="500"
                    min="1000"
                    max="40000"
                    value={pasosMetaText}
                    onChange={(e) =>
                      handleNumericChange(
                        e.target.value,
                        setPasosMetaText,
                        'metaPasos',
                        1000,
                        40000,
                      )
                    }
                    onBlur={() => setPasosMetaText(String(profile.metaPasos ?? 8000))}
                    className="w-full min-h-[44px] px-gutter-md rounded-md bg-surface-container-high border border-outline font-title text-title-md text-primary tabular-nums focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
            )}
          </article>
        </section>

        {/* 4. Respaldo local (Offline) */}
        <section aria-labelledby="heading-respaldo" className="flex flex-col gap-gutter-md">
          <h2 id="heading-respaldo" className="font-headline text-headline-md text-on-surface">
            Respaldo local (Offline)
          </h2>

          <article className="bg-surface-container border border-outline rounded-lg p-gutter-lg flex flex-col gap-gutter-md">
            <div className="grid grid-cols-2 gap-gutter-md">
              <button
                type="button"
                onClick={() => void handleExportJson()}
                className="inline-flex items-center justify-center gap-gutter-xs min-h-[44px] px-gutter-md py-gutter-sm rounded-md bg-surface-container-high border border-outline text-on-surface font-label text-label-md transition-colors duration-100 hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-95"
              >
                <Download className="w-[18px] h-[18px]" aria-hidden="true" />
                <span>Exportar JSON</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center justify-center gap-gutter-xs min-h-[44px] px-gutter-md py-gutter-sm rounded-md bg-surface-container-high border border-outline text-on-surface font-label text-label-md transition-colors duration-100 hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-95"
              >
                <Upload className="w-[18px] h-[18px]" aria-hidden="true" />
                <span>Importar JSON</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                onChange={handleSelectImportFile}
                className="hidden"
              />
            </div>

            <p className="font-body text-body-sm text-on-surface-variant text-pretty">
              Tus datos, pesajes, hábitos y registros de comidas se guardan localmente en este dispositivo.
            </p>
          </article>
        </section>

        {/* Identidad de marca */}
        <footer className="pt-gutter-sm pb-gutter-xs flex flex-col items-center gap-gutter-xs opacity-85">
          <SamsaraLogo size="sm" />
          <span className="font-mono text-[11px] text-on-surface-variant">
            PWA 100% offline · Datos locales
          </span>
        </footer>
      </main>

      <ConfirmModal
        open={pendingBackup !== null}
        title="Restaurar respaldo local"
        description={
          pendingBackup
            ? `Se reemplazarán los datos actuales con ${pendingBackup.foods.length} alimentos, ${pendingBackup.combos.length} combos, ${pendingBackup.mealLogs.length} comidas registradas y ${pendingBackup.weightLogs.length} pesajes. ¿Deseas continuar?`
            : ''
        }
        confirmLabel="Restaurar"
        cancelLabel="Cancelar"
        tone="warning"
        onConfirm={() => void handleConfirmRestore()}
        onCancel={() => setPendingBackup(null)}
      />
    </div>
  );
}
