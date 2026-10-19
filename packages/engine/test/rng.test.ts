import { describe, expect, it } from 'vitest';
import { createSeededRng, randomInt, shuffle } from '../src';

describe('générateur à graine', () => {
  it('est déterministe et reprend la séquence depuis un état sauvegardé', () => {
    const a = createSeededRng('graine');
    const b = createSeededRng('graine');
    const first = Array.from({ length: 5 }, () => a.next());
    expect(Array.from({ length: 5 }, () => b.next())).toEqual(first);
    const saved = a.snapshot();
    const resumed = createSeededRng(saved);
    expect(Array.from({ length: 10 }, () => resumed.next())).toEqual(
      Array.from({ length: 10 }, () => a.next()),
    );
    expect(createSeededRng('autre').next()).not.toBe(first[0]);
  });

  it('produit des valeurs dans [0, 1) et des entiers dans [0, n)', () => {
    const rng = createSeededRng(42);
    for (let i = 0; i < 1000; i++) {
      const x = rng.next();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
      const n = randomInt(rng, 7);
      expect(Number.isInteger(n) && n >= 0 && n < 7).toBe(true);
    }
  });

  it('mélange sans perdre ni dupliquer d’élément', () => {
    const items = Array.from({ length: 30 }, (_, i) => i);
    const shuffled = shuffle(items, createSeededRng(7));
    expect([...shuffled].sort((x, y) => x - y)).toEqual(items);
    expect(shuffled).not.toEqual(items);
    expect(items[0]).toBe(0);
  });
});
