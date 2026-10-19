/**
 * Particules d'ambiance de la mine (chargées à la demande) : poussière qui
 * flotte dans la lumière à gauche, braises qui montent côté dragon, plus
 * nombreuses et plus rapides quand la chaleur monte. Canvas 2D, une seule
 * boucle, en pause quand l'onglet est caché.
 */

export interface AmbientOptions {
  readonly quality: 'medium' | 'high';
  readonly heat: number;
}

export interface Ambient {
  setHeat(heat: number): void;
  destroy(): void;
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

export function startAmbient(canvas: HTMLCanvasElement, options: AmbientOptions): Ambient {
  const context = canvas.getContext('2d');
  if (!context) return { setHeat: () => undefined, destroy: () => undefined };
  const ctx = context;
  const high = options.quality === 'high';
  const dpr = high ? Math.min(2, window.devicePixelRatio || 1) : 1;
  let heat = options.heat;
  let width = 0;
  let height = 0;
  let frame = 0;
  let last = performance.now();

  const resize = (): void => {
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);

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

  const tick = (now: number): void => {
    frame = requestAnimationFrame(tick);
    const dt = Math.min(50, now - last);
    last = now;
    if (document.hidden || width === 0) return;
    ctx.clearRect(0, 0, width, height);

    // Poussière : plus lumineuse dans le faisceau de la lanterne (haut gauche).
    ctx.globalCompositeOperation = 'source-over';
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
      const alpha = (0.12 + beam * 0.5) * (0.6 + 0.4 * Math.sin(now / 700 + mote.phase));
      ctx.fillStyle = `rgba(255, 238, 205, ${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(mote.x, mote.y, mote.size, 0, Math.PI * 2);
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
        embers.splice(i, 1);
        continue;
      }
      const alpha = Math.sin(Math.PI * t) * 0.9;
      const green = Math.round(170 - t * 120);
      ctx.fillStyle = `rgba(255, ${green}, 40, ${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(ember.x, ember.y, ember.size, 0, Math.PI * 2);
      ctx.fill();
      if (high) {
        ctx.fillStyle = `rgba(255, 90, 20, ${(alpha * 0.18).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(ember.x, ember.y, ember.size * 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };
  frame = requestAnimationFrame(tick);

  return {
    setHeat(next) {
      heat = next;
    },
    destroy() {
      cancelAnimationFrame(frame);
      observer.disconnect();
      ctx.clearRect(0, 0, width, height);
    },
  };
}
