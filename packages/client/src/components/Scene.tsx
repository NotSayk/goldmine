import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import type { Ambient } from '../fx/ambient';
import { effectiveQuality, reducedMotion, usePreferences, type Quality } from '../preferences';

const clamp = (value: number): number => Math.max(-1, Math.min(1, value));

/** Parallaxe : le décor suit légèrement la souris, ou l'inclinaison du téléphone. */
function useParallax(ref: RefObject<HTMLElement | null>, enabled: boolean): void {
  useEffect(() => {
    const element = ref.current;
    if (!element || !enabled) return;
    let frame = 0;
    let x = 0;
    let y = 0;
    const apply = (): void => {
      frame = 0;
      element.style.setProperty('--px', x.toFixed(3));
      element.style.setProperty('--py', y.toFixed(3));
    };
    const schedule = (): void => {
      if (!frame) frame = requestAnimationFrame(apply);
    };
    const onPointer = (event: PointerEvent): void => {
      if (event.pointerType !== 'mouse') return;
      x = clamp((event.clientX / window.innerWidth) * 2 - 1);
      y = clamp((event.clientY / window.innerHeight) * 2 - 1);
      schedule();
    };
    const onTilt = (event: DeviceOrientationEvent): void => {
      if (event.gamma === null || event.beta === null) return;
      x = clamp(event.gamma / 30);
      y = clamp((event.beta - 45) / 30);
      schedule();
    };
    window.addEventListener('pointermove', onPointer, { passive: true });
    window.addEventListener('deviceorientation', onTilt);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('deviceorientation', onTilt);
      element.style.removeProperty('--px');
      element.style.removeProperty('--py');
    };
  }, [ref, enabled]);
}

/** Particules d'ambiance, chargées à la demande (jamais en qualité basse). */
function AmbientLayer({ quality, heat }: { quality: Exclude<Quality, 'low'>; heat: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ambientRef = useRef<Ambient | null>(null);
  const heatRef = useRef(heat);

  useEffect(() => {
    heatRef.current = heat;
    ambientRef.current?.setHeat(heat);
  }, [heat]);

  useEffect(() => {
    let cancelled = false;
    void import('../fx/ambient').then(({ startAmbient }) => {
      if (cancelled || !canvasRef.current) return;
      ambientRef.current = startAmbient(canvasRef.current, { quality, heat: heatRef.current });
    });
    return () => {
      cancelled = true;
      ambientRef.current?.destroy();
      ambientRef.current = null;
    };
  }, [quality]);

  return <canvas ref={canvasRef} className="scene__particles" aria-hidden />;
}

/** Décor de la mine en trois plans (dessins originaux), purement décoratif. */
function MineBackdrop() {
  return (
    <div className="backdrop" aria-hidden>
      <svg
        className="backdrop__layer backdrop__far"
        viewBox="0 0 1000 400"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="mine-far-rock" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1c2436" />
            <stop offset="1" stopColor="#0d121c" />
          </linearGradient>
        </defs>
        <path
          d="M0 400 V180 L70 150 L120 178 L190 128 L250 162 L330 118 L390 152 L470 108 L545 150 L610 118 L690 160 L770 122 L845 166 L925 130 L1000 158 V400 Z"
          fill="url(#mine-far-rock)"
        />
        {/* Galeries lointaines */}
        <path d="M150 400 V300 Q150 250 200 250 Q250 250 250 300 V400 Z" fill="#070a11" />
        <path d="M640 400 V318 Q640 280 678 280 Q716 280 716 318 V400 Z" fill="#070a11" />
        <path
          d="M0 230 L80 214 L160 236 L260 210 L380 238 L520 214 L640 240 L780 216 L900 236 L1000 222"
          fill="none"
          stroke="rgba(150,170,210,0.08)"
          strokeWidth="3"
        />
      </svg>

      <svg
        className="backdrop__layer backdrop__heat"
        viewBox="0 0 480 400"
        preserveAspectRatio="xMaxYMid slice"
      >
        <defs>
          <radialGradient id="mine-ember-glow" cx="1" cy="0.75" r="0.75">
            <stop offset="0" stopColor="#ff7a2a" stopOpacity="0.85" />
            <stop offset="0.45" stopColor="#c2321a" stopOpacity="0.35" />
            <stop offset="1" stopColor="#400a05" stopOpacity="0" />
          </radialGradient>
          <filter id="mine-heat-haze" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.012 0.06" numOctaves="2" seed="4">
              <animate
                attributeName="baseFrequency"
                dur="4s"
                values="0.012 0.06;0.016 0.08;0.012 0.06"
                repeatCount="indefinite"
              />
            </feTurbulence>
            <feDisplacementMap
              in="SourceGraphic"
              scale="14"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
        <g className="backdrop__haze">
          <rect x="0" y="0" width="480" height="400" fill="url(#mine-ember-glow)" />
          <path
            d="M120 400 L180 330 L240 352 L300 296 L360 330 L420 286 L480 312 V400 Z"
            fill="#1a0b08"
          />
          <path
            d="M180 330 L240 352 L300 296 L360 330 L420 286 L480 312"
            fill="none"
            stroke="#ff8a3d"
            strokeOpacity="0.55"
            strokeWidth="3"
          />
        </g>
      </svg>

      <svg
        className="backdrop__layer backdrop__mid"
        viewBox="0 0 640 400"
        preserveAspectRatio="xMinYMax slice"
      >
        <defs>
          <linearGradient id="mine-wood" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#4a2f16" />
            <stop offset="0.5" stopColor="#7a4e26" />
            <stop offset="1" stopColor="#3a2410" />
          </linearGradient>
          <radialGradient id="mine-crystal-glow">
            <stop offset="0" stopColor="#7ae3ff" stopOpacity="0.55" />
            <stop offset="1" stopColor="#7ae3ff" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* Étais */}
        <rect x="4" y="20" width="22" height="380" fill="url(#mine-wood)" />
        {/* Cristaux qui luisent */}
        <g className="crystal-cluster">
          <circle className="crystal-glow" cx="62" cy="372" r="70" fill="url(#mine-crystal-glow)" />
          <path d="M30 400 L42 338 L56 400 Z" fill="#5ccbe6" />
          <path d="M50 400 L68 318 L84 400 Z" fill="#8fe9ff" />
          <path d="M76 400 L88 352 L100 400 Z" fill="#4bb5d1" />
          <path d="M68 318 L74 360 L62 360 Z" fill="#e6fbff" opacity="0.7" />
        </g>
        <g className="crystal-cluster crystal-cluster--late">
          <circle
            className="crystal-glow"
            cx="330"
            cy="388"
            r="54"
            fill="url(#mine-crystal-glow)"
          />
          <path d="M308 400 L320 356 L330 400 Z" fill="#6fd8f0" />
          <path d="M324 400 L338 342 L352 400 Z" fill="#a6efff" />
        </g>
      </svg>

      <svg
        className="backdrop__layer backdrop__near"
        viewBox="0 0 640 400"
        preserveAspectRatio="xMinYMin slice"
      >
        <defs>
          <linearGradient id="mine-beam" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8a5a2c" />
            <stop offset="1" stopColor="#3e2814" />
          </linearGradient>
          <linearGradient id="mine-shaft" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffd98a" stopOpacity="0.22" />
            <stop offset="1" stopColor="#ffd98a" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="mine-lantern">
            <stop offset="0" stopColor="#ffe3a0" stopOpacity="0.9" />
            <stop offset="0.3" stopColor="#ffb547" stopOpacity="0.35" />
            <stop offset="1" stopColor="#ffb547" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* Faisceaux de la lanterne */}
        <path className="light-shaft" d="M70 52 L300 400 L120 400 Z" fill="url(#mine-shaft)" />
        <path
          className="light-shaft light-shaft--2"
          d="M70 52 L470 400 L340 400 Z"
          fill="url(#mine-shaft)"
        />
        {/* Poutre et stalactites */}
        <rect x="0" y="0" width="640" height="16" fill="url(#mine-beam)" />
        <path
          d="M24 16 L34 44 L44 16 Z M130 16 L136 34 L144 16 Z M196 16 L206 52 L218 16 Z M290 16 L296 32 L304 16 Z M380 16 L390 46 L400 16 Z M470 16 L476 36 L484 16 Z M548 16 L558 50 L568 16 Z M610 16 L616 34 L624 16 Z"
          fill="#0c111b"
        />
        {/* Lanterne suspendue */}
        <path d="M70 16 V34" stroke="#2a2f3a" strokeWidth="2" />
        <circle className="lantern-glow" cx="70" cy="46" r="64" fill="url(#mine-lantern)" />
        <path d="M62 36 H78 L76 56 H64 Z" fill="#ffcf6b" stroke="#2a1a08" strokeWidth="2" />
      </svg>
    </div>
  );
}

/**
 * La mine : décor en couches (parallaxe), particules, vignette et lampe. La
 * chaleur (`--heat`, posée sur la racine) vire l'ambiance du froid au rouge braise.
 */
export function Scene({ heat, children }: { heat: number; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const preferences = usePreferences();
  const quality = effectiveQuality(preferences);
  const still = reducedMotion(preferences);
  useParallax(ref, !still && quality !== 'low');
  return (
    <section ref={ref} className="board scene" aria-label="Table de jeu">
      <MineBackdrop />
      {!still && quality !== 'low' && <AmbientLayer quality={quality} heat={heat} />}
      <div className="scene__stage">{children}</div>
      <div className="scene__vignette" aria-hidden />
    </section>
  );
}
