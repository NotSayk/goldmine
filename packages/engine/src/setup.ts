import { DEFAULT_DECKS, EXTRACTION_KINDS, validateDecks } from './config/decks';
import {
  DOUBLE_DRAW_DWARVES_PER_PLAYER,
  DRAGON_START_POSITION,
  MAX_DWARVES,
  MAX_PLAYERS,
  MIN_PLAYERS,
  BIG_NUGGETS_TOTAL,
  WAGON_POSITION,
} from './constants';
import { emptyPile } from './rules/cards';
import { shuffle, type Rng } from './rng';
import type {
  DeckComposition,
  DwarfState,
  ExitCard,
  ExtractionCard,
  GameEvent,
  GameState,
  PlayerId,
  PlayerInfo,
  TrackCard,
} from './types';

export interface GameSetup {
  /** Joueurs dans le sens horaire. */
  readonly players: readonly PlayerInfo[];
  /** Premier joueur de la manche 1 (le plus jeune selon le livret). */
  readonly firstPlayerId: PlayerId;
  /** Variante « Double pioche » (2 joueurs uniquement). */
  readonly doubleDraw?: boolean;
  /** Composition des paquets ; par défaut la composition provisoire. */
  readonly decks?: DeckComposition;
}

export class GameSetupError extends Error {
  constructor(readonly problems: readonly string[]) {
    super(problems.join(' '));
    this.name = 'GameSetupError';
  }
}

export function validateSetup(setup: GameSetup): string[] {
  const problems: string[] = [];
  const count = setup.players.length;
  if (count < MIN_PLAYERS || count > MAX_PLAYERS) {
    problems.push(`Il faut entre ${MIN_PLAYERS} et ${MAX_PLAYERS} joueurs (reçu : ${count}).`);
  }
  const ids = new Set(setup.players.map((p) => p.id));
  if (ids.size !== count) problems.push('Les identifiants de joueurs doivent être uniques.');
  if (!ids.has(setup.firstPlayerId))
    problems.push('Le premier joueur doit faire partie de la partie.');
  if (setup.doubleDraw && count !== 2) {
    problems.push('La variante « Double pioche » se joue uniquement à 2 joueurs.');
  }
  const dwarfCount = count * (setup.doubleDraw ? DOUBLE_DRAW_DWARVES_PER_PLAYER : 1);
  if (dwarfCount > MAX_DWARVES) problems.push(`Au plus ${MAX_DWARVES} nains en jeu.`);
  problems.push(...validateDecks(setup.decks ?? DEFAULT_DECKS));
  return problems;
}

export function buildExtractionCards(decks: DeckComposition): ExtractionCard[] {
  const cards: ExtractionCard[] = [];
  for (const kind of EXTRACTION_KINDS) {
    for (let i = 0; i < decks.extraction[kind]; i++) {
      cards.push({ id: `X${String(cards.length + 1).padStart(2, '0')}`, kind });
    }
  }
  return cards;
}

export function buildExitCards(decks: DeckComposition): ExitCard[] {
  const cards: ExitCard[] = [];
  for (const entry of decks.exit) {
    for (let i = 0; i < entry.count; i++) {
      cards.push({
        id: `E${String(cards.length + 1).padStart(2, '0')}`,
        actions: [...entry.actions],
      });
    }
  }
  return cards;
}

/** Piste de départ : Sortie à gauche, Wagon au milieu, dragon à droite, Mines côté bleu. */
export function buildTrack(): TrackCard[] {
  const mine = (n: number): TrackCard => ({ id: `mine-${n}`, kind: 'mine', burned: false });
  return [
    { id: 'exit', kind: 'exit', burned: false },
    mine(1),
    mine(2),
    mine(3),
    { id: 'wagon', kind: 'wagon', burned: false },
    mine(4),
    mine(5),
    mine(6),
    { id: 'dragon', kind: 'dragon', burned: false },
  ];
}

/** Mélange, puis remélange tant que la carte visible est un dragon (mise en place, étape 2). */
export function shuffleUntilGoldOnTop(
  cards: readonly ExtractionCard[],
  rng: Rng,
): ExtractionCard[] {
  if (!cards.some((card) => card.kind !== 'dragon')) {
    throw new GameSetupError(['La pioche Extraction ne contient aucune carte avec de l’or.']);
  }
  let deck = shuffle(cards, rng);
  while (deck[0]?.kind === 'dragon') deck = shuffle(cards, rng);
  return deck;
}

function firstDwarfOf(state: GameState, playerId: PlayerId): DwarfState {
  const dwarf = state.dwarves.find((d) => d.ownerId === playerId);
  if (!dwarf) throw new Error(`Aucun nain pour le joueur ${playerId}.`);
  return dwarf;
}

/** Mise en place d'une manche (cartes remélangées, nains sur le Wagon). Modifie `state`. */
export function startRound(
  state: GameState,
  round: number,
  firstPlayerId: PlayerId,
  rng: Rng,
  events: GameEvent[],
): void {
  const { decks } = state.config;
  state.phase = 'playing';
  state.round = round;
  state.roundFirstPlayer = firstPlayerId;
  state.turn = 1;
  state.track = buildTrack();
  state.dragonPosition = DRAGON_START_POSITION;
  state.extractionDeck = shuffleUntilGoldOnTop(buildExtractionCards(decks), rng);
  state.exitDeck = shuffle(buildExitCards(decks), rng);
  state.exitDiscard = [];
  state.box = { extraction: [], exit: [] };
  state.piles = Object.fromEntries(state.config.players.map((p) => [p.id, emptyPile()]));
  for (const dwarf of state.dwarves) {
    dwarf.status = 'mine';
    dwarf.position = WAGON_POSITION;
    dwarf.secured = emptyPile();
  }
  state.ladder = [];
  state.pending = null;
  const first = firstDwarfOf(state, firstPlayerId);
  state.currentDwarf = first.id;
  events.push({ type: 'RoundStarted', round, firstPlayerId });
  events.push({ type: 'TurnStarted', dwarfId: first.id, playerId: first.ownerId });
}

/** Crée une partie et met en place la manche 1. */
export function createGame(setup: GameSetup, rng: Rng): { state: GameState; events: GameEvent[] } {
  const problems = validateSetup(setup);
  if (problems.length > 0) throw new GameSetupError(problems);
  const doubleDraw = setup.doubleDraw ?? false;
  const perPlayer = doubleDraw ? DOUBLE_DRAW_DWARVES_PER_PLAYER : 1;
  const dwarves: DwarfState[] = [];
  for (const player of setup.players) {
    for (let i = 0; i < perPlayer; i++) {
      dwarves.push({
        id: dwarves.length,
        ownerId: player.id,
        color: dwarves.length,
        status: 'mine',
        position: WAGON_POSITION,
        secured: emptyPile(),
        bigNuggets: 0,
      });
    }
  }
  const state: GameState = {
    config: {
      players: setup.players.map((p) => ({ id: p.id, name: p.name })),
      doubleDraw,
      decks: setup.decks ?? DEFAULT_DECKS,
    },
    phase: 'playing',
    round: 1,
    roundFirstPlayer: setup.firstPlayerId,
    turn: 1,
    track: buildTrack(),
    dragonPosition: DRAGON_START_POSITION,
    dwarves,
    currentDwarf: null,
    pending: null,
    extractionDeck: [],
    exitDeck: [],
    exitDiscard: [],
    box: { extraction: [], exit: [] },
    piles: {},
    ladder: [],
    bigNuggetReserve: BIG_NUGGETS_TOTAL,
    roundResults: [],
    finalResult: null,
  };
  const events: GameEvent[] = [];
  startRound(state, 1, setup.firstPlayerId, rng, events);
  return { state, events };
}
