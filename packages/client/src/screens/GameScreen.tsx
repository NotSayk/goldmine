import { useEffect, useState } from 'react';
import type { PlayerView } from '@pepite/engine';
import type { RoomView } from '@pepite/shared';
import { BRANDING } from '@pepite/shared/branding';
import { DwarfDisc } from '../assets/DwarfDisc';
import { ActionBar } from '../components/ActionBar';
import { CardMemo } from '../components/CardMemo';
import { ChoiceDialog } from '../components/ChoiceDialog';
import { Decks } from '../components/Decks';
import { GameLog } from '../components/GameLog';
import { Modal } from '../components/Modal';
import { Players } from '../components/Players';
import { Scene } from '../components/Scene';
import { Spotlight } from '../components/Spotlight';
import { FinalStandings, RoundResultTable } from '../components/Results';
import { TopBar } from '../components/TopBar';
import { Track } from '../components/Track';
import { TurnCountdown, type TurnTimer } from '../components/TurnCountdown';
import { startFpsMonitor } from '../fx/fps';
import { heatOf } from '../fx/heat';
import { dwarfLook, dwarfName } from '../i18n/fr';
import type { Sequence } from '../director/sequences';
import { client, type LastDrawn, type LogEntry } from '../store';

function TurnBanner({
  view,
  room,
  turnTimer,
}: {
  view: PlayerView;
  room: RoomView;
  turnTimer: TurnTimer | null;
}) {
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
    <div className={`turn-banner${yours ? ' turn-banner--you' : ''}`}>
      {dwarf && <DwarfDisc color={dwarf.color} size={30} />}
      {/* Seul le texte est annoncé : le compte à rebours changerait chaque seconde. */}
      <span className="turn-banner__text" role="status" aria-live="polite">
        {text}
      </span>
      <span className="small muted">
        {BRANDING.dragonName} :{' '}
        {view.dragonPosition === 8 ? 'au fond' : `carte ${view.dragonPosition}`}
      </span>
      <TurnCountdown timer={turnTimer} />
    </div>
  );
}

function RoundEndPanel({
  view,
  isHost,
  idle,
}: {
  view: PlayerView;
  isHost: boolean;
  /** Plus aucun coup à montrer : le classement peut s'ouvrir. */
  idle: boolean;
}) {
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
        open={open && idle}
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
  boardView,
  room,
  log,
  waiting,
  sequence,
  sequenceMs,
  sequenceSpeed,
  queued,
  lastDrawn,
  turnTimer,
}: {
  /** Dernière vue reçue : actions et choix, jamais retardés par les animations. */
  view: PlayerView;
  /** Vue montrée sur la table, au rythme du réalisateur. */
  boardView: PlayerView;
  room: RoomView;
  log: readonly LogEntry[];
  waiting: boolean;
  sequence: Sequence | null;
  sequenceMs: number;
  sequenceSpeed: number;
  queued: number;
  lastDrawn: LastDrawn | null;
  turnTimer: TurnTimer | null;
}) {
  const [confirmLeave, setConfirmLeave] = useState(false);
  const isHost = room.hostId === view.viewerId;
  const swapTargets =
    view.pending?.kind === 'chooseSwapTarget' && view.pending.playerId === view.viewerId
      ? view.pending.targets
      : [];
  const idle = sequence === null && queued === 0;
  const heat = heatOf(boardView.dragonPosition);

  // La chaleur teinte toute la page ; la qualité « auto » suit la fluidité.
  useEffect(() => {
    document.documentElement.style.setProperty('--heat', heat.toFixed(3));
  }, [heat]);
  useEffect(() => {
    const stop = startFpsMonitor();
    return () => {
      stop();
      document.documentElement.style.removeProperty('--heat');
    };
  }, []);
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
        <div className="game__memo">
          <CardMemo view={view} />
        </div>
        <div className="game__center stack">
          <TurnBanner view={view} room={room} turnTimer={turnTimer} />
          <Scene heat={heat}>
            <Track
              view={boardView}
              swapTargets={swapTargets}
              onSwap={(dwarfId) =>
                client.send({ type: 'action', action: { type: 'chooseSwapTarget', dwarfId } })
              }
            />
            <Decks view={boardView} lastDrawn={lastDrawn} />
          </Scene>
          <RoundEndPanel key={boardView.round} view={boardView} isHost={isHost} idle={idle} />
          {boardView.phase === 'finished' && <FinalPanel view={boardView} isHost={isHost} />}
          {view.phase === 'playing' && (
            <ActionBar view={view} waiting={waiting} turnTimer={turnTimer} />
          )}
        </div>
        <aside className="game__side stack">
          <Players view={boardView} room={room} />
          <GameLog entries={log} />
        </aside>
      </main>
      <Spotlight
        sequence={sequence}
        durationMs={sequenceMs}
        speed={sequenceSpeed}
        queued={queued}
        view={view}
      />
      <ChoiceDialog view={view} waiting={waiting} turnTimer={turnTimer} />
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
