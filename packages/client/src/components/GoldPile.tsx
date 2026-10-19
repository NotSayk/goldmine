import type { CSSProperties } from 'react';
import { Nugget } from '../assets/Nugget';
import { plural } from '../i18n/fr';
import { RollingNumber } from './RollingNumber';

const VISIBLE_CARDS = 6;

/** Désordre fixe de chaque carte de la pile (toujours le même pour un rang donné). */
function jitter(index: number): { rotate: number; x: number } {
  const seed = Math.sin(index * 12.9898) * 43758.5453;
  const unit = seed - Math.floor(seed);
  return { rotate: (unit - 0.5) * 16, x: (unit - 0.5) * 4 };
}

/**
 * Pile d'or d'un joueur : de vraies cartes empilées de travers, qui se tassent
 * à chaque ajout, et un compteur qui défile. C'est aussi la destination des
 * cartes et des pépites qui volent (`data-gold-anchor`).
 */
export function GoldPile({
  playerId,
  cards,
  gold,
}: {
  playerId: string;
  cards: number;
  /** `null` si la valeur est cachée. */
  gold: number | null;
}) {
  const shown = Math.min(cards, VISIBLE_CARDS);
  return (
    <span
      className="gold-pile"
      data-gold-anchor={playerId}
      title="Or en jeu : perdu si le dragon rattrape le nain"
      aria-label={
        gold === null
          ? `Or en jeu : valeur cachée, ${plural(cards, 'carte')}`
          : `Or en jeu : ${plural(gold, 'pépite')} (${plural(cards, 'carte')})`
      }
      role="img"
    >
      <span className="gold-pile__stack" data-parity={cards % 2} aria-hidden>
        {cards === 0 && <span className="gold-pile__empty" />}
        {Array.from({ length: shown }, (_, i) => {
          const { rotate, x } = jitter(i);
          return (
            <span
              key={i}
              className="gold-pile__card"
              style={{ '--r': `${rotate}deg`, '--x': `${x}px`, '--i': i } as CSSProperties}
            />
          );
        })}
      </span>
      <span className="gold-pile__value" aria-hidden>
        <Nugget size={16} />
        <RollingNumber value={gold} />
      </span>
    </span>
  );
}
