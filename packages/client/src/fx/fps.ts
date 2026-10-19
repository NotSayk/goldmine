import { getPreferences, lowerAutoQuality } from '../preferences';

const WINDOW_MS = 2000;
/** Sous ce seuil (images par seconde), la qualité « auto » baisse d'un cran. */
const MIN_FPS = 40;
const COOLDOWN_MS = 5000;

/**
 * Surveille la fluidité pendant la partie : en qualité « auto », les effets
 * sont allégés quand le rendu peine. Retourne la fonction d'arrêt.
 */
export function startFpsMonitor(): () => void {
  let frame = 0;
  let frames = 0;
  let windowStart = performance.now();
  let quietUntil = windowStart + COOLDOWN_MS;
  const tick = (now: number): void => {
    frame = requestAnimationFrame(tick);
    if (document.hidden) {
      frames = 0;
      windowStart = now;
      return;
    }
    frames += 1;
    const elapsed = now - windowStart;
    if (elapsed < WINDOW_MS) return;
    const fps = (frames * 1000) / elapsed;
    frames = 0;
    windowStart = now;
    if (now < quietUntil || getPreferences().quality !== 'auto') return;
    if (fps < MIN_FPS) {
      lowerAutoQuality();
      quietUntil = now + COOLDOWN_MS;
    }
  };
  frame = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(frame);
}
