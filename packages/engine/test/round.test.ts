import { describe, expect, it } from 'vitest';
import { BIG_NUGGETS_TOTAL, type ExtractionCard, type GameState } from '../src';
import { act, eventsOfType, newGame, place, play, stackExit, stackExtraction } from './helpers';

function giveGold(state: GameState, playerId: string, kinds: ExtractionCard['kind'][]): void {
  for (const kind of kinds) {
    const index = state.extractionDeck.findIndex((c, i) => i > 0 && c.kind === kind);
    state.piles[playerId]!.extraction.push(state.extractionDeck.splice(index, 1)[0]!);
  }
}

function exitDwarf(state: GameState, dwarfId: number): void {
  const dwarf = state.dwarves[dwarfId]!;
  dwarf.status = 'exit';
  dwarf.position = 0;
  dwarf.secured = state.piles[dwarf.ownerId]!;
  state.piles[dwarf.ownerId] = { extraction: [], bonus: [] };
  state.ladder.push(dwarfId);
}

/** Fait sortir le nain actif avec « Petit pas » depuis la première Mine. */
function stepOut(state: GameState): GameState {
  place(state, { [state.currentDwarf!]: 1 });
  stackExit(state, [['step']]);
  return play(state, { type: 'drawExit' }).state;
}

describe('fin de manche et décompte (manches 1 et 2)', () => {
  it('fin quand tous les nains sont sortis : 3/2/1 Grosses pépites aux plus riches', () => {
    const { state } = newGame({ players: 4 });
    giveGold(state, 'p1', ['noDoor']); // 1
    giveGold(state, 'p2', ['redDoor', 'redDoor']); // 4
    giveGold(state, 'p3', ['redDoor', 'noDoor']); // 3
    giveGold(state, 'p4', ['redDoor', 'blueDoor', 'noDoor']); // 4
    exitDwarf(state, 1);
    exitDwarf(state, 3);
    exitDwarf(state, 2);
    const ended = stepOut(state);
    const result = ended.roundResults[0]!;
    const { state: next, events } = act(ended, { type: 'startNextRound' });
    expect(result.cause).toBe('mineEmpty');
    // Égalité p2/p4 à 4 : p2 est plus haut sur l'échelle.
    expect(result.ranking.map((r) => [r.playerId, r.total, r.bigNuggetsAwarded])).toEqual([
      ['p2', 4, 3],
      ['p4', 4, 2],
      ['p3', 3, 1],
      ['p1', 1, 0],
    ]);
    expect(result.winnerPlayerId).toBe('p2');
    expect(next.round).toBe(2);
    expect(next.roundFirstPlayer).toBe('p2');
    expect(next.currentDwarf).toBe(1);
    expect(next.bigNuggetReserve).toBe(BIG_NUGGETS_TOTAL - 6);
    expect(next.dwarves.map((d) => d.bigNuggets)).toEqual([0, 3, 1, 2]);
    expect(eventsOfType(events, 'RoundStarted')[0]).toEqual({
      type: 'RoundStarted',
      round: 2,
      firstPlayerId: 'p2',
    });
  });

  it('remet tout en place pour la manche suivante en gardant les Grosses pépites', () => {
    const { state } = newGame({ players: 2 });
    giveGold(state, 'p2', ['noDoor']);
    exitDwarf(state, 1);
    const ended = stepOut(state);
    expect(ended.phase).toBe('roundEnd');
    const next = act(ended, { type: 'startNextRound' }).state;
    expect(next.phase).toBe('playing');
    expect(next.extractionDeck).toHaveLength(58);
    expect(next.exitDeck).toHaveLength(16);
    expect(next.exitDiscard).toHaveLength(0);
    expect(next.ladder).toEqual([]);
    expect(next.dragonPosition).toBe(8);
    expect(next.track.every((c) => !c.burned)).toBe(true);
    expect(next.dwarves.every((d) => d.status === 'mine' && d.position === 4)).toBe(true);
    expect(next.dwarves[1]?.bigNuggets).toBe(3);
    expect(Object.values(next.piles).every((p) => p.extraction.length === 0)).toBe(true);
  });

  it('un nain sans pépite ne reçoit pas de Grosse pépite', () => {
    const { state } = newGame({ players: 3 });
    giveGold(state, 'p2', ['noDoor']);
    exitDwarf(state, 1);
    exitDwarf(state, 2);
    const ended = stepOut(state);
    const result = ended.roundResults[0]!;
    expect(result.ranking.map((r) => r.bigNuggetsAwarded)).toEqual([3, 0, 0]);
    expect(ended.bigNuggetReserve).toBe(9);
  });

  it('le Bonus d’or compte +3 et les éliminés ne comptent pas', () => {
    const { state } = newGame({ players: 3 });
    giveGold(state, 'p1', ['redDoor']); // 2
    state.piles.p1!.bonus.push(state.exitDeck.find((c) => c.actions[0] === 'goldBonus')!);
    state.exitDeck = state.exitDeck.filter((c) => !state.piles.p1!.bonus.includes(c));
    giveGold(state, 'p2', ['redDoor', 'redDoor', 'redDoor']); // 6, mais éliminé
    state.dwarves[1]!.status = 'eliminated';
    giveGold(state, 'p3', ['redDoor', 'redDoor']); // 4
    exitDwarf(state, 2);
    const ended = stepOut(state);
    const result = ended.roundResults[0]!;
    expect(result.ranking.map((r) => [r.playerId, r.total])).toEqual([
      ['p1', 5],
      ['p3', 4],
    ]);
    expect(result.eliminated).toEqual([1]);
  });

  it('cas n° 5 : sans vainqueur, le joueur suivant le précédent premier joueur commence', () => {
    const { state } = newGame({ players: 3, firstPlayerId: 'p3' });
    exitDwarf(state, 0);
    exitDwarf(state, 1);
    const ended = stepOut(state);
    expect(ended.roundResults[0]?.winnerPlayerId).toBeNull();
    expect(ended.bigNuggetReserve).toBe(BIG_NUGGETS_TOTAL);
    const next = act(ended, { type: 'startNextRound' }).state;
    expect(next.roundFirstPlayer).toBe('p1');
  });

  it('cas n° 4 : pioche Extraction vide, fin de manche et nains restants éliminés', () => {
    const { state } = newGame({ players: 2 });
    giveGold(state, 'p2', ['noDoor']);
    exitDwarf(state, 1);
    state.extractionDeck = state.extractionDeck.filter((c) => c.kind === 'noDoor').slice(0, 1);
    const { state: ended, events } = play(state, { type: 'drawExtraction' });
    expect(ended.phase).toBe('roundEnd');
    expect(ended.roundResults[0]?.cause).toBe('extractionDeckEmpty');
    expect(eventsOfType(events, 'DwarfEliminated')[0]).toMatchObject({
      dwarfId: 0,
      cause: 'stranded',
    });
    expect(ended.roundResults[0]?.winnerPlayerId).toBe('p2');
  });

  it('le dragon termine la manche : seuls les nains sortis marquent', () => {
    const { state } = newGame({ players: 2 });
    giveGold(state, 'p2', ['redDoor']);
    exitDwarf(state, 1);
    state.dragonPosition = 2;
    state.track = [
      { id: 'exit', kind: 'exit', burned: false },
      { id: 'mine-1', kind: 'mine', burned: false },
      { id: 'dragon', kind: 'dragon', burned: false },
      ...state.track.slice(2, 8).map((c) => ({ ...c, burned: true })),
    ];
    place(state, { 0: 1 });
    stackExtraction(state, ['noDoor', 'dragon']);
    const { state: ended } = play(state, { type: 'drawExtraction' });
    expect(ended.roundResults[0]?.cause).toBe('dragonReachedExit');
    expect(ended.roundResults[0]?.ranking.map((r) => r.playerId)).toEqual(['p2']);
    expect(ended.dwarves[1]?.bigNuggets).toBe(3);
  });
});
