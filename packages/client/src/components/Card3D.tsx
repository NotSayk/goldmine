import { useEffect, useRef, type ReactNode } from 'react';
import { effectiveQuality, reducedMotion, usePreferences } from '../preferences';

export type CardFinish = 'plain' | 'gold' | 'dragon' | 'exit';

/**
 * Carte en relief : elle s'incline vers le pointeur, son ombre suit, et un
 * reflet (doré et irisé pour les cartes d'or) glisse sur sa surface. Sans
 * effet sur écran tactile, en qualité basse ou avec le mouvement réduit.
 */
export function Card3D({
  children,
  finish = 'plain',
  className = '',
  tilt = true,
}: {
  children: ReactNode;
  finish?: CardFinish;
  className?: string;
  tilt?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const preferences = usePreferences();
  const enabled = tilt && !reducedMotion(preferences) && effectiveQuality(preferences) !== 'low';

  useEffect(() => {
    const element = ref.current;
    if (!element || !enabled || !window.matchMedia('(pointer: fine)').matches) return;
    let frame = 0;
    let x = 0;
    let y = 0;
    const apply = (): void => {
      frame = 0;
      element.style.setProperty('--tx', x.toFixed(3));
      element.style.setProperty('--ty', y.toFixed(3));
    };
    const schedule = (): void => {
      if (!frame) frame = requestAnimationFrame(apply);
    };
    const onMove = (event: PointerEvent): void => {
      const rect = element.getBoundingClientRect();
      x = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width) * 2 - 1));
      y = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height) * 2 - 1));
      schedule();
    };
    const onEnter = (): void => element.classList.add('card3d--tilting');
    const onLeave = (): void => {
      element.classList.remove('card3d--tilting');
      x = 0;
      y = 0;
      schedule();
    };
    element.addEventListener('pointerenter', onEnter);
    element.addEventListener('pointermove', onMove);
    element.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(frame);
      element.removeEventListener('pointerenter', onEnter);
      element.removeEventListener('pointermove', onMove);
      element.removeEventListener('pointerleave', onLeave);
    };
  }, [enabled]);

  return (
    <div ref={ref} className={`card3d card3d--${finish} ${className}`}>
      <div className="card3d__body">
        {children}
        <span className="card3d__sheen" aria-hidden />
      </div>
    </div>
  );
}
