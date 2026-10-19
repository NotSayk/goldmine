import { GameScreen } from './screens/GameScreen';
import { HomeScreen } from './screens/HomeScreen';
import { LobbyScreen } from './screens/LobbyScreen';
import { client, useAppState } from './store';

export function App() {
  const state = useAppState();
  const { room, view } = state;
  return (
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
            ✕
          </button>
        </div>
      )}
      {!room && <HomeScreen connected={state.connection === 'open'} />}
      {room && room.status === 'lobby' && <LobbyScreen room={room} playerId={state.playerId} />}
      {room && room.status !== 'lobby' && view && (
        <GameScreen
          view={view}
          room={room}
          log={state.log}
          effects={state.effects}
          waiting={state.waiting}
          highlights={state.highlights}
          highlightMs={state.highlightMs}
        />
      )}
      {room && room.status !== 'lobby' && !view && (
        <p className="muted">Chargement de la partie…</p>
      )}
    </div>
  );
}
