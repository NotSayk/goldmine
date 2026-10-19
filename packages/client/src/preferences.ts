import { useSyncExternalStore } from 'react';

/** `mine` : fantasy sombre (défaut) ; `contrast` : contraste élevé ; `auto` : suit le système. */
export type ThemePreference = 'auto' | 'mine' | 'contrast';
export type MotionPreference = 'auto' | 'reduced' | 'full';
/** Qualité des effets ; `auto` baisse d'un cran si les images par seconde chutent. */
export type QualityPreference = 'auto' | 'low' | 'medium' | 'high';
export type Quality = Exclude<QualityPreference, 'auto'>;
export type AnimationSpeed = 'normal' | 'fast';

export interface Preferences {
  readonly theme: ThemePreference;
  readonly motion: MotionPreference;
  readonly quality: QualityPreference;
  readonly animationSpeed: AnimationSpeed;
  /** Volumes de 0 à 1. */
  readonly musicVolume: number;
  readonly sfxVolume: number;
  readonly muted: boolean;
  readonly vibration: boolean;
  /** Afficher les réactions rapides des autres joueurs. */
  readonly emotes: boolean;
}

const KEY = 'pepite.preferences';
const listeners = new Set<() => void>();

export const DEFAULT_PREFERENCES: Preferences = {
  theme: 'auto',
  motion: 'auto',
  quality: 'auto',
  animationSpeed: 'normal',
  musicVolume: 0.5,
  sfxVolume: 0.8,
  muted: false,
  vibration: true,
  emotes: true,
};

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function volume(value: unknown, fallback: number): number {
  return typeof value === 'number' && value >= 0 && value <= 1 ? value : fallback;
}

function load(): Preferences {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = (raw ? JSON.parse(raw) : {}) as Partial<Record<keyof Preferences, unknown>>;
    const d = DEFAULT_PREFERENCES;
    return {
      theme: oneOf(parsed.theme, ['auto', 'mine', 'contrast'], d.theme),
      motion: oneOf(parsed.motion, ['auto', 'reduced', 'full'], d.motion),
      quality: oneOf(parsed.quality, ['auto', 'low', 'medium', 'high'], d.quality),
      animationSpeed: oneOf(parsed.animationSpeed, ['normal', 'fast'], d.animationSpeed),
      musicVolume: volume(parsed.musicVolume, d.musicVolume),
      sfxVolume: volume(parsed.sfxVolume, d.sfxVolume),
      muted: typeof parsed.muted === 'boolean' ? parsed.muted : d.muted,
      vibration: typeof parsed.vibration === 'boolean' ? parsed.vibration : d.vibration,
      emotes: typeof parsed.emotes === 'boolean' ? parsed.emotes : d.emotes,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

let current = load();

// ---------------------------------------------------------------------------
// Qualité effective (avec baisse automatique si les images par seconde chutent)
// ---------------------------------------------------------------------------

const QUALITY_ORDER: readonly Quality[] = ['low', 'medium', 'high'];
let autoQuality: Quality = initialAutoQuality();

function initialAutoQuality(): Quality {
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const cores = navigator.hardwareConcurrency || 4;
  return coarse || cores <= 4 ? 'medium' : 'high';
}

export function effectiveQuality(preferences: Preferences = current): Quality {
  return preferences.quality === 'auto' ? autoQuality : preferences.quality;
}

/** Appelé par le moniteur d'images par seconde quand le rendu peine. */
export function lowerAutoQuality(): void {
  const index = QUALITY_ORDER.indexOf(autoQuality);
  if (current.quality !== 'auto' || index <= 0) return;
  autoQuality = QUALITY_ORDER[index - 1] ?? 'low';
  apply(current);
  notify();
}

export function reducedMotion(preferences: Preferences = current): boolean {
  const system = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return preferences.motion === 'reduced' || (preferences.motion === 'auto' && system);
}

function apply(preferences: Preferences): void {
  const root = document.documentElement;
  const systemContrast = window.matchMedia('(prefers-contrast: more)').matches;
  const contrast =
    preferences.theme === 'contrast' || (preferences.theme === 'auto' && systemContrast);
  root.dataset.theme = contrast ? 'contrast' : 'mine';
  root.dataset.motion = reducedMotion(preferences) ? 'reduced' : 'full';
  root.dataset.quality = effectiveQuality(preferences);
  root.dataset.speed = preferences.animationSpeed;
}

function notify(): void {
  // Nouvel objet : les abonnés React voient le changement de qualité automatique.
  current = { ...current };
  for (const listener of listeners) listener();
}

apply(current);
for (const query of ['(prefers-reduced-motion: reduce)', '(prefers-contrast: more)']) {
  window.matchMedia(query).addEventListener('change', () => {
    apply(current);
    notify();
  });
}

export function getPreferences(): Preferences {
  return current;
}

export function setPreferences(patch: Partial<Preferences>): void {
  current = { ...current, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    // Préférence non mémorisée (stockage indisponible).
  }
  apply(current);
  notify();
}

export function subscribePreferences(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function usePreferences(): Preferences {
  return useSyncExternalStore(subscribePreferences, () => current);
}
