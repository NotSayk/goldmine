import { useEffect, useRef } from 'react';
import type { PlayerView } from '@pepite/engine';
import { ExitActionIcon } from '../assets/Cards';
import { DwarfToken } from '../assets/DwarfToken';
import { EXIT_LABELS, dwarfLabel } from '../i18n/fr';
import { useLooks } from '../looks';
import { client } from '../store';
import { TurnCountdown, type TurnTimer } from './TurnCountdown';

/**
 * Choix demandé au joueur après une carte Exit (action à jouer ou nain à
 * échanger). Affiché à la place des boutons d'action, sans fenêtre : le
 * plateau reste visible, et les nains échangeables s'y touchent aussi.
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
  const looks = useLooks();
  const ref = useRef<HTMLElement>(null);
  const pending = view.pending;
  const mine = pending !== null && pending.playerId === view.viewerId;
  const kind = mine ? pending.kind : null;

  // Le focus va au premier choix possible, comme dans une fenêtre de dialogue.
  useEffect(() => {
    if (kind)
      ref.current?.querySelector<HTMLButtonElement>('button.choice:not([disabled])')?.focus();
  }, [kind]);

  if (!mine) return null;
  return (
    <section ref={ref} className="actions choice-panel" aria-labelledby="choice-title">
      <p className="choice-panel__title" id="choice-title">
        <TurnCountdown timer={turnTimer} />
        <span role="status">
          {pending.kind === 'chooseSwapTarget'
            ? 'Avec quel nain échanger votre place ? Touchez-le sur le plateau ou ci-dessous.'
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
      {pending.kind === 'chooseSwapTarget' && (
        <div className="choice-grid">
          {pending.targets.map((id) => {
            const dwarf = view.dwarves[id];
            if (!dwarf) return null;
            return (
              <button
                key={id}
                type="button"
                className="choice"
                disabled={waiting}
                onClick={() =>
                  client.send({ type: 'action', action: { type: 'chooseSwapTarget', dwarfId: id } })
                }
              >
                <span className="choice__icon">
                  <DwarfToken color={dwarf.color} look={looks.get(dwarf.ownerId)} size={36} />
                </span>
                <span className="choice__title">{dwarfLabel(view, id)}</span>
                <span className="choice__text">
                  {dwarf.position === 4 ? 'Sur le Wagon' : `Sur la carte ${dwarf.position}`}
                  {dwarf.position < (view.dwarves[pending.dwarfId]?.position ?? 0)
                    ? ' — plus près de la Sortie que vous'
                    : ''}
                </span>
              </button>
            );
          })}
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
