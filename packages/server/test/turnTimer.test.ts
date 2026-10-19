import { describe, expect, it } from 'vitest';
import {
  createGame,
  createSeededRng,
  reduce,
  type DeckComposition,
  type Rng,
} from '@pepite/engine';
import { pickTimeoutMove } from '../src/turnTimer';

const players = [
  { id: 'a', name: 'Alice' },
  { id: 'b', name: 'Bruno' },
  { id: 'c', name: 'Chloé' },
];

/** Générateur qui rend toujours la même valeur (pile si < 0,5). */
const fixed = (value: number): Rng => ({ next: () => value });

const DUAL: DeckComposition = {
  extraction: { dragon: 8, redDoor: 20, blueDoor: 20, noDoor: 10 },
  exit: [{ actions: ['doubleStep', 'swap'], count: 16 }],
};

describe('coup joué quand le temps est écoulé', () => {
  it('pile : Creuser, face : Fuir', () => {
    const { state } = createGame({ players, firstPlayerId: 'b' }, createSeededRng(1));
    expect(pickTimeoutMove(state, fixed(0.1))).toEqual({
      action: { type: 'drawExtraction', playerId: 'b' },
      autoPlay: {
        kind: 'draw',
        dwarfId: 1,
        playerId: 'b',
        result: 'drawExtraction',
        coin: 'heads',
      },
    });
    expect(pickTimeoutMove(state, fixed(0.9))?.autoPlay).toMatchObject({
      result: 'drawExit',
      coin: 'tails',
    });
  });

  it('sans tirage quand une seule option est possible', () => {
    const { state } = createGame({ players, firstPlayerId: 'a' }, createSeededRng(2));
    state.exitDeck = [];
    state.exitDiscard = [];
    expect(pickTimeoutMove(state, fixed(0.9))?.autoPlay).toMatchObject({
      result: 'drawExtraction',
      coin: null,
    });
  });

  it('carte Exit à deux actions : pile ou face entre les deux', () => {
    const { state } = createGame({ players, firstPlayerId: 'a', decks: DUAL }, createSeededRng(3));
    const drawn = reduce(state, { type: 'drawExit', playerId: 'a' }, createSeededRng(4));
    if (!drawn.ok) throw new Error(drawn.error.code);
    expect(drawn.state.pending?.kind).toBe('chooseExitAction');
    const move = pickTimeoutMove(drawn.state, fixed(0.9));
    expect(move?.action).toEqual({ type: 'chooseExitAction', index: 1, playerId: 'a' });
    expect(move?.autoPlay).toMatchObject({
      kind: 'exitAction',
      options: ['doubleStep', 'swap'],
      result: 'swap',
      coin: 'tails',
    });
    // Puis l'échange : cible tirée au hasard parmi les nains possibles.
    const chosen = reduce(drawn.state, move!.action, createSeededRng(5));
    if (!chosen.ok) throw new Error(chosen.error.code);
    const swap = pickTimeoutMove(chosen.state, fixed(0.99));
    expect(swap?.autoPlay).toEqual({ kind: 'swapTarget', dwarfId: 0, playerId: 'a', targetId: 2 });
  });

  it('rien à jouer entre deux manches', () => {
    const { state } = createGame({ players, firstPlayerId: 'a' }, createSeededRng(6));
    expect(pickTimeoutMove({ ...state, phase: 'roundEnd' }, fixed(0.5))).toBeNull();
  });
});
