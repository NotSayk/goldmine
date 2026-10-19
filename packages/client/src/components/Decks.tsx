import type { PlayerView } from '@pepite/engine';
import { CardBack, ExitCardFace, ExtractionCardArt } from '../assets/Cards';
import { EXIT_LABELS, EXTRACTION_LABELS, plural } from '../i18n/fr';
import type { LastDrawn } from '../store';

export function Decks({
  view,
  lastDrawn,
}: {
  view: PlayerView;
  /** Dernière carte creusée (vue par tous au moment de la pioche). */
  lastDrawn: LastDrawn | null;
}) {
  const top = view.extraction.top;
  const discardTop = view.exit.discard[view.exit.discard.length - 1];
  const count = view.extraction.count;
  return (
    <section className="decks" aria-label="Pioches">
      <div className="deck">
        <div className="deck__label">Extraction</div>
        <div
          className="deck__card deck__card--stacked"
          role="img"
          aria-label={
            top
              ? `Carte visible : ${EXTRACTION_LABELS[top].name}, ${EXTRACTION_LABELS[top].effect}`
              : `Pioche Extraction, face cachée : ${plural(count, 'carte')}`
          }
          title={
            top
              ? `${EXTRACTION_LABELS[top].name} : ${EXTRACTION_LABELS[top].effect}`
              : 'Face cachée : on découvre la carte en la piochant'
          }
        >
          {top ? (
            <ExtractionCardArt kind={top} />
          ) : count > 0 ? (
            <CardBack deck="extraction" />
          ) : (
            <div className="card-empty">Vide</div>
          )}
        </div>
        <div className="deck__count">{plural(count, 'carte')}</div>
        {lastDrawn && (
          <div className="deck__hint">
            Dernière : {EXTRACTION_LABELS[lastDrawn.card].name} ({lastDrawn.by})
          </div>
        )}
      </div>
      <div className="deck">
        <div className="deck__label">Exit</div>
        <div
          className="deck__card deck__card--stacked"
          role="img"
          aria-label={`Pioche Exit, face cachée : ${plural(view.exit.deckCount, 'carte')}`}
          title="Cartes Exit : face cachée"
        >
          {view.exit.deckCount > 0 ? <CardBack /> : <div className="card-empty">Vide</div>}
        </div>
        <div className="deck__count">{plural(view.exit.deckCount, 'carte')}</div>
      </div>
      <div className="deck">
        <div className="deck__label">Défausse Exit</div>
        <div
          className="deck__card"
          role="img"
          aria-label={
            discardTop
              ? `Dernière carte défaussée : ${discardTop.map((a) => EXIT_LABELS[a].name).join(' ou ')}`
              : 'Défausse vide'
          }
          title={discardTop ? discardTop.map((a) => EXIT_LABELS[a].name).join(' / ') : undefined}
        >
          {discardTop ? (
            <ExitCardFace actions={discardTop} />
          ) : (
            <div className="card-empty">Vide</div>
          )}
        </div>
        <div className="deck__count">{plural(view.exit.discard.length, 'carte')}</div>
        {discardTop && (
          <div className="deck__hint">{discardTop.map((a) => EXIT_LABELS[a].name).join(' / ')}</div>
        )}
      </div>
    </section>
  );
}
