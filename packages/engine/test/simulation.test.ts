import { describe, expect, it } from 'vitest';
import { createSeededRng, heuristicBot, playGame, randomBot, type BotPolicy } from '../src';
import { makePlayers } from './helpers';

describe('parties complètes entre bots', () => {
  it.each([2, 3, 4, 6])('se terminent à %i joueurs', (count) => {
    const players = makePlayers(count);
    const policies = Object.fromEntries(
      players.map((p, i) => [p.id, i % 2 ? randomBot : heuristicBot]),
    );
    const played = playGame(
      { players, firstPlayerId: 'p1' },
      policies,
      createSeededRng(`partie-${count}`),
      createSeededRng(`bots-${count}`),
    );
    expect(played.state.phase).toBe('finished');
    expect(played.events.filter((e) => e.type === 'RoundEnded')).toHaveLength(3);
    expect(played.actions).toBeGreaterThan(3);
  });

  it('signale un bot qui ne joue pas', () => {
    const idle: BotPolicy = () => null;
    const players = makePlayers(2);
    expect(() =>
      playGame(
        { players, firstPlayerId: 'p1' },
        { p1: idle, p2: idle },
        createSeededRng(1),
        createSeededRng(2),
      ),
    ).toThrow('rien joué');
    expect(() =>
      playGame({ players, firstPlayerId: 'p1' }, {}, createSeededRng(1), createSeededRng(2)),
    ).toThrow('Aucun bot');
  });
});
