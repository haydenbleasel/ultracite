import { describe, expect, test } from "bun:test";
import path from "node:path";

import { options } from "../src/data/options";
import {
  buildEslintDevDependencies,
  eslintCoreDevDependencies,
  eslintFrameworkDevDependencies,
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

// Every package a preset's config (and its rule files) imports.
const presetImports = (preset: string): string[] => {
  const presetDir = path.join(eslintConfigDir, preset);
  const rulesDir = path.join(presetDir, "rules");
  const files = [
    path.join(presetDir, "eslint.config.mjs"),
    ...readDir(rulesDir).map((file) => path.join(rulesDir, file)),
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

  test("installs the NestJS plugin with the nestjs preset", () => {
    expect(Object.keys(eslintFrameworkDevDependencies.nestjs)).toContain(
      "@darraghor/eslint-plugin-nestjs-typed"
    );
  });
});
