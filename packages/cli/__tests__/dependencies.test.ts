import { describe, expect, test } from "bun:test";
import path from "node:path";

import { z } from "zod";

import { options } from "../src/data/options";
import {
  buildEslintDevDependencies,
  dependencyNamesByLinter,
  eslintCoreDevDependencies,
  eslintFrameworkDevDependencies,
  eslintPeerOverridePackages,
  eslintPeerOverridesFor,
} from "../src/dependencies";

// The preload mocks node:fs; the real readers are stashed on globalThis.
const readFile = (filePath: string): string =>
  globalThis.__realReadFileSync(filePath, "utf-8");

const readDir = (dirPath: string): string[] => {
  try {
    return globalThis.__realReaddirSync(dirPath).map(String);
  } catch {
    return [];
  }
};

const eslintConfigDir = path.join(import.meta.dir, "..", "config", "eslint");
const IMPORT_SOURCE_RE = /from\s+"(?<source>[^".][^"]*)"/gu;

// The npm package an import specifier resolves to: `@scope/name` for scoped
// packages, the first segment otherwise.
const packageName = (specifier: string): string => {
  const segments = specifier.split("/");

  return specifier.startsWith("@")
    ? segments.slice(0, 2).join("/")
    : (segments[0] ?? specifier);
};

const modulesIn = (dir: string): string[] =>
  readDir(dir)
    .filter((file) => file.endsWith(".mjs"))
    .map((file) => path.join(dir, file));

// Every package a preset's modules, rule files and type-aware add-on import.
const presetImports = (preset: string): string[] => {
  const presetDir = path.join(eslintConfigDir, preset);

  const files = [
    ...modulesIn(presetDir),
    ...modulesIn(path.join(presetDir, "rules")),
    ...modulesIn(path.join(presetDir, "type-aware")),
  ];

  const packages = new Set<string>();

  for (const file of files) {
    for (const match of readFile(file).matchAll(IMPORT_SOURCE_RE)) {
      const source = match.groups?.source ?? "";

      if (!source.startsWith("node:")) {
        packages.add(packageName(source));
      }
    }
  }

  return [...packages];
};

describe("ESLint dependencies", () => {
  test("installs every package the core preset imports", () => {
    const installed = Object.keys(eslintCoreDevDependencies);

    for (const dependency of presetImports("core")) {
      expect(installed).toContain(dependency);
    }
  });

  test("installs every package each framework preset imports", () => {
    for (const framework of options.frameworks) {
      const installed = Object.keys(buildEslintDevDependencies([framework]));

      for (const dependency of presetImports(framework)) {
        expect({
          dependency,
          framework,
          installed: installed.includes(dependency),
        }).toEqual({
          dependency,
          framework,
          installed: true,
        });
      }
    }
  });

  test("installs every package the type-aware preset imports", () => {
    const installed = Object.keys(eslintCoreDevDependencies);

    for (const dependency of presetImports("type-aware")) {
      expect(installed).toContain(dependency);
    }
  });

  test("installs Cypress and Storybook support only with their presets", () => {
    const core = Object.keys(eslintCoreDevDependencies);

    for (const name of [
      "eslint-plugin-cypress",
      "eslint-plugin-storybook",
      "storybook",
    ]) {
      expect(core).not.toContain(name);
    }

    expect(Object.keys(eslintFrameworkDevDependencies.cypress)).toEqual([
      "eslint-plugin-cypress",
    ]);
    expect(Object.keys(eslintFrameworkDevDependencies.storybook)).toEqual([
      "eslint-plugin-storybook",
      "storybook",
    ]);
  });

  test("no longer installs the Prettier plugins but still prunes them", () => {
    const core = Object.keys(eslintCoreDevDependencies);

    for (const name of ["eslint-plugin-prettier", "stylelint-prettier"]) {
      expect(core).not.toContain(name);
      expect(dependencyNamesByLinter.eslint.has(name)).toBe(true);
    }
  });

  // Bun runs the Oxlint config's JS plugins and the editors run oxlint,
  // oxfmt and oxlint-tsgolint on it, so switching between the two prunes
  // nothing either way.
  test("keeps the Oxlint packages when switching to Bun and back", () => {
    expect(dependencyNamesByLinter.bun).toEqual(dependencyNamesByLinter.oxlint);
  });

  test("pins every package instead of installing latest", () => {
    const versions = [
      ...Object.values(eslintCoreDevDependencies),
      ...Object.values(eslintFrameworkDevDependencies).flatMap((dependencies) =>
        Object.values(dependencies)
      ),
    ];

    expect(versions).not.toContain("latest");
  });

  test("installs the NestJS plugin with the nestjs preset", () => {
    expect(Object.keys(eslintFrameworkDevDependencies.nestjs)).toContain(
      "@darraghor/eslint-plugin-nestjs-typed"
    );
  });
});

const manifestSchema = z.looseObject({
  peerDependencies: z.record(z.string(), z.string()).optional(),
  version: z.string(),
});

// The manifest of a package installed for this workspace.
const installedManifest = (name: string) =>
  manifestSchema.parse(
    JSON.parse(
      readFile(
        path.join(import.meta.dir, "..", "node_modules", name, "package.json")
      )
    )
  );

describe("eslintPeerOverridePackages", () => {
  test("lists every ESLint plugin whose eslint peer range excludes the ESLint init installs", () => {
    const eslintVersion = installedManifest("eslint").version;

    const names = new Set([
      ...Object.keys(eslintCoreDevDependencies),
      ...Object.values(eslintFrameworkDevDependencies).flatMap((deps) =>
        Object.keys(deps)
      ),
    ]);

    const behind = [...names].filter((name) => {
      const range = installedManifest(name).peerDependencies?.eslint;

      return range !== undefined && !Bun.semver.satisfies(eslintVersion, range);
    });

    expect(behind.toSorted()).toEqual(
      [...eslintPeerOverridePackages].toSorted()
    );
  });

  test("picks the listed packages out of name@version specs", () => {
    expect(
      eslintPeerOverridesFor([
        "eslint@^10.12.0",
        "@tanstack/eslint-plugin-start@^0.1.0",
        "eslint-plugin-react@^7.37.5",
        "eslint-plugin-react-hooks@^7.1.1",
      ])
    ).toEqual(["@tanstack/eslint-plugin-start", "eslint-plugin-react"]);
    expect(eslintPeerOverridesFor(["eslint-plugin-jsx-a11y"])).toEqual([
      "eslint-plugin-jsx-a11y",
    ]);
  });
});
