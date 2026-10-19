import { describe, expect, it } from 'vitest';
import type { GameEvent } from '@pepite/engine';
import { DRAW_MS, PACE, animationMs } from '../src/pacing';

describe('rythme des animations', () => {
  it('compte une pioche, un dragon en chaîne plafonné et une seule annonce d’élimination', () => {
    const draw: GameEvent = {
      type: 'CardDrawn',
      deck: 'extraction',
      dwarfId: 0,
      card: 'noDoor',
      gold: 1,
    };
    expect(animationMs([draw])).toBe(DRAW_MS);
    const chain: GameEvent[] = [5, 4, 3, 2, 1, 0].map((to) => ({
      type: 'DragonMoved',
      from: to + 1,
      to,
      burnedCardId: `mine-${to}`,
    }));
    const eliminations: GameEvent[] = [0, 1].map((dwarfId) => ({
      type: 'DwarfEliminated',
      dwarfId,
      position: 3,
      cause: 'dragon',
      pileLost: true,
      goldLost: 2,
    }));
    expect(animationMs([draw, ...chain, ...eliminations])).toBe(
      DRAW_MS + PACE.dragonMaxMs + PACE.eliminationMs,
    );
  });

  it('distingue une carte Exit jouée d’une carte en attente de choix', () => {
    const drawn: GameEvent = { type: 'CardDrawn', deck: 'exit', dwarfId: 1, card: null };
    expect(animationMs([drawn])).toBe(PACE.exitPendingMs);
    expect(
      animationMs([
        drawn,
        { type: 'ExitActionPlayed', dwarfId: 1, action: 'step', cardActions: ['step'] },
      ]),
    ).toBe(DRAW_MS);
    expect(
      animationMs(
        [{ type: 'ExitActionPlayed', dwarfId: 1, action: 'step', cardActions: ['step', 'swap'] }],
        true,
      ),
    ).toBe(PACE.coinMs + PACE.exitChosenMs);
  });
});
