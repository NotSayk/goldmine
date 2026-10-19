import type { BotPolicy } from './bot';
import { reduce } from './reduce';
import type { Rng } from './rng';
import { createGame, type GameSetup } from './setup';
import type { GameEvent, GameState, PlayerId } from './types';
import { viewFor } from './view';

export interface PlayedGame {
  readonly state: GameState;
  readonly events: GameEvent[];
  readonly actions: number;
}

/**
 * Joue une partie complète avec des bots (simulations, tests de propriétés).
 * `gameRng` sert au moteur, `botRng` aux décisions des bots.
 */
export function playGame(
  setup: GameSetup,
  policies: Readonly<Record<PlayerId, BotPolicy>>,
  gameRng: Rng,
  botRng: Rng,
  maxActions = 20_000,
): PlayedGame {
  const created = createGame(setup, gameRng);
  let state = created.state;
  const events = [...created.events];
  let actions = 0;
  while (state.phase !== 'finished') {
    if (actions++ > maxActions) throw new Error(`Partie interrompue après ${maxActions} actions.`);
    if (state.phase === 'roundEnd') {
      const result = reduce(state, { type: 'startNextRound' }, gameRng);
      if (!result.ok) throw new Error(result.error.message);
      state = result.state;
      events.push(...result.events);
      continue;
    }
    const dwarf = state.currentDwarf === null ? undefined : state.dwarves[state.currentDwarf];
    if (!dwarf) throw new Error('Aucun nain actif pendant une manche.');
    const policy = policies[dwarf.ownerId];
    if (!policy) throw new Error(`Aucun bot pour ${dwarf.ownerId}.`);
    const action = policy(viewFor(state, dwarf.ownerId), botRng);
    if (!action) throw new Error(`Le bot de ${dwarf.ownerId} n'a rien joué.`);
    const result = reduce(state, { ...action, playerId: dwarf.ownerId }, gameRng);
    if (!result.ok) throw new Error(`${result.error.code} : ${result.error.message}`);
    state = result.state;
    events.push(...result.events);
  }
  return { state, events, actions };
}
