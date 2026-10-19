import { describe, expect, it } from 'vitest';
import { createSeededRng, reduce, type GameAction, type GameState } from '../src';
import { newGame, play, stackExit } from './helpers';

function expectRejected(state: GameState, action: GameAction, code: string): void {
  const snapshot = structuredClone(state);
  const rng = createSeededRng('validation');
  const before = rng.snapshot();
  const result = reduce(state, action, rng);
  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.error.code).toBe(code);
    expect(result.error.message.length).toBeGreaterThan(0);
  }
  expect(state).toEqual(snapshot);
  expect(rng.snapshot()).toEqual(before);
}

describe('actions illégales : rejetées sans modifier l’état', () => {
  it('hors de son tour', () => {
    const { state } = newGame();
    expectRejected(state, { type: 'drawExtraction', playerId: 'p2' }, 'NOT_YOUR_TURN');
    expectRejected(state, { type: 'drawExit', playerId: 'p3' }, 'NOT_YOUR_TURN');
  });

  it('joueur inconnu ou action mal formée', () => {
    const { state } = newGame();
    expectRejected(state, { type: 'drawExtraction', playerId: 'intrus' }, 'UNKNOWN_PLAYER');
    expectRejected(state, { type: 'voler' } as unknown as GameAction, 'INVALID_ACTION');
    expectRejected(state, null as unknown as GameAction, 'INVALID_ACTION');
    expectRejected(
      state,
      { type: 'drawExit', playerId: 42 } as unknown as GameAction,
      'UNKNOWN_PLAYER',
    );
  });

  it('choix sans carte en attente, cible invalide', () => {
    const { state } = newGame();
    expectRejected(
      state,
      { type: 'chooseExitAction', index: 0, playerId: 'p1' },
      'NO_CHOICE_PENDING',
    );
    expectRejected(
      state,
      { type: 'chooseSwapTarget', dwarfId: 1, playerId: 'p1' },
      'NO_CHOICE_PENDING',
    );
    stackExit(state, [['swap']]);
    const pending = play(state, { type: 'drawExit' }).state;
    expectRejected(
      pending,
      { type: 'chooseSwapTarget', dwarfId: 0, playerId: 'p1' },
      'INVALID_SWAP_TARGET',
    );
    expectRejected(
      pending,
      { type: 'chooseSwapTarget', dwarfId: 9, playerId: 'p1' },
      'INVALID_SWAP_TARGET',
    );
    expectRejected(pending, { type: 'drawExit', playerId: 'p1' }, 'CHOICE_PENDING');
    expectRejected(
      pending,
      { type: 'chooseExitAction', index: 0, playerId: 'p1' },
      'NO_CHOICE_PENDING',
    );
  });

  it('manche suivante pendant une manche, pioches vides', () => {
    const { state } = newGame();
    expectRejected(state, { type: 'startNextRound' }, 'ROUND_NOT_OVER');
    const empty = structuredClone(state);
    empty.exitDeck = [];
    empty.exitDiscard = [];
    expectRejected(empty, { type: 'drawExit', playerId: 'p1' }, 'EXIT_DECK_EMPTY');
    empty.extractionDeck = [];
    expectRejected(empty, { type: 'drawExtraction', playerId: 'p1' }, 'EXTRACTION_DECK_EMPTY');
  });

  it('actions de joueur entre deux manches', () => {
    const { state } = newGame();
    const ended = { ...structuredClone(state), phase: 'roundEnd' as const };
    expectRejected(ended, { type: 'drawExtraction', playerId: 'p1' }, 'ROUND_OVER');
    expectRejected(ended, { type: 'skipTurn' }, 'ROUND_OVER');
  });
});

describe('passer un tour (action système)', () => {
  it('passe au nain suivant et défausse une carte en attente', () => {
    const { state, rng } = newGame();
    stackExit(state, [['swap']]);
    const pending = play(state, { type: 'drawExit' }).state;
    const result = reduce(pending, { type: 'skipTurn' }, rng);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.pending).toBeNull();
    expect(result.state.exitDiscard).toHaveLength(1);
    expect(result.state.currentDwarf).toBe(1);
    expect(result.events.map((e) => e.type)).toEqual(['TurnSkipped', 'TurnStarted']);
  });
});
