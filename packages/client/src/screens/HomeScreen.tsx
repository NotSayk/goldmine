import { useEffect, useState, type FormEvent } from 'react';
import type { OpenRoomSummary } from '@pepite/shared';
import { BRANDING } from '@pepite/shared/branding';
import { DwarfToken } from '../assets/DwarfToken';
import { DragonHead } from '../assets/Dragon';
import { BigNugget, Nugget } from '../assets/Nugget';
import { TopBar } from '../components/TopBar';
import { INVITE_CODE, client } from '../store';

const NAME_KEY = 'pepite.name';

function savedName(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? '';
  } catch {
    return '';
  }
}

function rememberName(name: string): void {
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {
    // Nom non mémorisé.
  }
}

/** Liste des salons publics, rafraîchie régulièrement tant que l'accueil est affiché. */
function useOpenRoomsPolling(connected: boolean): void {
  useEffect(() => {
    if (!connected) return;
    client.send({ type: 'listRooms' });
    const timer = setInterval(() => client.send({ type: 'listRooms' }), 4000);
    return () => clearInterval(timer);
  }, [connected]);
}

function OpenRooms({
  rooms,
  canJoin,
  onJoin,
}: {
  rooms: readonly OpenRoomSummary[];
  canJoin: boolean;
  onJoin: (code: string) => void;
}) {
  return (
    <section className="panel stack open-rooms" aria-labelledby="open-rooms-title">
      <h2 id="open-rooms-title">Salons ouverts</h2>
      {rooms.length === 0 ? (
        <p className="muted small">
          Aucun salon public pour l’instant. Créez-en un, ou rejoignez un salon privé avec son code.
        </p>
      ) : (
        <ul className="open-rooms__list">
          {rooms.map((room) => (
            <li key={room.code} className="open-rooms__item">
              <span className="open-rooms__host">Salon de {room.hostName}</span>
              <span className="badge">
                {room.players}/{room.maxPlayers} joueurs
              </span>
              <button
                type="button"
                className="btn btn--small"
                disabled={!canJoin}
                onClick={() => onJoin(room.code)}
                aria-label={`Rejoindre le salon de ${room.hostName}`}
              >
                Rejoindre
              </button>
            </li>
          ))}
        </ul>
      )}
      {!canJoin && rooms.length > 0 && (
        <p className="small muted">Choisissez d’abord votre pseudo.</p>
      )}
    </section>
  );
}

export function HomeScreen({
  connected,
  openRooms,
}: {
  connected: boolean;
  openRooms: readonly OpenRoomSummary[];
}) {
  const [name, setName] = useState(savedName);
  useOpenRoomsPolling(connected);
  const [code, setCode] = useState(INVITE_CODE);
  const trimmed = name.trim();
  const validCode = /^[A-Za-z0-9]{4,5}$/.test(code.trim());

  const create = (event: FormEvent) => {
    event.preventDefault();
    if (!trimmed) return;
    rememberName(trimmed);
    client.send({ type: 'createRoom', name: trimmed });
  };

  const join = (event: FormEvent) => {
    event.preventDefault();
    if (!trimmed || !validCode) return;
    rememberName(trimmed);
    client.send({ type: 'joinRoom', code: code.trim().toUpperCase(), name: trimmed });
  };

  const joinOpen = (roomCode: string) => {
    if (!trimmed) return;
    rememberName(trimmed);
    client.send({ type: 'joinRoom', code: roomCode, name: trimmed });
  };

  return (
    <>
      <TopBar />
      <main>
        <section className="hero">
          <div className="hero__art" aria-hidden>
            <DwarfToken color={0} size={52} mood="joy" />
            <DwarfToken color={1} size={52} />
            <Nugget size={30} />
            <BigNugget size={36} />
            <DwarfToken color={2} size={52} mood="panic" />
            <DragonHead size={72} />
          </div>
          <h1>{BRANDING.gameName}</h1>
          <p className="hero__tagline">{BRANDING.tagline}</p>
          <p className="small muted">De 2 à 6 joueurs · 3 manches · environ 20 minutes</p>
        </section>

        <div className="field home-name">
          <label htmlFor="player-name">Votre pseudo</label>
          <input
            id="player-name"
            value={name}
            maxLength={20}
            autoComplete="nickname"
            placeholder="Ex. : Gemma"
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="home-grid">
          <form className="panel stack" onSubmit={create}>
            <h2>Créer un salon</h2>
            <p className="muted small">
              Vous recevrez un code à partager. Vous pourrez ajouter des bots pour compléter.
            </p>
            <button type="submit" className="btn" disabled={!trimmed || !connected}>
              Créer un salon
            </button>
          </form>
          <form className="panel stack" onSubmit={join}>
            <h2>Rejoindre avec un code</h2>
            <div className="field">
              <label htmlFor="room-code">Code du salon</label>
              <input
                id="room-code"
                className="code-input"
                value={code}
                maxLength={5}
                autoComplete="off"
                inputMode="text"
                placeholder="ABCDE"
                onChange={(e) => setCode(e.target.value.toUpperCase())}
              />
            </div>
            <button type="submit" className="btn" disabled={!trimmed || !validCode || !connected}>
              Rejoindre
            </button>
          </form>
        </div>
        <div className="home-rooms">
          <OpenRooms rooms={openRooms} canJoin={trimmed !== '' && connected} onJoin={joinOpen} />
        </div>
        <p className="small muted home-footer">
          Projet de fan non officiel, nom de travail provisoire.
        </p>
      </main>
    </>
  );
}
