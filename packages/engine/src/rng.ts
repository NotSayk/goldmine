/** Générateur pseudo-aléatoire injecté dans le moteur. `next()` retourne un réel dans [0, 1). */
export interface Rng {
  next(): number;
}

/** Générateur à graine sérialisable (sfc32, état de 128 bits). */
export interface SeededRng extends Rng {
  /** État courant, pour sauvegarder puis reprendre la séquence. */
  snapshot(): readonly [number, number, number, number];
}

/** Hachage d'une graine textuelle en 4 mots de 32 bits (cyrb128). */
function hashSeed(seed: string): [number, number, number, number] {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let i = 0; i < seed.length; i++) {
    const k = seed.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= h2 ^ h3 ^ h4;
  h2 ^= h1;
  h3 ^= h1;
  h4 ^= h1;
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

/**
 * Crée un générateur déterministe à partir d'une graine (texte, nombre ou état
 * sauvegardé). Adapté aux tests, aux simulations et aux rediffusions ; le
 * serveur injecte un générateur cryptographique (voir `packages/server`).
 */
export function createSeededRng(
  seed: string | number | readonly [number, number, number, number],
): SeededRng {
  let [a, b, c, d] = typeof seed === 'object' ? [...seed] : hashSeed(String(seed));
  const rng: SeededRng = {
    next() {
      a >>>= 0;
      b >>>= 0;
      c >>>= 0;
      d >>>= 0;
      let t = (a + b) | 0;
      a = b ^ (b >>> 9);
      b = (c + (c << 3)) | 0;
      c = (c << 21) | (c >>> 11);
      d = (d + 1) | 0;
      t = (t + d) | 0;
      c = (c + t) | 0;
      return (t >>> 0) / 4294967296;
    },
    snapshot() {
      return [a >>> 0, b >>> 0, c >>> 0, d >>> 0];
    },
  };
  if (typeof seed !== 'object') {
    // Écarte les premières sorties, peu mélangées.
    for (let i = 0; i < 15; i++) rng.next();
  }
  return rng;
}

/** Entier uniforme dans [0, n). */
export function randomInt(rng: Rng, n: number): number {
  return Math.min(n - 1, Math.floor(rng.next() * n));
}

/** Mélange de Fisher-Yates ; retourne une nouvelle liste. */
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(rng, i + 1);
    const tmp = result[i] as T;
    result[i] = result[j] as T;
    result[j] = tmp;
  }
  return result;
}
