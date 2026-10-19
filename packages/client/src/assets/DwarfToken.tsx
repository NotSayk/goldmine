import type { DwarfLook } from '@pepite/shared';
import { dwarfLook, type DwarfSymbol } from '../i18n/fr';

export type DwarfMood = 'idle' | 'joy' | 'panic' | 'dead';

const INK = '#14161c';
const SKIN = '#f0c39b';
const BEARDS = ['#ddd5c4', '#c4652e', '#5a3a22'];

/** Symbol de couleur (lisible sans distinguer les couleurs), au centre du torse. */
function Symbol({ symbol, ink }: { symbol: DwarfSymbol; ink: string }) {
  const shape = (() => {
    switch (symbol) {
      case 'circle':
        return <circle cx="20" cy="22" r="6" />;
      case 'square':
        return <rect x="14.5" y="16.5" width="11" height="11" rx="1.5" />;
      case 'triangle':
        return <path d="M20 14.5 L27 27.5 H13 Z" />;
      case 'diamond':
        return <path d="M20 14 L27 22 L20 30 L13 22 Z" />;
      case 'star':
        return (
          <path d="M20 13.5 L22.4 19 L28.3 19.4 L23.8 23.2 L25.2 29 L20 25.9 L14.8 29 L16.2 23.2 L11.7 19.4 L17.6 19 Z" />
        );
      case 'cross':
        return (
          <path d="M17.5 14.5 H22.5 V19.5 H27.5 V24.5 H22.5 V29.5 H17.5 V24.5 H12.5 V19.5 H17.5 Z" />
        );
    }
  })();
  // Symbole dessiné à l'échelle 40 × 40, réduit sur le bas du corps (bien visible).
  return (
    <g transform="translate(10.4 21.9) scale(0.48)" fill={ink}>
      {shape}
    </g>
  );
}

function Hat({ hat }: { hat: number }) {
  switch (hat % 3) {
    case 1:
      // Capuche pointue avec lampe frontale sur bandeau
      return (
        <g className="token__hat">
          <path
            d="M11.5 13 Q11 2 21 0.6 Q19.5 4 28.5 6.5 Q29 9 28.8 13 Q20 9 11.5 13 Z"
            fill="#3d4a6b"
            stroke={INK}
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
          <path d="M12 12 Q20 8.6 28.4 12" fill="none" stroke="#8a6a3a" strokeWidth="1.8" />
        </g>
      );
    case 2:
      // Casque de fer à cornes
      return (
        <g className="token__hat">
          <path
            d="M26 6 Q31.5 3.5 32 0.6 Q29.5 3 25 4.5 Z"
            fill="#efe3c8"
            stroke={INK}
            strokeWidth="1"
          />
          <path
            d="M14 6 Q8.5 3.5 8 0.6 Q10.5 3 15 4.5 Z"
            fill="#efe3c8"
            stroke={INK}
            strokeWidth="1"
          />
          <path
            d="M11.6 12.4 Q11 2.6 20 2.6 Q29 2.6 28.4 12.4 Z"
            fill="#8d97ab"
            stroke={INK}
            strokeWidth="1.3"
          />
          <path d="M11 12.4 H29" stroke={INK} strokeWidth="1.7" strokeLinecap="round" />
          <circle cx="20" cy="5.4" r="0.9" fill="#c9d0dc" />
        </g>
      );
    default:
      // Casque de mineur
      return (
        <g className="token__hat">
          <path
            d="M11.8 12 Q11.8 2 20 2 Q28.2 2 28.2 12 Z"
            fill="#e0b443"
            stroke={INK}
            strokeWidth="1.3"
          />
          <path d="M9.5 12.2 H30.5" stroke={INK} strokeWidth="2" strokeLinecap="round" />
          <path d="M20 2.3 V11.6" stroke="#b88a24" strokeWidth="1.1" />
        </g>
      );
  }
}

function Beard({ beard }: { beard: number }) {
  const color = BEARDS[beard % 3];
  switch (beard % 3) {
    case 1:
      // Tressée, fourchue
      return (
        <g className="token__beard" fill={color} stroke={INK} strokeWidth="1.1">
          <path d="M12.6 15.5 Q13 21.5 16 23 L18.2 27.5 L20 23.5 L21.8 27.5 L24 23 Q27 21.5 27.4 15.5 Q20 19.5 12.6 15.5 Z" />
          <path d="M17.2 25.2 h1.6 M21.2 25.2 h1.6" stroke={INK} strokeWidth="0.7" />
        </g>
      );
    case 2:
      // Courte et ronde
      return (
        <path
          className="token__beard"
          d="M12.6 15.5 Q12.6 23 20 23 Q27.4 23 27.4 15.5 Q20 19.5 12.6 15.5 Z"
          fill={color}
          stroke={INK}
          strokeWidth="1.1"
        />
      );
    default:
      // Longue, jusqu'au torse
      return (
        <path
          className="token__beard"
          d="M12.6 15.5 Q12.2 24 20 27 Q27.8 24 27.4 15.5 Q20 19.5 12.6 15.5 Z"
          fill={color}
          stroke={INK}
          strokeWidth="1.1"
        />
      );
  }
}

function Eyes({ mood }: { mood: DwarfMood }) {
  switch (mood) {
    case 'joy':
      return (
        <g className="token__eyes" fill="none" stroke={INK} strokeWidth="1.2" strokeLinecap="round">
          <path d="M14.9 14 Q16.3 12.3 17.7 14 M20.9 14 Q22.3 12.3 23.7 14" />
        </g>
      );
    case 'panic':
      return (
        <g className="token__eyes">
          <circle cx="16.2" cy="13.5" r="2" fill="#fff" stroke={INK} strokeWidth="0.8" />
          <circle cx="22.4" cy="13.5" r="2" fill="#fff" stroke={INK} strokeWidth="0.8" />
          <circle cx="15.8" cy="13.7" r="0.9" fill={INK} />
          <circle cx="22" cy="13.7" r="0.9" fill={INK} />
        </g>
      );
    case 'dead':
      return (
        <g className="token__eyes" stroke={INK} strokeWidth="1.1" strokeLinecap="round">
          <path d="M15 12.4 L17.4 14.8 M17.4 12.4 L15 14.8 M21.2 12.4 L23.6 14.8 M23.6 12.4 L21.2 14.8" />
        </g>
      );
    default:
      return (
        <g className="token__eyes" fill={INK}>
          <ellipse className="token__eye" cx="16" cy="13.6" rx="1.05" ry="1.35" />
          <ellipse className="token__eye" cx="22" cy="13.6" rx="1.05" ry="1.35" />
        </g>
      );
  }
}

/**
 * Jeton-personnage d'un nain (dessin original) : casque et lampe, barbe,
 * corps à la couleur du nain avec son symbole. Tourné vers la gauche, vers
 * la Sortie ; tous les symboles sont symétriques, le jeton peut donc être
 * retourné pour regarder à droite.
 */
export function DwarfToken({
  color,
  look,
  mood = 'idle',
  size = 32,
  label,
  className = '',
}: {
  color: number;
  look?: DwarfLook;
  mood?: DwarfMood;
  size?: number;
  label?: string;
  className?: string;
}) {
  const palette = dwarfLook(color);
  const hat = look?.hat ?? color % 3;
  const beard = look?.beard ?? (color + 1) % 3;
  return (
    <svg
      className={`token token--${mood} ${className}`}
      width={size}
      height={size}
      viewBox="0 0 40 40"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <g className="token__figure">
        {/* Corps : disque à la couleur du nain, avec son symbole */}
        <circle cx="20" cy="27" r="12.4" fill={palette.color} stroke={INK} strokeWidth="1.6" />
        <path
          d="M10.5 23 A11 11 0 0 1 14.5 18.4"
          fill="none"
          stroke="rgba(255,255,255,0.45)"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <Symbol symbol={palette.symbol} ink={palette.ink} />
        {/* Tête */}
        <circle cx="20" cy="13.5" r="7.2" fill={SKIN} stroke={INK} strokeWidth="1.2" />
        <Beard beard={beard} />
        <circle cx="18.6" cy="16.6" r="1.6" fill="#d9957a" stroke={INK} strokeWidth="0.6" />
        <Eyes mood={mood} />
        <Hat hat={hat} />
        {/* Lampe frontale, sur tous les chapeaux */}
        <circle
          className="token__lamp"
          cx="14.2"
          cy="8.6"
          r="2.1"
          fill="#fff4c2"
          stroke={INK}
          strokeWidth="0.9"
        />
        {mood === 'panic' && (
          <path
            className="token__sweat"
            d="M29.6 8.5 Q31.6 11.5 29.6 12.7 Q27.6 11.5 29.6 8.5 Z"
            fill="#9fe3ff"
            stroke={INK}
            strokeWidth="0.6"
          />
        )}
      </g>
    </svg>
  );
}
