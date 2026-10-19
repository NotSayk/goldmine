import { describe, expect, it } from 'vitest';
import { createGame, createSeededRng, viewFor, type GameEvent } from '@pepite/engine';
import { buildHighlights, highlightDuration } from '../src/spotlight';

const { state } = createGame(
  {
    players: [
      { id: 'a', name: 'Alice' },
      { id: 'b', name: 'Bruno' },
    ],
    firstPlayerId: 'a',
  },
  createSeededRng(3),
);

describe('coups mis au premier plan', () => {
  it('montre la carte creusée avec ses conséquences', () => {
    const events: GameEvent[] = [
      { type: 'CardDrawn', deck: 'extraction', dwarfId: 0, card: 'blueDoor', gold: 1 },
      { type: 'DwarfMoved', dwarfId: 0, from: 1, to: 0, cause: 'extraction' },
      { type: 'DwarfExited', dwarfId: 0, ladderSlot: 0 },
      { type: 'TurnStarted', dwarfId: 1, playerId: 'b' },
    ];
    const [highlight, ...rest] = buildHighlights(events, viewFor(state, 'b'));
    expect(rest).toEqual([]);
    expect(highlight).toMatchObject({
      dwarfId: 0,
      title: 'Alice creuse',
      name: 'Galerie de sortie',
      visual: { kind: 'extraction', card: 'blueDoor' },
      extra: ['Alice atteint la Sortie (place 1).'],
      tone: 'success',
    });
  });

  it('regroupe une chaîne de dragons et ses victimes', () => {
    const events: GameEvent[] = [
      { type: 'CardDrawn', deck: 'extraction', dwarfId: 0, card: 'noDoor', gold: 1 },
      { type: 'DragonMoved', from: 8, to: 7, burnedCardId: 'mine-6' },
      { type: 'DragonMoved', from: 7, to: 6, burnedCardId: 'mine-5' },
      { type: 'DwarfEliminated', dwarfId: 1, position: 6, cause: 'dragon', pileLost: true },
    ];
    const highlights = buildHighlights(events, viewFor(state, 'a'));
    expect(highlights.map((h) => h.visual.kind)).toEqual(['extraction', 'dragon']);
    expect(highlights[1]).toMatchObject({
      title: 'Braisard avance de 2 cartes !',
      visual: { kind: 'dragon', steps: 2 },
      extra: ['Bruno : rattrapé, or perdu.'],
      tone: 'danger',
    });
  });

  it('montre l’action Exit jouée, mais pas votre carte en attente de choix', () => {
    const played: GameEvent[] = [
      { type: 'CardDrawn', deck: 'exit', dwarfId: 1, card: null },
      { type: 'ExitActionPlayed', dwarfId: 1, action: 'doubleStep', cardActions: ['doubleStep'] },
    ];
    expect(buildHighlights(played, viewFor(state, 'a'))[0]).toMatchObject({
      title: 'Bruno joue',
      name: 'Deux pas',
      visual: { kind: 'exit', actions: ['doubleStep'], chosen: 'doubleStep' },
    });
    const pendingOwn: GameEvent[] = [
      { type: 'CardDrawn', deck: 'exit', dwarfId: 0, card: ['step', 'swap'] },
    ];
    expect(buildHighlights(pendingOwn, viewFor(state, 'a'))).toEqual([]);
    // Les autres voient la carte de dos pendant qu'Alice choisit.
    const seenByBruno = buildHighlights(
      [{ type: 'CardDrawn', deck: 'exit', dwarfId: 0, card: null }],
      viewFor(state, 'b'),
    );
    expect(seenByBruno[0]).toMatchObject({ title: 'Alice fuit', visual: { kind: 'exitBack' } });
  });

  it('accélère quand les coups s’accumulent', () => {
    expect(highlightDuration(1)).toBeGreaterThan(highlightDuration(3));
    expect(highlightDuration(3)).toBeGreaterThan(highlightDuration(6));
  });
});
