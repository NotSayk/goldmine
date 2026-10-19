import type { PlayerView } from '@pepite/engine';
import { CardBack, ExitCardFace, ExtractionCardArt } from '../assets/Cards';
import { EXIT_LABELS, EXTRACTION_LABELS, plural } from '../i18n/fr';

export function Decks({ view }: { view: PlayerView }) {
  const top = view.extraction.top;
  const discardTop = view.exit.discard[view.exit.discard.length - 1];
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
              : 'Aucune carte visible'
          }
          title={
            top ? `${EXTRACTION_LABELS[top].name} : ${EXTRACTION_LABELS[top].effect}` : undefined
          }
        >
          {top ? (
            <ExtractionCardArt kind={top} />
          ) : (
            <div className="card-empty">{view.phase === 'playing' ? 'Vide' : 'Manche finie'}</div>
          )}
        </div>
        <div className="deck__count">{plural(view.extraction.count, 'carte')}</div>
        {top && <div className="deck__hint">{EXTRACTION_LABELS[top].name}</div>}
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
