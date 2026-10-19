import { describe, expect, it } from 'vitest';
import { pileValue, type GameState } from '../src';
import { eventsOfType, newGame, place, play, stackExit, stackExtraction } from './helpers';

function variant(): GameState {
  return newGame({ players: 2, doubleDraw: true }).state;
}

describe('variante « Double pioche » (2 joueurs, 2 nains chacun)', () => {
  it('les 2 nains d’un joueur jouent à la suite, toujours dans le même ordre', () => {
    let s = variant();
    stackExtraction(s, ['noDoor', 'noDoor', 'noDoor', 'noDoor', 'noDoor']);
    const order: number[] = [];
    for (let i = 0; i < 5; i++) {
      order.push(s.currentDwarf!);
      s = play(s, { type: 'drawExtraction' }).state;
    }
    expect(order).toEqual([0, 1, 2, 3, 0]);
  });

  it('les 2 nains partagent une pile d’or commune', () => {
    let s = variant();
    stackExtraction(s, ['redDoor', 'noDoor', 'noDoor']);
    s = play(s, { type: 'drawExtraction' }).state;
    s = play(s, { type: 'drawExtraction' }).state;
    expect(pileValue(s.piles.p1!).total).toBe(3);
    expect(s.piles.p1!.extraction).toHaveLength(2);
  });

  it('un nain éliminé : l’équipier continue seul et garde l’or', () => {
    const s = variant();
    s.piles.p1!.extraction.push(...s.extractionDeck.splice(3, 2));
    place(s, { 1: 7 });
    stackExtraction(s, ['noDoor', 'dragon', 'noDoor']);
    const { state: next, events } = play(s, { type: 'drawExtraction' });
    expect(next.dwarves[1]?.status).toBe('eliminated');
    expect(eventsOfType(events, 'DwarfEliminated')[0]?.pileLost).toBe(false);
    expect(next.piles.p1!.extraction).toHaveLength(3);
    // Le nain éliminé ne joue plus : après le nain 0, c'est le nain 2.
    expect(next.currentDwarf).toBe(2);
  });

  it('les deux nains éliminés ensemble : l’or est perdu', () => {
    const s = variant();
    s.piles.p2!.extraction.push(...s.extractionDeck.splice(3, 2));
    place(s, { 2: 7, 3: 7 });
    stackExtraction(s, ['noDoor', 'dragon', 'noDoor']);
    const { state: next, events } = play(s, { type: 'drawExtraction' });
    expect(eventsOfType(events, 'DwarfEliminated').map((e) => e.pileLost)).toEqual([false, true]);
    expect(next.piles.p2!.extraction).toEqual([]);
  });

  it('un nain sorti emporte toute la pile ; l’équipier commence une nouvelle pile', () => {
    let s = variant();
    s.piles.p1!.extraction.push(...s.extractionDeck.splice(3, 3));
    place(s, { 0: 1 });
    stackExit(s, [['step']]);
    s = play(s, { type: 'drawExit' }).state;
    expect(s.dwarves[0]?.status).toBe('exit');
    expect(s.dwarves[0]?.secured.extraction).toHaveLength(3);
    expect(s.piles.p1!.extraction).toEqual([]);
    // Le nain 1 pioche : nouvelle pile.
    stackExtraction(s, ['redDoor', 'noDoor']);
    s = play(s, { type: 'drawExtraction' }).state;
    expect(pileValue(s.piles.p1!).total).toBe(2);
    expect(s.dwarves[0]?.secured.extraction).toHaveLength(3);
  });

  it('chaque nain est classé séparément : un joueur peut prendre plusieurs places', () => {
    let s = variant();
    // Nain 0 sort avec 2 pépites, nain 1 avec 1 pépite, l'adversaire avec 0.
    s.piles.p1!.extraction.push(s.extractionDeck.find((c) => c.kind === 'redDoor')!);
    s.extractionDeck = s.extractionDeck.filter((c) => !s.piles.p1!.extraction.includes(c));
    place(s, { 0: 1, 1: 1, 2: 1, 3: 1 });
    stackExit(s, [['step']]);
    s = play(s, { type: 'drawExit' }).state; // nain 0 sort
    stackExtraction(s, ['blueDoor', 'noDoor']);
    s = play(s, { type: 'drawExtraction' }).state; // nain 1 sort avec 1 pépite
    stackExit(s, [['allTogether']]);
    s = play(s, { type: 'drawExit' }).state; // nains 2 puis 3 sortent
    expect(s.phase).toBe('roundEnd');
    const ranking = s.roundResults[0]!.ranking;
    expect(ranking.map((r) => [r.dwarfId, r.total, r.bigNuggetsAwarded])).toEqual([
      [0, 2, 3],
      [1, 1, 2],
      [2, 0, 0],
      [3, 0, 0],
    ]);
    expect(s.ladder).toEqual([0, 1, 2, 3]);
  });

  it('l’échange peut cibler l’équipier', () => {
    let s = variant();
    place(s, { 0: 6, 1: 2, 2: 7, 3: 7 });
    stackExit(s, [['swap']]);
    s = play(s, { type: 'drawExit' }).state;
    expect(s.pending).toMatchObject({ kind: 'chooseSwapTarget', targets: [1, 2, 3] });
    s = play(s, { type: 'chooseSwapTarget', dwarfId: 1 }).state;
    expect(s.dwarves[0]?.position).toBe(2);
    expect(s.dwarves[1]?.position).toBe(6);
  });

  it('manche 3 : le score du joueur additionne ses deux nains et ses Grosses pépites', () => {
    let s = variant();
    s.round = 3;
    s.dwarves[0]!.bigNuggets = 3;
    s.dwarves[1]!.bigNuggets = 2;
    s.dwarves[3]!.bigNuggets = 1;
    s.piles.p1!.extraction.push(s.extractionDeck.find((c) => c.kind === 'redDoor')!);
    s.extractionDeck = s.extractionDeck.filter((c) => !s.piles.p1!.extraction.includes(c));
    place(s, { 0: 1, 1: 1, 2: 1, 3: 1 });
    stackExit(s, [['allTogether']]);
    s = play(s, { type: 'drawExit' }).state;
    expect(s.phase).toBe('finished');
    const p1 = s.finalResult!.standings.find((x) => x.playerId === 'p1')!;
    expect(p1).toMatchObject({ extractionGold: 2, bigNuggets: 5, total: 7, bestLadderSlot: 0 });
    expect(s.finalResult!.winners).toEqual(['p1']);
  });
});
