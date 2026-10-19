import { describe, expect, it } from 'vitest';
import { createGame, createSeededRng, playGame, randomBot, viewFor } from '@pepite/engine';
import { describeEvent } from '../src/i18n/fr';

const players = [
  { id: 'a', name: 'Alice' },
  { id: 'b', name: 'Bruno' },
];

describe('journal en français', () => {
  it('décrit tous les événements d’une partie sans trou', () => {
    for (const doubleDraw of [false, true]) {
      const played = playGame(
        { players, firstPlayerId: 'a', doubleDraw },
        { a: randomBot, b: randomBot },
        createSeededRng(`journal-${doubleDraw}`),
        createSeededRng('bots'),
      );
      const view = viewFor(played.state, 'a');
      const texts = played.events
        .map((event) => describeEvent(event, view))
        .filter((text) => text !== null);
      expect(texts.length).toBeGreaterThan(10);
      for (const text of texts) expect(text).not.toMatch(/undefined|null|NaN/);
    }
  });

  it('conjugue à la deuxième personne pour le joueur, sans accord de genre', () => {
    const { state } = createGame({ players, firstPlayerId: 'a' }, createSeededRng(1));
    const caught = {
      type: 'DwarfEliminated',
      dwarfId: 0,
      position: 3,
      cause: 'dragon',
      pileLost: true,
      goldLost: 4,
    } as const;
    expect(describeEvent(caught, viewFor(state, 'a'))).toBe(
      'Dragobert vous rattrape : votre or est perdu (4 pépites).',
    );
    expect(describeEvent(caught, viewFor(state, 'b'))).toBe(
      'Dragobert rattrape Alice : son or est perdu (4 pépites).',
    );
    const drawn = {
      type: 'CardDrawn',
      deck: 'extraction',
      dwarfId: 0,
      card: 'redDoor',
      gold: 2,
    } as const;
    expect(describeEvent(drawn, viewFor(state, 'a'))).toBe(
      'Vous creusez : Un dragon aux œufs d’or (+2 pépites).',
    );
    expect(describeEvent(drawn, viewFor(state, 'b'))).toBe(
      'Alice creuse : Un dragon aux œufs d’or (+2 pépites).',
    );
  });
});
