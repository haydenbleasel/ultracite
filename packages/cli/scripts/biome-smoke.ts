/**
 * Biome preset smoke test.
 *
 * Loads every Biome preset on top of core with the installed Biome, in a git
 * repository as init's projects are (core turns on vcs.useIgnoreFile), and
 * checks a fixture for each. validate-biome.ts only parses the JSON, so a rule
 * or option the installed Biome doesn't know, like the renamed rule in #856,
 * fails here instead. Each fixture names diagnostics that must report and ones
 * that must not, which proves the preset's settings apply.
 */
import { mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { z } from "zod";

interface FixtureFile {
  content: string;
  /** Diagnostic categories (`lint/<group>/<rule>`, `assist/...`, `format`) that must report on this file. */
  expect: string[];
  /** Diagnostic categories that must not report on this file. */
  forbid?: string[];
}

interface Preset {
  files: Record<string, FixtureFile>;
  /** Biome presets stacked on core, in order. */
  presets: string[];
}

const here = import.meta.dirname;
const configDir = path.join(here, "../config/biome");
const biomeBin = path.join(here, "../node_modules/.bin/biome");

const packageJson = JSON.stringify({
  name: "biome-smoke",
  private: true,
  type: "module",
  version: "0.0.0",
});

const focusedTest = `test.only("adds", () => {
  expect(1 + 1).toBe(2);
});
`;

const presets = {
  angular: {
    files: {
      // The preset only turns on html.parser.interpolation, which changes no
      // diagnostic here, so this proves the config loads and templates parse.
      "src/app.component.html": {
        content: "<p>{{ name }}</p>\n",
        expect: [],
        forbid: ["parse"],
      },
    },
    presets: ["angular"],
  },
  astro: {
    files: {
      "src/page.astro": {
        content: `---
---

<style is:global>
  p {
    color: red;
  }
</style>
`,
        expect: ["lint/suspicious/useScopedStyles"],
      },
    },
    presets: ["astro"],
  },
  core: {
    files: {
      // Biome's Markdown formatter is off, so an unaligned table is left alone.
      "README.md": {
        content: "| a | b |\n|-|-|\n| 1 | 2 |\n",
        expect: [],
        forbid: ["format"],
      },
      "src/app.css": {
        content: `.card {
  color: red;
}

.card {
  color: blue;
}
`,
        expect: ["lint/suspicious/noDuplicateSelectors"],
      },
      "src/keys.json": {
        content: '{ "": 1 }\n',
        expect: ["lint/suspicious/noEmptyObjectKeys"],
      },
      "src/legacy.ts": {
        content: "var legacy = 1;\n\nexport { legacy };\n",
        expect: ["lint/suspicious/noVar"],
      },
      // GraphQL assists only run with graphql.assist.enabled.
      "src/schema.graphql": {
        content: "type User {\n  posts(last: Int, first: Int): [String]\n}\n",
        expect: ["assist/source/useGraphqlSortedArguments"],
      },
      "src/tailwind.tsx": {
        content: `export const Box = () => <div className="p-2 flex" />;
`,
        expect: ["lint/nursery/useTailwindSortedClasses"],
      },
    },
    presets: [],
  },
  cypress: {
    files: {
      "cypress/e2e/login.cy.ts": {
        content: 'export const visit = (): string => "/";\n',
        expect: [],
      },
    },
    presets: ["cypress"],
  },
  drizzle: {
    files: {
      "src/cache.ts": {
        content: `const cache = new Map<string, number>();

export const forget = (key: string): boolean => cache.delete(key);
`,
        expect: [],
        forbid: ["lint/suspicious/noDrizzleDeleteWithoutWhere"],
      },
      "src/db.ts": {
        content: `import { db } from "./client";
import { users } from "./schema";

export const wipe = async (): Promise<void> => {
  await db.delete(users);
};
`,
        expect: ["lint/suspicious/noDrizzleDeleteWithoutWhere"],
      },
    },
    presets: ["drizzle"],
  },
  jest: {
    files: {
      "src/math.test.ts": {
        content: focusedTest,
        expect: ["lint/suspicious/noFocusedTests"],
        forbid: ["lint/correctness/noUndeclaredVariables"],
      },
    },
    presets: ["jest"],
  },
  nestjs: {
    files: {
      "src/role.ts": {
        content: 'export enum Role {\n  Admin = "admin",\n}\n',
        expect: [],
        forbid: ["lint/style/noEnum"],
      },
    },
    presets: ["nestjs"],
  },
  next: {
    files: {
      "src/page.tsx": {
        content: 'export const Page = () => <img alt="" src="/a.png" />;\n',
        expect: ["lint/performance/noImgElement"],
      },
    },
    presets: ["react", "next"],
  },
  playwright: {
    files: {
      "e2e/home.spec.ts": {
        content: `import { expect, test } from "@playwright/test";

test.beforeEach(async ({}, testInfo) => {
  await Promise.resolve(testInfo.title);
});

test("shows the title", async ({ page }) => {
  await page.goto("/");
  await page.waitForTimeout(500);
  await expect(page).toHaveTitle("Home");
});
`,
        expect: ["lint/suspicious/noPlaywrightWaitForTimeout"],
        forbid: ["lint/correctness/noEmptyPattern"],
      },
    },
    presets: ["playwright"],
  },
  qwik: {
    files: {
      "src/counter.tsx": {
        content: `import { component$, useVisibleTask$ } from "@builder.io/qwik";

export const Counter = component$(() => {
  useVisibleTask$(() => {});

  return <p>count</p>;
});
`,
        expect: ["lint/correctness/noQwikUseVisibleTask"],
      },
    },
    presets: ["qwik"],
  },
  react: {
    files: {
      "src/list.tsx": {
        content: `export const List = ({ items }: { readonly items: string[] }) => (
  <ul>
    {items.map((item) => (
      <li>{item}</li>
    ))}
  </ul>
);
`,
        expect: ["lint/correctness/useJsxKeyInIterable"],
      },
    },
    presets: ["react"],
  },
  "react-native": {
    files: {
      "src/app.tsx": {
        content: `import { Text, View } from "react-native";

export const App = () => (
  <View>
    {__DEV__ ? <Text>dev</Text> : null}
    hello
  </View>
);
`,
        expect: ["lint/correctness/noReactNativeRawText"],
        forbid: ["lint/correctness/noUndeclaredVariables"],
      },
    },
    presets: ["react", "react-native"],
  },
  remix: {
    files: {
      "app/routes/$postId.tsx": {
        content: "export const Post = () => <p>post</p>;\n",
        expect: [],
        forbid: ["lint/style/useFilenamingConvention"],
      },
    },
    presets: ["react", "remix"],
  },
  solid: {
    files: {
      "src/counter.tsx": {
        content: `export const Counter = ({ count }: { readonly count: number }) => (
  <p>{count}</p>
);
`,
        expect: ["lint/correctness/noSolidDestructuredProps"],
      },
    },
    presets: ["solid"],
  },
  storybook: {
    files: {
      "src/button.stories.tsx": {
        content: 'export default { title: "Button" };\n',
        expect: [],
      },
    },
    presets: ["react", "storybook"],
  },
  svelte: {
    files: {
      "src/App.svelte": {
        content: '<div style="color: red">hi</div>\n',
        expect: ["lint/style/noInlineStyles"],
      },
    },
    presets: ["svelte"],
  },
  tanstack: {
    files: {
      "src/options.ts": {
        content: 'export const options = { queryKey: ["a"], enabled: true };\n',
        expect: [],
        forbid: ["assist/source/useSortedKeys"],
      },
    },
    presets: ["react", "tanstack"],
  },
  "type-aware": {
    files: {
      "src/a.ts": {
        content: `import { b } from "./b.ts";

export const a = (): number => b() + 1;
`,
        expect: ["lint/suspicious/noImportCycles"],
      },
      "src/b.ts": {
        content: `import { a } from "./a.ts";

export const b = (): number => a() - 1;
`,
        expect: ["lint/suspicious/noImportCycles"],
      },
    },
    presets: ["type-aware"],
  },
  vitest: {
    files: {
      "src/math.test.ts": {
        content: focusedTest,
        expect: ["lint/suspicious/noFocusedTests"],
      },
    },
    presets: ["vitest"],
  },
  vue: {
    files: {
      "src/UserCard.vue": {
        content: `<template>
  <p>card</p>
</template>

<style>
p {
  color: red;
}
</style>
`,
        expect: ["lint/suspicious/useScopedStyles"],
      },
    },
    presets: ["vue"],
  },
} satisfies Record<string, Preset>;

const reportSchema = z.looseObject({
  diagnostics: z.array(
    z.looseObject({
      category: z.string().optional(),
      location: z.looseObject({ path: z.string().optional() }).optional(),
    })
  ),
});

const presetPath = (name: string): string =>
  path.join(configDir, name, "biome.jsonc");

const writeFixture = async (root: string, preset: Preset): Promise<void> => {
  await writeFile(path.join(root, "package.json"), packageJson);
  await writeFile(
    path.join(root, "biome.jsonc"),
    JSON.stringify({
      extends: ["core", ...preset.presets].map(presetPath),
    })
  );

  await Promise.all(
    Object.entries(preset.files).map(async ([relative, file]) => {
      const target = path.join(root, relative);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, file.content);
    })
  );
};

const checkPreset = async (
  tempRoot: string,
  name: string,
  preset: Preset
): Promise<string[]> => {
  const root = path.join(tempRoot, name);
  await mkdir(root, { recursive: true });
  Bun.spawnSync(["git", "init", "-q"], { cwd: root });
  await writeFixture(root, preset);

  // `biome check` runs the linter, the formatter and the assist actions, so
  // format and assist diagnostics are visible too. It exits non-zero whenever
  // something reports, so only the report itself is read.
  const result = Bun.spawnSync(
    [biomeBin, "check", "--reporter=json", "--max-diagnostics=500", "."],
    { cwd: root }
  );

  const stdout = result.stdout.toString();
  const stderr = result.stderr.toString();
  let report: z.infer<typeof reportSchema>;

  try {
    report = reportSchema.parse(JSON.parse(stdout));
  } catch {
    // A configuration error stops Biome before it writes a report.
    return [`${name}: Biome didn't load the config:\n${stderr || stdout}`];
  }

  const byFile = new Map<string, Set<string>>();

  for (const diagnostic of report.diagnostics) {
    const file = diagnostic.location?.path?.replaceAll("\\", "/");

    if (file && diagnostic.category) {
      const categories = byFile.get(file) ?? new Set<string>();
      categories.add(diagnostic.category);
      byFile.set(file, categories);
    }
  }

  const failures: string[] = [];

  for (const [file, fixture] of Object.entries(preset.files)) {
    const categories = byFile.get(file) ?? new Set<string>();

    for (const expected of fixture.expect) {
      if (!categories.has(expected)) {
        failures.push(
          `${name}: ${file} should report ${expected}; it reported ${[...categories].join(", ") || "nothing"}`
        );
      }
    }

    for (const forbidden of fixture.forbid ?? []) {
      if (categories.has(forbidden)) {
        failures.push(`${name}: ${file} should not report ${forbidden}`);
      }
    }
  }

  return failures;
};

const main = async (): Promise<void> => {
  const entries = await readdir(configDir);
  const presetDirs = entries.filter((dir) => !dir.startsWith("."));

  const missing = presetDirs.filter((dir) => !(dir in presets));

  if (missing.length > 0) {
    console.error(
      `✗ No fixture for ${missing.map((dir) => `biome/${dir}`).join(", ")} in biome-smoke.ts`
    );
    process.exit(1);
  }

  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "biome-smoke-"));
  const failures: string[] = [];

  try {
    for (const [name, preset] of Object.entries(presets)) {
      // Sequential: each run spawns Biome, and the output stays in order.
      // oxlint-disable-next-line no-await-in-loop -- one Biome process at a time keeps the report readable
      const presetFailures = await checkPreset(tempRoot, name, preset);
      console.log(`${presetFailures.length === 0 ? "✓" : "✗"} biome/${name}`);
      failures.push(...presetFailures);
    }
  } finally {
    await rm(tempRoot, { force: true, recursive: true });
  }

  if (failures.length > 0) {
    console.error(`\n${failures.join("\n")}`);
    process.exit(1);
  }

  console.log("\nEvery Biome preset loads and lints its fixture");
};

await main();
