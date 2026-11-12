// A conditional inside a call in another conditional's branch: not a tree, but sonarjs reports it.
export const pad = (s: string, wide: boolean, right: boolean): string =>
  wide ? s.padStart(right ? 20 : 10) : s;
export const joined = (parts: string[], csv: boolean, tabs: boolean): string =>
  csv ? parts.join(",") : parts.join(tabs ? "\t" : " ");
