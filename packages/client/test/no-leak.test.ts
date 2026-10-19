import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  createGame,
  createSeededRng,
  filterEventsFor,
  randomBot,
  reduce,
  viewFor,
  type GameEvent,
  type GameState,
} from '@pepite/engine';
import type * as HouseRules from '../../engine/src/rules/houseRules';
import { buildSequences } from '../src/director/sequences';
import { EXIT_LABELS } from '../src/i18n/fr';

// Piles cachées (règle du livret) : le réalisateur ne doit jamais trahir l'or des autres.
vi.mock('../../engine/src/rules/houseRules', async (importOriginal) => ({
  ...(await importOriginal<typeof HouseRules>()),
  pileValuesArePublic: () => false,
}));

const PLAYERS = ['a', 'b', 'c', 'd'].map((id) => ({ id, name: id.toUpperCase() }));

/** Joue une partie avec des bots ; `onStep` reçoit chaque coup et l'état qui en résulte. */
function play(seed: string, onStep: (events: readonly GameEvent[], state: GameState) => void) {
  const gameRng = createSeededRng(seed);
  const botRng = createSeededRng(`${seed}-bots`);
  const created = createGame({ players: PLAYERS, firstPlayerId: 'a' }, gameRng);
  let state = created.state;
  onStep(created.events, state);
  for (let step = 0; state.phase !== 'finished' && step < 5000; step++) {
    const dwarf = state.currentDwarf === null ? undefined : state.dwarves[state.currentDwarf];
    const action =
      state.phase === 'roundEnd'
        ? ({ type: 'startNextRound' } as const)
        : dwarf
          ? { ...randomBot(viewFor(state, dwarf.ownerId), botRng)!, playerId: dwarf.ownerId }
          : null;
    if (!action) break;
    const result = reduce(state, action, gameRng);
    if (!result.ok) throw new Error(result.error.message);
    state = result.state;
    onStep(result.events, state);
  }
  return state;
}

describe('aucune fuite dans les animations', () => {
  it('ne montre ni l’or caché des autres, ni leurs cartes Exit en attente', () => {
    const exitNames = Object.values(EXIT_LABELS).map((label) => label.name);
    let checked = 0;
    for (const seed of ['fuite-1', 'fuite-2', 'fuite-3']) {
      const final = play(seed, (events, state) => {
        for (const viewer of PLAYERS) {
          const view = viewFor(state, viewer.id);
          const filtered = filterEventsFor(events, state, viewer.id);
          const sequences = buildSequences(filtered, view);
          for (const player of view.players) {
            if (player.id !== viewer.id) expect(player.pile.gold).toBeNull();
          }
          for (const sequence of sequences) {
            const owner =
              sequence.dwarfId === null ? null : (view.dwarves[sequence.dwarfId]?.ownerId ?? null);
            const others = owner !== null && owner !== viewer.id;
            if (others && sequence.visual.kind === 'eliminated') {
              // Le montant perdu par un autre joueur n'apparaît jamais.
              expect(sequence.detail).not.toMatch(/\d/);
            }
            if (others && sequence.visual.kind === 'exitBack') {
              const text = JSON.stringify(sequence);
              for (const name of exitNames) expect(text).not.toContain(name);
            }
            checked++;
          }
        }
      });
      expect(final.phase).toBe('finished');
    }
    expect(checked).toBeGreaterThan(200);
  });

  it('ne s’appuie que sur les types du moteur, jamais sur son code', () => {
    const files: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir)) {
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.tsx?$/.test(entry)) files.push(path);
      }
    };
    walk(join(import.meta.dirname, '../src'));
    expect(files.length).toBeGreaterThan(10);
    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      const runtimeImports = source.match(/^import (?!type )[^;]*from '@pepite\/engine[^']*';/gm);
      expect(runtimeImports, file).toBeNull();
    }
  });
});
