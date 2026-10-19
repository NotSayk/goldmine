/**
 * Particules d'ambiance dessinées hors du fil principal : le worker reçoit la
 * toile (OffscreenCanvas) et l'anime seul ; la page n'a plus rien à faire à
 * chaque image pour elles.
 */
import { createAmbientScene, type AmbientScene } from './ambientScene';

export type AmbientMessage =
  | {
      readonly type: 'start';
      readonly canvas?: OffscreenCanvas;
      readonly high: boolean;
      readonly dpr: number;
      readonly width: number;
      readonly height: number;
      readonly heat: number;
    }
  | { readonly type: 'resize'; readonly width: number; readonly height: number }
  | { readonly type: 'heat'; readonly heat: number }
  | { readonly type: 'visible'; readonly visible: boolean }
  | { readonly type: 'stop' };

interface WorkerScope {
  onmessage: ((event: MessageEvent<AmbientMessage>) => void) | null;
  requestAnimationFrame?: (callback: (now: number) => void) => number;
  cancelAnimationFrame?: (id: number) => void;
}

const scope = self as unknown as WorkerScope;
let canvas: OffscreenCanvas | null = null;
let context: OffscreenCanvasRenderingContext2D | null = null;
let scene: AmbientScene | null = null;
let dpr = 1;
let running = false;
let visible = true;
let handle = 0;

// requestAnimationFrame existe dans les workers de Chrome et Firefox ; sinon, une minuterie.
const nextFrame = (callback: (now: number) => void): number =>
  scope.requestAnimationFrame
    ? scope.requestAnimationFrame(callback)
    : (setTimeout(() => callback(performance.now()), 16) as unknown as number);
const cancelFrame = (id: number): void => {
  if (scope.cancelAnimationFrame) scope.cancelAnimationFrame(id);
  else clearTimeout(id);
};

const tick = (now: number): void => {
  handle = 0;
  if (!running || !visible || !scene) return;
  scene.draw(now);
  handle = nextFrame(tick);
};
const schedule = (): void => {
  if (!handle && running && visible) handle = nextFrame(tick);
};

const resize = (width: number, height: number): void => {
  if (!canvas || !context) return;
  canvas.width = Math.max(1, Math.round(width * dpr));
  canvas.height = Math.max(1, Math.round(height * dpr));
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  scene?.resize(width, height);
};

scope.onmessage = (event) => {
  const message = event.data;
  switch (message.type) {
    case 'start':
      if (message.canvas) {
        canvas = message.canvas;
        context = canvas.getContext('2d');
      }
      if (!context) return;
      dpr = message.dpr;
      scene = createAmbientScene(context, {
        high: message.high,
        width: message.width,
        height: message.height,
        heat: message.heat,
      });
      resize(message.width, message.height);
      running = true;
      schedule();
      return;
    case 'resize':
      resize(message.width, message.height);
      return;
    case 'heat':
      scene?.setHeat(message.heat);
      return;
    case 'visible':
      visible = message.visible;
      schedule();
      return;
    case 'stop':
      running = false;
      cancelFrame(handle);
      handle = 0;
      scene?.clear();
      return;
  }
};
