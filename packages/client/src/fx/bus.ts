import type { Anchor, BurstEffect } from '../director/sequences';

/** Effets visuels déclenchés par le réalisateur (purement cosmétiques). */
export type FxEvent =
  | { readonly type: 'shake'; readonly strength: number }
  | {
      readonly type: 'burst';
      readonly effect: BurstEffect;
      readonly anchor: Anchor;
      readonly count: number;
      readonly target?: Anchor;
    }
  | { readonly type: 'camera'; readonly position: number; readonly duration: number }
  | { readonly type: 'flameSweep'; readonly from: number; readonly to: number }
  | { readonly type: 'dragonRoar'; readonly duration: number };

type Listener = (event: FxEvent) => void;
const listeners = new Set<Listener>();

export function emitFx(event: FxEvent): void {
  for (const listener of listeners) listener(event);
}

export function onFx(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Centre à l'écran d'une ancre (carte de la piste, pile d'un joueur, centre). */
export function anchorPoint(anchor: Anchor): { x: number; y: number } | null {
  let element: Element | null = null;
  if (anchor.kind === 'track') {
    element = document.querySelector(`[data-track-index="${anchor.position}"]`);
  } else if (anchor.kind === 'player') {
    element = document.querySelector(`[data-gold-anchor="${CSS.escape(anchor.playerId)}"]`);
  } else {
    element = document.querySelector('.spotlight .staged-card') ?? null;
    if (!element) return { x: window.innerWidth / 2, y: window.innerHeight * 0.35 };
  }
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}
