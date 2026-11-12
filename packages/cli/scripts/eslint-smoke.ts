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

import * as typescriptParser from "@typescript-eslint/parser";
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
  /** Config objects the project's own config adds after the presets. */
  userConfig?: Linter.Config[];
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
      "public/Welcome_Email.html": {
        // A whole page that starts with an XML declaration. It's linted as a
        // template, after the `{` in its text, without the rules that only fit
        // one, and its own name is checked.
        content: `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
  <body style="margin: 0">
    <p>Reply with {yes} or {no}.</p>
    <my-signature></my-signature>
    <img src="https://example.com/logo.png" style="display: block" />
  </body>
</html>
`,
        expect: [
          "@angular-eslint/template/alt-text",
          "github/filenames-match-regex",
        ],
        forbid: [
          "@angular-eslint/template/no-inline-styles",
          "@angular-eslint/template/prefer-ngsrc",
          "@angular-eslint/template/prefer-self-closing-tags",
        ],
      },
      "src/banner.html": {
        // A fragment with an inline script: a template and a scripts block.
        content: `<div (click)="close()">Saved</div>
<script>
  var legacy = 1;
  console.log(legacy);
</script>
`,
        expect: [
          "@angular-eslint/template/click-events-have-key-events",
          "no-var",
        ],
        forbid: ["github/filenames-match-regex"],
      },
      "src/index.html": {
        // A whole page, linted as a template and for its inline script. The
        // `{` in the code sample is text, so the image after it is still
        // checked, but the rules that only fit a template stay quiet.
        content: `<!doctype html>
<html lang="en">
  <body>
    <app-root></app-root>
    <noscript><pre>if (ready) { start(); }</pre></noscript>
    <img src="/logo.png" />
    <script>
      var legacy = 1;
      console.log(legacy);
    </script>
  </body>
</html>
`,
        expect: ["@angular-eslint/template/alt-text", "no-var"],
        forbid: [
          "@angular-eslint/template/prefer-ngsrc",
          "github/filenames-match-regex",
        ],
      },
      "src/receipt.html": {
        // A component's template that is a whole page, such as an email
        // rendered on the server, still gets the template rules.
        content: `<!DOCTYPE html>
<html lang="en">
  <body>
    @if (order().status == "paid") {
      <p>Thanks, {{ order().name }}.</p>
    }
  </body>
</html>
`,
        expect: ["@angular-eslint/template/eqeqeq"],
        forbid: ["github/filenames-match-regex"],
      },
      "src/user-card.component.ts": {
        // An inline template: the same rules, reported in the TypeScript
        // file, beside core's and the Angular plugin's rules for the class.
        content: `import { Component } from "@angular/core";

${legacyVar}
@Component({
  selector: "app-user-card",
  template: \`
    <div (click)="open()">
      <img [src]="avatar" />
      <input type="text" autofocus />
      <p>{{ count() }}</p>
    </div>
  \`,
})
export class UserCard {
  public avatar = legacy;
}
`,
        expect: [
          "@angular-eslint/component-class-suffix",
          "@angular-eslint/template/alt-text",
          "@angular-eslint/template/click-events-have-key-events",
          "@angular-eslint/template/interactive-supports-focus",
          "no-var",
        ],
        // The inline template's name is ESLint's, which the filename rule
        // mustn't check.
        forbid: [
          "@angular-eslint/template/i18n",
          "@angular-eslint/template/no-autofocus",
          "@angular-eslint/template/no-call-expression",
          "github/filenames-match-regex",
        ],
      },
      "src/user-list.html": {
        // An external template: accessibility rules and general template
        // rules. The field takes focus on purpose, a signal is read by
        // calling it, and a static class merges with a bound one, so none of
        // those may report.
        content: `<div (click)="open()">
  <img [src]="avatar" />
  <input type="text" autofocus />
  <span class="name" [class]="state()" *ngIf="a == b">{{ name() }}</span>
  <app-user-card></app-user-card>
</div>
`,
        expect: [
          "@angular-eslint/template/alt-text",
          "@angular-eslint/template/click-events-have-key-events",
          "@angular-eslint/template/eqeqeq",
          "@angular-eslint/template/interactive-supports-focus",
          "@angular-eslint/template/prefer-control-flow",
          "@angular-eslint/template/prefer-self-closing-tags",
        ],
        forbid: [
          "@angular-eslint/template/i18n",
          "@angular-eslint/template/no-autofocus",
          "@angular-eslint/template/no-call-expression",
          "@angular-eslint/template/no-duplicate-attributes",
        ],
      },
    },
    presets: ["angular"],
    typeAware: {},
  },
  "angular-user-rules": {
    // A rule the project's config turns on without `files` runs on templates
    // too. The jsdoc rules read every node's range, so they throw on each
    // template unless the preset's parser gives its nodes one. A filename
    // pattern of the project's own still checks only real files' names, not
    // the names ESLint gives inline scripts and templates, which it rejects.
    files: {
      "src/banner.html": {
        content: `<div (click)="close()">Saved</div>
<script>
  console.log("saved");
</script>
`,
        expect: ["@angular-eslint/template/click-events-have-key-events"],
        forbid: ["github/filenames-match-regex"],
      },
      "src/user_menu.html": {
        content: `<button type="button">Menu</button>
`,
        expect: ["github/filenames-match-regex"],
      },
      "src/user-card.component.ts": {
        content: `import { Component } from "@angular/core";

@Component({
  selector: "app-user-card",
  template: \`<img [src]="avatar" />\`,
})
export class UserCardComponent {
  public avatar = "";
}
`,
        expect: ["@angular-eslint/template/alt-text"],
        forbid: ["github/filenames-match-regex"],
      },
      "src/user-list.html": {
        content: `<!-- The list of users -->
<ul>
  @for (user of users(); track user.id) {
    <li><img [src]="user.avatar" /></li>
  }
</ul>
`,
        expect: ["@angular-eslint/template/alt-text"],
      },
    },
    presets: ["angular"],
    userConfig: [
      {
        rules: {
          "github/filenames-match-regex": [
            "error",
            String.raw`^[a-z0-9-]+(\.[a-z0-9-]+)?$`,
          ],
          "jsdoc/check-tag-names": ["error", { definedTags: ["internal"] }],
        },
      },
    ],
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
  drizzle: {
    files: {
      "src/cache.ts": {
        content: `const cache = new Map<string, number>();

export const forget = (key: string): boolean => cache.delete(key);
`,
        expect: [],
        forbid: ["drizzle/enforce-delete-with-where"],
      },
      "src/db.ts": {
        content: `import { db } from "./client";
import { users } from "./schema";

export const wipe = async (): Promise<void> => {
  await db.delete(users);
};
`,
        expect: ["drizzle/enforce-delete-with-where"],
      },
    },
    presets: ["drizzle"],
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
  playwright: {
    files: {
      "src/home.spec.ts": {
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
        expect: ["playwright/no-wait-for-timeout"],
        forbid: ["no-empty-pattern"],
      },
    },
    presets: ["playwright"],
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
      "src/labelled-field.tsx": {
        // Qwik writes a label's target as `for`, which the preset's
        // jsx-a11y settings accept, and the field takes focus on purpose, so
        // neither may report.
        content: `import { component$ } from "@builder.io/qwik";

export const EmailField = component$(() => (
  <div>
    <label for="email">Email</label>
    <input id="email" type="email" autoFocus />
  </div>
));
`,
        expect: [],
        forbid: [
          "jsx-a11y/label-has-associated-control",
          "jsx-a11y/no-autofocus",
        ],
      },
      "src/signup-form.tsx": {
        // The accessibility rules: an image with no alt text, a label with no
        // control, an anchor with no href and a click handler on a div. The
        // rules don't know Qwik's `onClick$`, so the div isn't reported.
        content: `import { $, component$ } from "@builder.io/qwik";

export const SignupForm = component$(() => {
  const submit = $(() => undefined);

  return (
    <form>
      <img height={32} src="/logo.png" width={32} />
      <label>Name</label>
      <a onClick$={submit}>Help</a>
      <div onClick$={submit}>Send</div>
    </form>
  );
});
`,
        expect: [
          "jsx-a11y/alt-text",
          "jsx-a11y/anchor-is-valid",
          "jsx-a11y/label-has-associated-control",
        ],
        forbid: [
          "jsx-a11y/click-events-have-key-events",
          "jsx-a11y/no-static-element-interactions",
        ],
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
  "react-native": {
    files: {
      "src/app.jsx": {
        content: `import { Text, View } from "react-native";

export const App = () => (
  <View>
    {__DEV__ ? <Text>dev</Text> : null}
    hello
  </View>
);
`,
        expect: ["react-native/no-raw-text"],
        forbid: ["no-undef"],
      },
      "src/deep.ts": {
        content: `import Foo from "react-native/Libraries/Foo";

export const foo: unknown = Foo;
`,
        expect: ["@react-native/no-deep-imports"],
      },
    },
    presets: ["react", "react-native"],
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
      "src/labelled-field.tsx": {
        // Solid writes a label's target as `for`, which the preset's
        // jsx-a11y settings accept, and the field takes focus on purpose, so
        // neither may report.
        content: `export const EmailField = () => (
  <div>
    <label for="email">Email</label>
    <input autofocus id="email" type="email" />
  </div>
);
`,
        expect: [],
        forbid: [
          "jsx-a11y/label-has-associated-control",
          "jsx-a11y/no-autofocus",
        ],
      },
      "src/signup-form.tsx": {
        // The accessibility rules: an image with no alt text, a label with no
        // control and a click handler on a div.
        content: `export const SignupForm = (props: { readonly submit: () => void }) => (
  <form>
    <img src="/logo.png" />
    <label>Name</label>
    <div onClick={() => props.submit()}>Send</div>
  </form>
);
`,
        expect: [
          "jsx-a11y/alt-text",
          "jsx-a11y/click-events-have-key-events",
          "jsx-a11y/label-has-associated-control",
          "jsx-a11y/no-static-element-interactions",
        ],
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
      // Route first: `component` reads the component before its declaration
      // runs, which throws at import. Core's no-use-before-define stays on in
      // route files to catch it.
      "src/routes/index.tsx": {
        content: `import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomePage,
});

const HomePage = () => <p>home</p>;
`,
        expect: ["@typescript-eslint/no-use-before-define"],
      },
      // Component first: it only reads `Route` inside its body, which
      // `variables: false` allows.
      "src/routes/posts.$postId.tsx": {
        content: `import { createFileRoute } from "@tanstack/react-router";

const PostPage = () => <p>{Route.useLoaderData().title}</p>;

export const Route = createFileRoute("/posts/$postId")({
  loader: () => ({ title: "post" }),
  component: PostPage,
});
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
      "src/components/user-avatar.vue": {
        // The accessibility plugin's rules: an image with no alt text, a
        // click handler on a div, and an input nothing labels. The label
        // wraps its control without a `for`, and the field takes focus on
        // purpose, so neither may report.
        content: `<script setup lang="ts">
const source: string = "/avatar.png";
const open = (): void => {};
</script>

<template>
  <div @click="open">
    <img :src="source" />
    <input type="text" />
    <label>Name <input type="text" autofocus /></label>
  </div>
</template>
`,
        expect: [
          "vuejs-accessibility/alt-text",
          "vuejs-accessibility/click-events-have-key-events",
          "vuejs-accessibility/form-control-has-label",
          "vuejs-accessibility/no-static-element-interactions",
        ],
        forbid: [
          "vuejs-accessibility/label-has-for",
          "vuejs-accessibility/no-autofocus",
        ],
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
    ...preset,
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
  const configs = [...loaded.flat(), ...(preset.userConfig ?? [])];

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

/**
 * Core turns the base no-use-before-define off on TypeScript files, because
 * the typescript-eslint extension runs there instead, and the preset drops
 * deprecated typescript-eslint rules. typescript-eslint plans to deprecate
 * the extension in favour of the base rule (typescript-eslint#11014); when it
 * does, TypeScript files would lose the rule without any error.
 */
const checkUseBeforeDefineExtension = async (): Promise<string[]> => {
  const core = await loadPreset("core");

  const typescriptConfig = core.find(
    (config) => config.plugins?.["@typescript-eslint"]
  );

  const rule =
    typescriptConfig?.plugins?.["@typescript-eslint"]?.rules?.[
      "no-use-before-define"
    ];

  // SAFETY: the preset registers typescript-eslint, whose rules are rule
  // modules; the looser plugin type also admits other languages' rules.
  const deprecated = (rule as Rule.RuleModule | undefined)?.meta?.deprecated;

  return rule && !deprecated
    ? []
    : [
        "@typescript-eslint/no-use-before-define is deprecated or gone, so the preset no longer runs it: turn the base no-use-before-define back on for TypeScript files in config/eslint/core/rules/eslint-typescript.mjs",
      ];
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

    const extensionFailures = await checkUseBeforeDefineExtension();
    console.log(
      `${extensionFailures.length === 0 ? "✓" : "✗"} @typescript-eslint/no-use-before-define still covers TypeScript files`
    );
    failures.push(...extensionFailures);
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
