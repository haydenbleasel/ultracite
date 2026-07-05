import { describe, expect, test } from "bun:test";
/**
 * Oxlint config rule conflict tests
 *
 * These tests validate that mutually exclusive rules in oxlint configs are
 * not both enabled simultaneously. When two rules conflict, one must be
 * explicitly disabled.
 *
 * The core config also validates that it only contains rules from core plugins
 * (not jest, vitest, react, etc.) to prevent cross-plugin conflicts when
 * framework configs activate their plugins (#660).
 */
import { readdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import packageJson from "../package.json";

const readOxlintConfig = async (name: string) => {
  const configPath = path.join(import.meta.dirname, `../config/oxlint/${name}`);
  const mod = await import(configPath);
  return mod.default;
};

const isEnabled = (rule: unknown) => rule === "error" || rule === "warn";

const CORE_PLUGINS = [
  "eslint",
  "typescript",
  "unicorn",
  "oxc",
  "import",
  "jsdoc",
  "node",
  "promise",
];

/**
 * Parse `oxlint --rules --format=json` output to extract non-nursery rules
 * for specific plugins. Returns rule names in the format used by config
 * files (e.g. "no-eval", "typescript/no-explicit-any"). The plain markdown
 * output of `--rules` is empty as of oxlint 1.72, which made the previous
 * text-parsing version of this helper silently return nothing.
 */
const getOxlintRulesForPlugins = (plugins: string[]): string[] => {
  // Bun.spawnSync rather than node:child_process — several test files
  // install module-level mocks of node:child_process that leak across
  // files when the suite runs without --isolate.
  //
  // Run from the system temp dir with an absolute binary path so oxlint
  // does not walk up and auto-discover the repo's `oxlint.config.ts`. The
  // rule catalog is config-independent, and node <22.18 (e.g. the node-20
  // CI matrix runtime) cannot load a TypeScript config file, which would
  // otherwise make oxlint print a load error instead of the rules JSON.
  const oxlintBin = path.join(
    import.meta.dirname,
    "../node_modules/.bin/oxlint"
  );
  const result = Bun.spawnSync([oxlintBin, "--rules", "--format=json"], {
    cwd: os.tmpdir(),
  });
  const output = result.stdout.toString();
  const entries = JSON.parse(output) as {
    scope: string;
    value: string;
    category: string;
  }[];

  const rules: string[] = [];
  for (const entry of entries) {
    if (entry.category === "nursery") {
      continue;
    }
    // JSON scopes use underscores (react_perf); config prefixes use hyphens.
    const plugin = entry.scope.replaceAll("_", "-");
    if (plugins.includes(plugin)) {
      rules.push(
        plugin === "eslint" ? entry.value : `${plugin}/${entry.value}`
      );
    }
  }

  if (rules.length === 0) {
    throw new Error(
      `oxlint --rules returned no rules for plugins: ${plugins.join(", ")}`
    );
  }

  return rules.toSorted();
};

describe("oxlint package exports", () => {
  test("publishes typed oxlint subpath exports", () => {
    expect(packageJson.exports["./oxlint/*"]).toEqual({
      default: "./config/oxlint/*/index.mjs",
      types: "./config/oxlint/*/index.d.mts",
    });
  });

  test("ships declaration files for each oxlint config", () => {
    const oxlintConfigDirectory = path.join(
      import.meta.dirname,
      "../config/oxlint"
    );
    const configs = readdirSync(oxlintConfigDirectory, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .toSorted();

    const typedConfigs = configs.filter((config) => {
      const configFiles = readdirSync(path.join(oxlintConfigDirectory, config));
      return configFiles.includes("index.d.mts");
    });

    expect(typedConfigs).toEqual(configs);
  });

  test("publishes typed oxfmt export", () => {
    expect(packageJson.exports["./oxfmt"]).toEqual({
      default: "./config/oxfmt/index.mjs",
      types: "./config/oxfmt/index.d.mts",
    });
  });

  test("ships oxfmt declaration file", () => {
    const oxfmtFiles = readdirSync(
      path.join(import.meta.dirname, "../config/oxfmt")
    );

    expect(oxfmtFiles).toContain("index.d.mts");
  });
});

describe("oxlint core config", () => {
  /**
   * Core config must only contain rules from core plugins (#660).
   *
   * Previously, the core config used `categories: { correctness: "error", ... }` which
   * armed ALL rules across ALL plugins. These rules stayed inert until a framework config
   * activated their plugin — at which point non-core rules (jest, vitest, react, etc.)
   * would fire unexpectedly, causing cross-plugin conflicts.
   *
   * Now the core config explicitly lists rules for core plugins only.
   */
  test("does not use categories (uses explicit rules instead)", async () => {
    const config = await readOxlintConfig("core");
    expect(
      config.categories,
      "core config must not use categories — use explicit rules to avoid arming non-core plugin rules"
    ).toBeUndefined();
  });

  test("contains all non-nursery rules for core plugins", async () => {
    const expectedRules = getOxlintRulesForPlugins(CORE_PLUGINS);
    const config = await readOxlintConfig("core");
    const configRules = new Set(Object.keys(config.rules ?? {}).toSorted());

    const missingRules = expectedRules.filter((rule) => !configRules.has(rule));
    expect(
      missingRules,
      `Core config is missing ${missingRules.length} rules from core plugins: ${missingRules.join(", ")}`
    ).toEqual([]);
  });

  test("does not contain rules from non-core plugins", async () => {
    const config = await readOxlintConfig("core");
    const configRules = Object.keys(config.rules ?? {});

    // Also check overrides
    const overrideRules = (config.overrides ?? []).flatMap(
      (override: { rules?: Record<string, unknown> }) =>
        Object.keys(override.rules ?? {})
    );

    const allRules = [...configRules, ...overrideRules];
    const nonCoreRules = allRules.filter((rule) => {
      const plugin = rule.includes("/") ? rule.split("/")[0] : "eslint";
      return !CORE_PLUGINS.includes(plugin);
    });

    expect(
      nonCoreRules,
      `Core config contains rules from non-core plugins: ${nonCoreRules.join(", ")}`
    ).toEqual([]);
  });
});

describe("oxlint vitest config", () => {
  /**
   * prefer-called-once vs prefer-called-times
   *
   * These two rules are mutually exclusive and enforce opposite styles:
   * - prefer-called-once: enforce toHaveBeenCalledOnce() over toHaveBeenCalledTimes(1)
   * - prefer-called-times: enforce toHaveBeenCalledTimes(1) over toHaveBeenCalledOnce()
   *
   * Enabling both causes an unfixable conflict: any valid code would trigger one of
   * the two rules simultaneously. The ESLint vitest config resolves this by disabling
   * prefer-called-times (see packages/cli/config/eslint/vitest/rules/vitest.mjs).
   * The oxlint vitest config must be consistent.
   */
  describe("prefer-called-once vs prefer-called-times conflict", () => {
    test("prefer-called-times is explicitly disabled to avoid conflict with prefer-called-once", async () => {
      const config = await readOxlintConfig("vitest");
      const rules = config.overrides?.[0]?.rules ?? {};

      // prefer-called-times must be "off" — it directly contradicts prefer-called-once
      expect(rules["vitest/prefer-called-times"]).toBe("off");
    });

    test("prefer-called-once and prefer-called-times are not both enabled", async () => {
      const config = await readOxlintConfig("vitest");
      const rules = config.overrides?.[0]?.rules ?? {};

      const calledOnceEnabled = isEnabled(rules["vitest/prefer-called-once"]);
      const calledTimesEnabled = isEnabled(rules["vitest/prefer-called-times"]);

      expect(
        calledOnceEnabled && calledTimesEnabled,
        "prefer-called-once and prefer-called-times are both enabled — they conflict: one enforces toHaveBeenCalledOnce(), the other enforces toHaveBeenCalledTimes(1)"
      ).toBe(false);
    });
  });

  /**
   * prefer-to-be-truthy/falsy vs prefer-strict-boolean-matchers
   *
   * These rules are mutually exclusive and enforce opposite styles:
   * - prefer-to-be-truthy: enforce toBeTruthy() over toBe(true)
   * - prefer-to-be-falsy: enforce toBeFalsy() over toBe(false)
   * - prefer-strict-boolean-matchers: enforce toBe(true)/toBe(false) over toBeTruthy()/toBeFalsy()
   *
   * Enabling both causes an unfixable conflict. The ESLint vitest config resolves this by
   * disabling prefer-strict-boolean-matchers (see packages/cli/config/eslint/vitest/rules/vitest.mjs).
   * The oxlint vitest config must be consistent.
   */
  /**
   * prefer-describe-function-title vs valid-title (#665)
   *
   * These rules are mutually exclusive:
   * - prefer-describe-function-title: enforce describe(fn, ...) with a function reference
   * - valid-title: enforce describe('string', ...) with a string literal
   *
   * Enabling both causes an unfixable conflict: prefer-describe-function-title auto-fixes
   * string titles to function references, then valid-title flags the result as an error.
   */
  describe("prefer-describe-function-title vs valid-title conflict", () => {
    test("valid-title is explicitly disabled to avoid conflict with prefer-describe-function-title", async () => {
      const config = await readOxlintConfig("vitest");
      const rules = config.overrides?.[0]?.rules ?? {};

      expect(rules["vitest/valid-title"]).toBe("off");
    });

    test("valid-title and prefer-describe-function-title are not both enabled", async () => {
      const config = await readOxlintConfig("vitest");
      const rules = config.overrides?.[0]?.rules ?? {};

      const validTitleEnabled = isEnabled(rules["vitest/valid-title"]);
      const preferDescribeFnEnabled = isEnabled(
        rules["vitest/prefer-describe-function-title"]
      );

      expect(
        validTitleEnabled && preferDescribeFnEnabled,
        "valid-title and prefer-describe-function-title are both enabled — they conflict: one requires string titles, the other requires function references"
      ).toBe(false);
    });
  });

  describe("prefer-to-be-truthy/falsy vs prefer-strict-boolean-matchers conflict", () => {
    test("prefer-strict-boolean-matchers is explicitly disabled to avoid conflict", async () => {
      const config = await readOxlintConfig("vitest");
      const rules = config.overrides?.[0]?.rules ?? {};

      expect(rules["vitest/prefer-strict-boolean-matchers"]).toBe("off");
    });

    test("prefer-strict-boolean-matchers is not enabled alongside prefer-to-be-truthy or prefer-to-be-falsy", async () => {
      const config = await readOxlintConfig("vitest");
      const rules = config.overrides?.[0]?.rules ?? {};

      const strictBooleanEnabled = isEnabled(
        rules["vitest/prefer-strict-boolean-matchers"]
      );
      const truthyEnabled = isEnabled(rules["vitest/prefer-to-be-truthy"]);
      const falsyEnabled = isEnabled(rules["vitest/prefer-to-be-falsy"]);

      expect(
        strictBooleanEnabled && (truthyEnabled || falsyEnabled),
        "prefer-strict-boolean-matchers conflicts with prefer-to-be-truthy/prefer-to-be-falsy — they enforce opposite matcher styles"
      ).toBe(false);
    });
  });
});

describe("oxlint tanstack config", () => {
  test("disables filename-case for TanStack route files", async () => {
    const config = await readOxlintConfig("tanstack");

    const routeOverride = config.overrides?.find(
      (override: { files?: string[] }) =>
        override.files?.includes("**/routes/**/*.{tsx,ts}") &&
        override.files?.includes("**/app/routes/**/*.{tsx,ts}")
    );

    expect(routeOverride).toBeDefined();
    expect(routeOverride?.rules?.["unicorn/filename-case"]).toBe("off");
  });

  test("keeps routeTree.gen.ts filename-case override", async () => {
    const config = await readOxlintConfig("tanstack");

    const routeTreeOverride = config.overrides?.find(
      (override: { files?: string[] }) =>
        override.files?.includes("**/routeTree.gen.ts")
    );

    expect(routeTreeOverride).toBeDefined();
    expect(routeTreeOverride?.rules?.["unicorn/filename-case"]).toBe("off");
    expect(
      routeTreeOverride?.rules?.["unicorn/no-abusive-eslint-disable"]
    ).toBe("off");
  });
});

describe("oxlint JS plugin presets", () => {
  const jsPluginPresets = [
    { plugin: "eslint-plugin-github", preset: "github" },
    { plugin: "eslint-plugin-sonarjs", preset: "sonarjs" },
  ];

  for (const { plugin, preset } of jsPluginPresets) {
    test(`${preset} preset only references rules that exist in ${plugin}`, async () => {
      const config = await readOxlintConfig(preset);
      const mod = await import(plugin);
      const { rules } = mod.default as {
        rules: Record<string, { meta?: { deprecated?: boolean } }>;
      };

      const unknown = Object.keys(config.rules ?? {}).filter((key) => {
        const name = key.replace(`${preset}/`, "");
        return !(key.startsWith(`${preset}/`) && name in rules);
      });

      expect(unknown).toEqual([]);
    });

    test(`${preset} preset declares the ${plugin} JS plugin`, async () => {
      const config = await readOxlintConfig(preset);

      expect(config.jsPlugins).toEqual([{ name: preset, specifier: plugin }]);
    });
  }

  test("sonarjs preset does not enable rules that require type checking", async () => {
    const config = await readOxlintConfig("sonarjs");
    const mod = await import("eslint-plugin-sonarjs");
    const { rules } = mod.default as {
      rules: Record<
        string,
        { meta?: { docs?: { requiresTypeChecking?: boolean } } }
      >;
    };

    const typeAware = Object.entries(config.rules ?? {})
      .filter(([, severity]) => severity !== "off")
      .map(([key]) => key.replace("sonarjs/", ""))
      .filter((name) => rules[name]?.meta?.docs?.requiresTypeChecking);

    expect(typeAware).toEqual([]);
  });

  test("sonarjs preset does not enable deprecated rules", async () => {
    const config = await readOxlintConfig("sonarjs");
    const mod = await import("eslint-plugin-sonarjs");
    const { rules } = mod.default as {
      rules: Record<string, { meta?: { deprecated?: boolean } }>;
    };

    const deprecated = Object.entries(config.rules ?? {})
      .filter(([, severity]) => severity !== "off")
      .map(([key]) => key.replace("sonarjs/", ""))
      .filter((name) => rules[name]?.meta?.deprecated);

    expect(deprecated).toEqual([]);
  });
});

describe("oxlint react config", () => {
  const REACT_PLUGINS = ["react", "react-perf", "jsx-a11y"];

  test("contains all non-nursery rules for react plugins", async () => {
    const expectedRules = getOxlintRulesForPlugins(REACT_PLUGINS);
    const config = await readOxlintConfig("react");
    const configRules = new Set(Object.keys(config.rules ?? {}).toSorted());

    const missingRules = expectedRules.filter((rule) => !configRules.has(rule));
    expect(
      missingRules,
      `React config is missing ${missingRules.length} rules from react plugins: ${missingRules.join(", ")}`
    ).toEqual([]);
  });

  test("mirrors the ESLint react preset's off decisions", async () => {
    const config = await readOxlintConfig("react");

    // Rules turned off in config/eslint/react/rules — keep in sync.
    for (const rule of [
      "react/forward-ref-uses-ref",
      "react/jsx-filename-extension",
      "react/no-array-index-key",
      "jsx-a11y/no-autofocus",
    ]) {
      expect(config.rules?.[rule], `${rule} should be off`).toBe("off");
    }
  });
});

describe("oxlint next config", () => {
  test("contains all non-nursery nextjs rules", async () => {
    const expectedRules = getOxlintRulesForPlugins(["nextjs"]);
    const config = await readOxlintConfig("next");
    const configRules = new Set(Object.keys(config.rules ?? {}).toSorted());

    const missingRules = expectedRules.filter((rule) => !configRules.has(rule));
    expect(
      missingRules,
      `Next config is missing ${missingRules.length} nextjs rules: ${missingRules.join(", ")}`
    ).toEqual([]);
  });
});
