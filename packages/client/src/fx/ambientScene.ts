/**
 * Simulation et dessin des particules d'ambiance (poussière dans la lumière à
 * gauche, braises côté dragon), sans aucun accès au DOM : le même code tourne
 * dans un worker (OffscreenCanvas, hors du fil principal) ou, à défaut, sur
 * le fil principal.
 */

export type AmbientContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export interface AmbientScene {
  resize(width: number, height: number): void;
  setHeat(heat: number): void;
  /** Avance la simulation jusqu'à `now` et dessine une image. */
  draw(now: number): void;
  clear(): void;
}

interface Mote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  phase: number;
}

interface Ember {
  x: number;
  y: number;
  vy: number;
  size: number;
  life: number;
  age: number;
  sway: number;
}

const TAU = Math.PI * 2;
const MOTE_COLOR = 'rgb(255, 238, 205)';
const EMBER_GLOW = 'rgb(255, 90, 20)';
/** Teintes des braises, du jaune au rouge (vert de 170 à 50) : calculées une fois. */
const EMBER_COLORS = Array.from({ length: 13 }, (_, i) => `rgb(255, ${170 - i * 10}, 40)`);

export function createAmbientScene(
  ctx: AmbientContext,
  options: { high: boolean; width: number; height: number; heat: number },
): AmbientScene {
  const high = options.high;
  let heat = options.heat;
  let width = options.width;
  let height = options.height;
  let last = performance.now();

  const motes: Mote[] = Array.from({ length: high ? 42 : 18 }, () => ({
    x: Math.random() * width * 0.7,
    y: Math.random() * height,
    vx: (Math.random() - 0.3) * 0.008,
    vy: (Math.random() - 0.5) * 0.006,
    size: 0.6 + Math.random() * 1.3,
    phase: Math.random() * Math.PI * 2,
  }));
  const maxEmbers = high ? 46 : 18;
  const embers: Ember[] = [];

  const spawnEmber = (): Ember => ({
    x: width * (0.68 + Math.random() * 0.34),
    y: height + 4,
    vy: -(0.018 + Math.random() * 0.03) * (1 + heat * 1.4),
    size: 0.8 + Math.random() * 1.8,
    life: 2200 + Math.random() * 2600,
    age: 0,
    sway: Math.random() * Math.PI * 2,
  });

  const draw = (now: number): void => {
    const dt = Math.min(50, now - last);
    last = now;
    if (width === 0) return;
    ctx.clearRect(0, 0, width, height);

    // Poussière : plus lumineuse dans le faisceau de la lanterne (haut gauche).
    // L'opacité passe par globalAlpha : aucune couleur recréée à chaque image.
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = MOTE_COLOR;
    for (const mote of motes) {
      mote.x += mote.vx * dt;
      mote.y += mote.vy * dt + Math.sin(now / 1800 + mote.phase) * 0.004 * dt;
      if (mote.x > width * 0.75) mote.x = 0;
      if (mote.x < 0) mote.x = width * 0.75;
      if (mote.y > height) mote.y = 0;
      if (mote.y < 0) mote.y = height;
      const beam = Math.max(
        0,
        1 - Math.abs(mote.y - (height * 0.15 + mote.x * 0.45)) / (height * 0.35),
      );
      ctx.globalAlpha = (0.12 + beam * 0.5) * (0.6 + 0.4 * Math.sin(now / 700 + mote.phase));
      ctx.beginPath();
      ctx.arc(mote.x, mote.y, mote.size, 0, TAU);
      ctx.fill();
    }

    // Braises : leur nombre suit la chaleur.
    const wanted = Math.round(maxEmbers * (0.2 + heat * 0.8));
    if (embers.length < wanted && Math.random() < 0.08 * (1 + heat * 2)) embers.push(spawnEmber());
    ctx.globalCompositeOperation = 'lighter';
    for (let i = embers.length - 1; i >= 0; i--) {
      const ember = embers[i]!;
      ember.age += dt;
      ember.y += ember.vy * dt;
      ember.x += Math.sin(ember.age / 400 + ember.sway) * 0.02 * dt;
      const t = ember.age / ember.life;
      if (t >= 1 || ember.y < -8) {
        // Retrait sans décaler le tableau : la dernière braise prend sa place.
        embers[i] = embers[embers.length - 1]!;
        embers.pop();
        continue;
      }
      const alpha = Math.sin(Math.PI * t) * 0.9;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = EMBER_COLORS[Math.min(12, Math.round(t * 12))]!;
      ctx.beginPath();
      ctx.arc(ember.x, ember.y, ember.size, 0, TAU);
      ctx.fill();
      if (high) {
        ctx.globalAlpha = alpha * 0.18;
        ctx.fillStyle = EMBER_GLOW;
        ctx.beginPath();
        ctx.arc(ember.x, ember.y, ember.size * 3.2, 0, TAU);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  };

  return {
    resize(nextWidth, nextHeight) {
      width = nextWidth;
      height = nextHeight;
    },
    setHeat(next) {
      heat = next;
    },
    draw,
    clear() {
      ctx.clearRect(0, 0, width, height);
    },
  };
}
