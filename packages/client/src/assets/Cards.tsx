import { Fragment, type ReactNode } from 'react';
import type { ExitActionKind, ExtractionKind, TrackCardKind } from '@pepite/engine';
import { EXIT_LABELS } from '../i18n/fr';
import { DragonHead } from './Dragon';

const STROKE = '#14161c';

/**
 * Dégradés, motifs et découpes partagés par toutes les cartes, déclarés une
 * seule fois dans la page (toujours rendus : jamais dans un élément masqué).
 * Les cartes y renvoient par `url(#card-…)`.
 */
export function CardDefs() {
  return (
    <svg className="card-defs" width="0" height="0" aria-hidden focusable="false">
      <defs>
        {/* Mine : recto bleu, verso rouge */}
        <linearGradient id="card-mine-blue" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5b90d6" />
          <stop offset="0.55" stopColor="#3567a9" />
          <stop offset="1" stopColor="#1f3c6b" />
        </linearGradient>
        <linearGradient id="card-mine-red" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e3673f" />
          <stop offset="0.55" stopColor="#b3381f" />
          <stop offset="1" stopColor="#6a1a0e" />
        </linearGradient>
        <radialGradient id="card-tunnel-blue" cx="0.5" cy="0.62" r="0.72">
          <stop offset="0" stopColor="#f2c06a" stopOpacity="0.6" />
          <stop offset="0.28" stopColor="#3b5884" />
          <stop offset="1" stopColor="#0a1427" />
        </radialGradient>
        <radialGradient id="card-tunnel-red" cx="0.5" cy="0.85" r="0.8">
          <stop offset="0" stopColor="#ffd36b" />
          <stop offset="0.3" stopColor="#ff7a2a" />
          <stop offset="0.62" stopColor="#821d0b" />
          <stop offset="1" stopColor="#260603" />
        </radialGradient>
        <linearGradient id="card-wood" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#4e2f14" />
          <stop offset="0.45" stopColor="#9a6634" />
          <stop offset="1" stopColor="#4e2f14" />
        </linearGradient>
        <linearGradient id="card-wood-h" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a8723a" />
          <stop offset="1" stopColor="#5a3818" />
        </linearGradient>
        <linearGradient id="card-wood-burnt" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#120a08" />
          <stop offset="0.5" stopColor="#3d241a" />
          <stop offset="1" stopColor="#120a08" />
        </linearGradient>
        <linearGradient id="card-wood-burnt-h" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#47291d" />
          <stop offset="1" stopColor="#140b08" />
        </linearGradient>
        <radialGradient id="card-lamp-glow">
          <stop offset="0" stopColor="#ffe7a8" stopOpacity="0.95" />
          <stop offset="0.4" stopColor="#ffb547" stopOpacity="0.35" />
          <stop offset="1" stopColor="#ffb547" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="card-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff2b8" />
          <stop offset="0.4" stopColor="#ffcf4a" />
          <stop offset="1" stopColor="#c0820e" />
        </linearGradient>
        <linearGradient id="card-crystal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ecfcff" />
          <stop offset="0.5" stopColor="#7ae3ff" />
          <stop offset="1" stopColor="#2a98bd" />
        </linearGradient>
        {/* Sortie : le jour au bout de la galerie */}
        <linearGradient id="card-exit-rock" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a6997f" />
          <stop offset="1" stopColor="#62584a" />
        </linearGradient>
        <linearGradient id="card-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5ab8f2" />
          <stop offset="0.65" stopColor="#c4eaff" />
          <stop offset="1" stopColor="#f2fbff" />
        </linearGradient>
        <radialGradient id="card-sun-glow">
          <stop offset="0" stopColor="#fff8d2" />
          <stop offset="0.35" stopColor="#ffe27a" stopOpacity="0.75" />
          <stop offset="1" stopColor="#ffe27a" stopOpacity="0" />
        </radialGradient>
        <clipPath id="card-exit-opening">
          <path d="M8 110 V31 Q8 9 30 9 Q52 9 52 31 V110 Z" />
        </clipPath>
        {/* Cartes Extraction : parchemin et fenêtre illustrée */}
        <radialGradient id="card-parchment" cx="0.5" cy="0.4" r="0.78">
          <stop offset="0" stopColor="#fdf6de" />
          <stop offset="0.7" stopColor="#f0ddb0" />
          <stop offset="1" stopColor="#d9bc84" />
        </radialGradient>
        <linearGradient id="card-plaque" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7a5226" />
          <stop offset="1" stopColor="#4a2e12" />
        </linearGradient>
        <linearGradient id="card-scene" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#26375a" />
          <stop offset="1" stopColor="#0d1526" />
        </linearGradient>
        <radialGradient id="card-scene-glow" cx="0.5" cy="1" r="0.75">
          <stop offset="0" stopColor="#ffcf7a" stopOpacity="0.5" />
          <stop offset="1" stopColor="#ffcf7a" stopOpacity="0" />
        </radialGradient>
        <clipPath id="card-extraction-window">
          <rect x="8" y="8" width="44" height="48" rx="3" />
        </clipPath>
        <linearGradient id="card-door-red" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ea5b4c" />
          <stop offset="1" stopColor="#962015" />
        </linearGradient>
        <linearGradient id="card-door-blue" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5a9af0" />
          <stop offset="1" stopColor="#1b4690" />
        </linearGradient>
        <linearGradient id="card-stone" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#bdb6aa" />
          <stop offset="1" stopColor="#7a7368" />
        </linearGradient>
        <radialGradient id="card-rock" cx="0.35" cy="0.3" r="0.85">
          <stop offset="0" stopColor="#c9bfad" />
          <stop offset="1" stopColor="#6b6357" />
        </radialGradient>
        {/* Dos des cartes */}
        <radialGradient id="card-leather" cx="0.5" cy="0.45" r="0.75">
          <stop offset="0" stopColor="#8e5d2e" />
          <stop offset="0.6" stopColor="#6e4220" />
          <stop offset="1" stopColor="#3b210d" />
        </radialGradient>
        <pattern id="card-leather-dots" width="10" height="10" patternUnits="userSpaceOnUse">
          <circle cx="5" cy="5" r="1.2" fill="#a06a36" fillOpacity="0.45" />
        </pattern>
        <radialGradient id="card-medal" cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#8a5a2c" />
          <stop offset="1" stopColor="#3e220c" />
        </radialGradient>
        <radialGradient id="card-teal" cx="0.5" cy="0.48" r="0.78">
          <stop offset="0" stopColor="#2f8d9c" />
          <stop offset="0.6" stopColor="#1c5a66" />
          <stop offset="1" stopColor="#0d343c" />
        </radialGradient>
        <pattern
          id="card-exit-stripes"
          width="8"
          height="8"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect width="4" height="8" fill="#ffffff" fillOpacity="0.06" />
        </pattern>
        <linearGradient id="card-silver" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f4fbff" />
          <stop offset="0.5" stopColor="#b6d0d9" />
          <stop offset="1" stopColor="#7896a1" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/** Pépite placée dans les illustrations de cartes. */
function Nugget({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
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
function Sparkle({ x, y, size = 1 }: { x: number; y: number; size?: number }) {
  return (
    <path
      transform={`translate(${x} ${y}) scale(${size})`}
      d="M0 -3 Q0.4 -0.4 3 0 Q0.4 0.4 0 3 Q-0.4 0.4 -3 0 Q-0.4 -0.4 0 -3 Z"
      fill="#fff8d6"
    />
  );
}

/** Fond plein : le cadre de la carte est dessiné en CSS (taille variable selon l'écran). */
function Frame({ fill, children }: { fill: string; children: ReactNode }) {
  return (
    <>
      <rect x="0" y="0" width="60" height="84" fill={fill} />
      {children}
    </>
  );
}

/**
 * Galerie de mine vue de face : paroi rocheuse, boisage (deux montants et un
 * chapeau), rails qui s'enfoncent vers une lueur. Face rouge : galerie en feu,
 * bois calciné.
 */
function Gallery({ burned }: { burned: boolean }) {
  const post = burned ? 'url(#card-wood-burnt)' : 'url(#card-wood)';
  const beam = burned ? 'url(#card-wood-burnt-h)' : 'url(#card-wood-h)';
  return (
    <>
      {/* Le décor déborde du cadre 60 × 84 : la carte de la piste peut être plus haute. */}
      <rect
        x="-10"
        y="-30"
        width="80"
        height="144"
        fill={burned ? 'url(#card-mine-red)' : 'url(#card-mine-blue)'}
      />
      {/* Facettes de la paroi */}
      <path
        d="M0 9 L9 3 L13 13 L4 21 L0 19 Z M49 0 L60 6 L60 22 L53 17 Z M0 44 L7 39 L10 51 L3 59 L0 57 Z M52 42 L60 38 L60 61 L54 55 Z"
        fill="#000"
        fillOpacity="0.16"
      />
      <path
        d="M9 3 L13 13 M53 17 L60 6 M7 39 L10 51 M54 55 L60 38"
        stroke="#fff"
        strokeOpacity="0.14"
        strokeWidth="0.8"
      />
      {/* Galerie */}
      <path
        d="M14 77 V37 Q14 25 30 25 Q46 25 46 37 V77 Z"
        fill={burned ? 'url(#card-tunnel-red)' : 'url(#card-tunnel-blue)'}
      />
      {/* Rails et traverses qui s'enfoncent */}
      <path
        d="M20.5 72 H39.5 M22.8 64 H37.2 M24.6 57.5 H35.4 M26 52.5 H34"
        stroke={burned ? '#21100b' : '#4e3016'}
        strokeWidth="1.5"
      />
      <path
        d="M21 77 L28.4 47 M39 77 L31.6 47"
        stroke={burned ? '#3b1a12' : '#8a93a6'}
        strokeWidth="1.3"
      />
      {/* Sol */}
      <rect x="-10" y="77" width="80" height="37" fill="#000" fillOpacity="0.3" />
      <path d="M5 77.5 H55" stroke={STROKE} strokeWidth="1.2" />
      {/* Boisage */}
      <rect x="10.5" y="27" width="5" height="51" fill={post} stroke={STROKE} strokeWidth="1.1" />
      <rect x="44.5" y="27" width="5" height="51" fill={post} stroke={STROKE} strokeWidth="1.1" />
      <path
        d="M15.5 28 H20.5 L15.5 33.5 Z M44.5 28 H39.5 L44.5 33.5 Z"
        fill={post}
        stroke={STROKE}
        strokeWidth="0.9"
        strokeLinejoin="round"
      />
      <rect
        x="7"
        y="22.5"
        width="46"
        height="5.5"
        rx="1.2"
        fill={beam}
        stroke={STROKE}
        strokeWidth="1.1"
      />
      {/* Veinage du bois */}
      <path
        d="M13 31 V44 M12.4 52 V67 M47 33 V47 M47.6 56 V71 M11 25 H21 M34 25.8 H49"
        stroke="#000"
        strokeOpacity="0.3"
        strokeWidth="0.6"
      />
      {burned ? (
        <>
          {/* Braises dans les fentes du bois, flammes au fond */}
          <path
            d="M12 39 L14 43 L12.6 47 M47.8 49 L46.2 54 L48 58 M18 24.5 L22 26 L25 24.4"
            fill="none"
            stroke="#ff8a2a"
            strokeWidth="0.9"
          />
          <path
            d="M21 77 Q19 69 23.5 63.5 Q23.6 68.5 26.6 69.6 Q25.8 61 31 56 Q31 63.5 35 65.5 Q36 61 38.2 59.6 Q41.6 68 38.6 77 Z"
            fill="#ff7a2a"
            fillOpacity="0.9"
          />
          <path
            d="M25.5 77 Q24.6 71.5 27.8 68.2 Q28.8 71.2 30.8 71.4 Q30.8 66.2 33.8 63.2 Q36.2 70 34.2 77 Z"
            fill="#ffd36b"
          />
          <circle cx="20" cy="44" r="0.9" fill="#ffb347" />
          <circle cx="40" cy="39" r="0.8" fill="#ffb347" />
          <circle cx="34" cy="49" r="0.7" fill="#ffd36b" />
          <circle cx="25" cy="53" r="0.6" fill="#ffd36b" />
          <circle cx="6" cy="30" r="0.7" fill="#ffb347" fillOpacity="0.8" />
          <circle cx="54" cy="34" r="0.7" fill="#ffb347" fillOpacity="0.8" />
        </>
      ) : (
        <>
          {/* Lanterne suspendue au chapeau */}
          <circle cx="30" cy="35.5" r="10" fill="url(#card-lamp-glow)" />
          <path d="M30 28 V31.4" stroke={STROKE} strokeWidth="0.8" />
          <rect
            x="28.1"
            y="31.4"
            width="3.8"
            height="5.2"
            rx="1"
            fill="#ffd77a"
            stroke={STROKE}
            strokeWidth="0.8"
          />
          <path d="M28.1 33.3 H31.9" stroke={STROKE} strokeWidth="0.5" />
        </>
      )}
    </>
  );
}

/** Cristaux sur la paroi de gauche et pépite incrustée à droite (face bleue). */
function WallTreasures() {
  return (
    <>
      <g stroke={STROKE} strokeWidth="0.7" strokeLinejoin="round">
        <path d="M2.5 77 L4.6 69 L6.6 77 Z" fill="url(#card-crystal)" />
        <path d="M5.4 77 L7.6 64.5 L10 77 Z" fill="url(#card-crystal)" />
      </g>
      <path d="M7.6 64.5 L8.3 71 L6.9 71 Z" fill="#fff" fillOpacity="0.7" />
      <Nugget x={54.6} y={71} scale={0.42} />
      <Sparkle x={8.4} y={62} size={0.7} />
      <Sparkle x={56.8} y={66.6} size={0.6} />
    </>
  );
}

/** Wagonnet sur les rails, plein d'or (vide et noirci sur la face rouge). */
function Cart({ burned }: { burned: boolean }) {
  return (
    <>
      {!burned && (
        <>
          <Nugget x={23.5} y={50.5} scale={0.6} />
          <Nugget x={36.5} y={50.5} scale={0.6} />
          <Nugget x={30} y={47.6} scale={0.72} />
          <Sparkle x={33.8} y={44.4} size={0.8} />
        </>
      )}
      <path
        d="M15.5 52.5 H44.5 L41.8 68 H18.2 Z"
        fill={burned ? '#3d241c' : 'url(#card-wood-h)'}
        stroke={STROKE}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M16.6 58 H43.4 M17.6 63 H42.4"
        stroke="#000"
        strokeOpacity="0.35"
        strokeWidth="0.7"
      />
      <path d="M22 52.5 L22.7 68 M38 52.5 L37.3 68" stroke="#5a6170" strokeWidth="1.6" />
      <path d="M14.6 52.5 H45.4" stroke="#5a6170" strokeWidth="2.2" strokeLinecap="round" />
      {[23, 37].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy="70" r="3.6" fill="#2b2f38" stroke={STROKE} strokeWidth="1.2" />
          <circle cx={cx} cy="70" r="1.1" fill={burned ? '#6b5148' : '#a3acbd'} />
        </g>
      ))}
    </>
  );
}

/** La Sortie : la galerie débouche sur une vallée au soleil. */
function ExitScene() {
  return (
    <>
      <rect x="-10" y="-30" width="80" height="144" fill="url(#card-exit-rock)" />
      <path
        d="M0 12 L6 6 L9 16 L0 22 Z M54 4 L60 2 L60 18 L55 14 Z M0 52 L5 48 L7 60 L0 64 Z M55 50 L60 46 L60 66 Z"
        fill="#000"
        fillOpacity="0.14"
      />
      <path d="M8 110 V31 Q8 9 30 9 Q52 9 52 31 V110 Z" fill="url(#card-sky)" />
      <g clipPath="url(#card-exit-opening)">
        <circle cx="39" cy="25" r="15" fill="url(#card-sun-glow)" />
        <circle cx="39" cy="25" r="5.4" fill="#ffe06a" stroke="#e8a92a" strokeWidth="0.8" />
        <path
          d="M14 30 Q15 26.4 18.6 27.6 Q20 24.6 23.4 26.4 Q26.4 26 26.2 29.4 Q26.4 31 24 31 H15.4 Q13.6 31 14 30 Z"
          fill="#fff"
          fillOpacity="0.9"
        />
        <path d="M0 53 Q12 43 24 49 Q36 41 48 47 Q55 44 60 47 V110 H0 Z" fill="#a8d97f" />
        <path d="M0 63 Q14 55 30 61 Q44 55 60 59 V110 H0 Z" fill="#6bae47" />
        {/* Sapins au loin */}
        <path d="M15 47.5 L17.6 41 L20.2 47.5 Z M44 45.8 L46.2 40.4 L48.4 45.8 Z" fill="#4c8a35" />
        {/* Chemin vers le jour */}
        <path d="M18.2 110 L28.6 59 H31.4 L43.8 110 Z" fill="#ecd9a0" />
        <path
          d="M18.2 110 L28.6 59 M43.8 110 L31.4 59"
          stroke="#b89a58"
          strokeWidth="0.7"
          fill="none"
        />
        <path
          d="M10 70 l1 -2.4 l1 2.4 M47 68 l1 -2.4 l1 2.4 M15 78 l1 -2.4 l1 2.4"
          stroke="#3f7d2b"
          strokeWidth="0.8"
          fill="none"
        />
      </g>
      {/* Encadrement de pierre */}
      <path
        d="M8 110 V31 Q8 9 30 9 Q52 9 52 31 V110"
        fill="none"
        stroke="url(#card-stone)"
        strokeWidth="3.2"
      />
      <path
        d="M6.3 110 V31 Q6.3 7.3 30 7.3 Q53.7 7.3 53.7 31 V110"
        fill="none"
        stroke={STROKE}
        strokeWidth="0.9"
      />
      <path
        d="M9.7 26 L6.5 24.6 M15 15.4 L12.4 13 M23.4 10.6 L22.6 7.6 M36.6 10.6 L37.4 7.6 M45 15.4 L47.6 13 M50.3 26 L53.5 24.6"
        stroke={STROKE}
        strokeOpacity="0.55"
        strokeWidth="0.7"
      />
    </>
  );
}

/**
 * Carte de la piste : Mine (recto bleu / verso rouge), Wagon, Sortie ou dragon.
 */
export function TrackCardArt({ kind, burned }: { kind: TrackCardKind; burned: boolean }) {
  return (
    <svg viewBox="0 0 60 84" preserveAspectRatio="xMidYMid meet" aria-hidden className="card-art">
      {kind === 'exit' && <ExitScene />}
      {kind === 'mine' && (
        <>
          <Gallery burned={burned} />
          {!burned && <WallTreasures />}
        </>
      )}
      {kind === 'wagon' && (
        <>
          <Gallery burned={burned} />
          <Cart burned={burned} />
        </>
      )}
      {kind === 'dragon' && (
        <Frame fill="var(--dragon-card)">
          <path d="M4 80 Q30 60 56 80 Z" fill="var(--mine-red-deep)" opacity="0.5" />
          <g transform="translate(2 16)">
            <DragonHead size={56} />
          </g>
        </Frame>
      )}
    </svg>
  );
}

/** Porte cintrée dans son encadrement de pierre, posée sur le sol (y = 51). */
function Door({ color, x }: { color: 'red' | 'blue'; x: number }) {
  return (
    <g transform={`translate(${x} 0)`}>
      <path
        d="M0 52 V32 Q0 23 10 23 Q20 23 20 32 V52 Z"
        fill="url(#card-stone)"
        stroke={STROKE}
        strokeWidth="1"
      />
      <path
        d="M2.5 52 V32.5 Q2.5 25.6 10 25.6 Q17.5 25.6 17.5 32.5 V52 Z"
        fill={`url(#card-door-${color})`}
        stroke={STROKE}
        strokeWidth="1"
      />
      <path
        d="M6.2 26.6 V52 M10 25.6 V52 M13.8 26.6 V52"
        stroke="#000"
        strokeOpacity="0.28"
        strokeWidth="0.7"
      />
      <path d="M2.5 33 H17.5 M2.5 45.5 H17.5" stroke="#2d3038" strokeWidth="1.5" />
      <circle
        cx={color === 'red' ? 5.4 : 14.6}
        cy="40"
        r="1.2"
        fill="url(#card-gold)"
        stroke={STROKE}
        strokeWidth="0.5"
      />
    </g>
  );
}

/** Rocher veiné d'or, posé sur le sol. */
function Boulder({ x }: { x: number }) {
  return (
    <g transform={`translate(${x} 0)`}>
      <path
        d="M0 52 L1.2 39 L6 32 L13 31 L18.4 36 L19.4 52 Z"
        fill="url(#card-rock)"
        stroke={STROKE}
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <path
        d="M6 32 L8 40 L1.2 39 M8 40 L14 44 L18.6 41 M14 44 L12 52"
        fill="none"
        stroke="#000"
        strokeOpacity="0.25"
        strokeWidth="0.7"
      />
      <path
        d="M3 47 L7 44.6 L10.4 46.4"
        fill="none"
        stroke="url(#card-gold)"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </g>
  );
}

/** Flèche de déplacement, en haut de l'illustration. */
function MoveArrow({ direction }: { direction: 'left' | 'right' }) {
  const right = direction === 'right';
  return (
    <path
      transform={right ? undefined : 'translate(60 0) scale(-1 1)'}
      d="M14 13.6 H36.6 V9.6 L45.6 16 L36.6 22.4 V18.4 H14 Z"
      fill={right ? '#ffb3a1' : '#a9d2ff'}
      stroke={STROKE}
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
  );
}

/**
 * Carte Extraction sur parchemin : une scène de mine encadrée (portes,
 * rochers, déplacement du nain en haut) et, sur une plaque, l'or gagné.
 */
function ExtractionFace({ gold, children }: { gold: 1 | 2; children: ReactNode }) {
  return (
    <>
      <rect
        x="1.5"
        y="1.5"
        width="57"
        height="81"
        rx="6"
        fill="url(#card-parchment)"
        stroke={STROKE}
        strokeWidth="2"
      />
      <rect
        x="4.6"
        y="4.6"
        width="50.8"
        height="74.8"
        rx="4"
        fill="none"
        stroke="#b8893a"
        strokeWidth="0.9"
      />
      {/* Équerres dorées aux coins */}
      <path
        d="M4.6 11 V4.6 H11 M49 4.6 H55.4 V11 M4.6 73 V79.4 H11 M49 79.4 H55.4 V73"
        fill="none"
        stroke="#8a5a1c"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <rect x="8" y="8" width="44" height="48" rx="3" fill="url(#card-scene)" />
      <g clipPath="url(#card-extraction-window)">
        <rect x="8" y="8" width="44" height="48" fill="url(#card-scene-glow)" />
        <path d="M8 52 H52 V56 H8 Z" fill="#05080f" fillOpacity="0.55" />
        {children}
      </g>
      <rect
        x="8"
        y="8"
        width="44"
        height="48"
        rx="3"
        fill="none"
        stroke="#6b4a1c"
        strokeWidth="1.4"
      />
      {/* Plaque : or gagné */}
      <path
        d="M11 61.5 H49 L52.4 68.5 L49 75.5 H11 L7.6 68.5 Z"
        fill="url(#card-plaque)"
        stroke="#2e1b08"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <path
        d="M12 63 H48"
        stroke="#e9c98a"
        strokeOpacity="0.45"
        strokeWidth="0.6"
        strokeLinecap="round"
      />
      {gold === 2 ? (
        <>
          <Nugget x={23.5} y={68.6} scale={0.72} />
          <Nugget x={36.5} y={68.6} scale={0.72} />
        </>
      ) : (
        <Nugget x={30} y={68.6} scale={0.78} />
      )}
    </>
  );
}

/** Face d'une carte Extraction (pioche visible). */
export function ExtractionCardArt({ kind }: { kind: ExtractionKind }) {
  return (
    <svg viewBox="0 0 60 84" aria-hidden className="card-art">
      {kind === 'redDoor' && (
        <ExtractionFace gold={2}>
          <Boulder x={10} />
          <Door color="red" x={30} />
          <MoveArrow direction="right" />
          <Sparkle x={16} y={36} size={0.7} />
        </ExtractionFace>
      )}
      {kind === 'blueDoor' && (
        <ExtractionFace gold={1}>
          <Door color="blue" x={10} />
          <Boulder x={31} />
          <MoveArrow direction="left" />
          <Sparkle x={44} y={36} size={0.7} />
        </ExtractionFace>
      )}
      {kind === 'noDoor' && (
        <ExtractionFace gold={1}>
          {/* Front de taille veiné d'or : le nain reste sur place */}
          <path
            d="M8 56 V35 L14 28.5 L22 30.5 L29 26 L37 29.5 L45 26.5 L52 32 V56 Z"
            fill="url(#card-rock)"
            stroke={STROKE}
            strokeWidth="1"
            strokeLinejoin="round"
          />
          <path
            d="M14 28.5 L16 37 L9 41 M16 37 L25 39 L29 26 M25 39 L33 46 L44 41 L45 26.5 M33 46 L31 56 M44 41 L52 47"
            fill="none"
            stroke="#000"
            strokeOpacity="0.22"
            strokeWidth="0.7"
          />
          <path
            d="M11 48.5 L18 44.5 L24 47.4 L31 41.6 L38 44.2 L49 38.4"
            fill="none"
            stroke="url(#card-gold)"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Nugget x={31} y={41.8} scale={0.42} />
          <Sparkle x={19} y={42} size={0.8} />
          <Sparkle x={41.5} y={40} size={0.6} />
          {/* Sur place */}
          <circle cx="30" cy="17" r="5.6" fill="none" stroke={STROKE} strokeWidth="3.4" />
          <circle cx="30" cy="17" r="5.6" fill="none" stroke="#fff1c6" strokeWidth="1.8" />
          <circle cx="30" cy="17" r="2.2" fill="#fff1c6" stroke={STROKE} strokeWidth="0.8" />
        </ExtractionFace>
      )}
      {kind === 'dragon' && (
        <>
          <rect
            x="1.5"
            y="1.5"
            width="57"
            height="81"
            rx="6"
            fill="var(--parchment)"
            stroke={STROKE}
            strokeWidth="2"
          />
          {/* Cadre gaufré et rivets */}
          <rect
            x="5"
            y="5"
            width="50"
            height="74"
            rx="3.5"
            fill="none"
            stroke="var(--parchment-deep)"
            strokeWidth="1.2"
          />
          <path
            d="M8 8 h0.01 M52 8 h0.01 M8 76 h0.01 M52 76 h0.01"
            stroke="var(--gold-deep)"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
          <g transform="translate(4 8)">
            <DragonHead size={52} />
          </g>
        </>
      )}
    </svg>
  );
}

/** Dos d'une carte Exit : sarcelle rayonnante, filets argentés, porte et flèche vers le jour. */
function ExitBack() {
  const rays = Array.from({ length: 12 }, (_, i) => i * 30);
  return (
    <svg viewBox="0 0 60 84" aria-hidden className="card-art">
      <rect
        x="1.5"
        y="1.5"
        width="57"
        height="81"
        rx="6"
        fill="url(#card-teal)"
        stroke={STROKE}
        strokeWidth="2"
      />
      <rect x="1.5" y="1.5" width="57" height="81" rx="6" fill="url(#card-exit-stripes)" />
      {/* Rayons autour de l'emblème */}
      <g transform="translate(30 42)" fill="#dff6fa" fillOpacity="0.07">
        {rays.map((angle) => (
          <path key={angle} transform={`rotate(${angle})`} d="M-2.2 -6 L0 -40 L2.2 -6 Z" />
        ))}
      </g>
      <rect
        x="5"
        y="5"
        width="50"
        height="74"
        rx="4"
        fill="none"
        stroke="url(#card-silver)"
        strokeWidth="1.3"
      />
      <path
        d="M8.5 14 V8.5 H14 M46 8.5 H51.5 V14 M8.5 70 V75.5 H14 M46 75.5 H51.5 V70"
        fill="none"
        stroke="#eef9fb"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M30 6.6 L31.8 9 L30 11.4 L28.2 9 Z M30 72.6 L31.8 75 L30 77.4 L28.2 75 Z"
        fill="#cfe7ee"
      />
      {/* Emblème : une porte cintrée et la flèche vers la sortie */}
      <path
        d="M14 60 V34 Q14 21 30 21 Q46 21 46 34 V60 Z"
        fill="#164a54"
        stroke="url(#card-silver)"
        strokeWidth="2"
      />
      <path
        d="M16.8 57.4 V34.6 Q16.8 23.8 30 23.8 Q43.2 23.8 43.2 34.6 V57.4 Z"
        fill="none"
        stroke="#cfe7ee"
        strokeOpacity="0.35"
        strokeWidth="0.7"
      />
      <path
        d="M21 54 V38 Q21 31 28 31 H33 V54"
        fill="none"
        stroke="#f4f1e6"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M36 43 H46.5 M42.5 39 L46.5 43 L42.5 47"
        fill="none"
        stroke="#f4f1e6"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Dos d'une carte Extraction : cuir repoussé, médaillon doré, pioches croisées et pépite. */
function ExtractionBack() {
  return (
    <svg viewBox="0 0 60 84" aria-hidden className="card-art">
      <rect
        x="1.5"
        y="1.5"
        width="57"
        height="81"
        rx="6"
        fill="url(#card-leather)"
        stroke={STROKE}
        strokeWidth="2"
      />
      <rect x="1.5" y="1.5" width="57" height="81" rx="6" fill="url(#card-leather-dots)" />
      {/* Couture */}
      <rect
        x="5.5"
        y="5.5"
        width="49"
        height="73"
        rx="4"
        fill="none"
        stroke="#e9c98a"
        strokeOpacity="0.75"
        strokeWidth="1"
        strokeDasharray="2.4 2"
      />
      {/* Cadre repoussé et rivets */}
      <rect
        x="8.6"
        y="8.6"
        width="42.8"
        height="66.8"
        rx="3"
        fill="none"
        stroke="#2c1708"
        strokeWidth="1.2"
      />
      <rect
        x="9.4"
        y="9.4"
        width="41.2"
        height="65.2"
        rx="2.6"
        fill="none"
        stroke="#e2b77a"
        strokeOpacity="0.28"
        strokeWidth="0.7"
      />
      {[
        [11.4, 11.4],
        [48.6, 11.4],
        [11.4, 72.6],
        [48.6, 72.6],
      ].map(([cx, cy]) => (
        <circle
          key={`${cx}-${cy}`}
          cx={cx}
          cy={cy}
          r="1.5"
          fill="url(#card-gold)"
          stroke="#3e220c"
          strokeWidth="0.5"
        />
      ))}
      <circle
        cx="30"
        cy="42"
        r="19"
        fill="url(#card-medal)"
        stroke="url(#card-gold)"
        strokeWidth="2.4"
      />
      <circle cx="30" cy="42" r="15.6" fill="none" stroke="#c99a3c" strokeWidth="0.8" />
      {/* Pioches croisées */}
      <path
        d="M20.5 53 L38 31.5 M39.5 53 L22 31.5"
        stroke="#e9d3a6"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M31.4 27.6 Q40.4 26.4 45 33 Q39.6 30.4 34 31.6 Z M28.6 27.6 Q19.6 26.4 15 33 Q20.4 30.4 26 31.6 Z"
        fill="#c9ced8"
        stroke={STROKE}
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      <Nugget x={30} y={47} scale={0.78} />
      <Sparkle x={36.4} y={41.4} size={0.8} />
      <path
        d="M30 13 L32 16 L30 19 L28 16 Z M30 65 L32 68 L30 71 L28 68 Z"
        fill="url(#card-gold)"
      />
    </svg>
  );
}

/** Dos d'une carte : pioche Exit (par défaut) ou pioche Extraction. */
export function CardBack({ deck = 'exit' }: { deck?: 'exit' | 'extraction' }) {
  return deck === 'extraction' ? <ExtractionBack /> : <ExitBack />;
}

/** Pictogramme d'une action Exit. */
export function ExitActionIcon({ action, size = 28 }: { action: ExitActionKind; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      {action === 'step' && (
        <>
          <path
            d="M20 16 H6 M11 10 L5 16 L11 22"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <ellipse cx="25" cy="16" rx="3.5" ry="5" fill="currentColor" />
        </>
      )}
      {action === 'doubleStep' && (
        <path
          d="M16 9 L9 16 L16 23 M26 9 L19 16 L26 23"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {action === 'allTogether' && (
        <>
          <circle cx="12" cy="9" r="3.5" fill="currentColor" />
          <circle cx="20" cy="16" r="3.5" fill="currentColor" />
          <circle cx="12" cy="23" r="3.5" fill="currentColor" />
          <path
            d="M8 16 H3 M5.5 13 L3 16 L5.5 19"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M27 9 V23" stroke="currentColor" strokeWidth="2" strokeDasharray="2 3" />
        </>
      )}
      {action === 'swap' && (
        <>
          <path
            d="M7 12 H24 M19 7 L24 12 L19 17"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M25 21 H8 M13 16 L8 21 L13 26"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
      {action === 'goldBonus' && (
        <>
          <path
            d="M4 22 L7 13 L14 10 L21 12 L23 19 L19 25 L9 26 Z"
            fill="var(--gold)"
            stroke="var(--gold-ink)"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <text
            x="27"
            y="12"
            textAnchor="middle"
            fontSize="11"
            fontWeight="800"
            fill="currentColor"
          >
            +3
          </text>
        </>
      )}
    </svg>
  );
}

/**
 * Face d'une carte Exit (défausse, carte mise en scène) : chaque action dans
 * son médaillon, avec son nom, centrés ; « ou » entre les deux actions d'une
 * carte double. `chosen` met en avant l'action jouée.
 */
export function ExitCardFace({
  actions,
  chosen = null,
}: {
  actions: readonly ExitActionKind[];
  chosen?: ExitActionKind | null;
}) {
  return (
    <div className={`exit-face exit-face--${actions.length > 1 ? 'double' : 'single'}`} aria-hidden>
      {/* Mise en page dans un élément intérieur : ses unités cqw se mesurent sur la carte. */}
      <div className="exit-face__inner">
        {actions.map((action, i) => (
          <Fragment key={i}>
            {i > 0 && <span className="exit-face__or">ou</span>}
            <span
              className={[
                'exit-face__action',
                chosen === action ? 'exit-face__action--chosen' : '',
                chosen && chosen !== action ? 'exit-face__action--dim' : '',
              ].join(' ')}
            >
              <span className="exit-face__medal">
                <ExitActionIcon action={action} size={32} />
              </span>
              <span className="exit-face__name">{EXIT_LABELS[action].name}</span>
            </span>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
