import { afterEach, describe, expect, test } from "bun:test";

import { buildUpgradePrompt } from "../src/upgrade-agent";
import { findPendingGuides, readProjectState } from "../src/upgrade-guides";
import type { ProjectState } from "../src/upgrade-guides";
import { mockFileSystem, restoreFileSystemMock } from "./mock-fs";

const project = (state: Partial<ProjectState>): ProjectState => ({
  biomeConfig: null,
  commandSources: [],
  ...state,
});

const versionsFor = (state: Partial<ProjectState>): number[] =>
  findPendingGuides(project(state)).map((guide) => guide.version);

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
    mockFileSystem({ "/repo/biome.json": '{ "extends": "ultracite/core" }' });

    try {
      expect(
        findPendingGuides(readProjectState("/repo")).map(
          (guide) => guide.version
        )
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

  test("leaves an ESLint config that doesn't use Ultracite alone", () => {
    expect(
      versionsFor({
        dependencies: ["cypress"],
        eslintConfig: "export default [];",
      })
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
      "/repo/biome.jsonc": '{\n  // v6\n  "extends": ["ultracite/core"],\n}',
      "/repo/package.json": '{"scripts":{"format":"ultracite format"}}',
    });

    const state = readProjectState("/repo");

    expect(state.biomeConfig?.extends).toEqual(["ultracite/core"]);
    expect(state.commandSources).toEqual([
      '{"scripts":{"format":"ultracite format"}}',
    ]);
  });

  test("reads the ESLint config and the dependencies", () => {
    mockFileSystem({
      "/repo/eslint.config.mjs":
        'import core from "ultracite/eslint/core";\nexport default [...core];',
      "/repo/package.json":
        '{"dependencies":{"react":"19"},"devDependencies":{"cypress":"15"}}',
    });

    const state = readProjectState("/repo");

    expect(state.eslintConfig).toContain("ultracite/eslint/core");
    expect(state.dependencies).toEqual(["react", "cypress"]);
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
      version: "7.13.0",
    });

    expect(prompt).toContain("Ultracite has been upgraded to 7.13.0");
    expect(prompt).toContain("Don't install or remove packages");
    expect(
      prompt.indexOf("--- skills/ultracite/references/upgrades/v6.md ---")
    ).toBeLessThan(
      prompt.indexOf("--- skills/ultracite/references/upgrades/v7.md ---")
    );
    expect(prompt).toContain("# Upgrading to Ultracite v6");
  });
});
