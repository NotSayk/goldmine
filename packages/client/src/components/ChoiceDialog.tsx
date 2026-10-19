import type { PlayerView } from '@pepite/engine';
import { ExitActionIcon } from '../assets/Cards';
import { DwarfDisc } from '../assets/DwarfDisc';
import { EXIT_LABELS, dwarfLabel } from '../i18n/fr';
import { client } from '../store';
import { Modal } from './Modal';
import { TurnCountdown, type TurnTimer } from './TurnCountdown';

/** Choix demandé au joueur après une carte Exit : action à jouer ou nain à échanger. */
export function ChoiceDialog({
  view,
  waiting,
  turnTimer,
}: {
  view: PlayerView;
  waiting: boolean;
  turnTimer: TurnTimer | null;
}) {
  const pending = view.pending;
  const mine = pending !== null && pending.playerId === view.viewerId;
  return (
    <Modal
      open={mine}
      title={pending?.kind === 'chooseSwapTarget' ? 'Avec qui échanger ?' : 'Choisissez une action'}
    >
      {pending?.kind === 'chooseExitAction' && (
        <div className="choice-grid">
          <p className="muted choice-hint">
            <TurnCountdown timer={turnTimer} />
            Votre carte Exit porte deux actions : choisissez-en une, sinon pile ou face décide.
          </p>
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
                <ExitActionIcon action={option.action} size={36} />
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
      {pending?.kind === 'chooseSwapTarget' && (
        <div className="choice-grid">
          <p className="muted choice-hint">
            <TurnCountdown timer={turnTimer} />
            Sans choix avant la fin du temps, la cible est tirée au hasard.
          </p>
          <p className="muted">
            Votre nain prend la place du nain choisi, et inversement. Seuls les nains encore dans la
            mine peuvent être choisis.
          </p>
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
                  <DwarfDisc color={dwarf.color} size={36} />
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
    </Modal>
  );
}
