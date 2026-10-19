import { useState } from 'react';
import type { RoomView } from '@pepite/shared';
import { DwarfDisc } from '../assets/DwarfDisc';
import { TopBar } from '../components/TopBar';
import { client } from '../store';

export function LobbyScreen({ room, playerId }: { room: RoomView; playerId: string | null }) {
  const [copied, setCopied] = useState(false);
  const isHost = room.hostId === playerId;
  const count = room.players.length;
  const link = `${location.origin}/?salon=${room.code}`;

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Rejoins ma partie',
          text: `Code du salon : ${room.code}`,
          url: link,
        });
      } else {
        await navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // Partage annulé ou presse-papiers indisponible : le code reste affiché.
    }
  };

  return (
    <>
      <TopBar meta="Salon d’attente">
        <button
          type="button"
          className="btn btn--small btn--danger"
          onClick={() => client.send({ type: 'leaveRoom' })}
        >
          Quitter
        </button>
      </TopBar>
      <main className="stack">
        <section className="panel stack" aria-label="Code du salon">
          <p className="muted small">Code du salon à partager</p>
          <p className="room-code" aria-label={`Code ${room.code.split('').join(' ')}`}>
            {room.code}
          </p>
          <div className="row">
            <button type="button" className="btn btn--ghost" onClick={() => void share()}>
              {copied ? 'Lien copié !' : 'Partager le lien'}
            </button>
          </div>
        </section>

        <section className="panel stack" aria-label="Joueurs du salon">
          <h2>
            Joueurs ({count}/{room.maxPlayers})
          </h2>
          <ul className="player-list">
            {room.players.map((player, index) => (
              <li key={player.id} className="player-item">
                <DwarfDisc color={index} size={32} />
                <span className="player-item__name">
                  {player.name}
                  {player.id === playerId && ' (vous)'}
                </span>
                {player.isHost && <span className="badge">Hôte</span>}
                {player.isBot && <span className="badge">Bot</span>}
                {!player.isBot && player.connection !== 'online' && (
                  <span className="badge badge--warn">Déconnecté</span>
                )}
                {isHost && player.id !== playerId && (
                  <button
                    type="button"
                    className="btn btn--small btn--ghost"
                    onClick={() => client.send({ type: 'removePlayer', playerId: player.id })}
                    aria-label={`Retirer ${player.name}`}
                  >
                    Retirer
                  </button>
                )}
              </li>
            ))}
          </ul>
          {isHost && (
            <button
              type="button"
              className="btn btn--ghost"
              disabled={count >= room.maxPlayers}
              onClick={() => client.send({ type: 'addBot' })}
            >
              + Ajouter un bot
            </button>
          )}
        </section>

        <section className="panel stack" aria-label="Réglages de la partie">
          <h2>Réglages</h2>
          <div className="field">
            <label htmlFor="first-player">Qui commence ? (le livret dit : le plus jeune)</label>
            <select
              id="first-player"
              value={room.settings.firstPlayer}
              disabled={!isHost}
              onChange={(e) => client.send({ type: 'updateSettings', firstPlayer: e.target.value })}
            >
              <option value="random">Tirage au sort</option>
              {room.players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={room.settings.doubleDraw}
              disabled={!isHost}
              onChange={(e) =>
                client.send({ type: 'updateSettings', doubleDraw: e.target.checked })
              }
            />
            <span>
              <strong>Variante à 2 joueurs</strong> : chacun guide deux nains qui partagent leur or.
              <span className="muted small"> (s’applique seulement à 2 joueurs, conseillée)</span>
            </span>
          </label>
        </section>

        {isHost ? (
          <button
            type="button"
            className="btn"
            style={{ width: '100%', minHeight: 56, fontSize: '1.1rem' }}
            disabled={count < room.minPlayers}
            onClick={() => client.send({ type: 'startGame' })}
          >
            {count < room.minPlayers
              ? 'Il faut au moins 2 joueurs (ajoutez un bot)'
              : 'Lancer la partie'}
          </button>
        ) : (
          <p className="notice notice--info">
            <span>En attente du lancement par l’hôte…</span>
          </p>
        )}
      </main>
    </>
  );
}
