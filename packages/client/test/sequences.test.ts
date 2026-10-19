import { describe, expect, it } from 'vitest';
import { createGame, createSeededRng, viewFor, type GameEvent } from '@pepite/engine';
import {
  FLIP_AT,
  REVEAL_AT,
  buildAutoPlaySequence as buildAutoPlayHighlight,
  buildSequences as buildHighlights,
  type Cue,
} from '../src/director/sequences';
import { PACE } from '@pepite/shared/pacing';

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

describe('séquences du réalisateur', () => {
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
      name: 'Il est l’or, monseignor !',
      visual: { kind: 'extraction', card: 'blueDoor' },
      extra: ['Alice atteint la Sortie (place 1).'],
      tone: 'success',
    });
  });

  it('regroupe une chaîne de dragons, puis annonce l’élimination en grand', () => {
    const events: GameEvent[] = [
      { type: 'CardDrawn', deck: 'extraction', dwarfId: 0, card: 'noDoor', gold: 1 },
      { type: 'DragonMoved', from: 8, to: 7, burnedCardId: 'mine-6' },
      { type: 'DragonMoved', from: 7, to: 6, burnedCardId: 'mine-5' },
      {
        type: 'DwarfEliminated',
        dwarfId: 1,
        position: 7,
        cause: 'dragon',
        pileLost: true,
        goldLost: 5,
      },
    ];
    const highlights = buildHighlights(events, viewFor(state, 'a'));
    expect(highlights.map((h) => h.visual.kind)).toEqual(['extraction', 'dragon', 'eliminated']);
    expect(highlights[1]).toMatchObject({
      title: 'Dragobert avance de 2 cartes !',
      visual: { kind: 'dragon', steps: 2 },
      tone: 'danger',
    });
    expect(highlights[2]).toMatchObject({
      title: 'Le nain de Bruno est éliminé !',
      name: 'Rattrapé par Dragobert sur la carte 7',
      detail: '5 pépites perdues !',
      dramatic: true,
    });
    // Pour le joueur concerné, l'annonce lui parle directement.
    expect(buildHighlights(events, viewFor(state, 'b'))[2]).toMatchObject({
      title: 'Votre nain est éliminé !',
    });
  });

  it('montre l’action Exit jouée, mais pas votre carte en attente de choix', () => {
    const played: GameEvent[] = [
      { type: 'CardDrawn', deck: 'exit', dwarfId: 1, card: null },
      { type: 'ExitActionPlayed', dwarfId: 1, action: 'doubleStep', cardActions: ['doubleStep'] },
    ];
    expect(buildHighlights(played, viewFor(state, 'a'))[0]).toMatchObject({
      title: 'Bruno joue',
      name: 'Double pas',
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

  it('un dragon pioché : pas de pépites, la carte ne va pas dans la pile', () => {
    const events: GameEvent[] = [
      { type: 'CardDrawn', deck: 'extraction', dwarfId: 0, card: 'dragon', gold: 0 },
      { type: 'DragonMoved', from: 8, to: 7, burnedCardId: 'mine-6' },
    ];
    const [draw, dragon] = buildHighlights(events, viewFor(state, 'b'));
    expect(draw).toMatchObject({
      title: 'Alice pioche un dragon !',
      name: 'Un dragon ! UN DRAGON !',
      tone: 'danger',
      targetPlayerId: null,
    });
    expect(draw?.cues.some((cue) => cue.type === 'burst')).toBe(false);
    expect(dragon?.visual).toEqual({ kind: 'dragon', steps: 1 });
    // Dragobert rugit sur la piste dès que la carte est lisible, puis quand il avance.
    const roar = (cues: readonly Cue[] | undefined): Cue | undefined =>
      cues?.find((cue) => cue.type === 'dragonRoar');
    expect(roar(draw?.cues)?.at).toBeGreaterThanOrEqual(REVEAL_AT);
    expect(roar(dragon?.cues)?.at).toBe(0);
  });

  it('marque la même pause de suspense pour une bonne ou une mauvaise carte', () => {
    const timing = (card: 'redDoor' | 'blueDoor' | 'noDoor' | 'dragon'): Cue[] => {
      const [sequence] = buildHighlights(
        [
          {
            type: 'CardDrawn',
            deck: 'extraction',
            dwarfId: 0,
            card,
            gold: card === 'dragon' ? 0 : 1,
          },
        ],
        viewFor(state, 'b'),
      );
      return (sequence?.cues ?? []).filter((cue) => cue.type === 'reveal' || cue.type === 'sound');
    };
    const reveal = (cues: Cue[]): number | undefined => cues.find((c) => c.type === 'reveal')?.at;
    for (const card of ['redDoor', 'blueDoor', 'noDoor', 'dragon'] as const) {
      expect(reveal(timing(card))).toBe(REVEAL_AT);
      expect(timing(card).find((c) => c.type === 'sound' && c.sound === 'flip')?.at).toBe(FLIP_AT);
    }
  });

  it('fait monter une chaîne de dragons en intensité sans l’allonger sans fin', () => {
    const events: GameEvent[] = [5, 4, 3, 2, 1].map((to) => ({
      type: 'DragonMoved',
      from: to + 1,
      to,
      burnedCardId: `mine-${to}`,
    }));
    const [dragon] = buildHighlights(events, viewFor(state, 'a'));
    expect(dragon?.visual).toEqual({ kind: 'dragon', steps: 5 });
    expect(dragon?.duration).toBeLessThanOrEqual(PACE.dragonMaxMs);
    const shakes = (dragon?.cues ?? []).flatMap((c) => (c.type === 'shake' ? [c.strength] : []));
    expect(shakes.length).toBe(5);
    expect(Math.max(...shakes)).toBeLessThanOrEqual(3);
    expect(shakes[1]! > shakes[0]!).toBe(true);
    expect(Math.max(...(dragon?.cues ?? []).map((c) => c.at))).toBeLessThan(dragon?.duration ?? 0);
  });

  it('change le plateau au début de la cinématique du dragon', () => {
    const events: GameEvent[] = [
      { type: 'CardDrawn', deck: 'extraction', dwarfId: 0, card: 'redDoor', gold: 2 },
      { type: 'DwarfMoved', dwarfId: 0, from: 1, to: 2, cause: 'extraction' },
      { type: 'DragonMoved', from: 8, to: 7, burnedCardId: 'mine-6' },
    ];
    const [draw, dragon] = buildHighlights(events, viewFor(state, 'a'));
    expect(draw?.cues.some((c) => c.type === 'reveal')).toBe(false);
    expect(dragon?.cues.find((c) => c.type === 'reveal')?.at).toBe(0);
    expect(dragon?.cues.some((c) => c.type === 'sound' && c.sound === 'step')).toBe(true);
    expect(dragon?.important).toBe(true);
  });
});

describe('temps écoulé : pile ou face', () => {
  it('annonce le tirage entre Creuser et Fuir', () => {
    const highlight = buildAutoPlayHighlight(
      { kind: 'draw', dwarfId: 1, playerId: 'b', result: 'drawExit', coin: 'tails' },
      viewFor(state, 'a'),
    );
    expect(highlight).toMatchObject({
      title: 'Temps écoulé pour Bruno !',
      name: 'Pile ou face… Fuir !',
      detail: 'Pile : Creuser · Face : Fuir',
      visual: { kind: 'coin', heads: 'Creuser', tails: 'Fuir', side: 'tails' },
    });
  });

  it('parle au joueur concerné et gère le coup sans tirage', () => {
    const highlight = buildAutoPlayHighlight(
      { kind: 'draw', dwarfId: 0, playerId: 'a', result: 'drawExtraction', coin: null },
      viewFor(state, 'a'),
    );
    expect(highlight).toMatchObject({
      title: 'Temps écoulé !',
      name: 'Coup automatique : Creuser',
      visual: { side: null },
    });
  });

  it('tire entre les deux actions d’une carte Exit', () => {
    const highlight = buildAutoPlayHighlight(
      {
        kind: 'exitAction',
        dwarfId: 0,
        playerId: 'a',
        options: ['step', 'goldBonus'],
        result: 'goldBonus',
        coin: 'tails',
      },
      viewFor(state, 'b'),
    );
    expect(highlight.visual).toEqual({
      kind: 'coin',
      heads: 'Petit pas',
      tails: 'Bonus d’or',
      side: 'tails',
    });
  });
});
