import { useEffect, useRef } from 'react';
import type { PlayerView } from '@pepite/engine';
import { ExitActionIcon } from '../assets/Cards';
import { EXIT_LABELS } from '../i18n/fr';
import { client } from '../store';
import { TurnCountdown, type TurnTimer } from './TurnCountdown';

/**
 * Choix demandé au joueur après une carte Exit, affiché sous le plateau, sans
 * fenêtre. Pour une action à choisir : deux boutons. Pour un échange : pas de
 * menu, on touche directement le nain voulu sur le plateau (ce sont des
 * boutons, atteignables aussi au clavier).
 */
export function ChoicePanel({
  view,
  waiting,
  turnTimer,
}: {
  view: PlayerView;
  waiting: boolean;
  turnTimer: TurnTimer | null;
}) {
  const ref = useRef<HTMLElement>(null);
  const pending = view.pending;
  const mine = pending !== null && pending.playerId === view.viewerId;
  const kind = mine ? pending.kind : null;

  // Le focus va au premier choix possible : bouton d'action, ou nain à échanger sur le plateau.
  useEffect(() => {
    if (!kind) return;
    const first =
      kind === 'chooseSwapTarget'
        ? document.querySelector<HTMLButtonElement>('button.disc--target')
        : ref.current?.querySelector<HTMLButtonElement>('button.choice:not([disabled])');
    first?.focus({ preventScroll: true });
  }, [kind]);

  if (!mine) return null;
  return (
    <section ref={ref} className="actions choice-panel" aria-labelledby="choice-title">
      <p className="choice-panel__title" id="choice-title">
        <TurnCountdown timer={turnTimer} />
        <span role="status">
          {pending.kind === 'chooseSwapTarget'
            ? 'Échange : touchez sur le plateau le nain avec lequel échanger votre place (ceux entourés en surbrillance).'
            : 'Votre carte Exit porte deux actions : choisissez-en une.'}
        </span>
      </p>
      {pending.kind === 'chooseExitAction' && (
        <div className="choice-grid">
          {(pending.options ?? []).map((option) => (
            <button
              key={option.index}
              type="button"
              className="choice"
              disabled={!option.allowed || waiting}
              onClick={() =>
                client.send({
                  type: 'action',
                  action: { type: 'chooseExitAction', index: option.index },
                })
              }
            >
              <span className="choice__icon">
                <ExitActionIcon action={option.action} size={32} />
              </span>
              <span className="choice__title">{EXIT_LABELS[option.action].name}</span>
              <span className="choice__text">
                {option.allowed
                  ? EXIT_LABELS[option.action].effect
                  : 'Impossible : aucun autre nain n’est dans la mine.'}
              </span>
            </button>
          ))}
        </div>
      )}
      <p className="actions__note">
        Sans choix avant la fin du temps,{' '}
        {pending.kind === 'chooseSwapTarget'
          ? 'la cible est tirée au hasard.'
          : 'pile ou face décide.'}
      </p>
    </section>
  );
}
