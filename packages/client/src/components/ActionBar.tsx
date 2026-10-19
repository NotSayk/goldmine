import type { PlayerView } from '@pepite/engine';
import { BRANDING } from '@pepite/shared/branding';
import { IconPickaxe, IconRun } from '../assets/Icons';
import { EXTRACTION_LABELS, plural, reasonText } from '../i18n/fr';
import { client } from '../store';
import { useSecondsLeft, type TurnTimer } from './TurnCountdown';

export function ActionBar({
  view,
  waiting,
  turnTimer,
}: {
  view: PlayerView;
  waiting: boolean;
  turnTimer: TurnTimer | null;
}) {
  const seconds = useSecondsLeft(turnTimer);
  const { drawExtraction, drawExit, yourTurn } = view.legal;
  const top = view.extraction.top;
  const me = view.players.find((p) => p.id === view.viewerId);
  const gold = me?.pile.gold ?? 0;
  const reason = reasonText(drawExtraction.reason ?? drawExit.reason, view);
  return (
    <section className="actions" aria-label="Vos actions">
      <button
        type="button"
        className="action-btn"
        disabled={!drawExtraction.allowed || waiting}
        onClick={() => client.send({ type: 'action', action: { type: 'drawExtraction' } })}
        aria-describedby="action-note"
      >
        <span className="action-btn__title">
          <IconPickaxe size={22} /> Creuser
        </span>
        <span className="action-btn__sub">
          {top
            ? `${EXTRACTION_LABELS[top].name} : ${EXTRACTION_LABELS[top].effect}`
            : view.extraction.count > 0
              ? `Carte cachée : de l’or… et peut-être 1 carte vers la Sortie ou vers ${BRANDING.dragonName}`
              : 'Pioche vide'}
        </span>
      </button>
      <button
        type="button"
        className="action-btn action-btn--exit"
        disabled={!drawExit.allowed || waiting}
        onClick={() => client.send({ type: 'action', action: { type: 'drawExit' } })}
        aria-describedby="action-note"
      >
        <span className="action-btn__title">
          <IconRun size={22} /> Fuir
        </span>
        <span className="action-btn__sub">
          Carte Exit cachée : avancer, échanger ou garder un Bonus d’or
        </span>
      </button>
      <p className="actions__note" id="action-note" aria-live="polite">
        {yourTurn && !reason
          ? seconds !== null && seconds <= 10
            ? `Plus que ${plural(seconds, 'seconde')} : sinon, pile ou face entre Creuser et Fuir !`
            : `À vous ! Or en jeu : ${plural(gold, 'pépite')} (perdu si le dragon vous rattrape).`
          : reason}
      </p>
    </section>
  );
}
