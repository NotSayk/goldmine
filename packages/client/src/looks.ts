import { createContext, useContext } from 'react';
import type { DwarfLook } from '@pepite/shared';

/** Apparence (chapeau, barbe) des nains de chaque joueur, d'après le salon. */
export const LooksContext = createContext<ReadonlyMap<string, DwarfLook>>(new Map());

export function useLooks(): ReadonlyMap<string, DwarfLook> {
  return useContext(LooksContext);
}
