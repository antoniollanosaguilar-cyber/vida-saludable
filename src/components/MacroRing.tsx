interface MacroRingProps {
  progress: number; // 0 to 1 (clamped visually)
  strokeClass: string;
  centerPrimary: string;
  centerPrimaryClass?: string;
  centerSecondary: string;
  centerSecondaryClass?: string;
  title: string;
  subtitle: string;
  subtitleClass?: string;
  ariaLabel: string;
}

const RADIUS = 50;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function MacroRing({
  progress,
  strokeClass,
  centerPrimary,
  centerPrimaryClass = 'text-on-surface',
  centerSecondary,
  centerSecondaryClass = 'text-on-surface-variant',
  title,
  subtitle,
  subtitleClass = 'text-on-surface-variant',
  ariaLabel,
}: MacroRingProps) {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
  const dashOffset = CIRCUMFERENCE * (1 - clamped);

  return (
    <div className="flex flex-col items-center text-center gap-gutter-sm">
      <div
        className="relative w-[124px] h-[124px] flex items-center justify-center"
        role="img"
        aria-label={ariaLabel}
      >
        <svg className="w-[124px] h-[124px] -rotate-90" viewBox="0 0 120 120" aria-hidden="true">
          <circle
            cx="60"
            cy="60"
            r={RADIUS}
            fill="none"
            className="stroke-track"
            strokeWidth="9"
          />
          <circle
            cx="60"
            cy="60"
            r={RADIUS}
            fill="none"
            className={strokeClass}
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE.toFixed(2)}
            strokeDashoffset={dashOffset.toFixed(2)}
            style={{
              transition:
                'stroke-dashoffset 300ms cubic-bezier(0.2, 0, 0, 1), stroke 150ms ease-out',
            }}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center px-gutter-xs">
          <span
            className={`font-display text-display-lg-mobile tabular-nums ${centerPrimaryClass}`}
          >
            {centerPrimary}
          </span>
          <span className={`font-label text-label-sm tabular-nums ${centerSecondaryClass}`}>
            {centerSecondary}
          </span>
        </div>
      </div>

      <div className="flex flex-col items-center gap-gutter-xs">
        <span className="font-label text-label-md text-on-surface">{title}</span>
        <span className={`font-body text-body-sm tabular-nums ${subtitleClass}`}>
          {subtitle}
        </span>
      </div>
    </div>
  );
}
