import { describe, expect, test } from "bun:test";

import {
  chainScript,
  isGeneratedUltraciteFixCommand,
  localBinCommand,
  runsUltraciteFix,
  ultraciteFixCommand,
} from "../src/integrations/project-command";

describe("localBinCommand", () => {
  test.each([
    ["npm", "npx ultracite fix"],
    ["yarn", "yarn ultracite fix"],
    ["pnpm", "pnpm exec ultracite fix"],
    ["bun", "bunx ultracite fix"],
    ["deno", "deno run -A npm:ultracite fix"],
    ["nub", "nub exec ultracite fix"],
    ["aube", "aube exec ultracite fix"],
  ] as const)(
    "runs the installed binary with %s",
    (packageManager, expected) => {
      expect(ultraciteFixCommand(packageManager)).toBe(expected);
    }
  );

  test("never uses a registry-download runner", () => {
    // `yarn dlx` does not exist in Yarn 1, and `pnpm dlx` ignores the version
    // the project pins.
    expect(localBinCommand("yarn", "lint-staged")).toBe("yarn lint-staged");
    expect(localBinCommand("pnpm", "husky")).toBe("pnpm exec husky");
  });
});

describe("isGeneratedUltraciteFixCommand", () => {
  test("recognises dlx commands written by earlier versions", () => {
    expect(isGeneratedUltraciteFixCommand("yarn dlx ultracite fix")).toBe(true);
    expect(isGeneratedUltraciteFixCommand("pnpm dlx ultracite fix")).toBe(true);
    expect(isGeneratedUltraciteFixCommand("bun x ultracite fix")).toBe(true);
  });

  test("recognises the current commands", () => {
    expect(isGeneratedUltraciteFixCommand("pnpm exec ultracite fix")).toBe(
      true
    );
  });

  test("ignores hand-written commands", () => {
    expect(isGeneratedUltraciteFixCommand("npx ultracite fix --unsafe")).toBe(
      false
    );
    expect(isGeneratedUltraciteFixCommand("eslint --fix")).toBe(false);
  });
});

describe("runsUltraciteFix", () => {
  test("matches ultracite fix however it is invoked", () => {
    expect(runsUltraciteFix("npx ultracite fix")).toBe(true);
    expect(runsUltraciteFix("deno run -A npm:ultracite fix")).toBe(true);
    expect(runsUltraciteFix("./node_modules/.bin/ultracite fix src")).toBe(
      true
    );
  });

  test("does not match other commands", () => {
    expect(runsUltraciteFix("npx ultracite check")).toBe(false);
    expect(runsUltraciteFix("npm test")).toBe(false);
  });
});

describe("chainScript", () => {
  const HUSKY_RE = /\bhusky\b/u;

  test("uses the command when there is no script", () => {
    expect(chainScript(undefined, "husky", HUSKY_RE)).toBe("husky");
    expect(chainScript("  ", "husky", HUSKY_RE)).toBe("husky");
  });

  test("appends to an existing script", () => {
    expect(chainScript("svelte-kit sync || echo ''", "husky", HUSKY_RE)).toBe(
      "svelte-kit sync || echo '' && husky"
    );
  });

  test("keeps a script that already runs the tool", () => {
    expect(chainScript("npm run build && husky", "husky", HUSKY_RE)).toBe(
      "npm run build && husky"
    );
  });
});
