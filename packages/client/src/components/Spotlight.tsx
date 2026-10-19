import type { CSSProperties } from 'react';
import { CardBack, ExitActionIcon, ExtractionCardArt } from '../assets/Cards';
import { DragonHead, Flame } from '../assets/Dragon';
import { DwarfDisc } from '../assets/DwarfDisc';
import { EXIT_LABELS } from '../i18n/fr';
import type { Highlight, HighlightVisual } from '../spotlight';
import { client } from '../store';

function Visual({ visual, color }: { visual: HighlightVisual; color: number | null }) {
  switch (visual.kind) {
    case 'extraction':
      return (
        <div className="spot-card spot-card--flip">
          <ExtractionCardArt kind={visual.card} />
        </div>
      );
    case 'exitBack':
      return (
        <div className="spot-card spot-card--wobble">
          <CardBack />
        </div>
      );
    case 'exit':
      return (
        <div className="spot-card spot-card--flip spot-card--exit">
          {visual.actions.map((action, i) => (
            <span
              key={i}
              className={[
                'spot-action',
                action === visual.chosen ? 'spot-action--chosen' : '',
                visual.chosen && action !== visual.chosen ? 'spot-action--dim' : '',
              ].join(' ')}
            >
              <ExitActionIcon action={action} size={38} />
              <span>{EXIT_LABELS[action].name}</span>
            </span>
          ))}
        </div>
      );
    case 'dragon':
      return (
        <div className="spot-card spot-card--dragon">
          <DragonHead size={104} />
          {visual.steps > 1 && <span className="spot-badge">×{visual.steps}</span>}
        </div>
      );
    case 'exited':
      return (
        <div className="spot-card spot-card--sortie">
          <DwarfDisc color={color ?? 0} size={72} />
          <span className="spot-sparkle">✨</span>
        </div>
      );
    case 'eliminated':
      return (
        <div className="spot-card spot-card--eliminated">
          <span className="spot-flames" aria-hidden>
            <Flame size={120} />
          </span>
          <span className="spot-dead-discs">
            {visual.colors.map((dwarfColor, i) => (
              <DwarfDisc key={i} color={dwarfColor} size={visual.colors.length > 1 ? 52 : 72} />
            ))}
          </span>
          <span className="spot-skull" aria-hidden>
            💀
          </span>
        </div>
      );
    case 'coin':
      return (
        <div className="spot-card spot-card--coin">
          <div
            className={`coin${visual.side ? ' coin--flip' : ''}`}
            // Nombre pair de demi-tours : pile ; impair : face.
            style={
              { '--coin-end': visual.side === 'tails' ? '1980deg' : '1800deg' } as CSSProperties
            }
          >
            <span className="coin__face coin__face--heads">
              <small>Pile</small>
              {visual.heads}
            </span>
            <span className="coin__face coin__face--tails">
              <small>Face</small>
              {visual.tails}
            </span>
          </div>
        </div>
      );
    case 'skipped':
      return <div className="spot-card spot-card--skipped">⏭</div>;
  }
}

/**
 * Coup en cours mis au premier plan : la carte piochée ou l'action jouée par
 * n'importe quel joueur, avec ses conséquences. Le journal en donne l'équivalent
 * textuel pour les lecteurs d'écran ; un clic passe au coup suivant.
 */
export function Spotlight({
  highlight,
  durationMs,
  color,
}: {
  highlight: Highlight | undefined;
  durationMs: number;
  color: number | null;
}) {
  if (!highlight) return null;
  return (
    <div className={`spotlight${highlight.dramatic ? ' spotlight--dramatic' : ''}`} aria-hidden>
      <div
        key={highlight.id}
        className={`spotlight__panel spotlight__panel--${highlight.tone}`}
        style={{ '--dur': `${durationMs}ms` } as CSSProperties}
        onClick={() => client.dismissHighlight()}
      >
        <Visual visual={highlight.visual} color={color} />
        <div className="spotlight__text">
          <p className="spotlight__title">
            {highlight.dwarfId !== null && color !== null && <DwarfDisc color={color} size={26} />}
            <span>{highlight.title}</span>
          </p>
          <p className="spotlight__name">{highlight.name}</p>
          <p className="spotlight__detail">{highlight.detail}</p>
          {highlight.extra.map((line, i) => (
            <p key={i} className="spotlight__extra">
              {line}
            </p>
          ))}
        </div>
        <span className="spotlight__timer" />
      </div>
    </div>
  );
}
