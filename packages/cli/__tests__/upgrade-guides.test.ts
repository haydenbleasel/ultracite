import { afterEach, describe, expect, test } from "bun:test";
import path from "node:path";
import process from "node:process";

import type { JsonValue } from "../src/data/types";
import { buildUpgradePrompt } from "../src/upgrade-agent";
import {
  findPendingGuides,
  readProjectState,
  typeCheckedRuleIds,
} from "../src/upgrade-guides";
import type { ProjectState } from "../src/upgrade-guides";
import { mockFileSystem, restoreFileSystemMock } from "./mock-fs";

// The project root for tests that read files. Resolved, as the config lookup
// resolves it, so the mocked paths match on Windows (`D:\repo`) too.
const repo = path.resolve("/repo");
const inRepo = (...segments: string[]): string => path.join(repo, ...segments);

const project = (state: Partial<ProjectState>): ProjectState => ({
  biomeConfig: null,
  commandSources: [],
  ...state,
});

const versionsFor = (state: Partial<ProjectState>): number[] =>
  findPendingGuides(project(state)).map((guide) => guide.version);

// Zed settings that format TypeScript with the given formatter.
const zedWith = (formatter: JsonValue): string =>
  JSON.stringify({ languages: { TypeScript: { formatter } } });

// An ESLint config on Ultracite's core preset with the given rule settings.
const withRules = (rules: string, extra = ""): string =>
  `import core from "ultracite/eslint/core";${extra}\nexport default [...core, {\n  rules: {\n    ${rules}\n  },\n}];`;

describe("findPendingGuides", () => {
  test("needs nothing for a current Biome config", () => {
    expect(
      versionsFor({
        biomeConfig: {
          extends: ["ultracite/biome/core", "ultracite/biome/react"],
        },
        commandSources: ['{"scripts":{"lint":"ultracite check"}}'],
      })
    ).toEqual([]);
  });

  test("needs nothing for a project on another linter", () => {
    expect(versionsFor({ commandSources: ['{"scripts":{}}'] })).toEqual([]);
  });

  test("needs v7 for v6 preset paths", () => {
    expect(
      versionsFor({
        biomeConfig: { extends: ["ultracite/core", "ultracite/next"] },
      })
    ).toEqual([7]);
  });

  test("needs v7 for a string extends of a v6 preset", () => {
    mockFileSystem({
      [inRepo("biome.json")]: '{ "extends": "ultracite/core" }',
    });

    try {
      expect(
        findPendingGuides(readProjectState(repo)).map((guide) => guide.version)
      ).toEqual([7]);
    } finally {
      restoreFileSystemMock();
    }
  });

  test("needs v7 for the removed lint and format commands", () => {
    expect(versionsFor({ commandSources: ["npx ultracite format"] })).toEqual([
      7,
    ]);
    expect(
      versionsFor({ commandSources: ['{"scripts":{"lint":"ultracite lint"}}'] })
    ).toEqual([7]);
  });

  test("needs v6 for the single v5 preset", () => {
    expect(versionsFor({ biomeConfig: { extends: ["ultracite"] } })).toEqual([
      6,
    ]);
  });

  test("needs v5 and v6 for a Biome 1 config, oldest first", () => {
    expect(
      versionsFor({
        biomeConfig: {
          $schema: "https://biomejs.dev/schemas/1.9.4/schema.json",
          extends: ["ultracite"],
        },
      })
    ).toEqual([5, 6]);
    expect(
      versionsFor({
        biomeConfig: {
          extends: ["ultracite"],
          organizeImports: { enabled: true },
        },
      })
    ).toEqual([5, 6]);
    expect(
      versionsFor({
        biomeConfig: { extends: ["ultracite"], files: { ignore: ["dist"] } },
      })
    ).toEqual([5, 6]);
  });

  test("needs v8 for a prettier/prettier rule in the ESLint or Stylelint config", () => {
    expect(
      versionsFor({
        eslintConfig:
          'import core from "ultracite/eslint/core";\nexport default [...core, { rules: { "prettier/prettier": "off" } }];',
      })
    ).toEqual([8]);
    expect(
      versionsFor({
        stylelintConfig:
          'export default { extends: ["ultracite/stylelint"], rules: { "prettier/prettier": null } };',
      })
    ).toEqual([8]);
  });

  test("needs v8 for an ESLint project that uses Cypress or Storybook without their presets", () => {
    const eslintConfig =
      'import core from "ultracite/eslint/core";\nexport default [...core];';

    expect(versionsFor({ dependencies: ["cypress"], eslintConfig })).toEqual([
      8,
    ]);
    expect(
      versionsFor({ dependencies: ["@storybook/react"], eslintConfig })
    ).toEqual([8]);
    expect(
      versionsFor({
        dependencies: ["cypress", "storybook"],
        eslintConfig: `import cypress from "ultracite/eslint/cypress";\nimport storybook from "ultracite/eslint/storybook";\n${eslintConfig}`,
      })
    ).toEqual([]);
  });

  test("needs v8 for Zed formatting with ESLint's language server", () => {
    const eslintConfig =
      'import core from "ultracite/eslint/core";\nexport default [...core];';

    const eslintServer = { language_server: { name: "eslint" } };

    expect(
      versionsFor({ eslintConfig, zedSettings: zedWith(eslintServer) })
    ).toEqual([8]);
    expect(
      versionsFor({
        eslintConfig,
        zedSettings: zedWith([
          { code_action: "source.fixAll.eslint" },
          eslintServer,
        ]),
      })
    ).toEqual([8]);
    expect(
      versionsFor({ eslintConfig, zedSettings: zedWith("prettier") })
    ).toEqual([]);
    expect(
      versionsFor({
        eslintConfig,
        zedSettings: zedWith({ language_server: { name: "biome" } }),
      })
    ).toEqual([]);
    expect(
      versionsFor({
        eslintConfig: "export default [];",
        zedSettings: zedWith(eslintServer),
      })
    ).toEqual([]);
  });

  test("leaves an ESLint config that doesn't use Ultracite alone", () => {
    expect(
      versionsFor({
        dependencies: ["cypress"],
        eslintConfig: "export default [];",
      })
    ).toEqual([]);
  });

  test("needs v8 for a type-checked ESLint rule without the type-aware preset", () => {
    expect(
      versionsFor({
        eslintConfig: withRules(
          '"@typescript-eslint/no-floating-promises": ["error", { ignoreVoid: true }],'
        ),
      })
    ).toEqual([8]);
    expect(
      versionsFor({
        eslintConfig: withRules("'sonarjs/deprecation': 'warn',"),
      })
    ).toEqual([8]);
    expect(
      versionsFor({
        eslintConfig: withRules('"vitest/unbound-method": [\n  "error",\n],'),
      })
    ).toEqual([8]);
  });

  test("leaves type-checked ESLint rules alone when they're off or have type information", () => {
    for (const setting of [
      '"off"',
      "'off'",
      "0",
      '["off"]',
      "[\n  'off',\n]",
    ]) {
      expect(
        versionsFor({
          eslintConfig: withRules(
            `"@typescript-eslint/strict-boolean-expressions": ${setting},`
          ),
        })
      ).toEqual([]);
    }

    // Not a type-checked rule, though its name starts like one.
    expect(
      versionsFor({
        eslintConfig: withRules('"@typescript-eslint/no-floating": "error",'),
      })
    ).toEqual([]);
    // Already type-aware, through the preset or its own parser options.
    expect(
      versionsFor({
        eslintConfig: withRules(
          '"@typescript-eslint/no-floating-promises": "error",',
          '\nimport typeAware from "ultracite/eslint/type-aware";'
        ),
      })
    ).toEqual([]);
    expect(
      versionsFor({
        eslintConfig: withRules(
          '"@typescript-eslint/no-floating-promises": "error",\n  },\n  languageOptions: { parserOptions: { projectService: true } '
        ),
      })
    ).toEqual([]);
    // A config that doesn't use Ultracite's presets.
    expect(
      versionsFor({
        eslintConfig:
          'export default [{ rules: { "@typescript-eslint/no-floating-promises": "error" } }];',
      })
    ).toEqual([]);
  });

  test("lists every rule the ESLint type-aware presets run", () => {
    // The presets are imported in a child process: they load plugins that
    // read node:fs, which this test suite mocks. The rules the presets keep
    // out of core only because types make them accurate still run without
    // types, so a config that sets one doesn't need the type-aware preset.
    const presets = [
      "type-aware",
      ...["angular", "jest", "nestjs", "qwik", "tanstack", "vitest"].map(
        (framework) => `${framework}/type-aware`
      ),
    ];

    const script = `
      const ids = new Set();
      const { typeAwareOnlyRules } = await import("./config/eslint/core/rules/unicorn.mjs");
      for (const preset of ${JSON.stringify(presets)}) {
        const { default: config } = await import(\`./config/eslint/\${preset}/eslint.config.mjs\`);
        for (const block of config) {
          for (const id of Object.keys(block.rules ?? {})) {
            if (id.includes("/") && !typeAwareOnlyRules.has(id)) ids.add(id);
          }
        }
      }
      console.log(JSON.stringify([...ids]));
    `;

    const result = Bun.spawnSync([process.execPath, "-e", script], {
      cwd: path.join(import.meta.dir, ".."),
    });

    expect(result.exitCode, result.stderr.toString()).toBe(0);
    // SAFETY: the script above prints a JSON array of rule IDs.
    const presetRuleIds = JSON.parse(result.stdout.toString()) as string[];
    expect([...typeCheckedRuleIds].toSorted()).toEqual(
      presetRuleIds.toSorted()
    );
  }, 30_000);

  test("the v8 guide lists every type-checked rule for the agent", () => {
    const [guide] = findPendingGuides(
      project({
        eslintConfig: withRules('"sonarjs/deprecation": "error",'),
      })
    );

    expect(guide?.version).toBe(8);
    expect(
      typeCheckedRuleIds.filter((id) => !guide?.content.includes(`\`${id}\``))
    ).toEqual([]);
  });

  test("needs v8 for oxlint-tsgolint without Oxlint's type-aware option", () => {
    const oxlintConfig =
      "export default defineConfig({ extends: [core], ignorePatterns: core.ignorePatterns });";

    expect(
      versionsFor({ dependencies: ["oxlint-tsgolint"], oxlintConfig })
    ).toEqual([8]);
    expect(
      versionsFor({
        dependencies: ["oxlint-tsgolint"],
        oxlintConfig: oxlintConfig.replace(
          "extends",
          "options: { typeAware: true }, extends"
        ),
      })
    ).toEqual([]);
    expect(versionsFor({ oxlintConfig })).toEqual([]);
  });

  test("needs v8 for an init that relied on --quiet to skip the prompts", () => {
    expect(
      versionsFor({
        commandSources: [
          "run: npx ultracite@latest init --quiet --linter oxlint --pm npm",
        ],
      })
    ).toEqual([8]);
    expect(
      versionsFor({
        commandSources: ["run: npx ultracite init --quiet -y --pm npm"],
      })
    ).toEqual([]);
    expect(
      versionsFor({ commandSources: ["npx ultracite check --quiet"] })
    ).toEqual([]);
  });

  test("names each guide's path in the skill", () => {
    const [guide] = findPendingGuides(
      project({ biomeConfig: { extends: ["ultracite/core"] } })
    );

    expect(guide?.path).toBe("skills/ultracite/references/upgrades/v7.md");
    expect(guide?.content).toContain("# Upgrading to Ultracite v7");
  });
});

describe("readProjectState", () => {
  afterEach(() => {
    restoreFileSystemMock();
  });

  test("reads the Biome config and the files that run Ultracite", () => {
    mockFileSystem({
      [inRepo("biome.jsonc")]:
        '{\n  // v6\n  "extends": ["ultracite/core"],\n}',
      [inRepo("package.json")]: '{"scripts":{"format":"ultracite format"}}',
    });

    const state = readProjectState(repo);

    expect(state.biomeConfig?.extends).toEqual(["ultracite/core"]);
    expect(state.commandSources).toEqual([
      '{"scripts":{"format":"ultracite format"}}',
    ]);
  });

  test("reads the ESLint config and the dependencies", () => {
    mockFileSystem({
      [inRepo("eslint.config.mjs")]:
        'import core from "ultracite/eslint/core";\nexport default [...core];',
      [inRepo("package.json")]:
        '{"dependencies":{"react":"19"},"devDependencies":{"cypress":"15"}}',
    });

    const state = readProjectState(repo);

    expect(state.eslintConfig).toContain("ultracite/eslint/core");
    expect(state.dependencies).toEqual(["react", "cypress"]);
    expect(findPendingGuides(state).map((guide) => guide.version)).toEqual([8]);
  });

  test("reads the Zed settings, comments and all", () => {
    mockFileSystem({
      [inRepo(".zed", "settings.json")]:
        '{\n  // v7\n  "languages": { "TSX": { "formatter": { "language_server": { "name": "eslint" } } } },\n}',
      [inRepo("eslint.config.mjs")]:
        'import core from "ultracite/eslint/core";\nexport default [...core];',
    });

    const state = readProjectState(repo);

    expect(state.zedSettings).toContain('"name": "eslint"');
    expect(findPendingGuides(state).map((guide) => guide.version)).toEqual([8]);
  });
});

describe("buildUpgradePrompt", () => {
  test("hands the agent each guide after the rules", () => {
    const guides = findPendingGuides(
      project({
        biomeConfig: { extends: ["ultracite"] },
        commandSources: ["ultracite lint"],
      })
    );

    const prompt = buildUpgradePrompt({
      guides,
      linter: "biome",
      version: "8.0.0",
    });

    expect(prompt).toContain("Ultracite has been upgraded to 8.0.0");
    expect(prompt).toContain("Don't install or remove packages");
    expect(
      prompt.indexOf("--- skills/ultracite/references/upgrades/v6.md ---")
    ).toBeLessThan(
      prompt.indexOf("--- skills/ultracite/references/upgrades/v7.md ---")
    );
    expect(prompt).toContain("# Upgrading to Ultracite v6");
  });
});
