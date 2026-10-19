import type { Clock } from './director';
import type { Cue, Sequence } from './sequences';

export interface CueHandlers {
  readonly onCue: (cue: Cue, sequence: Sequence) => void;
  /** Filtre les repères selon les réglages (mouvement réduit, qualité). */
  readonly accepts: (cue: Cue) => boolean;
}

/**
 * Programme les repères d'une séquence. Retourne une fonction d'arrêt : un
 * repère `reveal` encore à venir est alors joué tout de suite, pour que le
 * plateau finisse toujours sur la vue du serveur.
 */
export function runCues(
  sequence: Sequence,
  speed: number,
  handlers: CueHandlers,
  clock: Pick<Clock, 'setTimeout' | 'clearTimeout'>,
): () => void {
  const pending = new Map<unknown, Cue>();
  for (const cue of sequence.cues) {
    if (cue.type !== 'reveal' && !handlers.accepts(cue)) continue;
    const handle = clock.setTimeout(
      () => {
        pending.delete(handle);
        handlers.onCue(cue, sequence);
      },
      Math.round(cue.at / speed),
    );
    pending.set(handle, cue);
  }
  return () => {
    for (const [handle, cue] of pending) {
      clock.clearTimeout(handle);
      if (cue.type === 'reveal') handlers.onCue(cue, sequence);
    }
    pending.clear();
  };
}
