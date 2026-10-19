import { TOTAL_ROUNDS } from './constants';
import { activeDwarf, validatePlayerAction } from './legal';
import { pileValue } from './rules/cards';
import type {
  DeckComposition,
  DwarfId,
  DwarfStatus,
  ErrorCode,
  ExitActionKind,
  ExtractionKind,
  FinalResult,
  GameEvent,
  GameState,
  GoldPile,
  Phase,
  PlayerId,
  RoundResult,
  TrackCard,
} from './types';

/** Pile d'or vue par un joueur : la valeur n'est visible que par son propriétaire. */
export interface PileView {
  readonly cardCount: number;
  readonly bonusCount: number;
  /** Valeur en pépites (Bonus d'or compris), `null` pour les piles des adversaires. */
  readonly gold: number | null;
  /** Détail par type de carte, `null` pour les piles des adversaires. */
  readonly cards: Readonly<Partial<Record<ExtractionKind, number>>> | null;
}

export interface PlayerSummaryView {
  readonly id: PlayerId;
  readonly name: string;
  /** Place autour de la table (sens horaire). */
  readonly seat: number;
  readonly dwarfIds: readonly DwarfId[];
  readonly bigNuggets: number;
  /** Or en cours (commun aux 2 nains dans la variante). */
  readonly pile: PileView;
}

export interface DwarfView {
  readonly id: DwarfId;
  readonly ownerId: PlayerId;
  readonly color: number;
  readonly status: DwarfStatus;
  readonly position: number;
  /** Emplacement sur l'échelle de la Sortie (0 = le plus haut). */
  readonly ladderSlot: number | null;
  /** Or mis à l'abri sur la carte Nain. */
  readonly secured: PileView;
  readonly bigNuggets: number;
}

export interface Availability {
  readonly allowed: boolean;
  readonly reason: ErrorCode | null;
}

export interface ExitChoiceOption {
  readonly index: number;
  readonly action: ExitActionKind;
  readonly allowed: boolean;
  readonly reason: ErrorCode | null;
}

export type PendingView =
  | {
      readonly kind: 'chooseExitAction';
      readonly dwarfId: DwarfId;
      readonly playerId: PlayerId;
      /** Options de la carte, `null` pour les autres joueurs (carte cachée). */
      readonly options: readonly ExitChoiceOption[] | null;
    }
  | {
      readonly kind: 'chooseSwapTarget';
      readonly dwarfId: DwarfId;
      readonly playerId: PlayerId;
      readonly targets: readonly DwarfId[];
    };

export interface LegalActionsView {
  readonly yourTurn: boolean;
  readonly drawExtraction: Availability;
  readonly drawExit: Availability;
}

/**
 * Vue filtrée envoyée à un joueur. Construite par liste blanche : l'ordre des
 * pioches, les cartes Exit cachées et la valeur des piles adverses n'y figurent pas.
 */
export interface PlayerView {
  readonly viewerId: PlayerId | null;
  readonly phase: Phase;
  readonly round: number;
  readonly totalRounds: number;
  readonly turn: number;
  readonly doubleDraw: boolean;
  readonly players: readonly PlayerSummaryView[];
  readonly dwarves: readonly DwarfView[];
  readonly track: readonly TrackCard[];
  readonly dragonPosition: number;
  readonly extraction: {
    /** Carte visible du dessus (publique). */
    readonly top: ExtractionKind | null;
    readonly count: number;
  };
  readonly exit: {
    /** Seul le nombre de cartes de la pioche Exit est public. */
    readonly deckCount: number;
    /** Défausse visible, dernière carte = dessus. */
    readonly discard: readonly (readonly ExitActionKind[])[];
  };
  /** Contenu de la boîte (connu de tous) : composition des paquets. */
  readonly decks: DeckComposition;
  readonly bigNuggetReserve: number;
  readonly ladder: readonly DwarfId[];
  readonly roundFirstPlayerId: PlayerId;
  readonly currentDwarfId: DwarfId | null;
  readonly currentPlayerId: PlayerId | null;
  readonly pending: PendingView | null;
  readonly legal: LegalActionsView;
  readonly roundResults: readonly RoundResult[];
  readonly finalResult: FinalResult | null;
}

function countByKind(pile: GoldPile): Partial<Record<ExtractionKind, number>> {
  const counts: Partial<Record<ExtractionKind, number>> = {};
  for (const card of pile.extraction) counts[card.kind] = (counts[card.kind] ?? 0) + 1;
  return counts;
}

function pileView(pile: GoldPile, visible: boolean): PileView {
  return {
    cardCount: pile.extraction.length,
    bonusCount: pile.bonus.length,
    gold: visible ? pileValue(pile).total : null,
    cards: visible ? countByKind(pile) : null,
  };
}

function availability(error: { code: ErrorCode } | null): Availability {
  return error ? { allowed: false, reason: error.code } : { allowed: true, reason: null };
}

function pendingView(state: GameState, viewerId: PlayerId | null): PendingView | null {
  const pending = state.pending;
  if (!pending) return null;
  const dwarf = state.dwarves[pending.dwarfId];
  if (!dwarf) return null;
  if (pending.kind === 'chooseSwapTarget') {
    return {
      kind: 'chooseSwapTarget',
      dwarfId: dwarf.id,
      playerId: dwarf.ownerId,
      targets: [...pending.targets],
    };
  }
  const isOwner = viewerId === dwarf.ownerId;
  return {
    kind: 'chooseExitAction',
    dwarfId: dwarf.id,
    playerId: dwarf.ownerId,
    options: isOwner
      ? pending.card.actions.map((action, index) => ({
          index,
          action,
          allowed: pending.feasible[index] ?? false,
          reason: pending.feasible[index] ? null : 'ACTION_IMPOSSIBLE',
        }))
      : null,
  };
}

/** Vue d'un joueur (ou d'un spectateur avec `null`) sur l'état de la partie. */
export function viewFor(state: GameState, viewerId: PlayerId | null): PlayerView {
  const current = activeDwarf(state);
  const isPlayer = viewerId !== null && state.config.players.some((p) => p.id === viewerId);
  const yourTurn = isPlayer && state.phase === 'playing' && current?.ownerId === viewerId;
  const notPlaying = { allowed: false, reason: 'NOT_YOUR_TURN' as ErrorCode };
  return {
    viewerId,
    phase: state.phase,
    round: state.round,
    totalRounds: TOTAL_ROUNDS,
    turn: state.turn,
    doubleDraw: state.config.doubleDraw,
    players: state.config.players.map((player, seat) => {
      const dwarves = state.dwarves.filter((d) => d.ownerId === player.id);
      return {
        id: player.id,
        name: player.name,
        seat,
        dwarfIds: dwarves.map((d) => d.id),
        bigNuggets: dwarves.reduce((sum, d) => sum + d.bigNuggets, 0),
        pile: pileView(
          state.piles[player.id] ?? { extraction: [], bonus: [] },
          player.id === viewerId,
        ),
      };
    }),
    dwarves: state.dwarves.map((dwarf) => {
      const slot = state.ladder.indexOf(dwarf.id);
      return {
        id: dwarf.id,
        ownerId: dwarf.ownerId,
        color: dwarf.color,
        status: dwarf.status,
        position: dwarf.position,
        ladderSlot: slot >= 0 ? slot : null,
        secured: pileView(dwarf.secured, dwarf.ownerId === viewerId),
        bigNuggets: dwarf.bigNuggets,
      };
    }),
    track: state.track.map((card) => ({ id: card.id, kind: card.kind, burned: card.burned })),
    dragonPosition: state.dragonPosition,
    extraction: {
      top: state.phase === 'playing' ? (state.extractionDeck[0]?.kind ?? null) : null,
      count: state.extractionDeck.length,
    },
    exit: {
      deckCount: state.exitDeck.length,
      discard: state.exitDiscard.map((card) => [...card.actions]),
    },
    decks: state.config.decks,
    bigNuggetReserve: state.bigNuggetReserve,
    ladder: [...state.ladder],
    roundFirstPlayerId: state.roundFirstPlayer,
    currentDwarfId: state.phase === 'playing' ? state.currentDwarf : null,
    currentPlayerId: state.phase === 'playing' ? (current?.ownerId ?? null) : null,
    pending: pendingView(state, viewerId),
    legal: {
      yourTurn,
      drawExtraction: isPlayer
        ? availability(validatePlayerAction(state, viewerId, { type: 'drawExtraction' }))
        : notPlaying,
      drawExit: isPlayer
        ? availability(validatePlayerAction(state, viewerId, { type: 'drawExit' }))
        : notPlaying,
    },
    roundResults: state.roundResults,
    finalResult: state.finalResult,
  };
}

/** Filtre les événements pour un joueur : une carte Exit piochée n'est visible que de son auteur. */
export function filterEventsFor(
  events: readonly GameEvent[],
  state: GameState,
  viewerId: PlayerId | null,
): GameEvent[] {
  return events.map((event) => {
    if (event.type === 'CardDrawn' && event.deck === 'exit') {
      const owner = state.dwarves[event.dwarfId]?.ownerId;
      return owner === viewerId ? event : { ...event, card: null };
    }
    return event;
  });
}
