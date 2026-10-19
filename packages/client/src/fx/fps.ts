import {
  effectiveQuality,
  getPreferences,
  lowerAutoQuality,
  subscribePreferences,
} from '../preferences';

const WINDOW_MS = 2000;
/** Sous ce seuil (images par seconde), la qualité « auto » baisse d'un cran. */
const MIN_FPS = 40;
const COOLDOWN_MS = 5000;

/**
 * Surveille la fluidité pendant la partie : en qualité « auto », les effets
 * sont allégés quand le rendu peine. La boucle ne tourne que si elle peut
 * servir (qualité « auto » au-dessus de « basse ») : une boucle d'images en
 * trop fait travailler le navigateur à chaque image. Retourne la fonction d'arrêt.
 */
export function startFpsMonitor(): () => void {
  let frame = 0;
  let frames = 0;
  let windowStart = performance.now();
  let quietUntil = windowStart + COOLDOWN_MS;
  const useful = (): boolean => getPreferences().quality === 'auto' && effectiveQuality() !== 'low';
  const tick = (now: number): void => {
    if (!useful()) {
      frame = 0;
      return;
    }
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
    if (now < quietUntil) return;
    if (fps < MIN_FPS) {
      lowerAutoQuality();
      quietUntil = now + COOLDOWN_MS;
    }
  };
  const sync = (): void => {
    if (frame || !useful()) return;
    frames = 0;
    windowStart = performance.now();
    quietUntil = windowStart + COOLDOWN_MS;
    frame = requestAnimationFrame(tick);
  };
  const unsubscribe = subscribePreferences(sync);
  sync();
  return () => {
    cancelAnimationFrame(frame);
    unsubscribe();
  };
}
