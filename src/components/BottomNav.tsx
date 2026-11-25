import {
  CalendarDays,
  PlusCircle,
  Settings,
  TrendingUp,
  UtensilsCrossed,
} from 'lucide-react';

export type AppTab = 'today' | 'log' | 'menus' | 'progress' | 'settings';

interface BottomNavProps {
  activeTab: AppTab;
  onChangeTab: (tab: AppTab) => void;
}

const TABS: {
  id: AppTab;
  label: string;
  Icon: typeof CalendarDays;
}[] = [
  { id: 'today', label: 'Hoy', Icon: CalendarDays },
  { id: 'log', label: 'Registrar', Icon: PlusCircle },
  { id: 'menus', label: 'Menús', Icon: UtensilsCrossed },
  { id: 'progress', label: 'Progreso', Icon: TrendingUp },
  { id: 'settings', label: 'Ajustes', Icon: Settings },
];

export function BottomNav({ activeTab, onChangeTab }: BottomNavProps) {
  return (
    <nav
      aria-label="Navegación principal"
      className="fixed bottom-0 left-0 right-0 z-30 flex justify-center pointer-events-none"
    >
      <div className="pointer-events-auto w-full max-w-[480px] bg-surface-container border-t border-outline px-gutter-xs pt-gutter-xs pb-[max(8px,env(safe-area-inset-bottom))]">
        <div role="tablist" aria-label="Navegación principal" className="grid grid-cols-5 gap-0.5">
          {TABS.map(({ id, label, Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                role="tab"
                type="button"
                aria-selected={active}
                tabIndex={active ? 0 : -1}
                onClick={() => onChangeTab(id)}
                className={`flex flex-col items-center justify-center gap-1 min-h-[48px] py-1.5 rounded-md transition-colors duration-100 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  active
                    ? 'text-primary'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <Icon
                  className="w-[21px] h-[21px]"
                  strokeWidth={active ? 2.4 : 1.9}
                  aria-hidden="true"
                />
                <span className="font-label text-label-sm">{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
