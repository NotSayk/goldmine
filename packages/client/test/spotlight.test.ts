import { describe, expect, it } from 'vitest';
import { createGame, createSeededRng, viewFor, type GameEvent } from '@pepite/engine';
import { buildAutoPlayHighlight, buildHighlights, highlightDuration } from '../src/spotlight';

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
      title: 'Dragon révélé : Braisard avance de 2 cartes !',
      visual: { kind: 'dragon', steps: 2 },
      tone: 'danger',
    });
    expect(highlights[2]).toMatchObject({
      title: 'Le nain de Bruno est éliminé !',
      name: 'Rattrapé par Braisard sur la carte 7',
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

  it('accélère quand les coups s’accumulent, laisse plus de temps aux éliminations', () => {
    expect(highlightDuration(1)).toBeGreaterThan(highlightDuration(3));
    expect(highlightDuration(3)).toBeGreaterThan(highlightDuration(6));
    expect(highlightDuration(1, true)).toBeGreaterThan(highlightDuration(1));
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
      slow: true,
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
      heads: 'Un pas',
      tails: 'Trésor caché',
      side: 'tails',
    });
  });
});
