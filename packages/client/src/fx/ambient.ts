/**
 * Particules d'ambiance de la mine (chargées à la demande) : poussière qui
 * flotte dans la lumière à gauche, braises qui montent côté dragon, plus
 * nombreuses et plus rapides quand la chaleur monte. Dessinées dans un worker
 * (OffscreenCanvas) quand le navigateur le permet, sinon sur le fil principal ;
 * en pause quand l'onglet est caché.
 */
import type { AmbientMessage } from './ambient.worker';
import { createAmbientScene } from './ambientScene';

export interface AmbientOptions {
  readonly quality: 'medium' | 'high';
  readonly heat: number;
}

export interface Ambient {
  setHeat(heat: number): void;
  destroy(): void;
}

interface WorkerHandle {
  readonly worker: Worker;
  stopTimer?: ReturnType<typeof setTimeout>;
}

/**
 * Une toile ne se confie qu'une fois à un worker : on le garde pour elle (le
 * double montage de React en développement, ou un changement de qualité,
 * réutilise le même), et on ne l'arrête que s'il reste inutilisé.
 */
const workers = new WeakMap<HTMLCanvasElement, WorkerHandle>();

function dprFor(high: boolean): number {
  return high ? Math.min(2, window.devicePixelRatio || 1) : 1;
}

function startInWorker(canvas: HTMLCanvasElement, options: AmbientOptions): Ambient | null {
  let handle = workers.get(canvas);
  let transferred: OffscreenCanvas | undefined;
  if (!handle) {
    if (typeof Worker !== 'function' || typeof canvas.transferControlToOffscreen !== 'function') {
      return null;
    }
    try {
      const worker = new Worker(new URL('./ambient.worker.ts', import.meta.url), {
        type: 'module',
      });
      transferred = canvas.transferControlToOffscreen();
      handle = { worker };
      workers.set(canvas, handle);
    } catch {
      return null;
    }
  }
  clearTimeout(handle.stopTimer);
  const { worker } = handle;
  const send = (message: AmbientMessage, transfer: Transferable[] = []): void =>
    worker.postMessage(message, transfer);
  const high = options.quality === 'high';
  send(
    {
      type: 'start',
      ...(transferred ? { canvas: transferred } : {}),
      high,
      dpr: dprFor(high),
      width: canvas.clientWidth,
      height: canvas.clientHeight,
      heat: options.heat,
    },
    transferred ? [transferred] : [],
  );
  const observer = new ResizeObserver(() =>
    send({ type: 'resize', width: canvas.clientWidth, height: canvas.clientHeight }),
  );
  observer.observe(canvas);
  const onVisibility = (): void => send({ type: 'visible', visible: !document.hidden });
  document.addEventListener('visibilitychange', onVisibility);
  onVisibility();
  const current = handle;
  return {
    setHeat(heat) {
      send({ type: 'heat', heat });
    },
    destroy() {
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      send({ type: 'stop' });
      current.stopTimer = setTimeout(() => {
        worker.terminate();
        workers.delete(canvas);
      }, 2000);
    },
  };
}

/** Repli : même simulation, dessinée sur le fil principal. */
function startOnMainThread(canvas: HTMLCanvasElement, options: AmbientOptions): Ambient {
  let ctx: CanvasRenderingContext2D | null = null;
  try {
    ctx = canvas.getContext('2d');
  } catch {
    // Toile déjà confiée à un worker arrêté depuis : pas de particules.
  }
  if (!ctx) return { setHeat: () => undefined, destroy: () => undefined };
  const high = options.quality === 'high';
  const dpr = dprFor(high);
  const scene = createAmbientScene(ctx, {
    high,
    width: canvas.clientWidth,
    height: canvas.clientHeight,
    heat: options.heat,
  });
  const resize = (): void => {
    canvas.width = Math.max(1, Math.round(canvas.clientWidth * dpr));
    canvas.height = Math.max(1, Math.round(canvas.clientHeight * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    scene.resize(canvas.clientWidth, canvas.clientHeight);
  };
  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  let frame = 0;
  const tick = (now: number): void => {
    frame = requestAnimationFrame(tick);
    if (!document.hidden) scene.draw(now);
  };
  frame = requestAnimationFrame(tick);
  return {
    setHeat: (heat) => scene.setHeat(heat),
    destroy() {
      cancelAnimationFrame(frame);
      observer.disconnect();
      scene.clear();
    },
  };
}

export function startAmbient(canvas: HTMLCanvasElement, options: AmbientOptions): Ambient {
  // Une toile déjà confiée à un worker ne peut plus dessiner ici.
  return startInWorker(canvas, options) ?? startOnMainThread(canvas, options);
}
