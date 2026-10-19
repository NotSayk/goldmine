import { dwarfLook, type DwarfSymbol } from '../i18n/fr';

function Symbol({ symbol, ink }: { symbol: DwarfSymbol; ink: string }) {
  switch (symbol) {
    case 'circle':
      return <circle cx="20" cy="22" r="6" fill={ink} />;
    case 'square':
      return <rect x="14.5" y="16.5" width="11" height="11" rx="1.5" fill={ink} />;
    case 'triangle':
      return <path d="M20 14.5 L27 27.5 H13 Z" fill={ink} strokeLinejoin="round" />;
    case 'diamond':
      return <path d="M20 14 L27 22 L20 30 L13 22 Z" fill={ink} />;
    case 'star':
      return (
        <path
          d="M20 13.5 L22.4 19 L28.3 19.4 L23.8 23.2 L25.2 29 L20 25.9 L14.8 29 L16.2 23.2 L11.7 19.4 L17.6 19 Z"
          fill={ink}
        />
      );
    case 'cross':
      return (
        <path
          d="M17.5 14.5 H22.5 V19.5 H27.5 V24.5 H22.5 V29.5 H17.5 V24.5 H12.5 V19.5 H17.5 Z"
          fill={ink}
        />
      );
  }
}

/**
 * Disque d'un nain : couleur + symbole (lisible sans distinguer les couleurs)
 * et un petit casque de mineur.
 */
export function DwarfDisc({
  color,
  size = 32,
  label,
  className,
}: {
  color: number;
  size?: number;
  label?: string;
  className?: string;
}) {
  const look = dwarfLook(color);
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 40 40"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <circle cx="20" cy="21" r="17.5" fill="rgba(0,0,0,0.28)" />
      <circle cx="20" cy="20" r="17" fill={look.color} stroke="#14161c" strokeWidth="2.2" />
      <path
        d="M8.5 13 A13 13 0 0 1 31.5 13"
        fill="none"
        stroke="rgba(255,255,255,0.45)"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      {/* Casque de mineur */}
      <path d="M13 11.5 Q20 4 27 11.5 Z" fill="#14161c" opacity="0.85" />
      <circle cx="20" cy="8.6" r="1.6" fill="#fff6c8" />
      <Symbol symbol={look.symbol} ink={look.ink} />
    </svg>
  );
}
