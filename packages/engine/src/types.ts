/** Identifiant public d'un joueur (jamais secret). */
export type PlayerId = string;

/** Index d'un nain dans l'ordre de jeu (0 = premier nain du premier joueur assis). */
export type DwarfId = number;

/**
 * Types de cartes Extraction, nommés d'après leur aspect physique :
 * - `redDoor` : porte rouge, 2 pépites, 1 pas vers le dragon ;
 * - `blueDoor` : porte bleue, 1 pépite, 1 pas vers la Sortie ;
 * - `noDoor` : sans porte, 1 pépite, sur place ;
 * - `dragon` : déclenche le déplacement du dragon, jamais piochée par un joueur.
 */
export type ExtractionKind = 'redDoor' | 'blueDoor' | 'noDoor' | 'dragon';

export interface ExtractionCard {
  readonly id: string;
  readonly kind: ExtractionKind;
}

/** Actions imprimées sur les cartes Exit. */
export type ExitActionKind = 'step' | 'doubleStep' | 'allTogether' | 'swap' | 'goldBonus';

export interface ExitCard {
  readonly id: string;
  /** Une ou deux actions ; avec deux actions, le joueur en choisit une. */
  readonly actions: readonly ExitActionKind[];
}

export type TrackCardKind = 'exit' | 'mine' | 'wagon' | 'dragon';

export interface TrackCard {
  readonly id: string;
  readonly kind: TrackCardKind;
  /** Verso rouge : la carte a été dépassée par le dragon. */
  readonly burned: boolean;
}

export type DwarfStatus = 'mine' | 'exit' | 'eliminated';

/** Or non compté : cartes Extraction face cachée et cartes Bonus d'or gardées. */
export interface GoldPile {
  extraction: ExtractionCard[];
  bonus: ExitCard[];
}

export interface DwarfState {
  readonly id: DwarfId;
  readonly ownerId: PlayerId;
  /** Index de couleur (0 à 5), stable pour toute la partie. */
  readonly color: number;
  status: DwarfStatus;
  /** Index sur la piste : 0 = Sortie, 4 = Wagon, 8 = position initiale du dragon. */
  position: number;
  /** Or posé sur la carte Nain à l'arrivée à la Sortie (à l'abri du dragon). */
  secured: GoldPile;
  /** Grosses pépites posées sur la carte Nain (conservées d'une manche à l'autre). */
  bigNuggets: number;
}

export interface PlayerInfo {
  readonly id: PlayerId;
  readonly name: string;
}

export interface DeckComposition {
  /** Nombre de cartes Extraction par type. */
  readonly extraction: Readonly<Record<ExtractionKind, number>>;
  /** Cartes Exit : chaque entrée décrit un modèle de carte et son nombre d'exemplaires. */
  readonly exit: readonly { readonly actions: readonly ExitActionKind[]; readonly count: number }[];
}

export interface GameConfig {
  /** Joueurs dans le sens horaire. */
  readonly players: readonly PlayerInfo[];
  /** Variante « Double pioche » : 2 nains par joueur (2 joueurs uniquement). */
  readonly doubleDraw: boolean;
  readonly decks: DeckComposition;
}

export type Phase = 'playing' | 'roundEnd' | 'finished';

export type RoundEndCause = 'dragonReachedExit' | 'mineEmpty' | 'extractionDeckEmpty';

export type Pending =
  | {
      readonly kind: 'chooseExitAction';
      readonly dwarfId: DwarfId;
      readonly card: ExitCard;
      /** `feasible[i]` indique si l'action `card.actions[i]` est jouable. */
      readonly feasible: readonly boolean[];
    }
  | {
      readonly kind: 'chooseSwapTarget';
      readonly dwarfId: DwarfId;
      readonly card: ExitCard;
      readonly targets: readonly DwarfId[];
    };

export interface RoundRankingEntry {
  readonly dwarfId: DwarfId;
  readonly playerId: PlayerId;
  readonly extractionGold: number;
  readonly bonusCount: number;
  readonly total: number;
  /** 0 = emplacement le plus haut de l'échelle de la Sortie. */
  readonly ladderSlot: number;
  readonly bigNuggetsAwarded: number;
}

export interface RoundResult {
  readonly round: number;
  readonly cause: RoundEndCause;
  /** Nains arrivés à la Sortie, du plus riche au moins riche (égalité : échelle). */
  readonly ranking: readonly RoundRankingEntry[];
  readonly eliminated: readonly DwarfId[];
  /** Propriétaire du nain classé premier avec au moins 1 pépite, sinon `null`. */
  readonly winnerPlayerId: PlayerId | null;
}

export interface FinalStanding {
  readonly playerId: PlayerId;
  readonly extractionGold: number;
  readonly bonusGold: number;
  readonly bigNuggets: number;
  readonly total: number;
  /** Meilleur emplacement sur l'échelle en manche 3, `null` si aucun nain n'est sorti. */
  readonly bestLadderSlot: number | null;
  /** 1 = vainqueur ; des rangs égaux signalent une égalité non départagée. */
  readonly rank: number;
}

export interface FinalResult {
  readonly standings: readonly FinalStanding[];
  readonly winners: readonly PlayerId[];
}

export interface GameState {
  readonly config: GameConfig;
  phase: Phase;
  /** Manche en cours, de 1 à 3. */
  round: number;
  /** Premier joueur de la manche en cours. */
  roundFirstPlayer: PlayerId;
  /** Nombre de tours joués dans la manche en cours. */
  turn: number;
  track: TrackCard[];
  dragonPosition: number;
  /** Nains dans l'ordre de jeu ; `dwarves[i].id === i`. */
  dwarves: DwarfState[];
  currentDwarf: DwarfId | null;
  pending: Pending | null;
  /** Pioche Extraction, index 0 = carte visible du dessus. */
  extractionDeck: ExtractionCard[];
  /** Pioche Exit, index 0 = carte du dessus (cachée). */
  exitDeck: ExitCard[];
  /** Défausse Exit visible, dernier élément = carte du dessus. */
  exitDiscard: ExitCard[];
  /** Cartes rangées dans la boîte pendant la manche (dragons, or perdu). */
  box: { extraction: ExtractionCard[]; exit: ExitCard[] };
  /** Pile d'or en cours de chaque joueur (commune aux 2 nains dans la variante). */
  piles: Record<PlayerId, GoldPile>;
  /** Échelle de la Sortie : nains dans l'ordre d'arrivée (index 0 = le plus haut). */
  ladder: DwarfId[];
  bigNuggetReserve: number;
  roundResults: RoundResult[];
  finalResult: FinalResult | null;
}

/** Actions envoyées par un joueur (intentions). */
export type PlayerAction =
  | { readonly type: 'drawExtraction' }
  | { readonly type: 'drawExit' }
  | { readonly type: 'chooseExitAction'; readonly index: number }
  | { readonly type: 'chooseSwapTarget'; readonly dwarfId: DwarfId };

/** Actions acceptées par `reduce` : actions de joueur et actions système (serveur). */
export type GameAction =
  | (PlayerAction & { readonly playerId: PlayerId })
  | { readonly type: 'startNextRound' }
  | { readonly type: 'skipTurn' };

export type MoveCause = 'extraction' | 'step' | 'doubleStep' | 'allTogether' | 'swap';

export type EliminationCause = 'dragon' | 'stranded';

export type GameEvent =
  | { readonly type: 'RoundStarted'; readonly round: number; readonly firstPlayerId: PlayerId }
  | { readonly type: 'TurnStarted'; readonly dwarfId: DwarfId; readonly playerId: PlayerId }
  | {
      readonly type: 'CardDrawn';
      readonly deck: 'extraction';
      readonly dwarfId: DwarfId;
      readonly card: ExtractionKind;
      readonly gold: number;
    }
  | {
      readonly type: 'CardDrawn';
      readonly deck: 'exit';
      readonly dwarfId: DwarfId;
      /** Actions de la carte, `null` dans la vue des autres joueurs. */
      readonly card: readonly ExitActionKind[] | null;
    }
  | {
      readonly type: 'ExitActionPlayed';
      readonly dwarfId: DwarfId;
      readonly action: ExitActionKind;
      readonly cardActions: readonly ExitActionKind[];
    }
  | {
      readonly type: 'ExitCardWasted';
      readonly dwarfId: DwarfId;
      readonly cardActions: readonly ExitActionKind[];
    }
  | { readonly type: 'GoldBonusKept'; readonly dwarfId: DwarfId }
  | {
      readonly type: 'DwarfMoved';
      readonly dwarfId: DwarfId;
      readonly from: number;
      readonly to: number;
      readonly cause: MoveCause;
    }
  | { readonly type: 'DwarfMoveBlocked'; readonly dwarfId: DwarfId; readonly position: number }
  | {
      readonly type: 'DwarvesSwapped';
      readonly dwarfId: DwarfId;
      readonly targetId: DwarfId;
      readonly from: number;
      readonly to: number;
    }
  | { readonly type: 'DwarfExited'; readonly dwarfId: DwarfId; readonly ladderSlot: number }
  | {
      readonly type: 'DragonMoved';
      readonly from: number;
      readonly to: number;
      readonly burnedCardId: string;
    }
  | {
      readonly type: 'DwarfEliminated';
      readonly dwarfId: DwarfId;
      readonly position: number;
      readonly cause: EliminationCause;
      /** L'or en cours est perdu (faux si un équipier reste dans la mine, variante). */
      readonly pileLost: boolean;
    }
  | { readonly type: 'ExitDeckReshuffled'; readonly count: number }
  | { readonly type: 'TurnSkipped'; readonly dwarfId: DwarfId }
  | {
      readonly type: 'RoundEnded';
      readonly round: number;
      readonly cause: RoundEndCause;
      readonly result: RoundResult;
    }
  | {
      readonly type: 'BigNuggetsAwarded';
      readonly round: number;
      readonly awards: readonly {
        readonly dwarfId: DwarfId;
        readonly playerId: PlayerId;
        readonly count: number;
      }[];
    }
  | { readonly type: 'GameEnded'; readonly result: FinalResult };

export type ErrorCode =
  | 'INVALID_ACTION'
  | 'UNKNOWN_PLAYER'
  | 'GAME_OVER'
  | 'ROUND_OVER'
  | 'ROUND_NOT_OVER'
  | 'NOT_YOUR_TURN'
  | 'CHOICE_PENDING'
  | 'NO_CHOICE_PENDING'
  | 'INVALID_CHOICE'
  | 'ACTION_IMPOSSIBLE'
  | 'INVALID_SWAP_TARGET'
  | 'EXTRACTION_DECK_EMPTY'
  | 'EXIT_DECK_EMPTY';

export interface GameError {
  readonly code: ErrorCode;
  readonly message: string;
}

export type ReduceResult =
  | { readonly ok: true; readonly state: GameState; readonly events: GameEvent[] }
  | { readonly ok: false; readonly error: GameError };
