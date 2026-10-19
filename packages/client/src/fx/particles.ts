import type { BurstEffect } from '../director/sequences';

/**
 * Moteur de particules (chargé à la demande) : pépites soumises à la gravité
 * qui rebondissent, s'entrechoquent puis filent vers la pile du joueur ;
 * étincelles, cendres et fumée, braises, poussière, éclats de lumière et
 * confettis. Canvas 2D plein écran, boucle active seulement s'il reste des
 * particules. Écrit à la main plutôt qu'avec une bibliothèque de physique :
 * une vingtaine de corps au plus, quelques Ko au lieu de 80.
 */

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface ParticleEngine {
  burst(effect: BurstEffect, at: Point, count: number, target?: Point | null): void;
  destroy(): void;
}

interface Particle {
  effect: BurstEffect;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  spin: number;
  size: number;
  age: number;
  life: number;
  color: string;
  /** Sol sur lequel rebondissent les pépites. */
  floor: number;
  target: Point | null;
  /** Forme irrégulière d'une pépite (rayons relatifs). */
  shape: number[];
  phase: number;
}

const GRAVITY = 0.0018;
/** Les pépites rebondissent d'abord sous la carte, puis filent vers la pile. */
const HOMING_AT = 1300;
const CONFETTI_COLORS = [
  '#f2b632',
  '#ffe08a',
  '#5fd4ec',
  '#ff7a52',
  '#8fdc97',
  '#f4ecdc',
  '#cc79a7',
];

const rand = (min: number, max: number): number => min + Math.random() * (max - min);

function nuggetShape(): number[] {
  return Array.from({ length: 7 }, () => rand(0.72, 1.08));
}

export function createParticles(
  canvas: HTMLCanvasElement,
  quality: 'medium' | 'high',
): ParticleEngine {
  const context = canvas.getContext('2d');
  if (!context) return { burst: () => undefined, destroy: () => undefined };
  const ctx = context;
  const dpr = quality === 'high' ? Math.min(2, window.devicePixelRatio || 1) : 1;
  const amount = quality === 'high' ? 1 : 0.55;
  const particles: Particle[] = [];
  let frame = 0;
  let last = 0;

  const resize = (): void => {
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  window.addEventListener('resize', resize);

  const spawn = (effect: BurstEffect, at: Point, target: Point | null): Particle => {
    const base: Particle = {
      effect,
      x: at.x,
      y: at.y,
      vx: 0,
      vy: 0,
      angle: rand(0, Math.PI * 2),
      spin: rand(-0.01, 0.01),
      size: 3,
      age: 0,
      life: 1000,
      color: '#fff',
      floor: at.y + rand(60, 80),
      target,
      shape: [],
      phase: rand(0, Math.PI * 2),
    };
    const direction = rand(0, Math.PI * 2);
    switch (effect) {
      case 'gold':
      case 'bigGold':
        return {
          ...base,
          x: at.x + rand(-14, 14),
          vx: rand(-0.28, 0.28),
          vy: -rand(0.45, 0.8),
          size: effect === 'bigGold' ? rand(9, 12) : rand(5, 7.5),
          life: target ? 3400 : 2400,
          shape: nuggetShape(),
        };
      case 'sparks': {
        const speed = rand(0.25, 0.75);
        return {
          ...base,
          vx: Math.cos(direction) * speed,
          vy: Math.sin(direction) * speed - 0.2,
          size: rand(1, 2),
          life: rand(450, 900),
          color: Math.random() < 0.5 ? '#fff3c4' : '#ffd36a',
        };
      }
      case 'embers': {
        const speed = rand(0.05, 0.25);
        return {
          ...base,
          x: at.x + rand(-20, 20),
          y: at.y + rand(-20, 20),
          vx: Math.cos(direction) * speed,
          vy: -rand(0.08, 0.22),
          size: rand(1.2, 2.8),
          life: rand(700, 1400),
          color: Math.random() < 0.5 ? '#ffb347' : '#ff6a2a',
        };
      }
      case 'ash':
        return Math.random() < 0.3
          ? {
              // Bouffée de fumée
              ...base,
              x: at.x + rand(-10, 10),
              vx: rand(-0.02, 0.02),
              vy: -rand(0.03, 0.06),
              size: rand(8, 14),
              life: rand(1600, 2400),
              color: '60, 58, 66',
            }
          : {
              ...base,
              x: at.x + rand(-16, 16),
              y: at.y + rand(-8, 8),
              vx: rand(-0.05, 0.05),
              vy: -rand(0.04, 0.12),
              spin: rand(-0.006, 0.006),
              size: rand(1.5, 3.2),
              life: rand(1400, 2400),
              color: Math.random() < 0.6 ? '#2a2628' : '#6b6466',
              shape: [1],
            };
      case 'dust':
        return {
          ...base,
          y: at.y + rand(6, 14),
          vx: rand(-0.09, 0.09),
          vy: -rand(0.005, 0.03),
          size: rand(3, 6),
          life: rand(450, 750),
          color: '150, 132, 112',
        };
      case 'daylight':
        return {
          ...base,
          x: at.x + rand(-18, 18),
          y: at.y + rand(-24, 24),
          vx: rand(-0.04, 0.04),
          vy: -rand(0.04, 0.12),
          size: rand(1.5, 3),
          life: rand(800, 1400),
          color: '#fff7d6',
        };
      case 'confetti':
        return {
          ...base,
          x: at.x + rand(-60, 60),
          vx: rand(-0.45, 0.45),
          vy: -rand(0.5, 1),
          spin: rand(-0.02, 0.02),
          size: rand(5, 9),
          life: rand(2800, 3800),
          color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)]!,
        };
    }
  };

  /** Pépites : elles s'écartent quand elles se chevauchent (choc simple entre disques). */
  const collide = (nuggets: Particle[]): void => {
    for (let i = 0; i < nuggets.length; i++) {
      for (let j = i + 1; j < nuggets.length; j++) {
        const a = nuggets[i]!;
        const b = nuggets[j]!;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const min = (a.size + b.size) * 0.8;
        const distance = Math.hypot(dx, dy);
        if (distance === 0 || distance >= min) continue;
        const nx = dx / distance;
        const ny = dy / distance;
        const push = (min - distance) / 2;
        a.x -= nx * push;
        a.y -= ny * push;
        b.x += nx * push;
        b.y += ny * push;
        const relative = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (relative < 0) {
          const impulse = -relative * 0.75;
          a.vx -= impulse * nx;
          a.vy -= impulse * ny;
          b.vx += impulse * nx;
          b.vy += impulse * ny;
        }
      }
    }
  };

  const update = (p: Particle, dt: number): boolean => {
    p.age += dt;
    if (p.age >= p.life) return false;
    switch (p.effect) {
      case 'gold':
      case 'bigGold': {
        const homing = p.target !== null && p.age > HOMING_AT;
        if (homing && p.target) {
          // Vol vers la pile : de plus en plus vite, en rapetissant.
          const pull = Math.min(1, ((p.age - HOMING_AT) / 900) ** 2);
          p.x += (p.target.x - p.x) * Math.min(1, dt * 0.004 + pull * 0.2);
          p.y += (p.target.y - p.y) * Math.min(1, dt * 0.004 + pull * 0.2);
          p.size *= 0.992;
          if (Math.hypot(p.target.x - p.x, p.target.y - p.y) < 6) return false;
          return true;
        }
        p.vy += GRAVITY * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.angle += p.spin * dt + p.vx * 0.02;
        if (p.y > p.floor) {
          p.y = p.floor;
          p.vy = -p.vy * 0.42;
          p.vx *= 0.8;
          if (Math.abs(p.vy) < 0.05) p.vy = 0;
        }
        return true;
      }
      case 'sparks':
        p.vy += GRAVITY * 0.5 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.985;
        return true;
      case 'confetti':
        p.vy = Math.min(0.12, p.vy + GRAVITY * 0.6 * dt);
        p.vx *= 0.99;
        p.x += p.vx * dt + Math.sin(p.age / 260 + p.phase) * 0.06 * dt;
        p.y += p.vy * dt;
        p.angle += p.spin * dt;
        return p.y < window.innerHeight + 20;
      default:
        p.x += (p.vx + Math.sin(p.age / 300 + p.phase) * 0.02) * dt;
        p.y += p.vy * dt;
        p.angle += p.spin * dt;
        if (p.effect === 'dust' || p.color.includes(',')) p.size += dt * 0.012;
        return true;
    }
  };

  const drawNugget = (p: Particle, alpha: number): void => {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    p.shape.forEach((radius, i) => {
      const a = (i / p.shape.length) * Math.PI * 2;
      const x = Math.cos(a) * p.size * radius;
      const y = Math.sin(a) * p.size * radius * 0.82;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = '#f2b632';
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = '#7a4f00';
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-p.size * 0.45, -p.size * 0.2);
    ctx.lineTo(0, -p.size * 0.5);
    ctx.lineTo(p.size * 0.35, -p.size * 0.38);
    ctx.strokeStyle = '#fff3c4';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    if (p.effect === 'bigGold') {
      ctx.fillStyle = 'rgba(255, 243, 166, 0.9)';
      ctx.fillRect(p.size * 0.6, -p.size * 1.1, 2.5, 2.5);
    }
    ctx.restore();
  };

  const draw = (p: Particle): void => {
    const t = p.age / p.life;
    switch (p.effect) {
      case 'gold':
      case 'bigGold':
        drawNugget(p, t > 0.85 && !p.target ? (1 - t) / 0.15 : 1);
        return;
      case 'sparks':
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 1 - t;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 18, p.y - p.vy * 18);
        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
        return;
      case 'embers':
      case 'daylight':
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.sin(Math.PI * t);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        return;
      case 'confetti':
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.scale(1, Math.cos(p.age / 120 + p.phase));
        ctx.globalAlpha = t > 0.8 ? (1 - t) / 0.2 : 1;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
        return;
      default:
        if (p.color.includes(',')) {
          // Fumée et poussière : disques doux qui s'étalent.
          ctx.globalAlpha = 1;
          ctx.fillStyle = `rgba(${p.color}, ${(0.32 * (1 - t)).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          return;
        }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.globalAlpha = Math.min(1, (1 - t) * 1.6);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size, -p.size / 2, p.size * 2, p.size);
        ctx.restore();
    }
  };

  const tick = (now: number): void => {
    const dt = Math.min(40, now - (last || now));
    last = now;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    collide(
      particles.filter((p) => (p.effect === 'gold' || p.effect === 'bigGold') && p.age < 900),
    );
    for (let i = particles.length - 1; i >= 0; i--) {
      const particle = particles[i]!;
      if (!update(particle, dt)) particles.splice(i, 1);
    }
    for (const particle of particles) draw(particle);
    ctx.globalAlpha = 1;
    if (particles.length > 0) frame = requestAnimationFrame(tick);
    else {
      frame = 0;
      last = 0;
    }
  };

  return {
    burst(effect, at, count, target = null) {
      const total = Math.max(1, Math.round(count * (effect === 'gold' ? 1 : amount)));
      for (let i = 0; i < Math.min(total, 160); i++) particles.push(spawn(effect, at, target));
      if (!frame) frame = requestAnimationFrame(tick);
    },
    destroy() {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      particles.length = 0;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    },
  };
}
