import type { ReactNode } from 'react';
import type { ExitActionKind, ExtractionKind, TrackCardKind } from '@pepite/engine';
import { DragonHead } from './Dragon';

const STROKE = '#14161c';

/** Pépite miniature placée dans les illustrations de cartes. */
function MiniNugget({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path
        d="M-7 4 L-5 -3 L0 -6 L6 -4 L8 2 L5 6 L-3 7 Z"
        fill="var(--gold)"
        stroke="var(--gold-ink)"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M-3.5 -2 L0 -4 L3 -3"
        fill="none"
        stroke="var(--gold-light)"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </g>
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

function CaveArch({ burned }: { burned: boolean }) {
  return (
    <>
      <path
        d="M12 70 V36 Q12 18 30 18 Q48 18 48 36 V70 Z"
        fill={burned ? 'var(--mine-red-deep)' : 'var(--mine-blue-deep)'}
        stroke={STROKE}
        strokeWidth="1.8"
      />
      {/* Étais en bois */}
      <path
        d="M12 70 V34 M48 70 V34 M9 31 Q30 20 51 31"
        fill="none"
        stroke={burned ? '#3a1a10' : 'var(--wood)'}
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path d="M8 74 H52" stroke={STROKE} strokeWidth="1.6" />
    </>
  );
}

/**
 * Carte de la piste : Mine (recto bleu / verso rouge), Wagon, Sortie ou dragon.
 */
export function TrackCardArt({ kind, burned }: { kind: TrackCardKind; burned: boolean }) {
  const background = burned ? 'var(--mine-red)' : 'var(--mine-blue)';
  return (
    <svg viewBox="0 0 60 84" preserveAspectRatio="xMidYMid meet" aria-hidden className="card-art">
      {kind === 'exit' && (
        <Frame fill="var(--exit-card)">
          <path
            d="M10 76 V32 Q10 12 30 12 Q50 12 50 32 V76 Z"
            fill="var(--daylight)"
            stroke={STROKE}
            strokeWidth="1.8"
          />
          <circle cx="30" cy="30" r="7" fill="var(--sun)" />
          <path d="M14 76 L24 52 H36 L46 76 Z" fill="var(--exit-path)" opacity="0.8" />
        </Frame>
      )}
      {kind === 'mine' && (
        <Frame fill={background}>
          <CaveArch burned={burned} />
          {burned ? (
            <>
              <path
                d="M20 66 L24 58 L28 64 L33 54 L38 66"
                fill="none"
                stroke="var(--ember)"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <circle cx="22" cy="44" r="1.6" fill="var(--ember)" />
              <circle cx="37" cy="38" r="1.3" fill="var(--ember)" />
              <circle cx="31" cy="48" r="1.1" fill="var(--ember)" />
            </>
          ) : (
            <>
              <path
                d="M18 66 L21 58 L24 66 Z M36 66 L39 60 L42 66 Z"
                fill="var(--crystal)"
                stroke={STROKE}
                strokeWidth="1"
              />
              <MiniNugget x={30} y={62} scale={0.55} />
            </>
          )}
        </Frame>
      )}
      {kind === 'wagon' && (
        <Frame fill={background}>
          <CaveArch burned={burned} />
          <path d="M8 72 H52" stroke="#4a4f5c" strokeWidth="2.4" />
          <path
            d="M16 52 H44 L41 66 H19 Z"
            fill={burned ? '#5b3a32' : 'var(--wagon)'}
            stroke={STROKE}
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          {!burned && (
            <>
              <MiniNugget x={24} y={50} scale={0.55} />
              <MiniNugget x={33} y={48} scale={0.6} />
            </>
          )}
          <circle cx="23" cy="69" r="3.2" fill="#2b2f38" stroke={STROKE} strokeWidth="1.2" />
          <circle cx="37" cy="69" r="3.2" fill="#2b2f38" stroke={STROKE} strokeWidth="1.2" />
        </Frame>
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

function Door({ color, x }: { color: string; x: number }) {
  return (
    <g transform={`translate(${x} 0)`}>
      <path
        d="M0 50 V24 Q0 14 10 14 Q20 14 20 24 V50 Z"
        fill={color}
        stroke={STROKE}
        strokeWidth="1.8"
      />
      <path d="M10 16 V50" stroke={STROKE} strokeWidth="1" opacity="0.5" />
      <circle cx="15" cy="34" r="1.6" fill="var(--gold)" stroke={STROKE} strokeWidth="0.8" />
    </g>
  );
}

function Arrow({ direction }: { direction: 'left' | 'right' }) {
  return direction === 'left' ? (
    <path
      d="M28 8 H12 M18 2 L11 8 L18 14"
      fill="none"
      stroke={STROKE}
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ) : (
    <path
      d="M32 8 H48 M42 2 L49 8 L42 14"
      fill="none"
      stroke={STROKE}
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

/** Face d'une carte Extraction (pioche visible). */
export function ExtractionCardArt({ kind }: { kind: ExtractionKind }) {
  return (
    <svg viewBox="0 0 60 84" aria-hidden className="card-art">
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
      {kind === 'redDoor' && (
        <g transform="translate(0 6)">
          <Arrow direction="right" />
          <Door color="var(--door-red)" x={30} />
          <path
            d="M8 50 V30 L18 26 L26 32 V50 Z"
            fill="var(--rock)"
            stroke={STROKE}
            strokeWidth="1.4"
          />
        </g>
      )}
      {kind === 'blueDoor' && (
        <g transform="translate(0 6)">
          <Arrow direction="left" />
          <Door color="var(--door-blue)" x={10} />
          <path
            d="M34 50 V32 L44 26 L52 32 V50 Z"
            fill="var(--rock)"
            stroke={STROKE}
            strokeWidth="1.4"
          />
        </g>
      )}
      {kind === 'noDoor' && (
        <g transform="translate(0 6)">
          <path
            d="M8 56 V30 L20 18 L34 22 L50 16 L52 56 Z"
            fill="var(--rock)"
            stroke={STROKE}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M18 36 L24 30 L30 38 M36 30 L42 36"
            fill="none"
            stroke={STROKE}
            strokeWidth="1.2"
            opacity="0.5"
          />
          <circle cx="30" cy="8" r="3" fill={STROKE} />
        </g>
      )}
      {kind === 'dragon' && (
        <g transform="translate(4 8)">
          <DragonHead size={52} />
        </g>
      )}
      {kind === 'redDoor' && (
        <>
          <MiniNugget x={20} y={72} />
          <MiniNugget x={40} y={72} />
        </>
      )}
      {(kind === 'blueDoor' || kind === 'noDoor') && <MiniNugget x={30} y={72} />}
    </svg>
  );
}

/** Dos d'une carte Exit. */
function ExitBack() {
  return (
    <svg viewBox="0 0 60 84" aria-hidden className="card-art">
      <defs>
        <pattern
          id="exit-back-pattern"
          width="8"
          height="8"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect width="8" height="8" fill="var(--exit-back)" />
          <rect width="4" height="8" fill="var(--exit-back-stripe)" />
        </pattern>
      </defs>
      <rect
        x="1.5"
        y="1.5"
        width="57"
        height="81"
        rx="6"
        fill="url(#exit-back-pattern)"
        stroke={STROKE}
        strokeWidth="2"
      />
      <rect
        x="9"
        y="22"
        width="42"
        height="40"
        rx="5"
        fill="var(--exit-back)"
        stroke={STROKE}
        strokeWidth="1.6"
      />
      <path
        d="M22 54 V36 Q22 30 28 30 H34 V54"
        fill="none"
        stroke="#f4f1e6"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M36 42 H46 M42 38 L46 42 L42 46"
        fill="none"
        stroke="#f4f1e6"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Dos d'une carte Extraction : pioche face cachée, pioche et pépite. */
function ExtractionBack() {
  return (
    <svg viewBox="0 0 60 84" aria-hidden className="card-art">
      <defs>
        <pattern id="extraction-back-pattern" width="10" height="10" patternUnits="userSpaceOnUse">
          <rect width="10" height="10" fill="var(--extraction-back)" />
          <circle cx="5" cy="5" r="1.4" fill="var(--extraction-back-dot)" />
        </pattern>
      </defs>
      <rect
        x="1.5"
        y="1.5"
        width="57"
        height="81"
        rx="6"
        fill="url(#extraction-back-pattern)"
        stroke={STROKE}
        strokeWidth="2"
      />
      <circle
        cx="30"
        cy="42"
        r="19"
        fill="var(--extraction-back)"
        stroke={STROKE}
        strokeWidth="1.6"
      />
      {/* Pioche de mineur */}
      <path d="M21 52 L38 32" stroke="#e9d3a6" strokeWidth="3.4" strokeLinecap="round" />
      <path
        d="M30 27 Q40 26 45 33 Q39 30 33 31 Z"
        fill="#c9ced8"
        stroke={STROKE}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <MiniNugget x={36} y={50} scale={0.7} />
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

/** Face d'une carte Exit (défausse, choix d'action). */
export function ExitCardFace({ actions }: { actions: readonly ExitActionKind[] }) {
  return (
    <div className="exit-face" aria-hidden>
      {actions.map((action, i) => (
        <span key={i} className="exit-face__action">
          <ExitActionIcon action={action} size={22} />
        </span>
      ))}
    </div>
  );
}
