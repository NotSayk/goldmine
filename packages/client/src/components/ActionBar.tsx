import type { PlayerView } from '@pepite/engine';
import { plural, reasonText } from '../i18n/fr';
import { useSecondsLeft, type TurnTimer } from './TurnCountdown';

/**
 * Bandeau d'aide du tour. On joue en touchant directement une pioche sur le
 * plateau ; ce bandeau dit quoi faire, ou pourquoi ce n'est pas possible.
 */
export function ActionBar({ view, turnTimer }: { view: PlayerView; turnTimer: TurnTimer | null }) {
  const seconds = useSecondsLeft(turnTimer);
  const { drawExtraction, drawExit, yourTurn } = view.legal;
  const me = view.players.find((p) => p.id === view.viewerId);
  const gold = me?.pile.gold ?? 0;
  const reason = reasonText(drawExtraction.reason ?? drawExit.reason, view);
  const playable = yourTurn && !reason;
  return (
    <section
      className={`actions actions--hint${playable ? ' actions--your-turn' : ''}`}
      aria-label="Votre tour"
    >
      <p className="actions__note" id="action-note" aria-live="polite">
        {playable
          ? seconds !== null && seconds <= 10
            ? `Plus que ${plural(seconds, 'seconde')} : touchez une pioche, sinon pile ou face !`
            : `À vous ! Touchez la pioche Extraction pour creuser, ou la pioche Exit pour fuir. Or en jeu : ${plural(gold, 'pépite')}.`
          : reason}
      </p>
    </section>
  );
}
