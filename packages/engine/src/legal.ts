import type {
  DwarfState,
  ErrorCode,
  GameAction,
  GameError,
  GameState,
  PlayerAction,
  PlayerId,
} from './types';

const MESSAGES: Record<ErrorCode, string> = {
  INVALID_ACTION: 'Action inconnue ou mal formée.',
  UNKNOWN_PLAYER: 'Ce joueur ne participe pas à la partie.',
  GAME_OVER: 'La partie est terminée.',
  ROUND_OVER: 'La manche est terminée.',
  ROUND_NOT_OVER: 'La manche est encore en cours.',
  NOT_YOUR_TURN: 'Ce n’est pas votre tour.',
  CHOICE_PENDING: 'Terminez d’abord le choix en cours.',
  NO_CHOICE_PENDING: 'Aucun choix n’est attendu.',
  INVALID_CHOICE: 'Ce choix n’existe pas sur la carte.',
  ACTION_IMPOSSIBLE: 'Cette action est impossible pour le moment.',
  INVALID_SWAP_TARGET: 'Ce nain ne peut pas être ciblé par l’échange.',
  EXTRACTION_DECK_EMPTY: 'La pioche Extraction est vide.',
  EXIT_DECK_EMPTY: 'Plus aucune carte Exit à piocher (pioche et défausse vides).',
};

export function gameError(code: ErrorCode, message: string = MESSAGES[code]): GameError {
  return { code, message };
}

export function activeDwarf(state: GameState): DwarfState | null {
  return state.currentDwarf === null ? null : (state.dwarves[state.currentDwarf] ?? null);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Valide l'intention d'un joueur sans modifier l'état ; `null` si elle est légale. */
export function validatePlayerAction(
  state: GameState,
  playerId: PlayerId,
  action: PlayerAction,
): GameError | null {
  if (!state.config.players.some((p) => p.id === playerId)) return gameError('UNKNOWN_PLAYER');
  if (state.phase === 'finished') return gameError('GAME_OVER');
  if (state.phase !== 'playing') return gameError('ROUND_OVER');
  const dwarf = activeDwarf(state);
  if (!dwarf || dwarf.ownerId !== playerId) return gameError('NOT_YOUR_TURN');
  const pending = state.pending;
  switch (action.type) {
    case 'drawExtraction':
      if (pending) return gameError('CHOICE_PENDING');
      if (state.extractionDeck.length === 0) return gameError('EXTRACTION_DECK_EMPTY');
      return null;
    case 'drawExit':
      if (pending) return gameError('CHOICE_PENDING');
      // La défausse est remélangée dès que la pioche se vide : pioche vide = défausse vide.
      if (state.exitDeck.length === 0) return gameError('EXIT_DECK_EMPTY');
      return null;
    case 'chooseExitAction':
      if (pending?.kind !== 'chooseExitAction') return gameError('NO_CHOICE_PENDING');
      if (
        !Number.isInteger(action.index) ||
        action.index < 0 ||
        action.index >= pending.card.actions.length
      ) {
        return gameError('INVALID_CHOICE');
      }
      if (!pending.feasible[action.index]) return gameError('ACTION_IMPOSSIBLE');
      return null;
    case 'chooseSwapTarget':
      if (pending?.kind !== 'chooseSwapTarget') return gameError('NO_CHOICE_PENDING');
      if (!pending.targets.includes(action.dwarfId)) return gameError('INVALID_SWAP_TARGET');
      return null;
    default:
      return gameError('INVALID_ACTION');
  }
}

/** Valide n'importe quelle action (joueur ou système) ; `null` si elle est légale. */
export function validateAction(state: GameState, action: GameAction): GameError | null {
  if (!isRecord(action) || typeof action.type !== 'string') return gameError('INVALID_ACTION');
  switch (action.type) {
    case 'startNextRound':
      if (state.phase === 'finished') return gameError('GAME_OVER');
      if (state.phase !== 'roundEnd') return gameError('ROUND_NOT_OVER');
      return null;
    case 'skipTurn':
      if (state.phase === 'finished') return gameError('GAME_OVER');
      if (state.phase !== 'playing') return gameError('ROUND_OVER');
      return null;
    case 'drawExtraction':
    case 'drawExit':
    case 'chooseExitAction':
    case 'chooseSwapTarget':
      if (typeof action.playerId !== 'string') return gameError('UNKNOWN_PLAYER');
      return validatePlayerAction(state, action.playerId, action);
    default:
      return gameError('INVALID_ACTION');
  }
}
