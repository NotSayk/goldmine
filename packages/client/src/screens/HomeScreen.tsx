import { useState, type FormEvent } from 'react';
import { BRANDING } from '@pepite/shared/branding';
import { DwarfDisc } from '../assets/DwarfDisc';
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

export function HomeScreen({ connected }: { connected: boolean }) {
  const [name, setName] = useState(savedName);
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

  return (
    <>
      <TopBar />
      <main>
        <section className="hero">
          <div className="hero__art" aria-hidden>
            <DwarfDisc color={0} size={44} />
            <DwarfDisc color={1} size={44} />
            <Nugget size={30} />
            <BigNugget size={36} />
            <DwarfDisc color={2} size={44} />
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
            <h2>Rejoindre</h2>
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
        <p className="small muted home-footer">
          Projet de fan non officiel, nom de travail provisoire.
        </p>
      </main>
    </>
  );
}
