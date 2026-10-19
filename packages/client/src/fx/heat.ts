/** Le dragon part de la carte 8 (au fond) et la manche s'arrête quand il atteint la carte 1. */
const DRAGON_START = 8;
const DRAGON_LAST = 1;

/**
 * Jauge de chaleur de 0 (dragon au fond) à 1 (dragon devant la Sortie).
 * Calculée uniquement à partir de la position du dragon, information publique.
 */
export function heatOf(dragonPosition: number): number {
  const heat = (DRAGON_START - dragonPosition) / (DRAGON_START - DRAGON_LAST);
  return Math.min(1, Math.max(0, heat));
}
