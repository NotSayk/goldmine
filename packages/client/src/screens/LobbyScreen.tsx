import { useEffect, useRef, useState } from 'react';
import type { RoomView } from '@pepite/shared';
import { DwarfToken } from '../assets/DwarfToken';
import { LookPicker } from '../components/LookPicker';
import { TopBar } from '../components/TopBar';
import { EmoteBar, EmoteBubbleView } from '../components/Emotes';
import { client, type EmoteBubble } from '../store';

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * Adresse à partager. Sur « localhost », les autres joueurs ne peuvent pas
 * l'utiliser : le serveur fournit alors l'adresse de ce PC sur le réseau local.
 */
function useShareOrigin(): { origin: string; onLocalhost: boolean; lanFound: boolean } {
  const onLocalhost = LOCAL_HOSTNAMES.has(location.hostname);
  const [lanUrl, setLanUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!onLocalhost) return;
    let cancelled = false;
    fetch('/api/lan')
      .then((response) => (response.ok ? (response.json() as Promise<{ urls?: string[] }>) : null))
      .then((data) => {
        if (!cancelled) setLanUrl(data?.urls?.[0] ?? null);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [onLocalhost]);
  return { origin: lanUrl ?? location.origin, onLocalhost, lanFound: lanUrl !== null };
}

export function LobbyScreen({
  room,
  playerId,
  emotes,
}: {
  room: RoomView;
  playerId: string | null;
  emotes: readonly EmoteBubble[];
}) {
  const [copied, setCopied] = useState(false);
  const linkRef = useRef<HTMLInputElement>(null);
  const isHost = room.hostId === playerId;
  const me = room.players.find((p) => p.id === playerId);
  const count = room.players.length;
  const { origin, onLocalhost, lanFound } = useShareOrigin();
  const link = `${origin}/?salon=${room.code}`;
  const canShare = typeof navigator.share === 'function';

  const copy = async () => {
    try {
      if (window.isSecureContext && navigator.clipboard) {
        await navigator.clipboard.writeText(link);
      } else {
        // En HTTP sur le réseau local, le presse-papiers moderne est bloqué par le navigateur.
        linkRef.current?.select();
        if (!document.execCommand('copy')) throw new Error('copie refusée');
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Le lien reste sélectionné dans le champ : copie manuelle possible.
      linkRef.current?.select();
    }
  };

  const share = async () => {
    try {
      await navigator.share({
        title: 'Rejoins ma partie',
        text: `Code du salon : ${room.code}`,
        url: link,
      });
    } catch {
      // Partage annulé.
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
          <div className="field">
            <label htmlFor="invite-link">Lien d’invitation</label>
            <div className="invite">
              <input
                id="invite-link"
                ref={linkRef}
                readOnly
                value={link}
                onFocus={(event) => event.target.select()}
              />
              <button type="button" className="btn btn--ghost" onClick={() => void copy()}>
                {copied ? 'Copié !' : 'Copier'}
              </button>
              {canShare && (
                <button type="button" className="btn btn--ghost" onClick={() => void share()}>
                  Partager
                </button>
              )}
            </div>
          </div>
          {onLocalhost && lanFound && (
            <p className="small muted">
              Les joueurs connectés au même réseau (même Wi-Fi ou même box) ouvrent cette adresse.
            </p>
          )}
          {onLocalhost && !lanFound && (
            <p className="notice notice--info small">
              <span>
                Vous jouez sur « localhost » : les autres joueurs doivent utiliser l’adresse de ce
                PC sur le réseau, affichée au démarrage du serveur (par exemple
                http://192.168.1.42:3000).
              </span>
            </p>
          )}
        </section>

        <section className="panel stack" aria-label="Joueurs du salon">
          <h2>
            Joueurs ({count}/{room.maxPlayers})
          </h2>
          <ul className="player-list">
            {room.players.map((player) => (
              <li key={player.id} className="player-item">
                <DwarfToken
                  color={player.look.color}
                  look={player.look}
                  size={40}
                  you={player.id === playerId}
                />
                <span className="player-item__name">
                  {player.name}
                  {player.id === playerId && ' (vous)'}
                </span>
                <EmoteBubbleView
                  bubble={emotes.find((e) => e.playerId === player.id)}
                  name={player.name}
                />
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
          <EmoteBar />
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

        {me && <LookPicker look={me.look} players={room.players} playerId={me.id} />}

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
              checked={room.settings.isPublic}
              disabled={!isHost}
              onChange={(e) => client.send({ type: 'updateSettings', isPublic: e.target.checked })}
            />
            <span>
              <strong>Salon public</strong> : il apparaît dans la liste « Salons ouverts » de
              l’accueil.
              <span className="muted small">
                {' '}
                (décoché : on n’entre qu’avec le code ou le lien)
              </span>
            </span>
          </label>
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
            className="btn btn--hero btn--block"
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
