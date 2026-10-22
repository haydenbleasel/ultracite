/**
 * ESLint preset smoke test.
 *
 * Lints a small generated project per ESLint preset with ESLint itself, so
 * the whole class of "the preset loads but cannot lint real files" bugs is
 * caught: parse errors from a missing parser, files no config block matches,
 * rules that crash without type information, and preset blocks whose rules
 * never reach the extensions they target. Each fixture file carries a
 * deliberate violation of a rule the preset must apply to it.
 *
 * Fixtures are written to a temporary directory at run time (rather than
 * committed) so bun's test runner never collects the `*.test.*` fixtures and
 * the repo's own linter never sees the deliberate violations.
 */
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

// biome-ignore lint/performance/noNamespaceImport: Required for ESLint parser compatibility
import * as typescriptParser from "@typescript-eslint/parser"; // oxlint-disable-line sonarjs/no-wildcard-import -- required for ESLint parser compatibility
import { ESLint, Linter } from "eslint";
import type { Rule } from "eslint";

interface FixtureFile {
  content: string;
  /** Rule ids (or `plugin/` prefixes) that must report on this file. */
  expect: string[];
  /** Rule ids that must not report on this file. */
  forbid?: string[];
}

interface Preset {
  files: Record<string, FixtureFile>;
  /** ESLint presets combined with core, in order. */
  presets: string[];
  /**
   * Also lint the preset with the type-aware preset and its own type-aware
   * add-on (ultracite/eslint/<name>/type-aware), adding these files.
   */
  typeAware?: Record<string, FixtureFile>;
  /** Lint without a tsconfig.json, as core must work without type information. */
  withoutTsconfig?: boolean;
}

const here = import.meta.dirname;

const tsconfig = JSON.stringify({
  compilerOptions: {
    allowJs: true,
    experimentalDecorators: true,
    jsx: "preserve",
    module: "esnext",
    moduleResolution: "bundler",
    strict: true,
    target: "es2022",
  },
  include: ["src", "app"],
});

const packageJson = JSON.stringify({
  name: "eslint-smoke",
  private: true,
  type: "module",
  version: "0.0.0",
});

// A declaration that no core rule accepts, so every JavaScript and
// TypeScript flavour proves the core block reaches it.
const legacyVar = "var legacy = 1;\n";

const typedModule = `${legacyVar}
export const read = (input: string): unknown => JSON.parse(input);
`;

// A `.catch()` that isn't on a promise, like Zod's parse fallback (#854).
const schemaFallback = `declare const schema: { catch: (value: string) => string };
export const name = (): string => schema.catch("anonymous");
`;

const presets = {
  angular: {
    files: {
      "src/app.component.ts": {
        content: `import { Component, Input } from "@angular/core";

@Component({ selector: "app-root", template: "<p>hi</p>" })
export class App {
  @Input("alias") public name = "";
}
`,
        expect: ["@angular-eslint/component-class-suffix"],
      },
    },
    presets: ["angular"],
    typeAware: {},
  },
  astro: {
    files: {
      "src/pages/index.astro": {
        // The client-side <script> is linted as a virtual TypeScript file.
        content: `---
interface Props {
  readonly title: string;
}

const { title } = Astro.props as Props;
const markup = "<b>x</b>";
---

<h1>{title}</h1>
<div set:html={markup} />
<script>
  const button = document.querySelector("button");
  console.log(button);
</script>
`,
        expect: ["astro/no-set-html-directive"],
        // The client script is linted as a virtual `1_1.ts` file.
        forbid: ["github/filenames-match-regex"],
      },
    },
    presets: ["astro"],
  },
  core: {
    // Distinct basenames: TypeScript drops `a.tsx` from a program that
    // also contains `a.ts`, which would hide the file from type-aware rules.
    files: {
      "src/cjs-legacy.cjs": {
        content: `${legacyVar}module.exports = legacy;\n`,
        expect: ["no-var"],
      },
      "src/cjs-module.cts": { content: typedModule, expect: ["no-var"] },
      "src/esm-legacy.mjs": {
        content: `${legacyVar}export default legacy;\n`,
        expect: ["no-var"],
      },
      "src/esm-module.mts": { content: typedModule, expect: ["no-var"] },
      "src/fallback.ts": {
        // These match `.catch()` by name, so without type information they
        // would flag a schema's fallback.
        content: schemaFallback,
        expect: [],
        forbid: [
          "github/no-then",
          "promise/prefer-await-to-then",
          "unicorn/prefer-await",
        ],
      },
      "src/index.html": {
        content: `<!doctype html>
<html lang="en">
  <body>
    <script>
      var legacy = 1;
      console.log(legacy);
    </script>
  </body>
</html>
`,
        expect: ["no-var"],
      },
      "src/legacy-view.jsx": {
        content: `${legacyVar}export const View = () => <p>{legacy}</p>;\n`,
        expect: ["no-var"],
      },
      "src/legacy.js": {
        content: `${legacyVar}export default legacy;\n`,
        expect: ["no-var"],
      },
      "src/pages/BadPage.ts": {
        content: "export const page = 1;\n",
        expect: ["github/filenames-match-regex"],
      },
      "src/pages/[slug].json.ts": {
        content: "export const page = 1;\n",
        expect: [],
        forbid: ["github/filenames-match-regex"],
      },
      "src/pages/_app.tsx": {
        content: "export const App = () => null;\n",
        expect: [],
        forbid: ["github/filenames-match-regex"],
      },
      "src/routes/+page.ts": {
        content: "export const load = () => ({});\n",
        expect: [],
        forbid: ["github/filenames-match-regex"],
      },
      "src/sum.test.mts": {
        content: `${typedModule}
export const label = "repeated label";
export const other = "repeated label";
export const third = "repeated label";
`,
        expect: ["no-var"],
        forbid: ["sonarjs/no-duplicate-string"],
      },
      "src/timer.ts": {
        content: `export const schedule = (callback: () => void): NodeJS.Timeout =>
  setTimeout(callback, 10);
`,
        expect: [],
        forbid: ["no-undef", "sonarjs/no-reference-error"],
      },
      "src/typed-module.ts": {
        // Core has no tsconfig here and must not run rules that need type
        // information; the type-aware preset adds them.
        content: `${typedModule}
export const unsafe = (input: string): string => JSON.parse(input);
`,
        expect: ["no-var"],
        forbid: ["@typescript-eslint/no-unsafe-return"],
      },
      "src/view.tsx": {
        content: `${typedModule}
export const View = ({ name }: { readonly name: string }) => <p>{name}</p>;
`,
        expect: ["no-var"],
      },
    },
    presets: [],
    withoutTsconfig: true,
  },
  cypress: {
    files: {
      "src/login.cy.ts": {
        content: `describe("login", () => {
  it("waits", () => {
    cy.visit("/");
    cy.wait(1000);
  });
});
`,
        expect: ["cypress/no-unnecessary-waiting"],
      },
      "src/logout.cy.js": {
        content: `describe("logout", () => {
  it("waits", () => {
    cy.visit("/");
    cy.wait(1000);
  });
});
`,
        expect: ["cypress/no-unnecessary-waiting"],
        forbid: ["no-undef"],
      },
    },
    presets: ["cypress"],
  },
  gdp: {
    files: {
      "src/forge.ts": {
        content: `import { defineProof } from "@gdp-ts/core";

import type { UserIsAdmin } from "./proofs/user-is-admin.ts";

export const forged = {} as UserIsAdmin<"u">;
export const sneaky = defineProof("Sneaky");
`,
        expect: [
          "gdp-ts/no-define-proof",
          "gdp-ts/no-proof-assertion",
          "gdp-ts/no-type-assertion",
        ],
      },
      "src/lib/ids.ts": {
        content: `export type UserId = string & { readonly brand: "UserId" };

export const toUserId = (id: string) => id as UserId;
`,
        expect: [],
        forbid: ["gdp-ts/no-type-assertion"],
      },
      "src/projects.ts": {
        // Sensitive functions take proofs they never read at runtime.
        content: `import type { UserIsAdmin } from "./proofs/user-is-admin.ts";

export const deleteProject = <U>(
  id: string,
  _proof: UserIsAdmin<U>
): string => id;
`,
        expect: [],
        forbid: ["@typescript-eslint/no-unused-vars"],
      },
      "src/proofs/user-is-admin.ts": {
        content: `import { defineProof } from "@gdp-ts/core";
import type { Proof } from "@gdp-ts/core";

const prover = defineProof("UserIsAdmin");

export interface UserIsAdmin<U> extends Proof<"UserIsAdmin", [U]> {}

export { prover };
`,
        expect: ["gdp-ts/no-exported-prover"],
        forbid: [
          "@typescript-eslint/no-empty-object-type",
          "gdp-ts/no-define-proof",
        ],
      },
    },
    presets: ["gdp"],
  },
  jest: {
    files: {
      "src/sum.test.mts": {
        content: `test.only("adds", () => {
  expect(1 + 1).toBe(2);
});
`,
        expect: ["jest/no-focused-tests"],
      },
      "src/sum.test.ts": {
        content: `test.only("adds", () => {
  expect(1 + 1).toBe(2);
});
`,
        expect: ["jest/no-focused-tests"],
      },
    },
    presets: ["jest"],
    typeAware: {
      "src/counter.test.ts": {
        // Type-aware rule: proves the add-on runs with type information.
        content: `class Counter {
  count = 0;

  increment(): void {
    this.count += 1;
  }
}

test("counts", () => {
  const counter = new Counter();
  const increment = counter.increment;
  increment();
  expect(counter.count).toBe(1);
});
`,
        expect: ["jest/unbound-method"],
      },
    },
  },
  nestjs: {
    files: {
      "src/app.controller.ts": {
        content: `import { Controller, Get } from "@nestjs/common";

@Controller("app")
export class AppController {
  @Get()
  public read(): string {
    return "ok";
  }
}
`,
        expect: [],
      },
    },
    presets: ["nestjs"],
    typeAware: {},
  },
  next: {
    files: {
      "app/layout.jsx": {
        content: `export const Layout = () => <img alt="" src="/a.png" />;
`,
        expect: ["@next/next/no-img-element"],
      },
      "app/page.tsx": {
        content: `export const Page = () => <img alt="" src="/a.png" />;
`,
        expect: ["@next/next/no-img-element"],
      },
    },
    presets: ["react", "next"],
  },
  qwik: {
    files: {
      "src/component.tsx": {
        content: `import { component$, useVisibleTask$ } from "@builder.io/qwik";

export const Counter = component$(() => {
  useVisibleTask$(() => undefined);
  return <p>count</p>;
});
`,
        expect: ["qwik/no-use-visible-task"],
      },
      "src/legacy.jsx": {
        content: `import { component$, useVisibleTask$ } from "@builder.io/qwik";

export const Legacy = component$(() => {
  useVisibleTask$(() => undefined);
  return <p>count</p>;
});
`,
        expect: ["qwik/no-use-visible-task"],
      },
    },
    presets: ["qwik"],
    typeAware: {},
  },
  react: {
    files: {
      "src/component.tsx": {
        content: `export const Save = ({ label }: { readonly label: string }) => (
  <button>{label}</button>
);
`,
        expect: ["react/button-has-type"],
      },
      "src/legacy.jsx": {
        content: `export const Save = () => <button>Save</button>;
`,
        expect: ["react/button-has-type"],
      },
    },
    presets: ["react"],
  },
  remix: {
    files: {
      "app/routes/_index.tsx": {
        content: `export const Index = () => <p>home</p>;
`,
        expect: [],
      },
      "app/routes/about.jsx": {
        content: `export const About = () => <p>about</p>;
`,
        expect: [],
      },
    },
    presets: ["react", "remix"],
  },
  solid: {
    files: {
      "src/component.tsx": {
        content: `export const Greeting = ({ name }: { readonly name: string }) => (
  <p>{name}</p>
);
`,
        expect: ["solid/no-destructure"],
      },
      "src/legacy.jsx": {
        content: `export const Greeting = ({ name }) => <p>{name}</p>;
`,
        expect: ["solid/no-destructure"],
      },
    },
    presets: ["solid"],
  },
  storybook: {
    files: {
      "src/button.stories.tsx": {
        content: `const meta = { title: "Button" };

export default meta;

export const Primary = {};
`,
        expect: ["storybook/"],
      },
    },
    presets: ["storybook"],
  },
  svelte: {
    files: {
      "src/component.svelte": {
        content: `<script lang="ts">
  const markup: string = "<b>x</b>";
</script>

{@html markup}
`,
        expect: ["svelte/no-at-html-tags"],
        forbid: ["svelte/block-lang"],
      },
      "src/counter.svelte.ts": {
        content: `export const createCounter = () => {
  let count = $state(0);
  return {
    get count(): number {
      return count;
    },
    increment: (): void => {
      count += 1;
    },
  };
};
`,
        expect: [],
      },
    },
    presets: ["svelte"],
  },
  tanstack: {
    files: {
      "src/legacy.jsx": {
        content: `export const View = () => <p>view</p>;
`,
        expect: [],
      },
      "src/queries.ts": {
        content: `import { useQuery } from "@tanstack/react-query";

export const usePost = (id: string) =>
  useQuery({
    queryFn: () => fetch(\`/posts/\${id}\`),
    queryKey: ["post"],
  });
`,
        expect: ["@tanstack/query/exhaustive-deps"],
      },
      "src/routes/posts.$postId.tsx": {
        content: `import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/posts/$postId")({
  loader: () => ({ title: "post" }),
  component: PostPage,
});

function PostPage() {
  return <p>{Route.useLoaderData().title}</p>;
}
`,
        expect: [],
        forbid: [
          "@typescript-eslint/no-use-before-define",
          "github/filenames-match-regex",
          "sort-keys",
          "unicorn/filename-case",
        ],
      },
    },
    presets: ["react", "tanstack"],
    typeAware: {},
  },
  "type-aware": {
    files: {
      "src/fallback.ts": {
        // With types, unicorn/prefer-await skips a `.catch()` that isn't on a
        // promise.
        content: schemaFallback,
        expect: [],
        forbid: ["unicorn/prefer-await"],
      },
      "src/refresh.ts": {
        content: `export const refresh = (url: string): Promise<unknown> =>
  fetch(url).then((response) => response.json());
`,
        expect: ["unicorn/prefer-await"],
      },
      "src/typed-module.ts": {
        // Type-aware rule: proves the project service supplies type
        // information.
        content: `${typedModule}
export const unsafe = (input: string): string => JSON.parse(input);
`,
        expect: ["no-var", "@typescript-eslint/no-unsafe-return"],
      },
      "src/view.tsx": {
        content: `${typedModule}
export const View = ({ name }: { readonly name: string }) => <p>{name}</p>;
`,
        expect: ["no-var"],
      },
    },
    presets: ["type-aware"],
  },
  "type-aware-astro": {
    files: {
      "src/pages/index.astro": {
        // The client-side <script> is linted as a virtual TypeScript file
        // no tsconfig holds, so the Astro preset must switch the type-aware
        // rules off for it again.
        content: `---
const title = "Home";
---

<h1>{title}</h1>
<script>
  const button = document.querySelector("button");
  console.log(button);
</script>
`,
        expect: [],
      },
    },
    presets: ["type-aware", "astro"],
  },
  vitest: {
    files: {
      "src/sum.test.mts": {
        content: `import { expect, test } from "vitest";

test.only("adds", () => {
  expect(1 + 1).toBe(2);
});
`,
        expect: ["vitest/no-focused-tests"],
      },
      "src/sum.test.ts": {
        content: `import { expect, test } from "vitest";

test.only("adds", () => {
  expect(1 + 1).toBe(2);
});
`,
        expect: ["vitest/no-focused-tests"],
      },
    },
    presets: ["vitest"],
    typeAware: {
      "src/counter.test.ts": {
        // Type-aware rule: proves the add-on runs with type information.
        content: `import { expect, test } from "vitest";

class Counter {
  count = 0;

  increment(): void {
    this.count += 1;
  }
}

test("counts", () => {
  const counter = new Counter();
  const increment = counter.increment;
  increment();
  expect(counter.count).toBe(1);
});
`,
        expect: ["vitest/unbound-method"],
      },
    },
  },
  vue: {
    files: {
      "src/components/user-card.vue": {
        content: `<script setup lang="ts">
const title: string = "Hello";
</script>

<template>
  <h1 v-html="title" />
</template>
`,
        expect: ["vue/no-v-html"],
        forbid: ["vue/block-lang"],
      },
      "src/pages/index.vue": {
        // Nuxt and Vue Router file-based routing require these names.
        content: `<script setup lang="ts">
const title: string = "Home";
</script>

<template>
  <h1>{{ title }}</h1>
</template>
`,
        expect: [],
        forbid: ["vue/multi-word-component-names"],
      },
    },
    presets: ["vue"],
  },
} satisfies Record<string, Preset>;

// A framework preset run again with the type-aware preset and the
// framework's own type-aware add-on, as `init --type-aware` writes them.
const runsOf = (name: string, preset: Preset): [string, Preset][] => {
  if (!preset.typeAware) {
    return [[name, preset]];
  }

  const typeAwareRun: Preset = {
    files: { ...preset.files, ...preset.typeAware },
    presets: [
      "type-aware",
      ...preset.presets.flatMap((presetName) =>
        presetName === name ? [presetName, `${name}/type-aware`] : [presetName]
      ),
    ],
  };

  return [
    [name, preset],
    [`${name}-type-aware`, typeAwareRun],
  ];
};

const loadPreset = async (name: string): Promise<Linter.Config[]> => {
  const mod = await import(
    path.join(here, `../config/eslint/${name}/eslint.config.mjs`)
  );

  return mod.default;
};

const matches = (ruleId: string | null, expected: string): boolean =>
  ruleId !== null &&
  (expected.endsWith("/") ? ruleId.startsWith(expected) : ruleId === expected);

const writeFixture = async (
  root: string,
  { files, withoutTsconfig = false }: Preset
): Promise<void> => {
  await writeFile(path.join(root, "package.json"), packageJson);

  if (!withoutTsconfig) {
    await writeFile(path.join(root, "tsconfig.json"), tsconfig);
  }

  await Promise.all(
    Object.entries(files).map(async ([relative, file]) => {
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
  await writeFixture(root, preset);

  const loaded = await Promise.all(["core", ...preset.presets].map(loadPreset));
  const configs = loaded.flat();

  const eslint = new ESLint({
    cwd: root,
    overrideConfig: configs,
    overrideConfigFile: true,
  });

  const failures: string[] = [];
  let results: ESLint.LintResult[] = [];

  try {
    // Lint the directory, not a file list: a file no config block matches
    // is then silently skipped, which the coverage check below catches, and
    // non-source files (package.json, tsconfig.json) must not be picked up.
    results = await eslint.lintFiles(["."]);
  } catch (error) {
    return [`${name}: ESLint crashed: ${String(error)}`];
  }

  const byFile = new Map(
    results.map((result) => [
      path.relative(root, result.filePath).split(path.sep).join("/"),
      result,
    ])
  );

  for (const linted of byFile.keys()) {
    if (!(linted in preset.files)) {
      failures.push(`${name}: unexpected file linted: ${linted}`);
    }
  }

  for (const [relative, file] of Object.entries(preset.files)) {
    const result = byFile.get(relative);

    if (!result) {
      failures.push(`${name}: ${relative} was not linted by any config block`);
      continue;
    }

    for (const message of result.messages) {
      // Fatal messages are parse errors; "you need to install" is a plugin
      // reporting a dependency `ultracite init` should have installed.
      if (
        message.fatal === true ||
        message.message.includes("you need to install")
      ) {
        failures.push(`${name}: ${relative}: ${message.message}`);
      }
    }

    const ruleIds = result.messages.map((message) => message.ruleId);

    for (const expected of file.expect) {
      if (!ruleIds.some((ruleId) => matches(ruleId, expected))) {
        failures.push(`${name}: ${relative}: expected ${expected} to report`);
      }
    }

    for (const forbidden of file.forbid ?? []) {
      if (ruleIds.some((ruleId) => matches(ruleId, forbidden))) {
        failures.push(`${name}: ${relative}: ${forbidden} must not report`);
      }
    }
  }

  return failures;
};

const isEnabled = (entry: Linter.RuleEntry | undefined): boolean => {
  const severity = Array.isArray(entry) ? entry[0] : entry;

  return severity !== undefined && severity !== "off" && severity !== 0;
};

// The listeners a rule registers for a TypeScript file without type
// information. A rule that registers none does nothing there, and one that
// throws (typescript-eslint's) can't run at all.
const listenersWithoutTypes = (rule: Rule.RuleModule): number => {
  let count = 0;

  const probe: Rule.RuleModule = {
    ...rule,
    create: (context) => {
      const listeners = rule.create(context);
      count = Object.keys(listeners).length;

      return listeners;
    },
  };

  try {
    new Linter({ configType: "flat" }).verify(
      "export const value = 1;\n",
      [
        {
          files: ["**/*.ts"],
          languageOptions: { parser: typescriptParser },
          plugins: { probe: { rules: { rule: probe } } },
          rules: { "probe/rule": "error" },
        },
      ],
      "probe.ts"
    );
  } catch {
    return 0;
  }

  return count;
};

/**
 * Plugins mark the rules that read types `meta.docs.requiresTypeChecking`.
 * Some of those also work from the syntax tree; the rest register no
 * listeners without a TypeScript program, so in core they would be on but do
 * nothing. Core must run only the first kind, and the SonarJS and Unicorn
 * rules the type-aware preset adds must be the second, apart from the ones
 * the unicorn rules keep out of core on purpose because they are only
 * accurate with types. (typescript-eslint's split follows its own
 * `disable-type-checked` list instead.)
 */
const checkTypeInformation = async (tempRoot: string): Promise<string[]> => {
  // SAFETY: the ESLint preset's unicorn module exports the rules it runs only
  // with type information as a set of prefixed rule names.
  const { typeAwareOnlyRules } = (await import(
    path.join(here, "../config/eslint/core/rules/unicorn.mjs")
  )) as { typeAwareOnlyRules: Set<string> };

  const core = await loadPreset("core");
  const withTypeAware = [...core, ...(await loadPreset("type-aware"))];
  const plugins = new Map<string, Rule.RuleModule>();

  for (const config of withTypeAware) {
    for (const [namespace, plugin] of Object.entries(config.plugins ?? {})) {
      for (const [name, rule] of Object.entries(plugin.rules ?? {})) {
        // SAFETY: the presets register ESLint plugins, whose rules are rule
        // modules; the looser plugin type also admits other languages' rules.
        plugins.set(`${namespace}/${name}`, rule as Rule.RuleModule);
      }
    }
  }

  const rulesFor = async (configs: Linter.Config[]) => {
    const eslint = new ESLint({
      cwd: tempRoot,
      overrideConfig: configs,
      overrideConfigFile: true,
    });

    const config: Linter.Config =
      await eslint.calculateConfigForFile("src/probe.ts");

    return Object.entries(config.rules ?? {}).filter(([, entry]) =>
      isEnabled(entry)
    );
  };

  const needsTypes = (ruleId: string): boolean | undefined => {
    const rule = plugins.get(ruleId);
    const docs = rule?.meta?.docs;

    const marked =
      docs !== undefined &&
      "requiresTypeChecking" in docs &&
      docs.requiresTypeChecking === true;

    return rule && marked ? listenersWithoutTypes(rule) === 0 : undefined;
  };

  const failures: string[] = [];
  const coreRules = await rulesFor(core);

  for (const [ruleId] of coreRules) {
    if (needsTypes(ruleId) === true) {
      failures.push(
        `core: ${ruleId} does nothing without type information; move it to eslint/type-aware`
      );
    }
  }

  const coreIds = new Set(coreRules.map(([ruleId]) => ruleId));

  for (const [ruleId] of await rulesFor(withTypeAware)) {
    const added = !coreIds.has(ruleId);
    const ownSplit = ruleId.startsWith("@typescript-eslint/");
    const typeAwareOnly = typeAwareOnlyRules.has(ruleId);

    if (added && !ownSplit && !typeAwareOnly && needsTypes(ruleId) !== true) {
      failures.push(
        `type-aware: ${ruleId} works without type information; keep it in core`
      );
    }
  }

  return failures;
};

const main = async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "ultracite-eslint-"));
  const failures: string[] = [];
  const previousCwd = process.cwd();

  try {
    // Give the fixture projects this package's dependencies and run from
    // them, as a user runs ESLint from a project where `ultracite init`
    // installed the preset. Some plugins resolve optional peers from
    // process.cwd() when they are first imported (eslint-plugin-astro's
    // jsx-a11y rules), so this must happen before any preset loads.
    await symlink(
      path.join(here, "../node_modules"),
      path.join(tempRoot, "node_modules"),
      "junction"
    );
    process.chdir(tempRoot);

    // Sequential: every preset shares one TypeScript project service per
    // process, and running them in parallel only adds memory pressure.
    const runs = Object.entries(presets).flatMap(([name, preset]) =>
      runsOf(name, preset)
    );

    for (const [name, preset] of runs) {
      // oxlint-disable-next-line no-await-in-loop -- see comment above
      const presetFailures = await checkPreset(tempRoot, name, preset);
      console.log(`${presetFailures.length === 0 ? "✓" : "✗"} eslint/${name}`);
      failures.push(...presetFailures);
    }

    const typeFailures = await checkTypeInformation(tempRoot);
    console.log(
      `${typeFailures.length === 0 ? "✓" : "✗"} rules that need type information are only in eslint/type-aware`
    );
    failures.push(...typeFailures);
  } finally {
    process.chdir(previousCwd);
    await rm(tempRoot, { force: true, recursive: true });
  }

  if (failures.length > 0) {
    console.error(`\n${failures.length} ESLint smoke failure(s):`);

    for (const failure of failures) {
      console.error(`  ✗ ${failure}`);
    }

    process.exit(1);
  }

  console.log("\nEvery ESLint preset lints real files");
};

await main();
