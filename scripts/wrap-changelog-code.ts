import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const target = process.argv[2] ?? join("packages", "cli", "CHANGELOG.md");

const protectedPattern = /(`[^`\n]+`|\[[^\]\n]*\]\([^)\n]*\)|https?:\/\/\S+)/g;

const transforms: { pattern: RegExp; wrap: (m: string) => string }[] = [
  {
    pattern: /\b[a-zA-Z_][\w]*(?:\.[a-zA-Z_][\w]*)*\(\)/g,
    wrap: (m) => `\`${m}\``,
  },
  {
    pattern: /\{[#:/][a-zA-Z]+\}/g,
    wrap: (m) => `\`${m}\``,
  },
  {
    pattern:
      /\b(?:bun\.lock|bun\.lockb|package-lock\.json|yarn\.lock|pnpm-lock\.yaml|biome\.jsonc?|tsconfig\.json|package\.json)\b/g,
    wrap: (m) => `\`${m}\``,
  },
  {
    pattern:
      /(?<![-@\w])@[a-z][a-z0-9-]*\/[a-z][a-z0-9-]+(?:@[\w.+~-]+)?(?![\w-])/g,
    wrap: (m) => `\`${m}\``,
  },
  {
    pattern:
      /(?<![-@\w/])[a-z][a-z0-9]*\/[a-z][a-z0-9]*(?:-[a-z0-9]+)+(?![\w-/])/g,
    wrap: (m) => `\`${m}\``,
  },
  {
    pattern: /\b(?:use|no|prefer|require|valid|consistent)[A-Z][a-zA-Z0-9]+\b/g,
    wrap: (m) => `\`${m}\``,
  },
];

const transformSegment = (text: string): string => {
  let out = text;
  for (const { pattern, wrap } of transforms) {
    out = out.replace(pattern, wrap);
  }
  return out;
};

const raw = await readFile(target, "utf-8");

let output = "";
let lastIndex = 0;
for (const match of raw.matchAll(protectedPattern)) {
  const start = match.index ?? 0;
  output += transformSegment(raw.slice(lastIndex, start));
  output += match[0];
  lastIndex = start + match[0].length;
}
output += transformSegment(raw.slice(lastIndex));

await writeFile(target, output);

console.log(`Transformed ${target}`);
