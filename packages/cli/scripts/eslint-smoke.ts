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

import { ESLint } from "eslint";
import type { Linter } from "eslint";

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
      "src/button.stories.tsx": {
        content: `const meta = { title: "Button" };

export default meta;

export const Primary = {};
`,
        expect: ["storybook/"],
      },
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
    presets: [],
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
  files: Record<string, FixtureFile>
): Promise<void> => {
  await writeFile(path.join(root, "package.json"), packageJson);
  await writeFile(path.join(root, "tsconfig.json"), tsconfig);
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
  await writeFixture(root, preset.files);

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
    for (const [name, preset] of Object.entries(presets)) {
      // oxlint-disable-next-line no-await-in-loop -- see comment above
      const presetFailures = await checkPreset(tempRoot, name, preset);
      console.log(`${presetFailures.length === 0 ? "✓" : "✗"} eslint/${name}`);
      failures.push(...presetFailures);
    }
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

  console.log(
    `\nAll ${Object.keys(presets).length} ESLint presets lint real files`
  );
};

await main();
