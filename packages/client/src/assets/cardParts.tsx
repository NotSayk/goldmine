/**
 * Éléments de dessin partagés par les cartes et la carte du dragon (dessins
 * originaux). Les dégradés `url(#card-…)` sont déclarés par `CardDefs`.
 */

export const STROKE = '#14161c';

/** Pépite placée dans les illustrations de cartes. */
export function Nugget({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path
        d="M-7 4 L-5 -3 L0 -6 L6 -4 L8 2 L5 6 L-3 7 Z"
        fill="url(#card-gold)"
        stroke="var(--gold-ink)"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M-3.5 -2 L0 -4 L3 -3"
        fill="none"
        stroke="#fffbe6"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </g>
  );
}

/** Éclat de lumière à quatre branches. */
export function Sparkle({ x, y, size = 1 }: { x: number; y: number; size?: number }) {
  return (
    <path
      transform={`translate(${x} ${y}) scale(${size})`}
      d="M0 -3 Q0.4 -0.4 3 0 Q0.4 0.4 0 3 Q-0.4 0.4 -3 0 Q-0.4 -0.4 0 -3 Z"
      fill="#fff8d6"
    />
  );
}

/** Traverses tous les 7,5 : leur motif se poursuit d'une carte à la suivante. */
const SLEEPERS = Array.from({ length: 10 }, (_, k) => -3.75 + 7.5 * k);

/**
 * Voie ferrée vue de côté, à la même hauteur sur toutes les cartes : posées
 * côte à côte sur la piste, les cartes forment une seule voie continue, du
 * dragon jusqu'au butoir de la Sortie. Elle déborde du cadre 60 × 84 pour
 * toucher les bords de la carte.
 */
export function Rails({
  burned = false,
  from = -10,
  ballast,
}: {
  burned?: boolean;
  /** Début de la voie (à gauche) ; elle va toujours jusqu'au bord droit. */
  from?: number;
  ballast?: string;
}) {
  return (
    <g>
      <path
        d={`M${from} 71.6 H70 V78 H${from} Z`}
        fill={ballast ?? (burned ? '#2a0f08' : '#141c2b')}
        fillOpacity="0.6"
      />
      <path d={`M${from} 78 H70`} stroke={STROKE} strokeWidth="1" />
      {SLEEPERS.filter((x) => x > from + 1).map((x) => (
        <rect
          key={x}
          x={x - 1.4}
          y="71.2"
          width="2.8"
          height="6.4"
          rx="0.5"
          fill={burned ? '#24130d' : 'url(#card-wood-h)'}
          stroke={STROKE}
          strokeWidth="0.5"
        />
      ))}
      <path d={`M${from} 72.8 H70`} stroke={burned ? '#4a3430' : '#7d8597'} strokeWidth="1.2" />
      <path d={`M${from} 76.2 H70`} stroke={burned ? '#5c403a' : '#b3bccd'} strokeWidth="1.6" />
      <path d={`M${from} 77.1 H70`} stroke="#000" strokeOpacity="0.45" strokeWidth="0.6" />
    </g>
  );
}
