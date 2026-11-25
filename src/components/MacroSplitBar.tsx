import { getMacroDistribution } from '../engine/menuEngine';

interface MacroSplitBarProps {
  proteinaG: number;
  carbohidratosG: number;
  grasasG: number;
  showLabels?: boolean;
}

export function MacroSplitBar({
  proteinaG,
  carbohidratosG,
  grasasG,
  showLabels = false,
}: MacroSplitBarProps) {
  const { protPct, carbsPct, fatsPct } = getMacroDistribution(
    proteinaG,
    carbohidratosG,
    grasasG,
  );

  return (
    <div className="flex flex-col gap-1">
      <div
        className="w-full h-1 rounded-full bg-track overflow-hidden flex"
        aria-label={`Distribución de macros: ${protPct}% proteína, ${carbsPct}% carbohidratos, ${fatsPct}% grasas`}
      >
        {protPct > 0 && (
          <div className="h-full bg-primary" style={{ width: `${protPct}%` }} />
        )}
        {carbsPct > 0 && (
          <div className="h-full bg-secondary" style={{ width: `${carbsPct}%` }} />
        )}
        {fatsPct > 0 && (
          <div className="h-full bg-warning" style={{ width: `${fatsPct}%` }} />
        )}
      </div>

      {showLabels && (
        <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-on-surface-variant">
          <span className="text-primary">P {protPct}%</span>
          <span className="text-secondary">C {carbsPct}%</span>
          <span className="text-warning">G {fatsPct}%</span>
        </div>
      )}
    </div>
  );
}
