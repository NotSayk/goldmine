import type { SoundName } from '../director/sequences';
import type { Preferences } from '../preferences';

export interface AudioEngine {
  configure(preferences: Preferences): void;
  play(sound: SoundName, count: number): void;
  setHeat(heat: number): void;
  setPlaying(playing: boolean): void;
}

/** Moteur provisoire (le moteur de synthèse arrive au jalon « son »). */
export function createAudioEngine(): AudioEngine | null {
  return null;
}
