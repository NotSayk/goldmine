import { describe, expect, it } from 'vitest';
import { filterEventsFor, viewFor } from '../src';
import { DUAL_ACTION_DECKS, newGame, play, stackExit, stackExtraction } from './helpers';

describe('vue filtrée (informations cachées)', () => {
  it('montre la carte visible Extraction mais jamais le contenu de la pioche Exit', () => {
    const { state } = newGame();
    const view = viewFor(state, 'p2');
    expect(view.extraction).toEqual({ top: state.extractionDeck[0]!.kind, count: 58 });
    expect(view.exit).toEqual({ deckCount: 16, discard: [] });
    const json = JSON.stringify(view);
    for (const card of state.exitDeck) expect(json).not.toContain(card.id);
    for (const card of state.extractionDeck) expect(json).not.toContain(`"${card.id}"`);
  });

  it('cache la valeur des piles adverses, montre la sienne', () => {
    const { state } = newGame();
    stackExtraction(state, ['redDoor', 'noDoor']);
    const next = play(state, { type: 'drawExtraction' }).state;
    const own = viewFor(next, 'p1').players[0]!.pile;
    const seenByOther = viewFor(next, 'p2').players[0]!.pile;
    expect(own).toEqual({ cardCount: 1, bonusCount: 0, gold: 2, cards: { redDoor: 1 } });
    expect(seenByOther).toEqual({ cardCount: 1, bonusCount: 0, gold: null, cards: null });
    expect(viewFor(next, null).players[0]!.pile.gold).toBeNull();
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
