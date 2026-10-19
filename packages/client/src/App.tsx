import { IconClose } from './assets/Icons';
import { useMemo } from 'react';
import { LooksContext } from './looks';
import { GameScreen } from './screens/GameScreen';
import { HomeScreen } from './screens/HomeScreen';
import { LobbyScreen } from './screens/LobbyScreen';
import { client, useAppState } from './store';

export function App() {
  const state = useAppState();
  const { room, view } = state;
  const looks = useMemo(
    () => new Map((room?.players ?? []).map((player) => [player.id, player.look])),
    [room],
  );
  return (
    <LooksContext.Provider value={looks}>
      <div className="app">
        {state.connection !== 'open' && (
          <div className="connection-banner" role="status">
            {state.connection === 'connecting'
              ? 'Connexion au serveur…'
              : 'Connexion perdue, reconnexion…'}
          </div>
        )}
        {state.notice && (
          <div className="notice" role="alert">
            <span>{state.notice.text}</span>
            <button
              type="button"
              className="icon-btn"
              onClick={() => client.dismissNotice()}
              aria-label="Fermer le message"
            >
              <IconClose />
            </button>
          </div>
        )}
        {!room && (
          <HomeScreen connected={state.connection === 'open'} openRooms={state.openRooms} />
        )}
        {room && room.status === 'lobby' && (
          <LobbyScreen room={room} playerId={state.playerId} emotes={state.emotes} />
        )}
        {room && room.status !== 'lobby' && view && (
          <GameScreen
            view={view}
            boardView={state.boardView ?? view}
            room={room}
            log={state.log}
            waiting={state.waiting}
            sequence={state.sequence}
            sequenceMs={state.sequenceMs}
            sequenceSpeed={state.sequenceSpeed}
            queued={state.queued}
            lastDrawn={state.lastDrawn}
            turnTimer={state.turnTimer}
            goldHistory={state.goldHistory}
            emotes={state.emotes}
          />
        )}
        {room && room.status !== 'lobby' && !view && (
          <p className="muted">Chargement de la partie…</p>
        )}
      </div>
    </LooksContext.Provider>
  );
}
