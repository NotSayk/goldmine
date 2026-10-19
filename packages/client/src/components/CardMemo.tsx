import { useState } from 'react';
import type { ExtractionKind, PlayerView } from '@pepite/engine';
import { ExitActionIcon, ExtractionCardArt } from '../assets/Cards';
import { BigNugget } from '../assets/Nugget';
import { EXIT_LABELS, EXTRACTION_LABELS } from '../i18n/fr';

const EXTRACTION_ORDER: readonly ExtractionKind[] = ['redDoor', 'blueDoor', 'noDoor', 'dragon'];
const WIDE_QUERY = '(min-width: 1200px)';

/** Mémo de toutes les cartes du jeu : effet, nombre dans la boîte, cartes restantes. */
export function CardMemo({ view }: { view: PlayerView }) {
  // Ouvert d'office en colonne de gauche (grand écran), replié sur téléphone.
  const [open, setOpen] = useState(() => window.matchMedia(WIDE_QUERY).matches);
  return (
    <details
      className="panel memo"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>
        <h2>Mémo des cartes</h2>
      </summary>
      <section aria-labelledby="memo-extraction">
        <h3 id="memo-extraction">
          Extraction <span className="memo__hint">cachée · « Creuser »</span>
        </h3>
        <ul className="memo__list">
          {EXTRACTION_ORDER.map((kind) => (
            <li
              key={kind}
              className={`memo__item${kind === 'dragon' ? ' memo__item--danger' : ''}`}
            >
              <span className="memo__art">
                <ExtractionCardArt kind={kind} />
              </span>
              <span className="memo__text">
                <strong>{EXTRACTION_LABELS[kind].name}</strong>
                <span>{EXTRACTION_LABELS[kind].short}</span>
              </span>
              <span className="memo__count" title="Exemplaires dans la boîte">
                <span>×</span>
                <strong>{view.decks.extraction[kind]}</strong>
              </span>
            </li>
          ))}
        </ul>
        <p className="memo__hint">
          Pioche face cachée : {view.extraction.count} cartes restantes (le détail par type reste
          secret).
        </p>
      </section>
      <section aria-labelledby="memo-exit">
        <h3 id="memo-exit">
          Exit <span className="memo__hint">cachée · « Fuir »</span>
        </h3>
        <ul className="memo__list">
          {view.decks.exit.map((entry, index) => (
            <li key={index} className="memo__item">
              <span className="memo__icon">
                {entry.actions.map((action, i) => (
                  <ExitActionIcon
                    key={i}
                    action={action}
                    size={entry.actions.length > 1 ? 18 : 24}
                  />
                ))}
              </span>
              <span className="memo__text">
                <strong>{entry.actions.map((a) => EXIT_LABELS[a].name).join(' ou ')}</strong>
                <span>{entry.actions.map((a) => EXIT_LABELS[a].short).join(' / ')}</span>
              </span>
              <span className="memo__count" title="Exemplaires dans la boîte">
                <span>×</span>
                <strong>{entry.count}</strong>
              </span>
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="memo-score" className="memo__score">
        <h3 id="memo-score">Décompte</h3>
        <p className="legend">
          <BigNugget size={22} />
          <span>
            Manches 1 et 2 : 3, 2, 1 Grosses pépites aux trois nains sortis les plus riches. Manche
            3 : chaque Grosse pépite vaut 1 pépite.
          </span>
        </p>
      </section>
    </details>
  );
}
