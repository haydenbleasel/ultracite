/*
 * STUB: the two types serialize.ts imports in Astro, copied from
 * withastro/astro@9050e3819c51b0383cced278c278bc6f45c63468: ValueOf (packages/astro/src/
 * type-utils.ts, line 25) and AstroComponentMetadata (packages/astro/src/types/public/
 * internal.ts, lines 147-154). Not part of the source file.
 */
export type ValueOf<T> = T[keyof T];

export interface AstroComponentMetadata {
  displayName: string;
  hydrate?: "load" | "idle" | "visible" | "media" | "only";
  hydrateArgs?: any;
  componentUrl?: string;
  componentExport?: { value: string; namespace?: boolean };
  astroStaticSlot: true;
}
