import { describe, expect, it } from 'vitest';
import {
  BIG_NUGGETS_TOTAL,
  DEFAULT_DECKS,
  DRAGON_MOVES_TO_EXIT,
  EXIT_DECK_SIZE,
  EXTRACTION_DECK_SIZE,
  GameSetupError,
  WAGON_POSITION,
  buildExitCards,
  buildExtractionCards,
  createGame,
  createSeededRng,
  exitDeckSize,
  extractionDeckSize,
  validateDecks,
  validateSetup,
} from '../src';
import { shuffleUntilGoldOnTop } from '../src/setup';
import { makePlayers, newGame } from './helpers';

describe('composition des paquets', () => {
  it('compte 58 cartes Extraction et 16 cartes Exit', () => {
    expect(extractionDeckSize(DEFAULT_DECKS)).toBe(EXTRACTION_DECK_SIZE);
    expect(exitDeckSize(DEFAULT_DECKS)).toBe(EXIT_DECK_SIZE);
    expect(buildExtractionCards(DEFAULT_DECKS)).toHaveLength(58);
    expect(buildExitCards(DEFAULT_DECKS)).toHaveLength(16);
  });

  it('contient assez de dragons pour atteindre la Sortie', () => {
    expect(DEFAULT_DECKS.extraction.dragon).toBeGreaterThanOrEqual(DRAGON_MOVES_TO_EXIT);
  });

  it('donne des identifiants uniques aux cartes', () => {
    const ids = [...buildExtractionCards(DEFAULT_DECKS), ...buildExitCards(DEFAULT_DECKS)].map(
      (c) => c.id,
    );
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('refuse une composition inutilisable', () => {
    expect(validateDecks(DEFAULT_DECKS)).toEqual([]);
    expect(
      validateDecks({ extraction: { dragon: 5, redDoor: 0, blueDoor: 0, noDoor: 0 }, exit: [] }),
    ).toHaveLength(2);
    expect(
      validateDecks({
        extraction: { dragon: -1, redDoor: 1.5, blueDoor: 1, noDoor: 1 },
        exit: [{ actions: ['step', 'swap', 'goldBonus'], count: -2 }],
      }).length,
    ).toBeGreaterThanOrEqual(4);
  });
});

describe('mise en place', () => {
  it('place la piste, les nains sur le Wagon et une carte avec de l’or sur le dessus', () => {
    const { state, events } = newGame({ players: 4, firstPlayerId: 'p3' });
    expect(state.track.map((c) => c.kind)).toEqual([
      'exit',
      'mine',
      'mine',
      'mine',
      'wagon',
      'mine',
      'mine',
      'mine',
      'dragon',
    ]);
    expect(state.track.every((c) => !c.burned)).toBe(true);
    expect(state.dragonPosition).toBe(8);
    expect(state.dwarves).toHaveLength(4);
    expect(state.dwarves.every((d) => d.status === 'mine' && d.position === WAGON_POSITION)).toBe(
      true,
    );
    expect(state.extractionDeck).toHaveLength(58);
    expect(state.extractionDeck[0]?.kind).not.toBe('dragon');
    expect(state.exitDeck).toHaveLength(16);
    expect(state.exitDiscard).toEqual([]);
    expect(state.bigNuggetReserve).toBe(BIG_NUGGETS_TOTAL);
    expect(state.round).toBe(1);
    expect(state.phase).toBe('playing');
    expect(state.currentDwarf).toBe(2);
    expect(events).toEqual([
      { type: 'RoundStarted', round: 1, firstPlayerId: 'p3' },
      { type: 'TurnStarted', dwarfId: 2, playerId: 'p3' },
    ]);
  });

  it('remélange tant que la première carte Extraction est un dragon', () => {
    const cards = buildExtractionCards({
      extraction: { dragon: 40, redDoor: 1, blueDoor: 0, noDoor: 0 },
      exit: [],
    });
    for (let seed = 0; seed < 50; seed++) {
      const deck = shuffleUntilGoldOnTop(cards, createSeededRng(seed));
      expect(deck[0]?.kind).toBe('redDoor');
      expect(deck).toHaveLength(41);
    }
    const onlyDragons = buildExtractionCards({
      extraction: { dragon: 3, redDoor: 0, blueDoor: 0, noDoor: 0 },
      exit: [],
    });
    expect(() => shuffleUntilGoldOnTop(onlyDragons, createSeededRng(1))).toThrow(GameSetupError);
  });

  it('valide le nombre de joueurs, le premier joueur et la variante', () => {
    const rng = createSeededRng(1);
    expect(() => createGame({ players: makePlayers(1), firstPlayerId: 'p1' }, rng)).toThrow(
      GameSetupError,
    );
    expect(() => createGame({ players: makePlayers(7), firstPlayerId: 'p1' }, rng)).toThrow(
      GameSetupError,
    );
    expect(validateSetup({ players: makePlayers(3), firstPlayerId: 'x' })).toHaveLength(1);
    expect(
      validateSetup({ players: makePlayers(3), firstPlayerId: 'p1', doubleDraw: true }),
    ).toHaveLength(1);
    expect(
      validateSetup({
        players: [
          { id: 'a', name: 'A' },
          { id: 'a', name: 'B' },
        ],
        firstPlayerId: 'a',
      }),
    ).toHaveLength(1);
    expect(validateSetup({ players: makePlayers(6), firstPlayerId: 'p6' })).toEqual([]);
  });

  it('crée 2 nains par joueur dans la variante à 2 joueurs', () => {
    const { state } = newGame({ players: 2, doubleDraw: true, firstPlayerId: 'p2' });
    expect(state.dwarves.map((d) => d.ownerId)).toEqual(['p1', 'p1', 'p2', 'p2']);
    expect(state.currentDwarf).toBe(2);
  });
});
