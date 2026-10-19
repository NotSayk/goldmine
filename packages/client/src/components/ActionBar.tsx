import type { PlayerView } from '@pepite/engine';
import { EXTRACTION_LABELS, plural, reasonText } from '../i18n/fr';
import { client } from '../store';

export function ActionBar({ view, waiting }: { view: PlayerView; waiting: boolean }) {
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
        <span className="action-btn__title">⛏ Creuser</span>
        <span className="action-btn__sub">
          {top
            ? `${EXTRACTION_LABELS[top].name} : ${EXTRACTION_LABELS[top].effect}`
            : view.extraction.count > 0
              ? 'Carte cachée : de l’or… et peut-être un pas vers la Sortie ou vers le dragon'
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
        <span className="action-btn__title">🏃 Fuir</span>
        <span className="action-btn__sub">
          Carte Exit cachée : avancer, échanger ou garder un trésor
        </span>
      </button>
      <p className="actions__note" id="action-note" aria-live="polite">
        {yourTurn && !reason
          ? `À vous ! Or en jeu : ${plural(gold, 'pépite')} (perdu si le dragon vous rattrape).`
          : reason}
      </p>
    </section>
  );
}
