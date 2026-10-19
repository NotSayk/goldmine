import { describe, expect, it } from 'vitest';
import { filterEventsFor, houseRules, viewFor } from '../src';
import { DUAL_ACTION_DECKS, newGame, play, stackExit, stackExtraction } from './helpers';

describe('vue filtrée (informations cachées)', () => {
  it('cache la pioche Extraction (règle maison) : seul le nombre total de cartes est donné', () => {
    const { state } = newGame();
    const view = viewFor(state, 'p2');
    expect(houseRules.extractionTopIsPublic()).toBe(false);
    expect(view.extraction).toEqual({ top: null, count: 58 });
    expect(view.exit).toEqual({ deckCount: 16, discard: [] });
    const json = JSON.stringify(view);
    for (const card of state.exitDeck) expect(json).not.toContain(card.id);
    for (const card of state.extractionDeck) expect(json).not.toContain(`"${card.id}"`);
  });

  it('montre l’or de chaque joueur à tous (règle maison)', () => {
    const { state } = newGame();
    stackExtraction(state, ['redDoor', 'noDoor']);
    const next = play(state, { type: 'drawExtraction' }).state;
    const pile = { cardCount: 1, bonusCount: 0, gold: 2, cards: { redDoor: 1 } };
    expect(houseRules.pileValuesArePublic()).toBe(true);
    expect(viewFor(next, 'p1').players[0]!.pile).toEqual(pile);
    expect(viewFor(next, 'p2').players[0]!.pile).toEqual(pile);
    expect(viewFor(next, null).players[0]!.pile).toEqual(pile);
  });

  it('montre à tous la carte piochée, au moment où elle est piochée', () => {
    const { state } = newGame();
    stackExtraction(state, ['redDoor', 'noDoor']);
    const { state: next, events } = play(state, { type: 'drawExtraction' });
    for (const viewer of ['p1', 'p2', 'p3']) {
      expect(filterEventsFor(events, next, viewer)[0]).toEqual({
        type: 'CardDrawn',
        deck: 'extraction',
        dwarfId: 0,
        card: 'redDoor',
        gold: 2,
      });
      expect(viewFor(next, viewer).extraction.top).toBeNull();
    }
  });

  it('cache la carte Exit en attente de choix aux autres joueurs', () => {
    const { state } = newGame({ decks: DUAL_ACTION_DECKS });
    stackExit(state, [['goldBonus', 'doubleStep']]);
    const { state: next, events } = play(state, { type: 'drawExit' });
    const mine = viewFor(next, 'p1').pending;
    const theirs = viewFor(next, 'p2').pending;
    expect(mine).toMatchObject({
      kind: 'chooseExitAction',
      options: [
        { index: 0, action: 'goldBonus', allowed: true },
        { index: 1, action: 'doubleStep', allowed: true },
      ],
    });
    expect(theirs).toEqual({ kind: 'chooseExitAction', dwarfId: 0, playerId: 'p1', options: null });
    const ownEvents = filterEventsFor(events, next, 'p1');
    const otherEvents = filterEventsFor(events, next, 'p2');
    expect(ownEvents[0]).toMatchObject({ type: 'CardDrawn', card: ['goldBonus', 'doubleStep'] });
    expect(otherEvents[0]).toMatchObject({ type: 'CardDrawn', card: null });
  });

  it('indique les actions légales et les raisons des refus', () => {
    const { state } = newGame();
    expect(viewFor(state, 'p1').legal).toEqual({
      yourTurn: true,
      drawExtraction: { allowed: true, reason: null },
      drawExit: { allowed: true, reason: null },
    });
    expect(viewFor(state, 'p2').legal).toMatchObject({
      yourTurn: false,
      drawExtraction: { allowed: false, reason: 'NOT_YOUR_TURN' },
    });
    expect(viewFor(state, null).legal.yourTurn).toBe(false);
    stackExit(state, [['swap']]);
    const pending = play(state, { type: 'drawExit' }).state;
    const view = viewFor(pending, 'p1');
    expect(view.legal.drawExit).toEqual({ allowed: false, reason: 'CHOICE_PENDING' });
    expect(view.pending).toEqual({
      kind: 'chooseSwapTarget',
      dwarfId: 0,
      playerId: 'p1',
      targets: [1, 2],
    });
  });

  it('expose la piste, le dragon, l’échelle et le joueur actif', () => {
    const { state } = newGame({ players: 2, doubleDraw: true });
    const view = viewFor(state, 'p1');
    expect(view.track).toHaveLength(9);
    expect(view.dragonPosition).toBe(8);
    expect(view.players[0]).toMatchObject({ id: 'p1', seat: 0, dwarfIds: [0, 1], bigNuggets: 0 });
    expect(view.currentDwarfId).toBe(0);
    expect(view.currentPlayerId).toBe('p1');
    expect(view.doubleDraw).toBe(true);
    expect(view.dwarves[0]).toMatchObject({ status: 'mine', position: 4, ladderSlot: null });
  });
});
