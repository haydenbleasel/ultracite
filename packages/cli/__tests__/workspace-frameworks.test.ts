import { afterEach, describe, expect, mock, test } from "bun:test";

import { biome } from "../src/linters/biome";
import { eslint } from "../src/linters/eslint";
import { oxlint } from "../src/linters/oxlint";
import {
  parseWorkspaceFrameworks,
  pathToRoot,
} from "../src/workspace-frameworks";
import { mockFileSystem, restoreFileSystemMock } from "./mock-fs";

// A project with the given files, keyed by the paths the code reads them at
// (`./` prefixed for existence checks and async reads). Returns the files
// written.
const mockProject = (files: Record<string, string>) => {
  const written = new Map<string, string>();

  mock.module("node:fs/promises", () => ({
    access: mock((path: string) =>
      path in files ? Promise.resolve() : Promise.reject(new Error("ENOENT"))
    ),
    readFile: mock((path: string) =>
      path in files
        ? Promise.resolve(files[path])
        : Promise.reject(new Error("ENOENT"))
    ),
    writeFile: mock((path: string, content: string) => {
      written.set(path, content);
      return Promise.resolve();
    }),
  }));
  mockFileSystem(files);

  return written;
};

afterEach(() => {
  restoreFileSystemMock();
});

describe("parseWorkspaceFrameworks", () => {
  test("groups frameworks by normalized directory", () => {
    mockProject({ "./apps/docs": "", "./apps/web": "" });

    expect(
      parseWorkspaceFrameworks([
        "apps/web=react",
        "./apps/web/=tanstack",
        "apps\\web=react",
        "apps/docs=astro",
      ])
    ).toEqual([
      { dir: "apps/web", frameworks: ["react", "tanstack"] },
      { dir: "apps/docs", frameworks: ["astro"] },
    ]);
  });

  test("returns nothing without the flag", () => {
    expect(parseWorkspaceFrameworks()).toEqual([]);
  });

  test.each([
    "apps/web",
    "apps/web=",
    "=react",
    "apps/web=react=next",
    ".=react",
    "../outside=react",
    "apps/../../outside=react",
    "/abs/path=react",
    "C:\\outside=react",
  ])("rejects %s", (value) => {
    mockProject({ "./apps/web": "" });

    expect(() => parseWorkspaceFrameworks([value])).toThrow(
      `Invalid --workspace-framework value "${value}"`
    );
  });

  test("rejects an unknown framework", () => {
    mockProject({ "./apps/web": "" });

    expect(() => parseWorkspaceFrameworks(["apps/web=nextjs"])).toThrow(
      'Unknown framework "nextjs" in --workspace-framework "apps/web=nextjs".'
    );
  });

  test("rejects a directory that doesn't exist", () => {
    mockProject({});

    expect(() => parseWorkspaceFrameworks(["apps/wbe=react"])).toThrow(
      "points at apps/wbe, which doesn't exist"
    );
  });
});

describe("pathToRoot", () => {
  test("climbs one level per segment", () => {
    expect(pathToRoot("apps/web")).toBe("../..");
    expect(pathToRoot("packages/ui/src")).toBe("../../..");
  });
});

describe("biome workspace config", () => {
  test("repeats the root's extends, then extends the root config", async () => {
    const written = mockProject({
      "./biome.jsonc": JSON.stringify({
        extends: [
          "ultracite/biome/core",
          "ultracite/biome/vitest",
          "./biome/shared.json",
        ],
      }),
    });

    const configPath = await biome.createWorkspace({
      dir: "apps/web",
      frameworks: ["react"],
    });

    expect(configPath).toBe("apps/web/biome.jsonc");
    expect(JSON.parse(written.get("./apps/web/biome.jsonc") ?? "")).toEqual({
      $schema: "../../node_modules/@biomejs/biome/configuration_schema.json",
      extends: [
        "ultracite/biome/core",
        "ultracite/biome/vitest",
        "../../biome/shared.json",
        "../../biome.jsonc",
        "ultracite/biome/react",
      ],
      root: false,
    });
  });

  test("falls back to core without a readable root config", async () => {
    const written = mockProject({});

    await biome.createWorkspace({ dir: "apps/web", frameworks: ["react"] });

    expect(
      JSON.parse(written.get("./apps/web/biome.jsonc") ?? "").extends
    ).toEqual([
      "ultracite/biome/core",
      "../../biome.jsonc",
      "ultracite/biome/react",
    ]);
  });

  test("finds an existing workspace config", () => {
    mockProject({ "./apps/web/biome.json": "{}" });

    expect(biome.findWorkspaceConfig("apps/web")).toBe("apps/web/biome.json");
    expect(biome.findWorkspaceConfig("apps/docs")).toBeNull();
  });
});

describe("oxlint workspace config", () => {
  test("extends the root config and repeats what extends doesn't carry", async () => {
    const written = mockProject({
      "./oxlint.config.ts": "export default {};",
      "package.json": '{ "type": "module" }',
    });

    const configPath = await oxlint.createWorkspace({
      dir: "apps/web",
      frameworks: ["react"],
    });

    expect(configPath).toBe("apps/web/oxlint.config.ts");
    expect(written.get("./apps/web/oxlint.config.ts"))
      .toBe(`import { defineConfig } from "oxlint";
import react from "ultracite/oxlint/react";

import root from "../../oxlint.config.ts";

// Oxlint lints each file with its nearest config alone, so this extends the
// root config and repeats the properties that extends doesn't carry over.
export default defineConfig({
  extends: [root, react],
  ignorePatterns: root.ignorePatterns,
  settings: root.settings,
});
`);
  });

  test("writes .mts outside an ES module workspace package", async () => {
    const written = mockProject({
      "./oxlint.config.mts": "export default {};",
      "apps/web/package.json": '{ "name": "web" }',
      "package.json": '{ "type": "module" }',
    });

    const configPath = await oxlint.createWorkspace({
      dir: "apps/web",
      frameworks: ["vue"],
    });

    expect(configPath).toBe("apps/web/oxlint.config.mts");
    expect(written.get("./apps/web/oxlint.config.mts")).toContain(
      'import root from "../../oxlint.config.mts";'
    );
  });

  test("adds react-doctor add-ons when the root config selects it", async () => {
    const written = mockProject({
      "./oxlint.config.ts":
        'const jsPlugins = selectJsPlugins(["react-doctor"]);',
      "package.json": '{ "type": "module" }',
    });

    await oxlint.createWorkspace({
      dir: "apps/web",
      frameworks: ["react", "next"],
    });

    const contents = written.get("./apps/web/oxlint.config.ts") ?? "";
    expect(contents).toContain(
      'import nextJsPlugins from "ultracite/oxlint/next/js-plugins";'
    );
    expect(contents).toContain("extends: [root, react, next, nextJsPlugins],");
  });

  test("breaks a long extends list over several lines", async () => {
    const written = mockProject({
      "./oxlint.config.ts": "export default {};",
      "package.json": '{ "type": "module" }',
    });

    await oxlint.createWorkspace({
      dir: "apps/web",
      frameworks: [
        "react",
        "next",
        "tanstack",
        "vitest",
        "remix",
        "angular",
        "astro",
        "solid",
        "nestjs",
      ],
    });

    expect(written.get("./apps/web/oxlint.config.ts")).toContain(
      "  extends: [\n    root,\n    react,\n    next,\n"
    );
  });

  test("finds an existing workspace config", () => {
    mockProject({ "./apps/web/.oxlintrc.json": "{}" });

    expect(oxlint.findWorkspaceConfig("apps/web")).toBe(
      "apps/web/.oxlintrc.json"
    );
  });
});

describe("eslint workspace config", () => {
  test("disables the import rules a workspace package trips", async () => {
    const written = mockProject({
      "./eslint.config.mjs": "export default [];",
      "apps/web/package.json": '{ "name": "web" }',
    });

    const configPath = await eslint.createWorkspace({
      dir: "apps/web",
      frameworks: ["react", "tanstack"],
    });

    expect(configPath).toBe("apps/web/eslint.config.mjs");
    expect(written.get("./apps/web/eslint.config.mjs"))
      .toBe(`/* eslint-disable import-x/no-extraneous-dependencies, import-x/no-relative-packages -- imports the presets and config of the root package */
import react from "ultracite/eslint/react";
import tanstack from "ultracite/eslint/tanstack";

import root from "../../eslint.config.mjs";

// ESLint lints each file with its nearest config alone, so this spreads the
// root config before the workspace's presets.
export default [
  ...root,
  ...react,
  ...tanstack,
];
`);
  });

  test("keeps the dependency rule when the workspace declares ultracite", async () => {
    const written = mockProject({
      "./eslint.config.js": "export default [];",
      "apps/web/package.json": '{ "devDependencies": { "ultracite": "*" } }',
    });

    await eslint.createWorkspace({ dir: "apps/web", frameworks: ["react"] });

    const contents = written.get("./apps/web/eslint.config.mjs") ?? "";
    expect(contents.split("\n")[0]).toBe(
      "/* eslint-disable import-x/no-relative-packages -- imports the presets and config of the root package */"
    );
    expect(contents).toContain('import root from "../../eslint.config.js";');
  });

  test("adds no directive for a directory of the root package", async () => {
    const written = mockProject({
      "./eslint.config.mjs": "export default [];",
    });

    await eslint.createWorkspace({ dir: "src/legacy", frameworks: ["react"] });

    expect(written.get("./src/legacy/eslint.config.mjs")).toStartWith(
      'import react from "ultracite/eslint/react";'
    );
  });

  test("finds an existing workspace config", () => {
    mockProject({ "./apps/web/eslint.config.ts": "export default [];" });

    expect(eslint.findWorkspaceConfig("apps/web")).toBe(
      "apps/web/eslint.config.ts"
    );
  });
});
