import { beforeEach, describe, expect, test } from "bun:test";
import path from "node:path";

import {
  buildUnresolvableBiomeConfigMessage,
  canResolveUltracite,
  findUnresolvableBiomeConfig,
} from "../src/config-resolution";
import type { ConfigFileSystem } from "../src/config-resolution";

const PROJECT = "/project";

// The project on disk, described as absolute path → contents and handed to the
// resolver directly, so these tests don't depend on the global node:fs mock.
let files: Map<string, string>;

const fileSystem: ConfigFileSystem = {
  exists: (filePath) => files.has(filePath),
  readFile: (filePath) => {
    const content = files.get(filePath);

    if (content === undefined) {
      throw new Error(`ENOENT: ${filePath}`);
    }

    return content;
  },
};

const writeFile = (filePath: string, content: string): void => {
  files.set(path.join(PROJECT, filePath), content);
};

const ultracitePackageJson = JSON.stringify({
  exports: {
    "./biome/*": "./config/biome/*/biome.jsonc",
    "./eslint/*": "./config/eslint/*/eslint.config.mjs",
    "./oxlint/*": {
      default: "./config/oxlint/*/index.mjs",
      types: "./config/oxlint/*/index.d.mts",
    },
  },
  name: "ultracite",
  version: "7.9.3",
});

// A stand-in for an installed Ultracite: the exports map plus the files it
// points at, which is all a linter actually resolves.
const installUltracite = (): void => {
  writeFile("node_modules/ultracite/package.json", ultracitePackageJson);
  writeFile("node_modules/ultracite/config/biome/core/biome.jsonc", "{}");
  writeFile(
    "node_modules/ultracite/config/eslint/core/eslint.config.mjs",
    "export default [];"
  );
  writeFile(
    "node_modules/ultracite/config/oxlint/core/index.mjs",
    "export {};"
  );
};

const biomeConfig = JSON.stringify({ extends: ["ultracite/biome/core"] });

describe("config-resolution", () => {
  beforeEach(() => {
    files = new Map();
  });

  describe("canResolveUltracite", () => {
    test("resolves each linter's config from node_modules", () => {
      installUltracite();

      expect(canResolveUltracite("biome", PROJECT, fileSystem)).toBe(true);
      expect(canResolveUltracite("eslint", PROJECT, fileSystem)).toBe(true);
      expect(canResolveUltracite("oxlint", PROJECT, fileSystem)).toBe(true);
    });

    test("fails when ultracite is not installed", () => {
      expect(canResolveUltracite("biome", PROJECT, fileSystem)).toBe(false);
    });

    test("resolves from an ancestor's node_modules", () => {
      installUltracite();

      expect(
        canResolveUltracite("biome", path.join(PROJECT, "apps/web"), fileSystem)
      ).toBe(true);
    });

    test("fails when the installed version has no matching export", () => {
      writeFile(
        "node_modules/ultracite/package.json",
        JSON.stringify({
          exports: { ".": "./dist/index.js" },
          name: "ultracite",
        })
      );

      expect(canResolveUltracite("biome", PROJECT, fileSystem)).toBe(false);
    });

    test("fails when the export points at a file that isn't there", () => {
      writeFile("node_modules/ultracite/package.json", ultracitePackageJson);

      expect(canResolveUltracite("biome", PROJECT, fileSystem)).toBe(false);
    });

    // Node substitutes every `*` in the target, so a target using the wildcard
    // more than once has to expand in full — replacing only the first would
    // resolve to a path that doesn't exist.
    test("substitutes every wildcard in the export target", () => {
      writeFile(
        "node_modules/ultracite/package.json",
        JSON.stringify({
          exports: { "./biome/*": "./config/biome/*/*.jsonc" },
          name: "ultracite",
        })
      );
      writeFile("node_modules/ultracite/config/biome/core/core.jsonc", "{}");

      expect(canResolveUltracite("biome", PROJECT, fileSystem)).toBe(true);
    });
  });

  describe("findUnresolvableBiomeConfig", () => {
    test("returns the config when its extends cannot be resolved", () => {
      writeFile("biome.jsonc", biomeConfig);

      expect(findUnresolvableBiomeConfig(PROJECT, fileSystem)).toBe(
        path.join(PROJECT, "biome.jsonc")
      );
    });

    test("returns null when ultracite is installed", () => {
      installUltracite();
      writeFile("biome.jsonc", biomeConfig);

      expect(findUnresolvableBiomeConfig(PROJECT, fileSystem)).toBeNull();
    });

    test("returns null when there is no biome config", () => {
      expect(findUnresolvableBiomeConfig(PROJECT, fileSystem)).toBeNull();
    });

    test("returns null when the config extends a relative path", () => {
      writeFile(
        "biome.jsonc",
        JSON.stringify({
          extends: ["./node_modules/ultracite/config/biome/core/biome.jsonc"],
        })
      );

      expect(findUnresolvableBiomeConfig(PROJECT, fileSystem)).toBeNull();
    });

    test("returns null when the config cannot be parsed", () => {
      writeFile("biome.jsonc", "not json");

      expect(findUnresolvableBiomeConfig(PROJECT, fileSystem)).toBeNull();
    });
  });

  test("the error message names the config and how to fix it", () => {
    const message = buildUnresolvableBiomeConfigMessage("/app/biome.jsonc");

    expect(message).toContain("biome.jsonc");
    expect(message).toContain("ultracite/biome/core");
    expect(message).toContain("/app");
    expect(message).toContain("install");
  });
});
