import { useEffect, useRef, type CSSProperties, type ReactNode, type RefObject } from 'react';
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

/** Fissures de lave, de la plus proche du dragon à la plus proche de la Sortie. */
const CRACKS = [
  'M600 330 L572 342 L560 362 L536 370 L528 392 M560 362 L548 352',
  'M600 250 L584 268 L590 292 L570 310 L574 334 M590 292 L604 300',
  'M548 400 L540 380 L512 372 L500 352 L476 348 M512 372 L506 390',
  'M470 400 L462 384 L436 380 L426 362 L398 358 L390 340 M436 380 L430 398',
  'M380 400 L372 386 L344 382 L336 366 L310 364 M344 382 L352 396',
  'M300 400 L292 384 L266 380 L258 366 L230 362 L222 348',
];

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

/**
 * Décor de la mine (dessins originaux), purement décoratif. Le froid de la
 * Sortie s'oppose au feu du dragon : à gauche, des rayons de jour qui pâlissent
 * quand le dragon approche ; à droite, le feu vacille, des fissures de lave
 * gagnent vers la gauche à chaque carte brûlée et un mur de flammes se lève
 * quand la chaleur est forte. Une lanterne se balance, une flaque de lumière
 * suit le nain dont c'est le tour, et le feu du dragon illumine tout le décor
 * quand il avance (`.backdrop__flash`, animé par les effets).
 */
function MineBackdrop({
  heat,
  focus,
  yourTurn,
}: {
  heat: number;
  focus: number | null;
  yourTurn: boolean;
}) {
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
            <feTurbulence type="fractalNoise" baseFrequency="0.012 0.06" numOctaves="2" seed="4" />
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

      <div className="backdrop__daylight">
        <span />
        <span />
        <span />
      </div>

      <div className="backdrop__fire">
        <span className="backdrop__fire-a" />
        <span className="backdrop__fire-b" />
      </div>

      <svg className="backdrop__cracks" viewBox="0 0 600 400" preserveAspectRatio="xMaxYMax slice">
        {CRACKS.map((d, i) => (
          <g
            key={d}
            className="backdrop__crack"
            style={{ opacity: heat >= (i + 1) / 7 - 0.01 ? 1 : 0 }}
          >
            <path className="backdrop__crack-glow" d={d} />
            <path className="backdrop__crack-core" d={d} />
          </g>
        ))}
      </svg>

      <div className="backdrop__flames" style={{ opacity: clamp01((heat - 0.45) / 0.4) }}>
        <div>
          <svg viewBox="0 0 300 160" preserveAspectRatio="none">
            <path
              d="M0 160 Q20 110 34 128 Q40 80 62 112 Q74 60 92 104 Q110 70 124 112 Q140 50 160 100 Q178 64 192 110 Q210 40 230 96 Q248 70 262 112 Q280 60 300 90 V160 Z"
              fill="#c2321a"
              fillOpacity="0.75"
            />
          </svg>
        </div>
        <div>
          <svg viewBox="0 0 300 160" preserveAspectRatio="none">
            <path
              d="M0 160 Q24 128 40 140 Q52 104 72 132 Q88 96 104 128 Q122 100 140 134 Q158 88 176 126 Q194 104 210 136 Q228 92 248 128 Q266 110 282 138 Q292 120 300 128 V160 Z"
              fill="#ff8a2a"
              fillOpacity="0.85"
            />
            <path
              d="M0 160 Q30 146 48 152 Q66 132 86 150 Q108 136 126 152 Q148 128 168 150 Q190 138 210 154 Q232 132 254 150 Q276 140 300 150 V160 Z"
              fill="#ffd36b"
              fillOpacity="0.9"
            />
          </svg>
        </div>
      </div>

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
        </defs>
        {/* Étais */}
        <rect x="4" y="20" width="22" height="380" fill="url(#mine-wood)" />
        {/* Cristaux qui luisent */}
        <g>
          <path d="M30 400 L42 338 L56 400 Z" fill="#5ccbe6" />
          <path d="M50 400 L68 318 L84 400 Z" fill="#8fe9ff" />
          <path d="M76 400 L88 352 L100 400 Z" fill="#4bb5d1" />
          <path d="M68 318 L74 360 L62 360 Z" fill="#e6fbff" opacity="0.7" />
        </g>
        <g>
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
        </defs>
        {/* Poutre et stalactites */}
        <rect x="0" y="0" width="640" height="16" fill="url(#mine-beam)" />
        <path
          d="M24 16 L34 44 L44 16 Z M130 16 L136 34 L144 16 Z M196 16 L206 52 L218 16 Z M290 16 L296 32 L304 16 Z M380 16 L390 46 L400 16 Z M470 16 L476 36 L484 16 Z M548 16 L558 50 L568 16 Z M610 16 L616 34 L624 16 Z"
          fill="#0c111b"
        />
      </svg>

      {/*
        Lueurs dans des calques à part : seule leur opacité varie, ce que le
        navigateur anime sans redessiner le décor.
      */}
      <svg
        className="backdrop__layer backdrop__mid backdrop__glow backdrop__glow--crystals"
        viewBox="0 0 640 400"
        preserveAspectRatio="xMinYMax slice"
      >
        <defs>
          <radialGradient id="mine-crystal-glow">
            <stop offset="0" stopColor="#7ae3ff" stopOpacity="0.55" />
            <stop offset="1" stopColor="#7ae3ff" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="62" cy="372" r="70" fill="url(#mine-crystal-glow)" />
        <circle cx="330" cy="388" r="54" fill="url(#mine-crystal-glow)" />
      </svg>

      {/* Lanterne au bout de sa chaîne : elle se balance, son halo et son faisceau avec elle. */}
      <div className="backdrop__lantern">
        <div className="backdrop__lantern-swing">
          <span className="backdrop__lantern-cone" />
          <span className="backdrop__lantern-halo" />
          <svg viewBox="0 0 24 64" width="24" height="64">
            <path d="M12 0 V38" stroke="#2a2f3a" strokeWidth="2" strokeDasharray="3 1.6" />
            <path d="M7 38 H17 L15.6 41 H8.4 Z" fill="#3a2a18" stroke="#1a1108" strokeWidth="1" />
            <path d="M8 41 H16 L15 56 H9 Z" fill="#ffcf6b" stroke="#2a1a08" strokeWidth="1.6" />
            <path d="M12 41 V56" stroke="#2a1a08" strokeWidth="1" />
            <path d="M8.4 56 H15.6 L14 59 H10 Z" fill="#3a2a18" stroke="#1a1108" strokeWidth="1" />
          </svg>
        </div>
      </div>

      {/* Flaque de lumière derrière le nain dont c'est le tour. */}
      <div
        className={`backdrop__spot${yourTurn ? ' backdrop__spot--yours' : ''}`}
        style={
          { '--focus': focus ?? 0.5, opacity: focus === null ? 0 : undefined } as CSSProperties
        }
      />
      <div className="backdrop__dim" style={{ opacity: focus !== null && !yourTurn ? 1 : 0 }} />
      <div className="backdrop__flash" />
    </div>
  );
}

/**
 * La mine : décor en couches (parallaxe), particules, vignette et lampe. La
 * chaleur (`--heat`, posée sur la racine) vire l'ambiance du froid au rouge braise.
 */
export function Scene({
  heat,
  focus = null,
  yourTurn = false,
  children,
  table,
  overlay,
}: {
  heat: number;
  /** Position du nain dont c'est le tour, de 0 (Sortie) à 1 (dragon) ; `null` hors partie. */
  focus?: number | null;
  /** C'est à vous : la lumière est plus chaude et le décor ne s'assombrit pas. */
  yourTurn?: boolean;
  /** La piste : la caméra s'en approche et elle tremble avec la mine. */
  children: ReactNode;
  /** Les pioches, posées sous la piste : ni zoom ni tremblement, on peut toujours les viser. */
  table?: ReactNode;
  /** Coup mis en scène, posé sur la zone des pioches : la piste reste toujours visible. */
  overlay?: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const preferences = usePreferences();
  const quality = effectiveQuality(preferences);
  const still = reducedMotion(preferences);
  useParallax(ref, !still && quality !== 'low');
  return (
    <section ref={ref} className="board scene" aria-label="Table de jeu">
      <div className="scene__back" aria-hidden>
        <MineBackdrop heat={heat} focus={focus} yourTurn={yourTurn} />
        {!still && quality !== 'low' && <AmbientLayer quality={quality} heat={heat} />}
      </div>
      <div className="scene__viewport">
        <div className="scene__stage">{children}</div>
      </div>
      {table && <div className="scene__table">{table}</div>}
      <div className="scene__front" aria-hidden>
        <div className="scene__vignette" />
      </div>
      {overlay && <div className="scene__overlay">{overlay}</div>}
    </section>
  );
}
