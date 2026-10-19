import { useState } from 'react';
import type { PlayerView } from '@pepite/engine';
import type { RoomView } from '@pepite/shared';
import { BRANDING } from '@pepite/shared/branding';
import { DwarfDisc } from '../assets/DwarfDisc';
import { ActionBar } from '../components/ActionBar';
import { ChoiceDialog } from '../components/ChoiceDialog';
import { Decks } from '../components/Decks';
import { GameLog } from '../components/GameLog';
import { Modal } from '../components/Modal';
import { Players } from '../components/Players';
import { FinalStandings, RoundResultTable } from '../components/Results';
import { TopBar } from '../components/TopBar';
import { Track } from '../components/Track';
import { dwarfLook, dwarfName } from '../i18n/fr';
import { client, type Effect, type LogEntry } from '../store';

function TurnBanner({ view, room }: { view: PlayerView; room: RoomView }) {
  if (view.phase !== 'playing') return null;
  const dwarf = view.currentDwarfId === null ? undefined : view.dwarves[view.currentDwarfId];
  const yours = view.legal.yourTurn;
  const pending = view.pending;
  const current = room.players.find((p) => p.id === view.currentPlayerId);
  let text = yours ? 'À vous de jouer !' : `Au tour de ${dwarf ? dwarfName(view, dwarf.id) : '…'}`;
  if (yours && view.doubleDraw && dwarf) {
    text = `À vous de jouer avec votre nain ${dwarfLook(dwarf.color).name} !`;
  }
  if (pending && !yours)
    text +=
      pending.kind === 'chooseSwapTarget'
        ? ' (choisit un nain à échanger)'
        : ' (choisit une action)';
  if (current?.botControlled || current?.isBot) text += ' — joue automatiquement';
  return (
    <div
      className={`turn-banner${yours ? ' turn-banner--you' : ''}`}
      role="status"
      aria-live="polite"
    >
      {dwarf && <DwarfDisc color={dwarf.color} size={30} />}
      <span className="turn-banner__text">{text}</span>
      <span className="small muted">
        {BRANDING.dragonName} :{' '}
        {view.dragonPosition === 8 ? 'au fond' : `carte ${view.dragonPosition}`}
      </span>
    </div>
  );
}

function RoundEndPanel({ view, isHost }: { view: PlayerView; isHost: boolean }) {
  // Monté avec une clé par manche : la fenêtre se rouvre à chaque fin de manche.
  const [open, setOpen] = useState(true);
  const result = view.roundResults[view.roundResults.length - 1];
  if (view.phase !== 'roundEnd' || !result) return null;
  const nextButton = isHost ? (
    <button type="button" className="btn" onClick={() => client.send({ type: 'nextRound' })}>
      Lancer la manche {view.round + 1}
    </button>
  ) : (
    <span className="muted">En attente de l’hôte pour la manche {view.round + 1}…</span>
  );
  return (
    <>
      <section className="panel row" aria-label="Fin de manche">
        <strong style={{ flex: 1 }}>Manche {view.round} terminée.</strong>
        <button type="button" className="btn btn--ghost" onClick={() => setOpen(true)}>
          Voir le classement
        </button>
        {nextButton}
      </section>
      <Modal
        open={open}
        title={`Fin de la manche ${view.round}`}
        onClose={() => setOpen(false)}
        closeLabel="Voir la table"
      >
        <RoundResultTable view={view} result={result} />
        <div className="row" style={{ marginTop: 16, justifyContent: 'flex-end' }}>
          {nextButton}
        </div>
      </Modal>
    </>
  );
}

function FinalPanel({ view, isHost }: { view: PlayerView; isHost: boolean }) {
  const last = view.roundResults[view.roundResults.length - 1];
  return (
    <section className="panel stack" aria-label="Fin de la partie">
      <FinalStandings view={view} />
      {last && (
        <details className="collapsible">
          <summary>Détail de la manche 3</summary>
          <RoundResultTable view={view} result={last} />
        </details>
      )}
      <div className="row">
        {isHost && (
          <button
            type="button"
            className="btn"
            onClick={() => client.send({ type: 'backToLobby' })}
          >
            Rejouer (retour au salon)
          </button>
        )}
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => client.send({ type: 'leaveRoom' })}
        >
          Quitter
        </button>
      </div>
    </section>
  );
}

export function GameScreen({
  view,
  room,
  log,
  effects,
  waiting,
}: {
  view: PlayerView;
  room: RoomView;
  log: readonly LogEntry[];
  effects: readonly Effect[];
  waiting: boolean;
}) {
  const [confirmLeave, setConfirmLeave] = useState(false);
  const isHost = room.hostId === view.viewerId;
  const swapTargets =
    view.pending?.kind === 'chooseSwapTarget' && view.pending.playerId === view.viewerId
      ? view.pending.targets
      : [];
  return (
    <>
      <TopBar
        meta={`Manche ${Math.min(view.round, view.totalRounds)}/${view.totalRounds} · ${room.code}`}
      >
        <button
          type="button"
          className="btn btn--small btn--danger"
          onClick={() => setConfirmLeave(true)}
        >
          Quitter
        </button>
      </TopBar>
      <main className="game">
        <div className="stack">
          <TurnBanner view={view} room={room} />
          <Track
            view={view}
            effects={effects}
            swapTargets={swapTargets}
            onSwap={(dwarfId) =>
              client.send({ type: 'action', action: { type: 'chooseSwapTarget', dwarfId } })
            }
          />
          <Decks view={view} />
          <RoundEndPanel key={view.round} view={view} isHost={isHost} />
          {view.phase === 'finished' && <FinalPanel view={view} isHost={isHost} />}
          {view.phase === 'playing' && <ActionBar view={view} waiting={waiting} />}
        </div>
        <aside className="game__side stack">
          <Players view={view} room={room} />
          <GameLog entries={log} />
        </aside>
      </main>
      <ChoiceDialog view={view} waiting={waiting} />
      <Modal open={confirmLeave} title="Quitter la partie ?" onClose={() => setConfirmLeave(false)}>
        <p>Un bot jouera à votre place jusqu’à la fin de la partie. Vous ne pourrez pas revenir.</p>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn--ghost" onClick={() => setConfirmLeave(false)}>
            Rester
          </button>
          <button
            type="button"
            className="btn btn--danger"
            onClick={() => client.send({ type: 'leaveRoom' })}
          >
            Quitter
          </button>
        </div>
      </Modal>
    </>
  );
}
