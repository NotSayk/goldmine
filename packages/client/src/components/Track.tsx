import { useLayoutEffect, useRef, type CSSProperties, type RefObject } from 'react';
import type { DwarfView, PlayerView, TrackCard } from '@pepite/engine';
import { BRANDING } from '@pepite/shared/branding';
import { PACE } from '@pepite/shared/pacing';
import { Flame } from '../assets/Dragon';
import { DwarfToken, type DwarfMood } from '../assets/DwarfToken';
import { TrackCardArt } from '../assets/Cards';
import { dwarfLook, dwarfName } from '../i18n/fr';
import { useLooks } from '../looks';
import { reducedMotion } from '../preferences';
import { Card3D } from './Card3D';

const COLUMNS = 9;
/** Silhouette d'un nain (tête et corps du jeton) : emplacement de l'échelle de la Sortie. */
const SLOT_SILHOUETTE = 'M13.44 16.48 A7.2 7.2 0 1 1 26.56 16.48 A12.4 12.4 0 1 1 13.44 16.48 Z';
const HOP_MS = PACE.hopMs;

interface Spot {
  /** En pourcentage de la piste. */
  readonly x: number;
  readonly y: number;
}

/** Centre d'un nain : 2 colonnes × 3 rangées par carte. */
function slotCenter(position: number, slot: number): Spot {
  const column = slot % 2;
  const row = Math.floor(slot / 2) % 3;
  return { x: ((position + 0.28 + 0.44 * column) / COLUMNS) * 100, y: 20 + row * 28 };
}

function spotStyle(spot: Spot): CSSProperties {
  return { left: `${spot.x}%`, top: `${spot.y}%` };
}

function cardLabel(card: TrackCard, index: number): string {
  switch (card.kind) {
    case 'exit':
      return 'Sortie de la mine';
    case 'dragon':
      return `Carte ${BRANDING.dragonName}`;
    case 'wagon':
      return card.burned ? `Wagon, face rouge (carte ${index})` : `Wagon (carte ${index})`;
    case 'mine':
      return card.burned ? `Mine, face rouge (carte ${index})` : `Mine (carte ${index})`;
  }
}

function moodOf(dwarf: DwarfView, dragonPosition: number): DwarfMood {
  if (dwarf.status === 'eliminated') return 'dead';
  if (dwarf.status === 'exit') return 'joy';
  return dragonPosition - dwarf.position <= 1 ? 'panic' : 'idle';
}

/**
 * Déplacement par bonds, une carte par bond : le nain s'écrase au décollage,
 * s'étire en l'air et s'écrase à l'atterrissage (FLIP : l'élément est déjà à
 * sa place, l'animation part de l'ancienne position). Il regarde vers où il va.
 */
function useHops(ref: RefObject<HTMLElement | null>, spot: Spot, position: number): void {
  const previous = useRef<{ spot: Spot; position: number } | null>(null);
  const { x, y } = spot;
  useLayoutEffect(() => {
    const element = ref.current;
    const track = element?.parentElement;
    const before = previous.current;
    const spot = { x, y };
    previous.current = { spot, position };
    if (!element || !track || !before) return;
    if (before.spot.x === spot.x && before.spot.y === spot.y) return;
    const dx = ((before.spot.x - spot.x) / 100) * track.clientWidth;
    const dy = ((before.spot.y - spot.y) / 100) * track.clientHeight;
    if (Math.abs(dx) > 1) element.dataset.facing = dx < 0 ? 'right' : 'left';
    if (reducedMotion()) return;
    const hops = Math.max(1, Math.min(4, Math.abs(before.position - position)));
    const lift = Math.max(14, track.clientHeight * 0.32);
    const at = (progress: number, rise: number, sx: number, sy: number): Keyframe => ({
      transform: `translate(calc(-50% + ${(dx * (1 - progress)).toFixed(1)}px), calc(-50% + ${(dy * (1 - progress) - rise).toFixed(1)}px)) scale(${sx}, ${sy})`,
    });
    const frames: Keyframe[] = [];
    for (let k = 0; k < hops; k++) {
      frames.push({ ...at(k / hops, 0, 1.12, 0.86), offset: k / hops });
      frames.push({ ...at((k + 0.5) / hops, lift, 0.9, 1.12), offset: (k + 0.5) / hops });
    }
    frames.push({ ...at(1, 0, 1.14, 0.84), offset: (hops - 0.12) / hops });
    frames.push({ ...at(1, 0, 1, 1), offset: 1 });
    const animation = element.animate(frames, { duration: hops * HOP_MS, easing: 'ease-in-out' });
    return () => animation.cancel();
  }, [ref, x, y, position]);
}

function TrackDwarf({
  view,
  dwarf,
  spot,
  target,
  onSwap,
}: {
  view: PlayerView;
  dwarf: DwarfView;
  spot: Spot;
  target: boolean;
  onSwap: (dwarfId: number) => void;
}) {
  const ref = useRef<HTMLElement>(null);
  const looks = useLooks();
  const position = dwarf.status === 'exit' ? -1 - (dwarf.ladderSlot ?? 0) : dwarf.position;
  useHops(ref, spot, position);
  const mood = moodOf(dwarf, view.dragonPosition);
  const look = dwarfLook(dwarf.color);
  const name = dwarfName(view, dwarf.id);
  const where =
    dwarf.status === 'exit'
      ? `sorti, place ${(dwarf.ladderSlot ?? 0) + 1} sur l’échelle`
      : dwarf.status === 'eliminated'
        ? `éliminé sur la carte ${dwarf.position}`
        : dwarf.position === 4
          ? 'sur le Wagon'
          : `sur la carte ${dwarf.position}`;
  const label = `${name} — nain ${look.name}, ${where}`;
  const className = [
    'disc',
    `disc--${mood}`,
    dwarf.id === view.currentDwarfId && view.phase === 'playing' ? 'disc--active' : '',
    dwarf.ownerId === view.viewerId ? 'disc--mine' : '',
    target ? 'disc--target' : '',
  ].join(' ');
  const token = (
    <>
      <DwarfToken
        color={dwarf.color}
        look={looks.get(dwarf.ownerId)}
        mood={mood}
        label={target ? undefined : label}
      />
      {mood === 'dead' && (
        <span className="disc__burn" aria-hidden>
          <Flame />
        </span>
      )}
    </>
  );
  if (target) {
    return (
      <button
        ref={ref as RefObject<HTMLButtonElement>}
        type="button"
        className={className}
        style={spotStyle(spot)}
        onClick={() => onSwap(dwarf.id)}
        aria-label={`Échanger avec ${label}`}
        title={`Échanger avec ${name}`}
      >
        {token}
      </button>
    );
  }
  return (
    <span ref={ref} className={className} style={spotStyle(spot)} title={label}>
      {token}
    </span>
  );
}

export function Track({
  view,
  swapTargets,
  onSwap,
}: {
  view: PlayerView;
  swapTargets: readonly number[];
  onSwap: (dwarfId: number) => void;
}) {
  // Rang de chaque nain sur sa carte (pour les empiler sans chevauchement).
  const slots = new Map<number, number>();
  const byPosition = new Map<number, DwarfView[]>();
  for (const dwarf of view.dwarves) {
    // Nains vivants et nains tombés partagent les emplacements de leur carte.
    if (dwarf.status === 'exit') continue;
    const list = byPosition.get(dwarf.position) ?? [];
    list.push(dwarf);
    byPosition.set(dwarf.position, list);
  }
  for (const list of byPosition.values()) list.forEach((dwarf, i) => slots.set(dwarf.id, i));
  const spotOf = (dwarf: DwarfView): Spot =>
    dwarf.status === 'exit'
      ? slotCenter(0, dwarf.ladderSlot ?? 0)
      : slotCenter(dwarf.position, slots.get(dwarf.id) ?? 0);
  // La lampe frontale éclaire le nain dont c'est le tour.
  const active = view.currentDwarfId === null ? undefined : view.dwarves[view.currentDwarfId];
  const lamp = view.phase === 'playing' && active?.status === 'mine' ? spotOf(active) : null;

  return (
    <div
      className="track"
      role="group"
      aria-label="Piste de la mine, de la Sortie (à gauche) au dragon (à droite)"
    >
      {view.track.map((card, index) => (
        <div
          // Nouvelle clé à chaque manche : la piste est redistribuée en cascade.
          key={`${view.round}-${card.id}`}
          className="track-card"
          data-kind={card.kind}
          data-burned={card.burned}
          data-track-index={index}
          style={{ '--i': index } as CSSProperties}
          title={cardLabel(card, index)}
        >
          <Card3D finish={card.kind === 'dragon' ? 'dragon' : 'plain'}>
            <div className="track-card__face" role="img" aria-label={cardLabel(card, index)}>
              <TrackCardArt kind={card.kind} burned={card.burned} />
              {card.kind !== 'exit' && card.kind !== 'dragon' && (
                <span className="track-card__index" aria-hidden>
                  {index}
                </span>
              )}
            </div>
          </Card3D>
        </div>
      ))}

      {lamp && <span className="track__lamp" style={spotStyle(lamp)} aria-hidden />}

      {view.dwarves.map((_, slot) => (
        <span
          key={`slot-${slot}`}
          className="ladder-slot"
          style={spotStyle(slotCenter(0, slot))}
          aria-hidden
        >
          <svg viewBox="0 0 40 40">
            <path d={SLOT_SILHOUETTE} />
            <text x="20" y="31">
              {slot + 1}
            </text>
          </svg>
        </span>
      ))}

      {view.dwarves.map((dwarf) => (
        <TrackDwarf
          // Nouvelle manche : les nains repartent du Wagon sans bondir depuis la Sortie.
          key={`${view.round}-${dwarf.id}`}
          view={view}
          dwarf={dwarf}
          spot={spotOf(dwarf)}
          target={swapTargets.includes(dwarf.id)}
          onSwap={onSwap}
        />
      ))}
    </div>
  );
}
