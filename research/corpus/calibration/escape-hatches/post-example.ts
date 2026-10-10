// The annotated example in the post (P1-P6), checked in all three linters. Hand-written.
// Run: node research/corpus/scripts/escape-hatch-linters.cjs --calibration

interface Settings {
  theme: string;
  fontSize?: number;
}

const cache = new Map<string, Settings>();

export function loadSettings(user: string, raw: string): Settings {
  if (cache.has(user)) {
    return cache.get(user)!; // P1
  }
  const parsed = JSON.parse(raw); // P2
  const theme: string = (parsed as any).theme; // P3
  const settings = { theme, fontSize: parsed.size }; // P4
  cache.set(user, settings);
  return settings as unknown as Settings; // P5
}

export function readTheme(input: unknown): string {
  return (input as Settings).theme; // P6
}
