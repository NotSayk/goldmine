import {
  randomInt,
  validatePlayerAction,
  type GameAction,
  type GameState,
  type Rng,
} from '@pepite/engine';
import type { AutoPlay, CoinSide } from '@pepite/shared';

/** Temps minimal laissé pour choisir l'action d'une carte Exit piochée en fin de chrono. */
export const MIN_CHOICE_MS = 15_000;

export interface TimeoutMove {
  readonly action: GameAction;
  readonly autoPlay: AutoPlay;
}

function flip(rng: Rng): CoinSide {
  return rng.next() < 0.5 ? 'heads' : 'tails';
}

/**
 * Coup joué d'office quand le temps est écoulé : pile ou face entre les deux
 * options possibles (Creuser / Fuir, ou les deux actions d'une carte Exit),
 * cible au hasard pour un échange. `null` s'il n'y a rien à jouer.
 */
export function pickTimeoutMove(game: GameState, rng: Rng): TimeoutMove | null {
  if (game.phase !== 'playing' || game.currentDwarf === null) return null;
  const dwarf = game.dwarves[game.currentDwarf];
  if (!dwarf) return null;
  const { id: dwarfId, ownerId: playerId } = dwarf;
  const pending = game.pending;

  if (pending?.kind === 'chooseExitAction') {
    const allowed = pending.card.actions
      .map((action, index) => ({ action, index }))
      .filter((option) => pending.feasible[option.index]);
    const coin = allowed.length > 1 ? flip(rng) : null;
    const pick = allowed[coin === 'tails' ? 1 : 0];
    if (!pick) return null;
    return {
      action: { type: 'chooseExitAction', index: pick.index, playerId },
      autoPlay: {
        kind: 'exitAction',
        dwarfId,
        playerId,
        options: allowed.map((option) => option.action),
        result: pick.action,
        coin,
      },
    };
  }

  if (pending?.kind === 'chooseSwapTarget') {
    const targetId = pending.targets[randomInt(rng, pending.targets.length)];
    if (targetId === undefined) return null;
    return {
      action: { type: 'chooseSwapTarget', dwarfId: targetId, playerId },
      autoPlay: { kind: 'swapTarget', dwarfId, playerId, targetId },
    };
  }

  const canDig = validatePlayerAction(game, playerId, { type: 'drawExtraction' }) === null;
  const canFlee = validatePlayerAction(game, playerId, { type: 'drawExit' }) === null;
  if (!canDig && !canFlee) return null;
  const coin = canDig && canFlee ? flip(rng) : null;
  const result =
    coin === null
      ? canDig
        ? 'drawExtraction'
        : 'drawExit'
      : coin === 'heads'
        ? 'drawExtraction'
        : 'drawExit';
  return {
    action: { type: result, playerId },
    autoPlay: { kind: 'draw', dwarfId, playerId, result, coin },
  };
}
