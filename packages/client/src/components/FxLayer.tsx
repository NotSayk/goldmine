import { useEffect, useRef } from 'react';
import { anchorPoint, onFx, type FxEvent } from '../fx/bus';
import type { ParticleEngine } from '../fx/particles';
import { effectiveQuality, reducedMotion, usePreferences } from '../preferences';

function trackCard(position: number): Element | null {
  return document.querySelector(`[data-track-index="${position}"]`);
}

/**
 * Tremblement de la mine (décor et piste), plus fort à chaque pas d'une
 * chaîne de dragons. Les pioches ne bougent pas : on peut toujours les viser.
 */
function shake(strength: number): void {
  const targets = document.querySelectorAll<HTMLElement>('.scene__back, .scene__viewport');
  if (targets.length === 0) return;
  const amplitude = 3 + strength * 3;
  const frames: Keyframe[] = [{ transform: 'none' }];
  for (let i = 0; i < 6; i++) {
    const decay = 1 - i / 6;
    frames.push({
      transform: `translate(${(i % 2 ? 1 : -1) * amplitude * decay}px, ${(Math.random() - 0.5) * amplitude * decay}px) rotate(${(i % 2 ? -1 : 1) * 0.25 * strength * decay}deg)`,
    });
  }
  frames.push({ transform: 'none' });
  for (const target of targets) {
    target.animate(frames, { duration: 480 + strength * 110, easing: 'ease-out' });
  }
}

/** Travelling : la caméra s'approche du dragon, puis revient. */
function camera(position: number, duration: number): void {
  const stage = document.querySelector<HTMLElement>('.scene__stage');
  const card = trackCard(position);
  if (!stage || !card) return;
  const box = stage.getBoundingClientRect();
  const target = card.getBoundingClientRect();
  const x = ((target.left + target.width / 2 - box.left) / box.width) * 100;
  const y = ((target.top + target.height / 2 - box.top) / box.height) * 100;
  stage.style.transformOrigin = `${x.toFixed(1)}% ${y.toFixed(1)}%`;
  stage.animate(
    [
      { transform: 'none' },
      { transform: 'scale(1.14)', offset: 0.22, easing: 'ease-in-out' },
      { transform: 'scale(1.16)', offset: 0.72 },
      { transform: 'none' },
    ],
    { duration, easing: 'cubic-bezier(.45,0,.3,1)' },
  );
}

/** Élément éphémère posé sur le calque d'effets, retiré à la fin de son animation. */
function transient(
  layer: HTMLElement,
  className: string,
  rect: { left: number; top: number; width: number; height: number },
  keyframes: Keyframe[],
  options: KeyframeAnimationOptions,
): void {
  const element = document.createElement('div');
  element.className = className;
  Object.assign(element.style, {
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
  });
  for (let i = 0; i < 3; i++) element.appendChild(document.createElement('span'));
  layer.appendChild(element);
  const animation = element.animate(keyframes, { fill: 'forwards', ...options });
  animation.onfinish = () => element.remove();
  animation.oncancel = () => element.remove();
}

/**
 * Souffle de flammes : il part de la gueule du dragon, à sa nouvelle place, et
 * balaie la piste vers la Sortie. Calculé sur la grille de la piste (la carte
 * du dragon est encore en train de glisser à cet instant).
 */
function flameSweep(layer: HTMLElement, to: number): void {
  const track = document.querySelector('.track')?.getBoundingClientRect();
  if (!track) return;
  const card = track.width / 9;
  const mouth = track.left + (to + 0.3) * card;
  const left = mouth - card * 1.6;
  transient(
    layer,
    'fx-flame',
    { left, top: track.top + track.height * 0.12, width: mouth - left, height: track.height * 0.7 },
    [
      { opacity: 0, transform: 'scaleX(0.05) scaleY(0.6)' },
      { opacity: 1, transform: 'scaleX(0.75) scaleY(1)', offset: 0.25 },
      { opacity: 1, transform: 'scaleX(1) scaleY(1.1)', offset: 0.55 },
      { opacity: 0, transform: 'scaleX(1.05) scaleY(0.5) translateX(-6%)' },
    ],
    { duration: 1300, easing: 'cubic-bezier(.2,.7,.3,1)' },
  );
}

/** Le feu du dragon illumine un instant tout le décor de la mine. */
function fireFlash(): void {
  document
    .querySelector('.backdrop__flash')
    ?.animate([{ opacity: 0 }, { opacity: 1, offset: 0.18 }, { opacity: 0 }], {
      duration: 1100,
      easing: 'ease-out',
    });
}

/**
 * Dragobert rugit : gueule ouverte, yeux en feu, il se cabre et crache de la
 * fumée (classe posée sur sa carte le temps du rugissement).
 */
let roarTimer: ReturnType<typeof setTimeout> | undefined;
function roar(duration: number): void {
  const dragon = document.querySelector('.dragobert');
  if (!dragon) return;
  // Retirer puis remettre la classe relance l'animation s'il rugissait déjà.
  dragon.classList.remove('dragobert--roar');
  void dragon.getBoundingClientRect();
  dragon.classList.add('dragobert--roar');
  clearTimeout(roarTimer);
  roarTimer = setTimeout(() => dragon.classList.remove('dragobert--roar'), duration);
}

/** Faisceaux de lumière du jour qui jaillissent de la Sortie. */
function daylight(layer: HTMLElement, x: number, y: number): void {
  const size = Math.min(window.innerWidth * 0.8, 300);
  transient(
    layer,
    'fx-daylight',
    { left: x - size / 2, top: y - size / 2, width: size, height: size },
    [
      { opacity: 0, transform: 'scale(0.2) rotate(0deg)' },
      { opacity: 1, transform: 'scale(1) rotate(20deg)', offset: 0.35 },
      { opacity: 0, transform: 'scale(1.25) rotate(45deg)' },
    ],
    { duration: 2000, easing: 'ease-out' },
  );
}

/**
 * Calque des effets du réalisateur : tremblements, travellings, flammes,
 * lumière du jour et particules (moteur chargé à la demande). Décoratif
 * uniquement : il ne lit que les positions à l'écran, jamais l'état du jeu.
 */
export function FxLayer() {
  const layerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const preferences = usePreferences();
  const quality = effectiveQuality(preferences);
  const still = reducedMotion(preferences);
  const particles = !still && quality !== 'low';

  useEffect(() => {
    let engine: Promise<ParticleEngine | null> | null = null;
    const load = (): Promise<ParticleEngine | null> => {
      engine ??= import('../fx/particles').then(({ createParticles }) =>
        canvasRef.current && quality !== 'low' ? createParticles(canvasRef.current, quality) : null,
      );
      return engine;
    };
    // Préchargement discret : la première pioche ne doit pas attendre le module.
    const preload = particles ? setTimeout(() => void load(), 1200) : undefined;

    const handle = (event: FxEvent): void => {
      const layer = layerRef.current;
      if (!layer || still) return;
      switch (event.type) {
        case 'shake':
          shake(event.strength);
          return;
        case 'camera':
          camera(event.position, event.duration);
          return;
        case 'flameSweep':
          flameSweep(layer, event.to);
          fireFlash();
          return;
        case 'dragonRoar':
          roar(event.duration);
          return;
        case 'burst': {
          const point = anchorPoint(event.anchor);
          if (!point) return;
          if (event.effect === 'daylight') daylight(layer, point.x, point.y);
          if (!particles) return;
          const target = event.target ? anchorPoint(event.target) : null;
          void load().then((created) => created?.burst(event.effect, point, event.count, target));
          return;
        }
      }
    };
    const unsubscribe = onFx(handle);
    return () => {
      clearTimeout(preload);
      unsubscribe();
      void engine?.then((created) => created?.destroy());
    };
  }, [quality, still, particles]);

  return (
    <div ref={layerRef} className="fx-layer" aria-hidden>
      {particles && <canvas ref={canvasRef} />}
    </div>
  );
}
