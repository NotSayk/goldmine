import { describe, expect, it } from 'vitest';
import { GOLD_BONUS_VALUE, pileValue } from '../src';
import {
  DUAL_ACTION_DECKS,
  act,
  eventsOfType,
  newGame,
  place,
  play,
  stackExit,
  stackExtraction,
} from './helpers';

describe('A. cartes Extraction', () => {
  it('porte rouge : 2 pépites et 1 pas vers le dragon', () => {
    const { state } = newGame();
    stackExtraction(state, ['redDoor', 'noDoor']);
    const { state: next, events } = play(state, { type: 'drawExtraction' });
    expect(next.dwarves[0]?.position).toBe(5);
    expect(pileValue(next.piles.p1!).total).toBe(2);
    expect(next.extractionDeck).toHaveLength(57);
    expect(eventsOfType(events, 'CardDrawn')[0]).toMatchObject({ card: 'redDoor', gold: 2 });
    expect(eventsOfType(events, 'DwarfMoved')[0]).toMatchObject({ from: 4, to: 5 });
    expect(next.currentDwarf).toBe(1);
  });

  it('porte bleue : 1 pépite et 1 pas vers la Sortie', () => {
    const { state } = newGame();
    stackExtraction(state, ['blueDoor', 'noDoor']);
    const { state: next } = play(state, { type: 'drawExtraction' });
    expect(next.dwarves[0]?.position).toBe(3);
    expect(pileValue(next.piles.p1!).total).toBe(1);
  });

  it('sans porte : 1 pépite, sur place', () => {
    const { state } = newGame();
    stackExtraction(state, ['noDoor', 'noDoor']);
    const { state: next, events } = play(state, { type: 'drawExtraction' });
    expect(next.dwarves[0]?.position).toBe(4);
    expect(pileValue(next.piles.p1!).total).toBe(1);
    expect(eventsOfType(events, 'DwarfMoved')).toHaveLength(0);
  });

  it('cas n° 1 : un nain collé au dragon ne bouge pas mais prend l’or', () => {
    const { state } = newGame();
    place(state, { 0: 7 });
    stackExtraction(state, ['redDoor', 'noDoor']);
    const { state: next, events } = play(state, { type: 'drawExtraction' });
    expect(next.dwarves[0]?.position).toBe(7);
    expect(pileValue(next.piles.p1!).total).toBe(2);
    expect(eventsOfType(events, 'DwarfMoveBlocked')).toEqual([
      { type: 'DwarfMoveBlocked', dwarfId: 0, position: 7 },
    ]);
  });

  it('une porte bleue depuis la première Mine fait sortir le nain avec la carte', () => {
    const { state } = newGame();
    place(state, { 0: 1 });
    // p1 pioche « sans porte », p2 et p3 aussi, puis p1 pioche « porte bleue ».
    stackExtraction(state, ['noDoor', 'noDoor', 'noDoor', 'blueDoor', 'noDoor']);
    let s = play(state, { type: 'drawExtraction' }).state;
    s = play(s, { type: 'drawExtraction' }).state;
    s = play(s, { type: 'drawExtraction' }).state;
    const { state: next, events } = play(s, { type: 'drawExtraction' });
    const dwarf = next.dwarves[0]!;
    expect(dwarf.status).toBe('exit');
    expect(dwarf.position).toBe(0);
    expect(pileValue(dwarf.secured).total).toBe(2);
    expect(pileValue(next.piles.p1!).total).toBe(0);
    expect(next.ladder).toEqual([0]);
    expect(eventsOfType(events, 'DwarfExited')).toEqual([
      { type: 'DwarfExited', dwarfId: 0, ladderSlot: 0 },
    ]);
    expect(next.currentDwarf).toBe(1);
  });
});

describe('B. cartes Exit', () => {
  it('« Petit pas » : 1 carte vers la Sortie, carte défaussée face visible', () => {
    const { state } = newGame();
    stackExit(state, [['step']]);
    const { state: next, events } = play(state, { type: 'drawExit' });
    expect(next.dwarves[0]?.position).toBe(3);
    expect(next.exitDiscard.map((c) => c.actions)).toEqual([['step']]);
    expect(next.exitDeck).toHaveLength(15);
    expect(eventsOfType(events, 'ExitActionPlayed')[0]?.action).toBe('step');
  });

  it('« Double pas » : 2 cartes vers la Sortie', () => {
    const { state } = newGame();
    stackExit(state, [['doubleStep']]);
    expect(play(state, { type: 'drawExit' }).state.dwarves[0]?.position).toBe(2);
  });

  it('« Double pas » depuis la première Mine : le second pas est ignoré', () => {
    const { state } = newGame();
    place(state, { 0: 1 });
    stackExit(state, [['doubleStep']]);
    const { state: next, events } = play(state, { type: 'drawExit' });
    expect(next.dwarves[0]?.status).toBe('exit');
    expect(next.dwarves[0]?.position).toBe(0);
    expect(eventsOfType(events, 'DwarfMoved')).toEqual([
      { type: 'DwarfMoved', dwarfId: 0, from: 1, to: 0, cause: 'doubleStep' },
    ]);
  });

  it('« Double pas » depuis la deuxième Mine : sortie exacte', () => {
    const { state } = newGame();
    place(state, { 0: 2 });
    stackExit(state, [['doubleStep']]);
    expect(play(state, { type: 'drawExit' }).state.dwarves[0]?.status).toBe('exit');
  });

  it('« Tous ensemble » : tous les nains de la piste avancent, ordre d’arrivée horaire', () => {
    const { state } = newGame({ players: 4, firstPlayerId: 'p3' });
    // p3 (nain 2) joue ; nains 3, 0 et 2 sont sur la première Mine, nain 1 est déjà sorti.
    place(state, { 0: 1, 2: 1, 3: 1 });
    state.dwarves[1]!.status = 'exit';
    state.dwarves[1]!.position = 0;
    state.ladder = [1];
    stackExit(state, [['allTogether']]);
    const { state: next, events } = play(state, { type: 'drawExit' });
    expect(next.ladder).toEqual([1, 2, 3, 0]);
    expect(eventsOfType(events, 'DwarfMoved').map((e) => e.dwarfId)).toEqual([2, 3, 0]);
    expect(eventsOfType(events, 'DwarfExited').map((e) => e.ladderSlot)).toEqual([1, 2, 3]);
    expect(next.phase).toBe('roundEnd');
  });

  it('« Tous ensemble » fait avancer les nains à des positions différentes', () => {
    const { state } = newGame({ players: 3 });
    place(state, { 0: 5, 1: 2, 2: 7 });
    stackExit(state, [['allTogether']]);
    const { state: next } = play(state, { type: 'drawExit' });
    expect(next.dwarves.map((d) => d.position)).toEqual([4, 1, 6]);
  });

  it('« Échange » : le joueur choisit la cible parmi les nains de la piste', () => {
    const { state } = newGame({ players: 3 });
    place(state, { 0: 6, 1: 2, 2: 3 });
    stackExit(state, [['swap']]);
    const drawn = play(state, { type: 'drawExit' }).state;
    expect(drawn.pending).toMatchObject({ kind: 'chooseSwapTarget', targets: [1, 2] });
    expect(drawn.currentDwarf).toBe(0);
    const { state: next, events } = play(drawn, { type: 'chooseSwapTarget', dwarfId: 1 });
    expect(next.dwarves[0]?.position).toBe(2);
    expect(next.dwarves[1]?.position).toBe(6);
    expect(next.pending).toBeNull();
    expect(next.exitDiscard).toHaveLength(1);
    expect(eventsOfType(events, 'DwarvesSwapped')[0]).toMatchObject({ from: 6, to: 2 });
    expect(next.currentDwarf).toBe(1);
  });

  it('cas n° 2 : un nain déjà sorti ne peut pas être ciblé ; cible unique appliquée', () => {
    const { state } = newGame({ players: 3 });
    place(state, { 0: 6, 2: 3 });
    state.dwarves[1]!.status = 'exit';
    state.dwarves[1]!.position = 0;
    state.ladder = [1];
    stackExit(state, [['swap']]);
    const { state: next } = play(state, { type: 'drawExit' });
    expect(next.pending).toBeNull();
    expect(next.dwarves[0]?.position).toBe(3);
    expect(next.dwarves[2]?.position).toBe(6);
  });

  it('« Échange » sans autre nain dans la mine : carte défaussée sans effet', () => {
    const { state } = newGame({ players: 2 });
    state.dwarves[1]!.status = 'exit';
    state.dwarves[1]!.position = 0;
    state.ladder = [1];
    stackExit(state, [['swap']]);
    const { state: next, events } = play(state, { type: 'drawExit' });
    expect(next.dwarves[0]?.position).toBe(4);
    expect(eventsOfType(events, 'ExitCardWasted')).toHaveLength(1);
    expect(next.exitDiscard).toHaveLength(1);
    expect(next.currentDwarf).toBe(0);
  });

  it('« Bonus d’or » : carte gardée, +3 au décompte', () => {
    const { state } = newGame();
    stackExit(state, [['goldBonus']]);
    const { state: next, events } = play(state, { type: 'drawExit' });
    expect(next.piles.p1?.bonus).toHaveLength(1);
    expect(pileValue(next.piles.p1!).total).toBe(GOLD_BONUS_VALUE);
    expect(next.exitDiscard).toHaveLength(0);
    expect(eventsOfType(events, 'GoldBonusKept')).toHaveLength(1);
  });

  it('pioche Exit vidée : la défausse est remélangée aussitôt, avant la pioche suivante', () => {
    const { state, rng } = newGame();
    stackExit(state, [['step']]);
    state.exitDiscard = state.exitDeck.splice(1);
    const { state: next, events } = play(state, { type: 'drawExit' }, rng);
    // La dernière carte vient d'être jouée : la nouvelle pioche est déjà mélangée.
    expect(eventsOfType(events, 'ExitDeckReshuffled')).toEqual([
      { type: 'ExitDeckReshuffled', count: 16 },
    ]);
    expect(next.exitDeck).toHaveLength(16);
    expect(next.exitDiscard).toHaveLength(0);
    const order = next.exitDeck.map((c) => c.id);
    const after = play(next, { type: 'drawExit' }, rng).state;
    expect(after.exitDeck.map((c) => c.id)).toEqual(order.slice(1));
  });
});

describe('cartes Exit à deux actions', () => {
  it('le joueur choisit l’une des deux actions', () => {
    const { state } = newGame({ decks: DUAL_ACTION_DECKS });
    stackExit(state, [['goldBonus', 'doubleStep']]);
    const drawn = play(state, { type: 'drawExit' }).state;
    expect(drawn.pending).toMatchObject({ kind: 'chooseExitAction', feasible: [true, true] });
    const { state: next } = play(drawn, { type: 'chooseExitAction', index: 1 });
    expect(next.dwarves[0]?.position).toBe(2);
    expect(next.exitDiscard.map((c) => c.actions)).toEqual([['goldBonus', 'doubleStep']]);
  });

  it('si une action est impossible, l’autre est imposée', () => {
    const { state } = newGame({ players: 2, decks: DUAL_ACTION_DECKS });
    state.dwarves[1]!.status = 'exit';
    state.dwarves[1]!.position = 0;
    state.ladder = [1];
    stackExit(state, [['step', 'swap']]);
    const { state: next, events } = play(state, { type: 'drawExit' });
    expect(next.pending).toBeNull();
    expect(next.dwarves[0]?.position).toBe(3);
    expect(eventsOfType(events, 'ExitActionPlayed')[0]?.action).toBe('step');
  });

  it('deux actions identiques : pas de choix à faire', () => {
    const { state } = newGame({ decks: DUAL_ACTION_DECKS });
    stackExit(state, [['step', 'step']]);
    const { state: next } = play(state, { type: 'drawExit' });
    expect(next.pending).toBeNull();
    expect(next.dwarves[0]?.position).toBe(3);
  });

  it('refuse l’action impossible et l’index invalide', () => {
    const { state, rng } = newGame({ players: 3, decks: DUAL_ACTION_DECKS });
    stackExit(state, [['step', 'swap']]);
    const drawn = play(state, { type: 'drawExit' }).state;
    expect(drawn.pending?.kind).toBe('chooseExitAction');
    // Les deux actions sont possibles ici ; on rend l'échange impossible artificiellement.
    const blocked = {
      ...drawn,
      pending: { ...drawn.pending!, feasible: [true, false] },
    } as typeof drawn;
    expect(
      act(drawn, { type: 'chooseExitAction', index: 1, playerId: 'p1' }, rng).state.pending?.kind,
    ).toBe('chooseSwapTarget');
    expect(() => act(blocked, { type: 'chooseExitAction', index: 1, playerId: 'p1' })).toThrow(
      'ACTION_IMPOSSIBLE',
    );
    expect(() => act(drawn, { type: 'chooseExitAction', index: 5, playerId: 'p1' })).toThrow(
      'INVALID_CHOICE',
    );
    expect(() => act(drawn, { type: 'drawExtraction', playerId: 'p1' })).toThrow('CHOICE_PENDING');
  });

  it('« Échange » choisi sur une carte double puis cible', () => {
    const { state } = newGame({ players: 3, decks: DUAL_ACTION_DECKS });
    place(state, { 0: 5, 1: 1, 2: 3 });
    stackExit(state, [['step', 'swap']]);
    let s = play(state, { type: 'drawExit' }).state;
    s = play(s, { type: 'chooseExitAction', index: 1 }).state;
    expect(s.pending).toMatchObject({ kind: 'chooseSwapTarget', targets: [1, 2] });
    s = play(s, { type: 'chooseSwapTarget', dwarfId: 1 }).state;
    expect(s.dwarves[0]?.position).toBe(1);
    expect(s.dwarves[1]?.position).toBe(5);
  });
});
