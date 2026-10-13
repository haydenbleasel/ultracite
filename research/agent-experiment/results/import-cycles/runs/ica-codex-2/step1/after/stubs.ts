// STUB, not part of the original source: Astro's DevToolbarMetadata type, copied from
// packages/astro/src/types/public/toolbar.ts (lines 63-74 at the same commit), so settings.ts
// type-checks without the rest of Astro.
export type DevToolbarPlacement = "bottom-left" | "bottom-center" | "bottom-right";

export type DevToolbarMetadata = Window &
  typeof globalThis & {
    __astro_dev_toolbar__: {
      root: string;
      version: string;
      latestAstroVersion: string | undefined;
      debugInfo: string;
      placement: DevToolbarPlacement | undefined;
    };
  };
