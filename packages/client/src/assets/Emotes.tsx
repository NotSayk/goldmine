import type { Emote } from '@pepite/shared';
import { Flame } from './Dragon';
import { Nugget } from './Nugget';

export const EMOTE_LABELS: Record<Emote, string> = {
  cheer: 'Bravo !',
  laugh: 'Ha ha !',
  gasp: 'Oh non !',
  fire: 'Ça chauffe !',
  gold: 'De l’or !',
  wave: 'Salut !',
};

function Face({ children }: { children: React.ReactNode }) {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden>
      <circle cx="14" cy="14" r="11.5" fill="#ffd36a" stroke="#5a3900" strokeWidth="1.6" />
      {children}
    </svg>
  );
}

/** Pictogrammes originaux des réactions rapides. */
export function EmoteIcon({ emote }: { emote: Emote }) {
  switch (emote) {
    case 'cheer':
      return (
        <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden>
          <path
            d="M14 2 L16.6 10 L25 10.2 L18.3 15.2 L20.8 23.4 L14 18.5 L7.2 23.4 L9.7 15.2 L3 10.2 L11.4 10 Z"
            fill="#ffd36a"
            stroke="#5a3900"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'laugh':
      return (
        <Face>
          <path
            d="M8.5 11.5 Q10 9.5 11.5 11.5 M16.5 11.5 Q18 9.5 19.5 11.5"
            fill="none"
            stroke="#3a2400"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path d="M8.5 15.5 Q14 22.5 19.5 15.5 Z" fill="#7a2a12" />
        </Face>
      );
    case 'gasp':
      return (
        <Face>
          <circle cx="10" cy="11" r="1.6" fill="#3a2400" />
          <circle cx="18" cy="11" r="1.6" fill="#3a2400" />
          <ellipse cx="14" cy="18.5" rx="2.6" ry="3.4" fill="#7a2a12" />
          <path
            d="M22 4 Q24 7.5 22 8.6 Q20 7.5 22 4 Z"
            fill="#9fe3ff"
            stroke="#14161c"
            strokeWidth="0.6"
          />
        </Face>
      );
    case 'fire':
      return <Flame size={28} />;
    case 'gold':
      return <Nugget size={28} />;
    case 'wave':
      return (
        <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden>
          <path
            d="M9 24 Q5 19 6 14 L8 9.5 Q9 8 10.4 9.2 L11 13 L11.5 5.5 Q12.5 4 14 5.4 L14.4 12 L15.4 4.6 Q16.8 3.4 18 4.8 L17.6 12.4 L19.6 7.6 Q21 6.8 21.8 8.2 L20 17 Q19 23 14 24.5 Z"
            fill="#f0c39b"
            stroke="#3a2400"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <path
            d="M3 6 Q2 9 3 12 M24.5 15 Q26 18 24.5 21"
            fill="none"
            stroke="#5fd4ec"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      );
  }
}
