import { Rails, STROKE } from './cardParts';

/**
 * Tête de Dragobert (dessin original), tournée vers la gauche, vers la Sortie,
 * dans un repère d'environ 40 × 30. Ses parties portent des classes pour être
 * animées sur la carte : paupière, pupille (regard), sourcil, mâchoire.
 */
function Head() {
  return (
    <g className="dragobert__head">
      {/* Cornes et collerette */}
      <path
        d="M25 12 L35 0.5 L31.5 14.5 Z"
        fill="url(#dragon-horn)"
        stroke={STROKE}
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path
        d="M29.5 16 L40 8.5 L35 20 Z"
        fill="url(#dragon-horn)"
        stroke={STROKE}
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path
        d="M30.5 19 L38.5 21 L32 24.5 Z"
        fill="url(#dragon-wing)"
        stroke={STROKE}
        strokeWidth="1"
        strokeLinejoin="round"
      />
      {/* Fond de la gueule, puis la mâchoire, qui s'ouvre quand il rugit */}
      <path d="M4 21 Q14 25.6 27 24 L27.5 27 Q15 31 5 24 Z" fill="#4a0b0e" />
      <g className="dragobert__jaw">
        <path
          d="M3 21.5 Q11 24.5 26 23.4 Q29.5 27.4 25 29.4 L10 29.4 Q4 29.4 3 21.5 Z"
          fill="url(#dragon-belly)"
          stroke={STROKE}
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <path
          d="M8 25 L9 23 L10 25.2 M14 25.5 L15 23.5 L16 25.6"
          fill="#fffaf0"
          stroke={STROKE}
          strokeWidth="0.6"
          strokeLinejoin="round"
        />
      </g>
      <path
        d="M2 20 Q1 13 8 11 L19 8 Q30 7 33 16 Q35 23.5 27 26 L10 26 Q2.6 26 2 20 Z"
        fill="url(#dragon-scale)"
        stroke={STROKE}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Crocs */}
      <path
        d="M6 24.4 L7.2 27.6 L8.6 24.8 M11.6 25.2 L12.8 28.4 L14.2 25.4 M18 25.4 L19 27.8 L20.2 25.6"
        fill="#fffaf0"
        stroke={STROKE}
        strokeWidth="0.7"
        strokeLinejoin="round"
      />
      {/* Écailles et naseau */}
      <path
        d="M24.5 18.6 q2.4 -2.4 4.8 0 M21.6 21.8 q2.2 -2.2 4.4 0 M27.4 13.4 q2 -2 4 0"
        fill="none"
        stroke="#3f2268"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <ellipse cx="6.2" cy="15.4" rx="1.1" ry="1.6" fill={STROKE} />
      {/* Œil : pupille fendue qui suit le jeu, paupière qui cligne */}
      <path
        className="dragobert__eye"
        d="M14.8 14.2 Q19 9.8 23.2 14.2 Q19 17 14.8 14.2 Z"
        fill="#ffe36b"
        stroke={STROKE}
        strokeWidth="1.1"
      />
      <g className="dragobert__pupil">
        <ellipse cx="18.8" cy="13.9" rx="0.95" ry="2.1" fill={STROKE} />
      </g>
      <path
        className="dragobert__lid"
        d="M14.4 14.4 Q19 9.2 23.6 14.4 Q19 17.4 14.4 14.4 Z"
        fill="#6a3fa3"
        stroke={STROKE}
        strokeWidth="1.1"
      />
      <path
        className="dragobert__brow"
        d="M13.6 10.8 L24.4 8.4"
        stroke={STROKE}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </g>
  );
}

/** Buste de Dragobert (cou et tête), à placer dans un autre dessin. */
export function DragonBust() {
  return (
    <g>
      {/* Cou */}
      <path
        d="M21 25 Q24 34 19 42 H40 Q38.6 31 32 21 Z"
        fill="url(#dragon-scale)"
        stroke={STROKE}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M21 26 Q23.6 34 19.6 41 H24 Q27 34 24.6 26.6 Z"
        fill="url(#dragon-belly)"
        stroke={STROKE}
        strokeWidth="0.9"
      />
      <Head />
    </g>
  );
}

/** Tête de Dragobert seule (icônes, bandeaux, aide). */
export function DragonHead({ size = 48, label }: { size?: number; label?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="-3 -4 46 46"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {/* Fumée */}
      <circle cx="2.5" cy="10" r="2.6" fill="var(--smoke)" opacity="0.65" />
      <circle cx="-0.4" cy="4.6" r="1.8" fill="var(--smoke)" opacity="0.5" />
      <DragonBust />
    </svg>
  );
}

/** D'où le dragon regarde le nain dont c'est le tour : loin, tout près, ou personne. */
export type DragonGaze = 'near' | 'far' | null;

/**
 * Carte de Dragobert sur la piste : couché au bout de la voie ferrée, devant
 * son antre en feu, tourné vers la Sortie. Au repos, il cligne des yeux, fume
 * des naseaux et son ventre rougeoit au rythme de sa respiration (plus fort
 * quand la chaleur monte). Il suit des yeux le nain qui joue ; près de la
 * Sortie, il enrage (yeux rouges, fumée continue). Le réalisateur le fait
 * rugir avant chaque avancée (classe `dragobert--roar`, posée par les effets).
 */
export function DragonCardArt({
  enraged = false,
  gaze = null,
}: {
  enraged?: boolean;
  gaze?: DragonGaze;
}) {
  return (
    <svg
      viewBox="0 0 60 84"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
      className={`card-art dragobert${enraged ? ' dragobert--enraged' : ''}`}
      data-gaze={gaze ?? undefined}
    >
      {/* Antre : roche sombre, brasier au fond (le décor déborde du cadre). */}
      <rect x="-10" y="-30" width="80" height="144" fill="url(#dragon-lair)" />
      <path
        d="M0 9 L9 3 L13 13 L4 21 L0 19 Z M49 0 L60 6 L60 22 L53 17 Z M0 44 L6 40 L8 50 L0 54 Z"
        fill="#000"
        fillOpacity="0.22"
      />
      <ellipse
        className="dragobert__fire"
        cx="40"
        cy="60"
        rx="36"
        ry="32"
        fill="url(#dragon-fire)"
      />
      <Rails burned />
      <g className="dragobert__rear">
        {/* Queue enroulée */}
        <path
          d="M46 73 Q60 77 62 66 Q63 56 55 56.5 Q50.5 57.5 52 61 Q57 59.6 57.4 65 Q57.6 70.6 46 68.6 Z"
          fill="url(#dragon-scale)"
          stroke={STROKE}
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <path d="M52.2 61.6 L48 57.6 L53.6 57 Z" fill="#3f2268" stroke={STROKE} strokeWidth="0.9" />
        {/* Corps couché sur les rails */}
        <path
          d="M17 77 Q15 64 27 59.6 Q40 55.4 50 61.6 Q57 66 55 77 Z"
          fill="url(#dragon-scale)"
          stroke={STROKE}
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        {/* Pointes du dos */}
        <path
          d="M23.4 62.4 L24.6 58 L27 61 Z M48.4 60.6 L51 57.2 L51.8 61.6 Z"
          fill="url(#dragon-horn)"
          stroke={STROKE}
          strokeWidth="0.8"
          strokeLinejoin="round"
        />
        {/* Aile repliée */}
        <path
          d="M29 60.4 L36 45 L39.6 52 L44.6 44.6 L47.4 58 Q40 56.4 29 60.4 Z"
          fill="url(#dragon-wing)"
          stroke={STROKE}
          strokeWidth="1"
          strokeLinejoin="round"
        />
        <path
          d="M36 45 L35 58 M44.6 44.6 L42 57.2"
          stroke="#1f0f36"
          strokeWidth="0.7"
          strokeLinecap="round"
        />
        {/* Ventre en plaques, qui rougeoie */}
        <path
          d="M18 77 Q19 72 26 70.6 Q38 68.6 52 71.6 Q55.4 73 55 77 Z"
          fill="url(#dragon-belly)"
          stroke={STROKE}
          strokeWidth="1"
        />
        <path
          d="M26 70.8 L25.4 77 M32 69.8 L31.8 77 M38 69.6 L38.2 77 M44 70.2 L44.8 77 M50 71.2 L51 77"
          stroke="#b5642a"
          strokeWidth="0.6"
        />
        {/* Patte arrière */}
        <path
          d="M45 69.4 Q50.6 71 50.4 77 H42.6 Q42.4 72.4 45 69.4 Z"
          fill="url(#dragon-scale)"
          stroke={STROKE}
          strokeWidth="1"
          strokeLinejoin="round"
        />
        {/* Cou et gorge */}
        <path
          d="M19 67 Q14 54 18.6 41 L29 38.6 Q27 52 31 61 Z"
          fill="url(#dragon-scale)"
          stroke={STROKE}
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        <path
          d="M19.4 66 Q15.4 54 19.4 42.4 L22.6 41.8 Q19.8 54 23.4 64.8 Z"
          fill="url(#dragon-belly)"
          stroke={STROKE}
          strokeWidth="0.8"
        />
        <path
          className="dragobert__glow"
          d="M18 77 Q19 72 26 70.6 Q38 68.6 52 71.6 Q55.4 73 55 77 Z M19.4 66 Q15.4 54 19.4 42.4 L22.6 41.8 Q19.8 54 23.4 64.8 Z"
          fill="#ffb347"
        />
        {/* Patte avant, griffes posées sur le rail */}
        <path
          d="M22 65.6 Q18 69 16.6 73 L15 76.8 H23.6 L24.6 71 Q25.6 68 24 65.6 Z"
          fill="url(#dragon-scale)"
          stroke={STROKE}
          strokeWidth="1.1"
          strokeLinejoin="round"
        />
        <path
          d="M15 76.8 L13.4 78.6 L16.6 77.6 Z M18.2 77 L17 78.9 L19.8 77.8 Z M21.2 77 L20.4 78.9 L22.8 77.6 Z"
          fill="#f4ead2"
          stroke={STROKE}
          strokeWidth="0.5"
          strokeLinejoin="round"
        />
        <g transform="translate(-1 13)">
          <Head />
        </g>
        {/* Fumée des naseaux */}
        <g className="dragobert__smoke" fill="var(--smoke)">
          <circle cx="4.6" cy="26.6" r="1.6" />
          <circle cx="4.6" cy="26.6" r="1.6" />
          <circle cx="4.6" cy="26.6" r="1.6" />
        </g>
      </g>
    </svg>
  );
}

/** Souffle de flammes (effet visuel). */
export function Flame({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <path
        d="M24 46 Q6 40 10 24 Q14 30 18 28 Q14 14 26 2 Q26 14 34 18 Q36 12 34 8 Q46 20 40 36 Q36 46 24 46 Z"
        fill="var(--flame-outer)"
      />
      <path
        d="M24 44 Q14 40 16 30 Q20 34 23 32 Q22 22 28 16 Q30 26 34 30 Q36 40 24 44 Z"
        fill="var(--flame-inner)"
      />
      <path d="M24 42 Q19 39 21 34 Q24 36 26 33 Q29 38 24 42 Z" fill="#fff6c8" />
    </svg>
  );
}
