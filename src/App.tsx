import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db/database';
import { DEFAULT_PROFILE, ensureSeedData } from './db/seedData';
import { calculateDailyTargets } from './engine/nutritionEngine';
import type {
  CookState,
  DayMenuTemplate,
  FoodItem,
  MealCombo,
  MealLogEntry,
  MealSlot,
  UserProfile,
  WeeklyPlanAssignment,
  WeightEntry,
} from './types/models';
import { BottomNav, type AppTab } from './components/BottomNav';
import { ToastHost, type ToastMessage } from './components/ToastHost';
import { QuickWeightModal } from './components/QuickWeightModal';
import { TodayPage } from './pages/TodayPage';
import { LogPage } from './pages/LogPage';
import { MenusPage } from './pages/MenusPage';
import { ProgressPage } from './pages/ProgressPage';
import { SettingsPage } from './pages/SettingsPage';
import { getTodayDateKey, MEAL_SLOT_LABELS } from './utils/formatters';

export function App() {
  const [ready, setReady] = useState(false);
  const [activeTab, setActiveTab] = useState<AppTab>('today');
  const [todayKey] = useState<string>(() => getTodayDateKey());
  const [selectedDate, setSelectedDate] = useState<string>(() => getTodayDateKey());
  const [preselectedSlot, setPreselectedSlot] = useState<MealSlot | null>(null);
  const [quickWeightOpen, setQuickWeightOpen] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let active = true;
    ensureSeedData()
      .then(() => {
        if (active) setReady(true);
      })
      .catch(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const showToast = useCallback(
    (
      text: string,
      options?: {
        tone?: ToastMessage['tone'];
        actionLabel?: string;
        onAction?: () => void;
      },
    ) => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
      setToast({
        id: Date.now(),
        text,
        tone: options?.tone ?? 'success',
        actionLabel: options?.actionLabel,
        onAction: options?.onAction,
      });
      toastTimerRef.current = window.setTimeout(() => {
        setToast(null);
      }, 4200);
    },
    [],
  );

  const dismissToast = useCallback(() => {
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setToast(null);
  }, []);

  const dbProfile = useLiveQuery(() => db.profile.get('default'), []);
  const profile: UserProfile = dbProfile ?? DEFAULT_PROFILE;

  const selectedDayWeight = useLiveQuery(
    () => db.weightLogs.get(selectedDate),
    [selectedDate],
  );

  const targets = useMemo(() => calculateDailyTargets(profile), [profile]);

  const handleUpdateProfile = useCallback(
    async (patch: Partial<UserProfile>) => {
      const current = (await db.profile.get('default')) ?? DEFAULT_PROFILE;
      await db.profile.put({
        ...current,
        ...patch,
        id: 'default',
        updatedAt: Date.now(),
      });
    },
    [],
  );

  const handleApplyCoachDeficit = useCallback(
    async (newDeficitKcal: number, reason: string) => {
      const previousDeficit = profile.deficitKcal;
      await handleUpdateProfile({ deficitKcal: newDeficitKcal });
      showToast(`Déficit ajustado a ${newDeficitKcal} kcal (${reason})`, {
        tone: 'success',
        actionLabel: 'Deshacer',
        onAction: () => {
          void handleUpdateProfile({ deficitKcal: previousDeficit });
        },
      });
    },
    [profile.deficitKcal, handleUpdateProfile, showToast],
  );

  const handleSaveWeight = useCallback(
    async (fecha: string, pesoKg: number, syncProfile: boolean) => {
      await db.weightLogs.put({ fecha, pesoKg });
      if (syncProfile) {
        await handleUpdateProfile({ pesoKg });
      }
      showToast(`Peso guardado: ${pesoKg.toFixed(1)} kg`);
    },
    [handleUpdateProfile, showToast],
  );

  const handleDeleteWeight = useCallback(
    async (entry: WeightEntry) => {
      await db.weightLogs.delete(entry.fecha);
      showToast(`Pesaje eliminado (${entry.pesoKg.toFixed(1)} kg)`, {
        tone: 'info',
        actionLabel: 'Deshacer',
        onAction: () => {
          void db.weightLogs.put(entry);
        },
      });
    },
    [showToast],
  );

  const handleUpdateDailyMetric = useCallback(
    async (fecha: string, patch: { aguaMl?: number; pasos?: number }) => {
      const current = (await db.dailyMetrics.get(fecha)) ?? {
        fecha,
        aguaMl: 0,
        pasos: 0,
      };
      await db.dailyMetrics.put({
        ...current,
        ...patch,
        fecha,
      });
    },
    [],
  );

  const handleCopyMealsFromYesterday = useCallback(
    async (entries: MealLogEntry[], label: string) => {
      if (entries.length === 0) return;
      const now = Date.now();
      const clones: Omit<MealLogEntry, 'id'>[] = entries.map((e, idx) => ({
        fecha: selectedDate,
        slot: e.slot,
        nombre: e.nombre,
        cantidadTexto: e.cantidadTexto,
        kcal: e.kcal,
        proteinaG: e.proteinaG,
        carbohidratosG: e.carbohidratosG,
        grasasG: e.grasasG,
        createdAt: now + idx,
        foodId: e.foodId,
        cantidadNum: e.cantidadNum,
        unidad: e.unidad,
        cookState: e.cookState,
      }));
      const insertedIds = (await db.mealLogs.bulkAdd(clones, {
        allKeys: true,
      })) as number[];

      showToast(`Copiadas ${clones.length} comidas (${label})`, {
        tone: 'success',
        actionLabel: 'Deshacer',
        onAction: () => {
          void db.mealLogs.bulkDelete(insertedIds);
        },
      });
    },
    [selectedDate, showToast],
  );

  const handleLogCombo = useCallback(
    async (
      combo: MealCombo,
      slot: MealSlot,
      override?: {
        scaleLabel?: string;
        kcal?: number;
        proteinaG?: number;
        carbohidratosG?: number;
        grasasG?: number;
      },
    ) => {
      const newEntry: Omit<MealLogEntry, 'id'> = {
        fecha: selectedDate,
        slot,
        nombre: combo.nombre,
        cantidadTexto:
          override?.scaleLabel ?? `Menú (${combo.ingredientes.length} ing.)`,
        kcal: override?.kcal ?? combo.totalKcal,
        proteinaG: override?.proteinaG ?? combo.totalProteinaG,
        carbohidratosG: override?.carbohidratosG ?? combo.totalCarbsG,
        grasasG: override?.grasasG ?? combo.totalGrasasG,
        createdAt: Date.now(),
      };
      const insertedId = await db.mealLogs.add(newEntry);

      showToast(`${combo.nombre} añadido a ${MEAL_SLOT_LABELS[slot]}`, {
        tone: 'success',
        actionLabel: 'Deshacer',
        onAction: () => {
          if (insertedId !== undefined) {
            void db.mealLogs.delete(insertedId);
          }
        },
      });
    },
    [selectedDate, showToast],
  );

  const handleApplyDayTemplate = useCallback(
    async (template: DayMenuTemplate) => {
      if (template.entries.length === 0) return;
      const now = Date.now();
      const rows: Omit<MealLogEntry, 'id'>[] = template.entries.map((e, idx) => ({
        fecha: selectedDate,
        slot: e.slot,
        nombre: e.nombre,
        cantidadTexto: e.cantidadTexto,
        kcal: e.kcal,
        proteinaG: e.proteinaG,
        carbohidratosG: e.carbohidratosG,
        grasasG: e.grasasG,
        createdAt: now + idx,
        foodId: e.foodId,
        cantidadNum: e.cantidadNum,
        unidad: e.unidad,
        cookState: e.cookState,
      }));
      const insertedIds = (await db.mealLogs.bulkAdd(rows, {
        allKeys: true,
      })) as number[];

      showToast(`Plantilla "${template.nombre}" cargada (${rows.length} comidas)`, {
        tone: 'success',
        actionLabel: 'Deshacer',
        onAction: () => {
          void db.mealLogs.bulkDelete(insertedIds);
        },
      });
    },
    [selectedDate, showToast],
  );

  const handleApplyWeeklyDayToDate = useCallback(
    async (assignments: WeeklyPlanAssignment[], dayLabel: string) => {
      if (assignments.length === 0) return;
      const now = Date.now();
      const rows: Omit<MealLogEntry, 'id'>[] = assignments.map((a, idx) => ({
        fecha: selectedDate,
        slot: a.slot,
        nombre: a.nombre,
        cantidadTexto: `Plan ${dayLabel} (${a.ingredientes.length} ing.)`,
        kcal: a.kcal,
        proteinaG: a.proteinaG,
        carbohidratosG: a.carbohidratosG,
        grasasG: a.grasasG,
        createdAt: now + idx,
      }));
      const insertedIds = (await db.mealLogs.bulkAdd(rows, {
        allKeys: true,
      })) as number[];

      showToast(`Plan del ${dayLabel} cargado (${rows.length} comidas)`, {
        tone: 'success',
        actionLabel: 'Deshacer',
        onAction: () => {
          void db.mealLogs.bulkDelete(insertedIds);
        },
      });
    },
    [selectedDate, showToast],
  );

  const handleLogFood = useCallback(
    async (payload: {
      food: FoodItem;
      slot: MealSlot;
      amount: number;
      cookState?: CookState;
      cantidadTexto: string;
      kcal: number;
      proteinaG: number;
      carbohidratosG: number;
      grasasG: number;
    }) => {
      const insertedId = await db.mealLogs.add({
        fecha: selectedDate,
        slot: payload.slot,
        nombre: payload.food.nombre,
        cantidadTexto: payload.cantidadTexto,
        kcal: payload.kcal,
        proteinaG: payload.proteinaG,
        carbohidratosG: payload.carbohidratosG,
        grasasG: payload.grasasG,
        createdAt: Date.now(),
        foodId: payload.food.id,
        cantidadNum: payload.amount,
        unidad: payload.food.unidadBase,
        cookState: payload.cookState,
      });

      showToast(`${payload.food.nombre} añadido a ${MEAL_SLOT_LABELS[payload.slot]}`, {
        tone: 'success',
        actionLabel: 'Deshacer',
        onAction: () => {
          if (insertedId !== undefined) {
            void db.mealLogs.delete(insertedId);
          }
        },
      });
    },
    [selectedDate, showToast],
  );

  const handleQuickAdd = useCallback(
    async (payload: {
      nombre: string;
      slot: MealSlot;
      kcal: number;
      proteinaG: number;
      carbohidratosG: number;
      grasasG: number;
    }) => {
      const insertedId = await db.mealLogs.add({
        fecha: selectedDate,
        slot: payload.slot,
        nombre: payload.nombre,
        cantidadTexto: 'Quick Add',
        kcal: payload.kcal,
        proteinaG: payload.proteinaG,
        carbohidratosG: payload.carbohidratosG,
        grasasG: payload.grasasG,
        createdAt: Date.now(),
      });

      showToast(`${payload.nombre} (${payload.kcal} kcal) añadido`, {
        tone: 'success',
        actionLabel: 'Deshacer',
        onAction: () => {
          if (insertedId !== undefined) {
            void db.mealLogs.delete(insertedId);
          }
        },
      });
    },
    [selectedDate, showToast],
  );

  const handleUpdateMeal = useCallback(
    async (updated: MealLogEntry) => {
      if (updated.id === undefined) return;
      await db.mealLogs.put(updated);
      showToast(`Actualizado: ${updated.nombre}`);
    },
    [showToast],
  );

  const handleDeleteMeal = useCallback(
    async (entry: MealLogEntry) => {
      if (entry.id === undefined) return;
      await db.mealLogs.delete(entry.id);
      const snapshot: Omit<MealLogEntry, 'id'> = {
        fecha: entry.fecha,
        slot: entry.slot,
        nombre: entry.nombre,
        cantidadTexto: entry.cantidadTexto,
        kcal: entry.kcal,
        proteinaG: entry.proteinaG,
        carbohidratosG: entry.carbohidratosG,
        grasasG: entry.grasasG,
        createdAt: entry.createdAt,
        foodId: entry.foodId,
        cantidadNum: entry.cantidadNum,
        unidad: entry.unidad,
        cookState: entry.cookState,
      };
      showToast(`Eliminado: ${entry.nombre}`, {
        tone: 'info',
        actionLabel: 'Deshacer',
        onAction: () => {
          void db.mealLogs.add(snapshot);
        },
      });
    },
    [showToast],
  );

  if (!ready) {
    return (
      <div className="min-h-screen max-w-[480px] mx-auto bg-surface flex items-center justify-center">
        <div className="flex flex-col items-center gap-gutter-sm">
          <div className="w-8 h-8 rounded-full border-2 border-track border-t-primary animate-spin" />
          <span className="font-label text-label-md text-on-surface-variant">
            Cargando Samsara...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-[480px] mx-auto flex flex-col bg-surface">
      {activeTab === 'today' && (
        <TodayPage
          selectedDate={selectedDate}
          todayKey={todayKey}
          profile={profile}
          targets={targets}
          onChangeDate={setSelectedDate}
          onOpenQuickWeight={() => setQuickWeightOpen(true)}
          onAddForSlot={(slot) => {
            setPreselectedSlot(slot);
            setActiveTab('log');
          }}
          onCopyMealsFromYesterday={handleCopyMealsFromYesterday}
          onUpdateMeal={handleUpdateMeal}
          onDeleteMeal={handleDeleteMeal}
          onUpdateDailyMetric={handleUpdateDailyMetric}
          onNotify={(text, tone) => showToast(text, { tone })}
        />
      )}

      {activeTab === 'log' && (
        <LogPage
          selectedDate={selectedDate}
          todayKey={todayKey}
          preselectedSlot={preselectedSlot}
          onClearPreselectedSlot={() => setPreselectedSlot(null)}
          onOpenMenusTab={() => setActiveTab('menus')}
          onLogCombo={handleLogCombo}
          onLogFood={handleLogFood}
          onQuickAdd={handleQuickAdd}
          onNotify={(text, tone) => showToast(text, { tone })}
        />
      )}

      {activeTab === 'menus' && (
        <MenusPage
          selectedDate={selectedDate}
          todayKey={todayKey}
          targets={targets}
          onLogCombo={handleLogCombo}
          onApplyDayTemplate={handleApplyDayTemplate}
          onApplyWeeklyDayToDate={handleApplyWeeklyDayToDate}
          onNotify={(text, tone) => showToast(text, { tone })}
        />
      )}

      {activeTab === 'progress' && (
        <ProgressPage
          todayKey={todayKey}
          profile={profile}
          targets={targets}
          onSaveWeight={handleSaveWeight}
          onDeleteWeight={handleDeleteWeight}
          onApplyCoachDeficit={handleApplyCoachDeficit}
        />
      )}

      {activeTab === 'settings' && (
        <SettingsPage
          profile={profile}
          targets={targets}
          onUpdateProfile={handleUpdateProfile}
          onNotify={(text, tone) => showToast(text, { tone })}
        />
      )}

      <QuickWeightModal
        open={quickWeightOpen}
        dateKey={selectedDate}
        todayKey={todayKey}
        initialWeightKg={selectedDayWeight?.pesoKg ?? profile.pesoKg}
        onClose={() => setQuickWeightOpen(false)}
        onSave={async (pesoKg, syncProfile) => {
          await handleSaveWeight(selectedDate, pesoKg, syncProfile);
        }}
      />

      <ToastHost toast={toast} onDismiss={dismissToast} />

      <BottomNav
        activeTab={activeTab}
        onChangeTab={(nextTab) => {
          if (nextTab !== 'log') {
            setPreselectedSlot(null);
          }
          setActiveTab(nextTab);
        }}
      />
    </div>
  );
}

export default App;
