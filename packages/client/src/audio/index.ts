import type { SoundName } from '../director/sequences';
import { getPreferences, subscribePreferences } from '../preferences';
import type { AudioEngine } from './engine';

/**
 * Point d'entrée du son. Le moteur (synthèse Web Audio, aucun fichier) n'est
 * chargé qu'après un premier geste de l'utilisateur, comme l'exigent les navigateurs.
 */
let engine: Promise<AudioEngine | null> | null = null;

export function unlockAudio(): void {
  if (engine) return;
  engine = import('./engine')
    .then((module) => module.createAudioEngine())
    .then((created) => {
      created?.configure(getPreferences());
      return created;
    })
    .catch(() => null);
  subscribePreferences(() => {
    void engine?.then((created) => created?.configure(getPreferences()));
  });
}

export function playSound(sound: SoundName, count = 1): void {
  void engine?.then((created) => created?.play(sound, count));
}

/** Chaleur de 0 à 1 (position du dragon) : pilote la musique adaptative. */
export function setMusicHeat(heat: number): void {
  void engine?.then((created) => created?.setHeat(heat));
}

/** Musique d'ambiance active seulement en partie. */
export function setMusicPlaying(playing: boolean): void {
  void engine?.then((created) => created?.setPlaying(playing));
}

// Premier geste de l'utilisateur : le son peut démarrer.
for (const type of ['pointerdown', 'keydown'] as const) {
  window.addEventListener(type, unlockAudio, { once: true, passive: true });
}
