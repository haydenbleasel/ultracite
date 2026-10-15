import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";

import { $ } from "bun";
import type { OxlintConfig } from "oxlint";

import { defineConfig } from "../config/bun/index.mjs";
import { bunRules } from "../config/bun/rules.mjs";
import oxfmt from "../config/oxfmt/index.mjs";
import antiSlop from "../config/oxlint/anti-slop/index.mjs";
import core from "../config/oxlint/core/index.mjs";
import vue from "../config/oxlint/vue/index.mjs";

const oxlintConfigDirectory = path.join(
  import.meta.dirname,
  "../config/oxlint"
);

const childDirectories = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? [entry.name] : []
  );

// Every preset, including the nested add-ons such as next/js-plugins.
const presetNames = childDirectories(oxlintConfigDirectory).flatMap((name) => [
  name,
  ...childDirectories(path.join(oxlintConfigDirectory, name)).map(
    (child) => `${name}/${child}`
  ),
]);

const ruleNames = (config: OxlintConfig): string[] => [
  ...Object.keys(config.rules ?? {}),
  ...(config.overrides ?? []).flatMap((override) =>
    Object.keys(override.rules ?? {})
  ),
];

const forBun = (preset: OxlintConfig): OxlintConfig => {
  const [adapted] = defineConfig({ extends: [preset] }).extends;

  return adapted;
};

// oxlint plugins Bun has no rules for at all, listed as `plugin/*`; any
// other rule Bun lacks is listed by name.
const unsupportedPlugins = new Set(["jsdoc", "vue"]);

const droppedRules = (preset: OxlintConfig): string[] => {
  const kept = new Set(ruleNames(forBun(preset)));

  return [
    ...new Set(
      ruleNames(preset)
        .filter((name) => !kept.has(name))
        .map((name) => {
          const plugin = name.split("/")[0] ?? "";

          return unsupportedPlugins.has(plugin) ? `${plugin}/*` : name;
        })
    ),
  ].toSorted();
};

// Runs `body` from a new, real project directory, with or without a
// `tailwindcss` package installed. node:fs and node:fs/promises are mocked
// in this suite, so the files go through Bun's own APIs.
const inProject = async <T>(
  withTailwindcss: boolean,
  body: () => T
): Promise<T> => {
  const dir = path.join(tmpdir(), `ultracite-bun-${randomUUID()}`);
  const previous = process.cwd();

  await Bun.write(path.join(dir, "package.json"), "{}");

  if (withTailwindcss) {
    await Bun.write(
      path.join(dir, "node_modules", "tailwindcss", "package.json"),
      JSON.stringify({ name: "tailwindcss", version: "4.0.0" })
    );
  }

  try {
    process.chdir(dir);

    return body();
  } finally {
    process.chdir(previous);
    await $`rm -rf ${dir}`.quiet();
  }
};

describe("ultracite/bun defineConfig", () => {
  test("drops the jsdoc rules and plugin from core", () => {
    const adapted = forBun(core);

    expect(ruleNames(adapted).some((name) => name.startsWith("jsdoc/"))).toBe(
      false
    );
    expect(adapted.plugins).not.toContain("jsdoc");
    expect(adapted.plugins).toEqual(
      core.plugins?.filter((plugin) => plugin !== "jsdoc")
    );
    expect(adapted.rules?.eqeqeq).toEqual(core.rules?.eqeqeq);
    expect(adapted.ignorePatterns).toBe(core.ignorePatterns);
  });

  test("keeps the rules of JS plugins, which Bun runs itself", () => {
    expect(forBun(antiSlop).rules).toEqual(antiSlop.rules);
    expect(forBun(antiSlop).jsPlugins).toEqual(antiSlop.jsPlugins);
  });

  test("drops unsupported rules from overrides and nested extends", () => {
    const preset: OxlintConfig = {
      extends: [
        { rules: { "jsdoc/check-access": "error", "no-var": "error" } },
      ],
      overrides: [
        {
          files: ["**/*.vue"],
          plugins: ["vue"],
          rules: { "no-console": "error", "vue/max-props": "error" },
        },
      ],
    };

    expect(forBun(preset)).toEqual({
      extends: [{ rules: { "no-var": "error" } }],
      overrides: [
        {
          files: ["**/*.vue"],
          plugins: [],
          rules: { "no-console": "error" },
        },
      ],
    });
  });

  // An unsupported rule the project turns on itself is its own call. Like
  // oxlint, Bun skips it unless the project also lists its plugin, and then
  // reports it as unsupported.
  test("leaves the config's own rules as written", () => {
    const config = defineConfig({
      extends: [core],
      rules: { "jsdoc/check-access": "error" },
    });

    expect(config.rules).toEqual({ "jsdoc/check-access": "error" });
  });

  test("returns a format config unchanged when tailwindcss is installed", async () => {
    const config = { ...oxfmt, printWidth: 100 };

    expect(await inProject(true, () => defineConfig(config))).toBe(config);
  });

  // Without tailwindcss, `bun fmt` leaves files with classes to sort
  // unformatted and exits 2.
  test("turns Tailwind class sorting off when tailwindcss isn't installed", async () => {
    const config = { ...oxfmt, printWidth: 100 };
    const { sortTailwindcss, ...rest } = config;
    const adapted = await inProject(false, () => defineConfig(config));

    expect(sortTailwindcss).toBeDefined();
    expect(Object.entries(adapted)).toEqual(Object.entries(rest));
  });

  test("doesn't change the presets it adapts", () => {
    const before = structuredClone(core);

    forBun(core);
    forBun(vue);

    expect(core).toEqual(before);
    expect(Object.keys(vue.rules ?? {}).length).toBeGreaterThan(0);
  });

  test("knows Bun's rules under the names the presets use", () => {
    for (const name of [
      "eqeqeq",
      "typescript/no-explicit-any",
      "@typescript-eslint/no-explicit-any",
      "react/rules-of-hooks",
      "react-perf/jsx-no-new-object-as-prop",
      "jsx-a11y/alt-text",
      "nextjs/no-img-element",
      "unicorn/prefer-node-protocol",
    ]) {
      expect(bunRules).toContain(name);
    }
  });

  // When a toolchain bump enables a rule Bun doesn't have yet, it shows up
  // here: Bun users lose it until scripts/sync-bun-rules.ts picks up a Bun
  // release that has it.
  test("drops only the rules Bun is known not to have", async () => {
    const droppedByPreset = await Promise.all(
      presetNames.map(async (name) => {
        const preset: { default: OxlintConfig } = await import(
          path.join(oxlintConfigDirectory, name, "index.mjs")
        );

        return [name, droppedRules(preset.default)] as const;
      })
    );

    const dropped = Object.fromEntries(
      droppedByPreset.filter(([, rules]) => rules.length > 0)
    );

    expect(dropped).toEqual({
      core: ["jsdoc/*"],
      vue: ["vue/*"],
    });
  });
});
