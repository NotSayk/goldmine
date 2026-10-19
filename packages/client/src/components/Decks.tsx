import type { CSSProperties, ReactNode } from 'react';
import type { Availability, PlayerView } from '@pepite/engine';
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

/** Ce que le joueur peut piocher maintenant (d'après la dernière vue du serveur). */
export interface DrawChoices {
  readonly extraction: Availability;
  readonly exit: Availability;
  readonly waiting: boolean;
  readonly onDraw: (deck: 'extraction' | 'exit') => void;
}

/** Pioche jouable : on la touche pour piocher (anneau doré quand c'est à vous). */
function DeckSlot({
  deck,
  draw,
  label,
  stackStyle,
  children,
}: {
  deck: 'extraction' | 'exit';
  draw: DrawChoices | undefined;
  label: string;
  stackStyle: CSSProperties;
  children: ReactNode;
}) {
  const availability = draw?.[deck];
  const playable = availability?.allowed === true && draw?.waiting === false;
  const verb = deck === 'extraction' ? 'Creuser' : 'Fuir';
  return (
    <button
      type="button"
      className={`deck__card deck__card--stacked deck__card--button${playable ? ' deck__card--playable' : ''}`}
      style={stackStyle}
      data-deck={deck}
      disabled={!playable}
      onClick={() => draw?.onDraw(deck)}
      aria-label={`${verb} : ${label}`}
      aria-describedby="action-note"
      title={playable ? `${verb} : ${label}` : label}
    >
      {children}
    </button>
  );
}

export function Decks({
  view,
  lastDrawn,
  draw,
}: {
  view: PlayerView;
  /** Dernière carte creusée (vue par tous au moment de la pioche). */
  lastDrawn: LastDrawn | null;
  /** Absent pour un spectateur. */
  draw?: DrawChoices;
}) {
  const top = view.extraction.top;
  const discardTop = view.exit.discard[view.exit.discard.length - 1];
  const count = view.extraction.count;
  const exitCount = view.exit.deckCount;
  return (
    <section className="decks" aria-label="Pioches">
      <div className="deck">
        <div className="deck__label">Extraction</div>
        <DeckSlot
          deck="extraction"
          draw={draw}
          stackStyle={thickness(count)}
          label={
            top
              ? `${EXTRACTION_LABELS[top].name}, ${EXTRACTION_LABELS[top].effect}`
              : `piocher une carte Extraction, face cachée (${plural(count, 'carte')})`
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
        </DeckSlot>
        <div className="deck__count">{plural(count, 'carte')}</div>
        {/* Ligne toujours présente (vide au début) : le plateau ne grandit pas à la première pioche. */}
        <div className="deck__hint">
          {lastDrawn && (
            <>
              Dernière : {EXTRACTION_LABELS[lastDrawn.card].name} ({lastDrawn.by})
            </>
          )}
        </div>
      </div>
      <div className="deck">
        <div className="deck__label">Exit</div>
        <DeckSlot
          deck="exit"
          draw={draw}
          stackStyle={thickness(exitCount)}
          label={`piocher une carte Exit, face cachée (${plural(exitCount, 'carte')})`}
        >
          {exitCount > 0 ? (
            <Card3D finish="exit">
              <CardBack />
            </Card3D>
          ) : (
            <div className="card-empty">Vide</div>
          )}
        </DeckSlot>
        <div className="deck__count">{plural(exitCount, 'carte')}</div>
        <div className="deck__hint" />
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
        <div className="deck__hint">
          {discardTop && discardTop.map((a) => EXIT_LABELS[a].name).join(' / ')}
        </div>
      </div>
    </section>
  );
}
