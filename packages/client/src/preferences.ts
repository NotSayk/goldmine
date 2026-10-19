import { useSyncExternalStore } from 'react';

export type ThemePreference = 'auto' | 'light' | 'dark';
export type MotionPreference = 'auto' | 'reduced' | 'full';

export interface Preferences {
  readonly theme: ThemePreference;
  readonly motion: MotionPreference;
}

const KEY = 'pepite.preferences';
const listeners = new Set<() => void>();

function load(): Preferences {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<Preferences>) : {};
    return {
      theme: parsed.theme === 'light' || parsed.theme === 'dark' ? parsed.theme : 'auto',
      motion: parsed.motion === 'reduced' || parsed.motion === 'full' ? parsed.motion : 'auto',
    };
  } catch {
    return { theme: 'auto', motion: 'auto' };
  }
}

let current = load();

function apply(preferences: Preferences): void {
  const root = document.documentElement;
  if (preferences.theme === 'auto') delete root.dataset.theme;
  else root.dataset.theme = preferences.theme;
  const systemReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const reduced =
    preferences.motion === 'reduced' || (preferences.motion === 'auto' && systemReduced);
  root.dataset.motion = reduced ? 'reduced' : 'full';
}

apply(current);
window
  .matchMedia('(prefers-reduced-motion: reduce)')
  .addEventListener('change', () => apply(current));

export function setPreferences(patch: Partial<Preferences>): void {
  current = { ...current, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    // Préférence non mémorisée (stockage indisponible).
  }
  apply(current);
  for (const listener of listeners) listener();
}

export function usePreferences(): Preferences {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => current,
  );
}
