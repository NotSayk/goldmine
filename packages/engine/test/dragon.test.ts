import { describe, expect, it } from 'vitest';
import { eventsOfType, newGame, place, play, stackExit, stackExtraction } from './helpers';

describe('dragon', () => {
  it('avance quand la nouvelle carte visible est un dragon, retourne la Mine et range le dragon', () => {
    const { state } = newGame();
    stackExtraction(state, ['noDoor', 'dragon', 'noDoor']);
    const { state: next, events } = play(state, { type: 'drawExtraction' });
    expect(next.dragonPosition).toBe(7);
    expect(next.track[8]).toEqual({ id: 'mine-6', kind: 'mine', burned: true });
    expect(next.track[7]).toEqual({ id: 'dragon', kind: 'dragon', burned: false });
    expect(next.box.extraction.map((c) => c.kind)).toEqual(['dragon']);
    expect(next.extractionDeck[0]?.kind).toBe('noDoor');
    expect(next.extractionDeck).toHaveLength(56);
    expect(eventsOfType(events, 'DragonMoved')).toEqual([
      { type: 'DragonMoved', from: 8, to: 7, burnedCardId: 'mine-6' },
    ]);
  });

  it('la carte dépassée passe à droite du dragon, côté rouge', () => {
    const { state } = newGame();
    stackExtraction(state, ['noDoor', 'dragon', 'noDoor']);
    const { state: next } = play(state, { type: 'drawExtraction' });
    expect(next.track.map((c) => c.id)).toEqual([
      'exit',
      'mine-1',
      'mine-2',
      'mine-3',
      'wagon',
      'mine-4',
      'mine-5',
      'dragon',
      'mine-6',
    ]);
  });

  it('élimine les nains de la Mine dépassée : or rangé dans la boîte', () => {
    const { state } = newGame({ players: 3 });
    place(state, { 1: 7, 2: 7 });
    // p2 tient un « porte rouge » et un « sans porte » : 3 pépites.
    stackExtraction(state, ['noDoor', 'dragon', 'noDoor', 'redDoor', 'noDoor']);
    state.piles.p2!.extraction.push(...state.extractionDeck.splice(3, 2));
    const { state: next, events } = play(state, { type: 'drawExtraction' });
    expect(next.dwarves[1]?.status).toBe('eliminated');
    expect(next.dwarves[2]?.status).toBe('eliminated');
    expect(next.piles.p2?.extraction).toEqual([]);
    expect(next.box.extraction).toHaveLength(3);
    expect(eventsOfType(events, 'DwarfEliminated').map((e) => e.dwarfId)).toEqual([1, 2]);
    expect(eventsOfType(events, 'DwarfEliminated')[0]).toMatchObject({
      cause: 'dragon',
      pileLost: true,
      goldLost: 3,
      position: 8,
    });
    expect(eventsOfType(events, 'DwarfEliminated')[1]).toMatchObject({ goldLost: 0 });
    // Les disques restent sur leur galerie, brûlée et passée à droite du dragon.
    expect(next.dwarves[1]?.position).toBe(8);
    expect(next.dwarves[2]?.position).toBe(8);
    expect(next.track[8]).toMatchObject({ id: 'mine-6', burned: true });
    // Le prochain nain encore dans la mine est le joueur 1.
    expect(next.currentDwarf).toBe(0);
  });

  it('enchaîne plusieurs dragons tant que la carte visible est un dragon', () => {
    const { state } = newGame({ players: 3 });
    place(state, { 1: 6, 2: 5 });
    stackExtraction(state, ['noDoor', 'dragon', 'dragon', 'dragon', 'blueDoor']);
    const { state: next, events } = play(state, { type: 'drawExtraction' });
    expect(next.dragonPosition).toBe(5);
    expect(eventsOfType(events, 'DragonMoved')).toHaveLength(3);
    expect(next.dwarves.map((d) => d.status)).toEqual(['mine', 'eliminated', 'eliminated']);
    expect(next.track.slice(5).map((c) => c.burned)).toEqual([false, true, true, true]);
    expect(next.extractionDeck[0]?.kind).toBe('blueDoor');
  });

  it('une carte Exit ne déclenche jamais le dragon', () => {
    const { state } = newGame();
    stackExtraction(state, ['dragon']);
    stackExit(state, [['step']]);
    // La mise en situation met un dragon visible : la pioche Exit ne le déclenche pas.
    const { state: next } = play(state, { type: 'drawExit' });
    expect(next.dragonPosition).toBe(8);
  });

  it('dépasse le Wagon comme une Mine', () => {
    const { state } = newGame({ players: 2 });
    state.dragonPosition = 5;
    state.track = [
      ...state.track.slice(0, 5),
      { id: 'dragon', kind: 'dragon', burned: false },
      { id: 'mine-4', kind: 'mine', burned: true },
      { id: 'mine-5', kind: 'mine', burned: true },
      { id: 'mine-6', kind: 'mine', burned: true },
    ];
    place(state, { 0: 3 });
    stackExtraction(state, ['noDoor', 'dragon', 'noDoor']);
    const { state: next } = play(state, { type: 'drawExtraction' });
    expect(next.track[5]).toEqual({ id: 'wagon', kind: 'wagon', burned: true });
    expect(next.dwarves[1]?.status).toBe('eliminated');
    expect(next.dwarves[0]?.status).toBe('mine');
  });

  it('s’arrête à côté de la Sortie et termine la manche immédiatement', () => {
    const { state } = newGame({ players: 2 });
    state.dragonPosition = 3;
    state.track = [
      { id: 'exit', kind: 'exit', burned: false },
      { id: 'mine-1', kind: 'mine', burned: false },
      { id: 'mine-2', kind: 'mine', burned: false },
      { id: 'dragon', kind: 'dragon', burned: false },
      ...state.track.slice(3, 8).map((c) => ({ ...c, burned: true })),
    ];
    place(state, { 0: 2, 1: 1 });
    stackExtraction(state, ['noDoor', 'dragon', 'dragon', 'dragon', 'noDoor']);
    const { state: next, events } = play(state, { type: 'drawExtraction' });
    expect(next.dragonPosition).toBe(1);
    // Le troisième dragon reste sur la pioche : le dragon ne peut pas avancer davantage.
    expect(eventsOfType(events, 'DragonMoved')).toHaveLength(2);
    expect(next.extractionDeck[0]?.kind).toBe('dragon');
    expect(next.dwarves.every((d) => d.status === 'eliminated')).toBe(true);
    expect(next.phase).toBe('roundEnd');
    expect(eventsOfType(events, 'RoundEnded')[0]?.cause).toBe('dragonReachedExit');
  });
});
