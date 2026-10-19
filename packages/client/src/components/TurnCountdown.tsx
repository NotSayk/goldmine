import { useEffect, useState } from 'react';

export interface TurnTimer {
  readonly deadline: number;
  readonly totalMs: number;
}

/** Secondes restantes avant le coup automatique (`null` sans chrono). */
export function useSecondsLeft(timer: TurnTimer | null): number | null {
  const [now, setNow] = useState(() => Date.now());
  // Un réveil par seconde, calé sur le changement de seconde affichée (le
  // premier tout de suite, pour un nouveau chrono).
  useEffect(() => {
    if (!timer) return;
    let id: ReturnType<typeof setTimeout>;
    const tick = (): void => {
      setNow(Date.now());
      const untilNext = (timer.deadline - Date.now()) % 1000;
      id = setTimeout(tick, (untilNext <= 0 ? untilNext + 1000 : untilNext) + 15);
    };
    id = setTimeout(tick, 0);
    return () => clearTimeout(id);
  }, [timer]);
  if (!timer) return null;
  const left = Math.ceil((timer.deadline - now) / 1000);
  return Math.max(0, Math.min(Math.ceil(timer.totalMs / 1000), left));
}

const CIRCUMFERENCE = 2 * Math.PI * 15.5;

/** Compte à rebours circulaire du tour en cours ; rouge et pulsant sous 10 s. */
export function TurnCountdown({ timer }: { timer: TurnTimer | null }) {
  const seconds = useSecondsLeft(timer);
  if (!timer || seconds === null) return null;
  const ratio = Math.min(1, (seconds * 1000) / timer.totalMs);
  const urgent = seconds <= 10;
  return (
    <span
      className={`countdown${urgent ? ' countdown--urgent' : ''}`}
      role="timer"
      aria-label={`${seconds} secondes pour jouer`}
      title="Temps restant pour jouer, sinon pile ou face"
    >
      <svg viewBox="0 0 36 36" className="countdown__ring" aria-hidden>
        <circle className="countdown__track" cx="18" cy="18" r="15.5" />
        <circle
          className="countdown__value"
          cx="18"
          cy="18"
          r="15.5"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={(1 - ratio) * CIRCUMFERENCE}
        />
      </svg>
      <span className="countdown__text">{seconds}</span>
    </span>
  );
}
