import { describe, expect, it } from 'vitest';
import {
  computeFinalResult,
  createSeededRng,
  reduce,
  type ExtractionCard,
  type GameState,
} from '../src';
import { act, eventsOfType, newGame, place, play, stackExit } from './helpers';

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

function lastRound(players: number): GameState {
  const { state } = newGame({ players });
  state.round = 3;
  return state;
}

/** Le nain actif sort avec « Petit pas » : fin de manche si c'était le dernier. */
function stepOut(state: GameState): ReturnType<typeof play> {
  place(state, { [state.currentDwarf!]: 1 });
  stackExit(state, [['step']]);
  return play(state, { type: 'drawExit' });
}

describe('manche 3 : décompte final', () => {
  it('les Grosses pépites valent 1 pépite et le plus riche gagne', () => {
    const state = lastRound(3);
    state.dwarves[0]!.bigNuggets = 1;
    state.dwarves[1]!.bigNuggets = 5;
    state.dwarves[2]!.bigNuggets = 0;
    giveGold(state, 'p2', ['noDoor']); // 1 + 5 = 6
    giveGold(state, 'p3', ['redDoor', 'redDoor', 'noDoor']); // 5 + 0 = 5
    giveGold(state, 'p1', ['redDoor', 'redDoor']); // 4 + 1 = 5
    exitDwarf(state, 1);
    exitDwarf(state, 2);
    const { state: ended, events } = stepOut(state);
    expect(ended.phase).toBe('finished');
    expect(ended.bigNuggetReserve).toBe(12);
    const result = ended.finalResult!;
    expect(result.winners).toEqual(['p2']);
    expect(result.standings.map((s) => [s.playerId, s.total, s.rank])).toEqual([
      ['p2', 6, 1],
      ['p3', 5, 2],
      ['p1', 5, 3],
    ]);
    expect(eventsOfType(events, 'GameEnded')).toHaveLength(1);
    expect(eventsOfType(events, 'BigNuggetsAwarded')).toHaveLength(0);
  });

  it('un joueur éliminé ne compte que ses Grosses pépites', () => {
    const state = lastRound(2);
    state.dwarves[0]!.bigNuggets = 4;
    state.dwarves[1]!.bigNuggets = 2;
    giveGold(state, 'p1', ['redDoor', 'redDoor', 'redDoor']);
    giveGold(state, 'p2', ['noDoor']);
    exitDwarf(state, 1);
    state.dragonPosition = 2;
    place(state, { 0: 1 });
    state.extractionDeck = [
      state.extractionDeck.find((c) => c.kind === 'noDoor')!,
      state.extractionDeck.find((c) => c.kind === 'dragon')!,
    ];
    const { state: ended } = play(state, { type: 'drawExtraction' });
    expect(ended.dwarves[0]?.status).toBe('eliminated');
    const p1 = ended.finalResult!.standings.find((s) => s.playerId === 'p1')!;
    expect(p1).toMatchObject({ extractionGold: 0, bigNuggets: 4, total: 4, bestLadderSlot: null });
    // p2 : 1 pépite + 2 Grosses pépites = 3 ; p1 gagne avec ses 4 Grosses pépites.
    expect(ended.finalResult!.winners).toEqual(['p1']);
  });

  it('égalité : la position sur l’échelle départage', () => {
    const state = lastRound(3);
    giveGold(state, 'p3', ['redDoor']);
    giveGold(state, 'p2', ['redDoor']);
    giveGold(state, 'p1', ['noDoor', 'noDoor']);
    exitDwarf(state, 2);
    exitDwarf(state, 1);
    const { state: ended } = stepOut(state);
    expect(ended.finalResult!.standings.map((s) => s.playerId)).toEqual(['p3', 'p2', 'p1']);
    expect(ended.finalResult!.winners).toEqual(['p3']);
  });

  it('cas n° 6 : à égalité, le joueur sorti l’emporte sur l’éliminé', () => {
    const state = lastRound(2);
    state.dwarves[0]!.bigNuggets = 3;
    giveGold(state, 'p2', ['noDoor', 'noDoor', 'noDoor']);
    exitDwarf(state, 1);
    state.dwarves[0]!.status = 'eliminated';
    const result = computeFinalResult(state);
    expect(result.standings.map((s) => [s.playerId, s.total, s.rank])).toEqual([
      ['p2', 3, 1],
      ['p1', 3, 2],
    ]);
  });

  it('cas n° 7 : égalité entre deux éliminés, victoire partagée', () => {
    const state = lastRound(3);
    state.dwarves[0]!.bigNuggets = 4;
    state.dwarves[1]!.bigNuggets = 4;
    state.dwarves[2]!.bigNuggets = 1;
    for (const dwarf of state.dwarves) dwarf.status = 'eliminated';
    const result = computeFinalResult(state);
    expect(result.winners).toEqual(['p1', 'p2']);
    expect(result.standings.map((s) => s.rank)).toEqual([1, 1, 3]);
  });

  it('plus aucune action après la fin de la partie', () => {
    const state = lastRound(2);
    exitDwarf(state, 1);
    const { state: ended } = stepOut(state);
    const rng = createSeededRng(1);
    for (const action of [
      { type: 'startNextRound' } as const,
      { type: 'skipTurn' } as const,
      { type: 'drawExit', playerId: 'p1' } as const,
    ]) {
      const result = reduce(ended, action, rng);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('GAME_OVER');
    }
  });

  it('enchaîne trois manches avec les Grosses pépites conservées', () => {
    const { state } = newGame({ players: 2 });
    let s = state;
    for (let round = 1; round <= 3; round++) {
      expect(s.round).toBe(round);
      const winner = s.currentDwarf!;
      giveGold(s, s.dwarves[winner]!.ownerId, ['noDoor']);
      s = stepOut(s).state; // le nain actif sort avec 1 pépite
      s = stepOut(s).state; // l'autre sort sans or
      if (round < 3) s = act(s, { type: 'startNextRound' }).state;
    }
    expect(s.phase).toBe('finished');
    expect(s.roundResults).toHaveLength(3);
    expect(s.bigNuggetReserve).toBe(6);
    expect(s.dwarves.map((d) => d.bigNuggets)).toEqual([6, 0]);
    expect(s.finalResult?.winners).toEqual(['p1']);
  });
});
