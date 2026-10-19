import type { CSSProperties } from 'react';
import type { PlayerView } from '@pepite/engine';
import { CardBack, ExitCardFace, ExtractionCardArt } from '../assets/Cards';
import { EXIT_LABELS, EXTRACTION_LABELS, plural } from '../i18n/fr';
import type { LastDrawn } from '../store';
import { Card3D } from './Card3D';

/** Épaisseur de la pile selon le nombre de cartes (tranche dessinée par des ombres). */
function thickness(count: number): CSSProperties {
  const layers = Math.min(7, Math.ceil(count / 8));
  const shadows = Array.from(
    { length: layers },
    (_, i) => `${i + 1}px ${(i + 1) * 1.5}px 0 ${i % 2 === 0 ? '#2b1d10' : '#120c06'}`,
  );
  return { '--stack': shadows.length > 0 ? shadows.join(', ') : 'none' } as CSSProperties;
}

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
  const exitCount = view.exit.deckCount;
  return (
    <section className="decks" aria-label="Pioches">
      <div className="deck">
        <div className="deck__label">Extraction</div>
        <div
          className="deck__card deck__card--stacked"
          style={thickness(count)}
          data-deck="extraction"
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
            <Card3D finish={top === 'dragon' ? 'dragon' : 'gold'}>
              <ExtractionCardArt kind={top} />
            </Card3D>
          ) : count > 0 ? (
            <Card3D>
              <CardBack deck="extraction" />
            </Card3D>
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
          style={thickness(exitCount)}
          data-deck="exit"
          role="img"
          aria-label={`Pioche Exit, face cachée : ${plural(exitCount, 'carte')}`}
          title="Cartes Exit : face cachée"
        >
          {exitCount > 0 ? (
            <Card3D finish="exit">
              <CardBack />
            </Card3D>
          ) : (
            <div className="card-empty">Vide</div>
          )}
        </div>
        <div className="deck__count">{plural(exitCount, 'carte')}</div>
      </div>
      <div className="deck">
        <div className="deck__label">Défausse Exit</div>
        <div
          className="deck__card"
          data-deck="exit-discard"
          role="img"
          aria-label={
            discardTop
              ? `Dernière carte défaussée : ${discardTop.map((a) => EXIT_LABELS[a].name).join(' ou ')}`
              : 'Défausse vide'
          }
          title={discardTop ? discardTop.map((a) => EXIT_LABELS[a].name).join(' / ') : undefined}
        >
          {discardTop ? (
            <Card3D finish="exit" className="deck__discard">
              <ExitCardFace actions={discardTop} />
            </Card3D>
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
