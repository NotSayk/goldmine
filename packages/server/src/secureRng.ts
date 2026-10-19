import { createHmac, randomBytes } from 'node:crypto';
import type { Rng } from '@pepite/engine';

/** État sérialisable du générateur (pour une persistance future). */
export interface SecureRngState {
  readonly key: string;
  readonly counter: number;
  readonly offset: number;
}

export interface SecureRng extends Rng {
  snapshot(): SecureRngState;
}

const WORDS_PER_BLOCK = 8;

/**
 * Générateur déterministe et cryptographiquement sûr (HMAC-SHA256 en mode
 * compteur). Une partie est rejouable à partir de sa clé, mais un client qui
 * observe les cartes révélées ne peut pas en déduire l'ordre des pioches.
 */
export function createSecureRng(state?: SecureRngState): SecureRng {
  const key = Buffer.from(state?.key ?? randomBytes(32).toString('hex'), 'hex');
  let counter = state?.counter ?? 0;
  let offset = state?.offset ?? WORDS_PER_BLOCK;
  let block = Buffer.alloc(0);
  const refill = (): void => {
    const counterBytes = Buffer.alloc(8);
    counterBytes.writeBigUInt64BE(BigInt(counter));
    block = createHmac('sha256', key).update(counterBytes).digest();
  };
  if (offset < WORDS_PER_BLOCK) {
    counter -= 1;
    refill();
    counter += 1;
  }
  return {
    next() {
      if (offset >= WORDS_PER_BLOCK) {
        refill();
        counter += 1;
        offset = 0;
      }
      const value = block.readUInt32BE(offset * 4);
      offset += 1;
      return value / 4294967296;
    },
    snapshot() {
      return { key: key.toString('hex'), counter, offset };
    },
  };
}
