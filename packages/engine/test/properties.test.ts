import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  BIG_NUGGETS_TOTAL,
  MAX_DWARVES,
  createGame,
  createSeededRng,
  heuristicBot,
  houseRules,
  randomBot,
  reduce,
  viewFor,
  type BotPolicy,
  type GameAction,
  type GameState,
} from '../src';
import { DUAL_ACTION_DECKS, allCardIds, makePlayers } from './helpers';

const EXTRACTION_IDS = Array.from({ length: 58 }, (_, i) => `X${String(i + 1).padStart(2, '0')}`);
const EXIT_IDS = Array.from({ length: 16 }, (_, i) => `E${String(i + 1).padStart(2, '0')}`);

function checkInvariants(state: GameState): void {
  const ids = allCardIds(state);
  // Conservation : aucune carte perdue ni dupliquée.
  expect([...ids.extraction].sort()).toEqual(EXTRACTION_IDS);
  expect([...ids.exit].sort()).toEqual(EXIT_IDS);
  // Grosses pépites : réserve + distribuées = 12.
  const awarded = state.dwarves.reduce((sum, d) => sum + d.bigNuggets, 0);
  expect(awarded + state.bigNuggetReserve).toBe(BIG_NUGGETS_TOTAL);
  expect(state.bigNuggetReserve).toBeGreaterThanOrEqual(0);
  expect(state.dwarves.length).toBeLessThanOrEqual(MAX_DWARVES);
  expect(state.ladder.length).toBeLessThanOrEqual(state.dwarves.length);
  for (const dwarf of state.dwarves) {
    if (dwarf.status === 'mine') {
      expect(dwarf.position).toBeGreaterThan(0);
      expect(dwarf.position).toBeLessThan(state.dragonPosition);
    }
    if (dwarf.status === 'exit') expect(state.ladder).toContain(dwarf.id);
  }
  expect(state.track[state.dragonPosition]?.kind).toBe('dragon');
  if (state.phase === 'playing') {
    expect(state.extractionDeck[0]?.kind).not.toBe('dragon');
    expect(state.dwarves[state.currentDwarf ?? -1]?.status).toBe('mine');
  }
}

/** Vérifie qu'aucune information cachée ne sort de la vue d'un joueur. */
function checkView(state: GameState, viewerId: string): void {
  const view = viewFor(state, viewerId);
  const json = JSON.stringify(view);
  for (const card of [...state.exitDeck, ...state.extractionDeck]) {
    expect(json).not.toContain(`"${card.id}"`);
  }
  if (!houseRules.pileValuesArePublic()) {
    for (const player of view.players) {
      if (player.id !== viewerId) expect(player.pile.gold).toBeNull();
    }
    for (const dwarf of view.dwarves) {
      if (dwarf.ownerId !== viewerId) expect(dwarf.secured.gold).toBeNull();
    }
  }
  if (view.pending?.kind === 'chooseExitAction' && view.pending.playerId !== viewerId) {
    expect(view.pending.options).toBeNull();
  }
}

interface RunOptions {
  players: number;
  doubleDraw: boolean;
  seed: number;
  policy: BotPolicy;
  dual: boolean;
  checkEveryStep: boolean;
}

function runGame(options: RunOptions): { state: GameState; actions: GameAction[] } {
  const rng = createSeededRng(options.seed);
  const botRng = createSeededRng(options.seed + 1);
  const players = makePlayers(options.players);
  let state = createGame(
    {
      players,
      firstPlayerId: players[options.seed % players.length]!.id,
      doubleDraw: options.doubleDraw,
      ...(options.dual ? { decks: DUAL_ACTION_DECKS } : {}),
    },
    rng,
  ).state;
  const actions: GameAction[] = [];
  let steps = 0;
  while (state.phase !== 'finished') {
    steps += 1;
    if (steps > 5_000) throw new Error('La partie ne se termine pas.');
    let action: GameAction;
    if (state.phase === 'roundEnd') {
      action = { type: 'startNextRound' };
    } else {
      const owner = state.dwarves[state.currentDwarf!]!.ownerId;
      const intent = options.policy(viewFor(state, owner), botRng);
      if (!intent) throw new Error('Le bot n’a rien proposé.');
      action = { ...intent, playerId: owner };
    }
    const result = reduce(state, action, rng);
    if (!result.ok) throw new Error(result.error.code);
    actions.push(action);
    state = result.state;
    if (options.checkEveryStep) {
      checkInvariants(state);
      checkView(state, players[steps % players.length]!.id);
    }
  }
  checkInvariants(state);
  return { state, actions };
}

const arbitraryGame = fc.record({
  players: fc.integer({ min: 2, max: 6 }),
  doubleDraw: fc.boolean(),
  seed: fc.integer({ min: 0, max: 1_000_000 }),
  policy: fc.constantFrom(randomBot, heuristicBot),
  dual: fc.boolean(),
});

describe('propriétés (fast-check)', () => {
  it('conservation des cartes, Grosses pépites, nains et vues à chaque action', () => {
    fc.assert(
      fc.property(arbitraryGame, (game) => {
        runGame({
          ...game,
          doubleDraw: game.doubleDraw && game.players === 2,
          checkEveryStep: true,
        });
      }),
      { numRuns: 60 },
    );
  });

  it('la partie se termine toujours avec au moins un vainqueur', () => {
    fc.assert(
      fc.property(arbitraryGame, (game) => {
        const { state } = runGame({
          ...game,
          doubleDraw: game.doubleDraw && game.players === 2,
          checkEveryStep: false,
        });
        expect(state.phase).toBe('finished');
        expect(state.roundResults).toHaveLength(3);
        expect(state.finalResult!.winners.length).toBeGreaterThan(0);
      }),
      { numRuns: 300 },
    );
  });

  it('l’ordre des pioches est fixé à l’avance : aucune carte n’est tirée au hasard en pioche', () => {
    const ids = (cards: readonly { id: string }[]): string[] => cards.map((c) => c.id);
    const isSuffix = (deck: string[], order: string[]): boolean =>
      deck.every((id, i) => order[order.length - deck.length + i] === id);
    fc.assert(
      fc.property(arbitraryGame, (game) => {
        const rng = createSeededRng(game.seed);
        const botRng = createSeededRng(game.seed + 1);
        const players = makePlayers(game.players);
        let state = createGame(
          {
            players,
            firstPlayerId: 'p1',
            doubleDraw: game.doubleDraw && game.players === 2,
            ...(game.dual ? { decks: DUAL_ACTION_DECKS } : {}),
          },
          rng,
        ).state;
        // Ordre complet décidé à la mise en place (puis à chaque remélange de la défausse).
        let extractionOrder = ids(state.extractionDeck);
        let exitOrder = ids(state.exitDeck);
        while (state.phase !== 'finished') {
          let action: GameAction = { type: 'startNextRound' };
          if (state.phase === 'playing') {
            const owner = state.dwarves[state.currentDwarf!]!.ownerId;
            action = { ...game.policy(viewFor(state, owner), botRng)!, playerId: owner };
          }
          const result = reduce(state, action, rng);
          if (!result.ok) throw new Error(result.error.code);
          state = result.state;
          const types = result.events.map((e) => e.type);
          if (types.includes('RoundStarted')) {
            extractionOrder = ids(state.extractionDeck);
            exitOrder = ids(state.exitDeck);
          } else if (types.includes('ExitDeckReshuffled')) {
            exitOrder = ids(state.exitDeck);
          }
          // Les cartes ne sortent que par le dessus, dans l'ordre décidé à l'avance.
          expect(isSuffix(ids(state.extractionDeck), extractionOrder)).toBe(true);
          expect(isSuffix(ids(state.exitDeck), exitOrder)).toBe(true);
          if (state.phase === 'playing' && state.exitDeck.length === 0) {
            expect(state.exitDiscard).toHaveLength(0);
          }
        }
      }),
      { numRuns: 80 },
    );
  });

  it('rejouabilité : même graine + mêmes actions = même état final', () => {
    fc.assert(
      fc.property(arbitraryGame, (game) => {
        const options = {
          ...game,
          doubleDraw: game.doubleDraw && game.players === 2,
          checkEveryStep: false,
        };
        const { state: original, actions } = runGame(options);
        const players = makePlayers(game.players);
        const rng = createSeededRng(game.seed);
        let replayed = createGame(
          {
            players,
            firstPlayerId: players[game.seed % players.length]!.id,
            doubleDraw: options.doubleDraw,
            ...(game.dual ? { decks: DUAL_ACTION_DECKS } : {}),
          },
          rng,
        ).state;
        for (const action of actions) {
          const result = reduce(replayed, action, rng);
          if (!result.ok) throw new Error(result.error.code);
          replayed = result.state;
        }
        expect(replayed).toEqual(original);
      }),
      { numRuns: 40 },
    );
  });
});
