import type { CSSProperties } from 'react';
import type { DwarfView, PlayerView, TrackCard } from '@pepite/engine';
import { BRANDING } from '@pepite/shared/branding';
import { DwarfDisc } from '../assets/DwarfDisc';
import { TrackCardArt } from '../assets/Cards';
import { dwarfLook, dwarfName } from '../i18n/fr';
import { Card3D } from './Card3D';

const COLUMNS = 9;

/** Centre d'un disque : 2 colonnes × 3 rangées par carte. */
function slotCenter(position: number, slot: number): { left: string; top: string } {
  const column = slot % 2;
  const row = Math.floor(slot / 2) % 3;
  return {
    left: `${((position + 0.28 + 0.44 * column) / COLUMNS) * 100}%`,
    top: `${20 + row * 28}%`,
  };
}

function cardLabel(card: TrackCard, index: number): string {
  switch (card.kind) {
    case 'exit':
      return 'Sortie';
    case 'dragon':
      return `Dragon ${BRANDING.dragonName}`;
    case 'wagon':
      return card.burned ? `Wagon brûlé (carte ${index})` : `Wagon (carte ${index})`;
    case 'mine':
      return card.burned ? `Galerie brûlée (carte ${index})` : `Galerie (carte ${index})`;
  }
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
  // La lampe frontale éclaire le nain dont c'est le tour.
  const active = view.currentDwarfId === null ? undefined : view.dwarves[view.currentDwarfId];
  const lamp =
    view.phase === 'playing' && active?.status === 'mine'
      ? slotCenter(active.position, slots.get(active.id) ?? 0)
      : null;

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

      {lamp && <span className="track__lamp" style={lamp} aria-hidden />}

      {view.dwarves.map((_, slot) => (
        <span key={`slot-${slot}`} className="ladder-slot" style={slotCenter(0, slot)} aria-hidden>
          {slot + 1}
        </span>
      ))}

      {view.dwarves.map((dwarf) => {
        const onExit = dwarf.status === 'exit';
        const dead = dwarf.status === 'eliminated';
        const style = onExit
          ? slotCenter(0, dwarf.ladderSlot ?? 0)
          : slotCenter(dwarf.position, slots.get(dwarf.id) ?? 0);
        const look = dwarfLook(dwarf.color);
        const name = dwarfName(view, dwarf.id);
        const where = onExit
          ? `sorti, place ${(dwarf.ladderSlot ?? 0) + 1} sur l’échelle`
          : dead
            ? `éliminé sur la carte ${dwarf.position}`
            : dwarf.position === 4
              ? 'sur le Wagon'
              : `sur la carte ${dwarf.position}`;
        const label = `${name} — nain ${look.name}, ${where}`;
        const className = [
          'disc',
          dwarf.id === view.currentDwarfId ? 'disc--active' : '',
          dwarf.ownerId === view.viewerId ? 'disc--mine' : '',
          dead ? 'disc--dead' : '',
        ].join(' ');
        if (swapTargets.includes(dwarf.id)) {
          return (
            <button
              key={dwarf.id}
              type="button"
              className={`${className} disc--target`}
              style={style}
              onClick={() => onSwap(dwarf.id)}
              aria-label={`Échanger avec ${label}`}
              title={`Échanger avec ${name}`}
            >
              <DwarfDisc color={dwarf.color} />
            </button>
          );
        }
        return (
          <span key={dwarf.id} className={className} style={style} title={label}>
            <DwarfDisc color={dwarf.color} label={label} />
          </span>
        );
      })}
    </div>
  );
}
