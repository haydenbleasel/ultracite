import { describe, expect, test } from "bun:test";
import { readFileSync as _readFileSync } from "node:fs";
import { join } from "node:path";

import { getRules } from "../src/rules";

// When running from the monorepo root, the CLI preload mocks node:fs.
// Use the real readFileSync stashed on globalThis, falling back to the import.
const readFileSync = ((globalThis as Record<string, unknown>)
  .__realReadFileSync ?? _readFileSync) as typeof _readFileSync;

const repoRoot = join(import.meta.dir, "..", "..", "..");
const skillPath = join(repoRoot, "skills", "ultracite", "SKILL.md");
const standardsPath = join(
  repoRoot,
  "skills",
  "ultracite",
  "references",
  "code-standards.md"
);

describe("rules content", () => {
  test("generated agent rules leave formatter details to the configured provider", () => {
    const rules = getRules("npx", "Biome");

    expect(rules).not.toContain("## Formatting");
    expect(rules).toContain(
      "Most formatting and common issues are automatically fixed by Biome."
    );
  });

  test("installable skill docs stay portable across repositories", () => {
    const skill = readFileSync(skillPath, "utf-8");
    const standards = readFileSync(standardsPath, "utf-8");

    expect(skill).not.toContain("**Formatting:**");
    expect(skill).toContain(
      "Formatting is handled by the project's configured linter/formatter."
    );

    expect(standards).not.toContain("## Formatting");
    expect(standards).toContain(
      "Formatting is intentionally handled by your project's configured linter or formatter."
    );
  });
});
