import { useEffect, useState } from 'react';
import { EMOTES, type Emote } from '@pepite/shared/cosmetics';
import { EMOTE_LABELS, EmoteIcon } from '../assets/Emotes';
import { usePreferences } from '../preferences';
import { client, type EmoteBubble } from '../store';

/** Pause entre deux réactions côté client (le serveur limite aussi le débit). */
const COOLDOWN_MS = 2000;

/** Barre des réactions rapides. */
export function EmoteBar() {
  const preferences = usePreferences();
  const [cooling, setCooling] = useState(false);
  useEffect(() => {
    if (!cooling) return;
    const timer = setTimeout(() => setCooling(false), COOLDOWN_MS);
    return () => clearTimeout(timer);
  }, [cooling]);
  if (!preferences.emotes) return null;
  const send = (emote: Emote): void => {
    client.send({ type: 'emote', emote });
    setCooling(true);
  };
  return (
    <div className="emote-bar" role="group" aria-label="Réactions rapides">
      {EMOTES.map((emote) => (
        <button
          key={emote}
          type="button"
          className="emote-bar__button"
          disabled={cooling}
          onClick={() => send(emote)}
          aria-label={EMOTE_LABELS[emote]}
          title={EMOTE_LABELS[emote]}
        >
          <EmoteIcon emote={emote} />
        </button>
      ))}
    </div>
  );
}

/** Bulle de réaction posée près d'un joueur. */
export function EmoteBubbleView({
  bubble,
  name,
}: {
  bubble: EmoteBubble | undefined;
  /** Nom annoncé aux lecteurs d'écran avant la réaction. */
  name: string;
}) {
  if (!bubble) return null;
  return (
    <span key={bubble.id} className="emote-bubble" role="status">
      <span className="sr-only">{name} : </span>
      <EmoteIcon emote={bubble.emote} />
      <span>{EMOTE_LABELS[bubble.emote]}</span>
    </span>
  );
}
