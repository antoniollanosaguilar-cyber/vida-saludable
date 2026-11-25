import { useId } from 'react';

interface SamsaraMarkProps {
  size?: number;
  variant?: 'color' | 'mono';
  className?: string;
}

const S_PATH = 'M 65.5 23.5 A 17.5 17.5 0 1 0 50 50 A 17.5 17.5 0 1 1 34.5 76.5';

export function SamsaraMark({
  size = 28,
  variant = 'color',
  className = '',
}: SamsaraMarkProps) {
  const uid = useId();
  const topClipId = `samsara-top-${uid}`;
  const bottomClipId = `samsara-bot-${uid}`;

  const topColor = variant === 'mono' ? '#F1F5F9' : '#10B981';
  const bottomColor = variant === 'mono' ? '#94A3B8' : '#38BDF8';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <defs>
        <clipPath id={topClipId}>
          <polygon points="0,0 100,0 100,28 0,66" />
        </clipPath>
        <clipPath id={bottomClipId}>
          <polygon points="0,72 100,34 100,100 0,100" />
        </clipPath>
      </defs>
      <path
        d={S_PATH}
        stroke={topColor}
        strokeWidth="12.5"
        strokeLinecap="round"
        clipPath={`url(#${topClipId})`}
      />
      <path
        d={S_PATH}
        stroke={bottomColor}
        strokeWidth="12.5"
        strokeLinecap="round"
        clipPath={`url(#${bottomClipId})`}
      />
    </svg>
  );
}

interface SamsaraLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function SamsaraLogo({ size = 'md', className = '' }: SamsaraLogoProps) {
  const markSize = size === 'sm' ? 24 : size === 'lg' ? 40 : 30;
  const textClass =
    size === 'sm'
      ? 'text-[14px] tracking-[0.16em]'
      : size === 'lg'
        ? 'text-[22px] tracking-[0.18em]'
        : 'text-[16px] tracking-[0.16em]';

  return (
    <span className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <SamsaraMark size={markSize} />
      <span className={`font-display font-bold text-on-surface leading-none ${textClass}`}>
        SAMSARA
      </span>
    </span>
  );
}
