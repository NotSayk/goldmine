import { describe, expect, it } from 'vitest';
import { houseRules } from '../src';
import { eventsOfType, newGame, place, play, stackExtraction } from './helpers';

describe('dragon pioché (pioche cachée)', () => {
  it('est la règle en ligne', () => {
    expect(houseRules.dragonActsWhenDrawn()).toBe(true);
  });

  it('un dragon sur le dessus de la pioche ne fait rien tant que personne ne le pioche', () => {
    const { state } = newGame();
    stackExtraction(state, ['noDoor', 'dragon', 'noDoor']);
    const { state: next, events } = play(state, { type: 'drawExtraction' });
    expect(next.dragonPosition).toBe(8);
    expect(eventsOfType(events, 'DragonMoved')).toEqual([]);
    expect(next.extractionDeck[0]?.kind).toBe('dragon');
  });

  it('piocher un dragon fait avancer Dragobert et rien d’autre', () => {
    const { state } = newGame({ players: 3 });
    stackExtraction(state, ['dragon', 'dragon', 'noDoor']);
    const before = state.dwarves[0]!.position;
    const { state: next, events } = play(state, { type: 'drawExtraction' });
    // Un seul pas, même si la carte suivante est aussi un dragon.
    expect(eventsOfType(events, 'DragonMoved')).toEqual([
      { type: 'DragonMoved', from: 8, to: 7, burnedCardId: 'mine-6' },
    ]);
    expect(next.track[8]).toEqual({ id: 'mine-6', kind: 'mine', burned: true });
    // Pas d'or, le nain ne bouge pas, la carte est rangée dans la boîte.
    expect(next.piles.p1?.extraction).toEqual([]);
    expect(next.dwarves[0]?.position).toBe(before);
    expect(eventsOfType(events, 'DwarfMoved')).toEqual([]);
    expect(next.box.extraction.map((c) => c.kind)).toEqual(['dragon']);
    expect(next.extractionDeck[0]?.kind).toBe('dragon');
    expect(eventsOfType(events, 'CardDrawn')[0]).toMatchObject({ card: 'dragon', gold: 0 });
    // Le tour passe au joueur suivant.
    expect(next.currentDwarf).toBe(1);
  });

  it('élimine les nains de la Mine dépassée, disques laissés sur la carte retournée', () => {
    const { state } = newGame({ players: 3 });
    place(state, { 1: 7, 2: 7 });
    stackExtraction(state, ['dragon', 'redDoor', 'noDoor']);
    state.piles.p2!.extraction.push(...state.extractionDeck.splice(1, 2));
    const { state: next, events } = play(state, { type: 'drawExtraction' });
    expect(next.dwarves.map((d) => d.status)).toEqual(['mine', 'eliminated', 'eliminated']);
    expect(next.dwarves[1]?.position).toBe(8);
    expect(eventsOfType(events, 'DwarfEliminated')[0]).toMatchObject({
      cause: 'dragon',
      goldLost: 3,
      position: 8,
    });
    expect(next.piles.p2?.extraction).toEqual([]);
  });

  it('termine la manche si Dragobert arrive à côté de la Sortie', () => {
    const { state } = newGame({ players: 2 });
    state.dragonPosition = 2;
    state.track = [
      { id: 'exit', kind: 'exit', burned: false },
      { id: 'mine-1', kind: 'mine', burned: false },
      { id: 'dragon', kind: 'dragon', burned: false },
      ...state.track.slice(2, 8).map((c) => ({ ...c, burned: true })),
    ];
    place(state, { 0: 1, 1: 1 });
    stackExtraction(state, ['dragon', 'noDoor']);
    const { state: next, events } = play(state, { type: 'drawExtraction' });
    expect(next.dragonPosition).toBe(1);
    expect(next.phase).toBe('roundEnd');
    expect(eventsOfType(events, 'RoundEnded')[0]?.cause).toBe('dragonReachedExit');
  });
});
