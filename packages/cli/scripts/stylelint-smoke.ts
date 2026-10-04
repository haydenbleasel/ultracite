/**
 * Stylelint preset smoke test.
 *
 * Lints a generated project through a config that re-exports the preset,
 * exactly as `ultracite init` writes it, so parse failures (SCSS and Less
 * without their custom syntax), false positives on idiomatic Tailwind CSS v4,
 * and ignore patterns that never apply are caught before release. The
 * Tailwind, SCSS and Less fixtures must lint clean; the other files prove the
 * CSS rules run and that build output is skipped.
 */
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import stylelint from "stylelint";

interface FixtureFile {
  content: string;
  /** Rule ids that must report. Empty means the file must lint clean. */
  expect: string[];
  /** The file must be skipped by the preset's ignoreFiles. */
  ignored?: boolean;
}

const here = import.meta.dirname;
const presetPath = path.join(here, "../config/stylelint/stylelint.config.mjs");

const typo = `a {
  colr: red;
}
`;

const files = {
  "dist/app.css": { content: typo, expect: [], ignored: true },
  "src/app.less": {
    content: `@import (reference) "mixins.less";

@primary: #3b82f6;
@min768: ~"(min-width: 768px)";

.rounded(@radius: 4px) {
  border-radius: @radius;
}

.button {
  .rounded(8px);

  width: ~"calc(100% - 10px)";
  color: darken(@primary, 10%);

  &:hover {
    color: fade(@primary, 50%);
  }

  @media @min768 {
    padding: 8px;
  }
}

.guard when (@mode = dark) {
  color: white;
}
`,
    expect: [],
  },
  "src/app.scss": {
    content: `@use "sass:math";

@forward "./mixins";

// line comment
$primary: #3b82f6;
$sizes: (
  small: 4px,
  large: 16px,
);

@mixin rounded($radius: 4px) {
  border-radius: $radius;
}

@function double($n) {
  @return $n * 2;
}

%placeholder {
  color: red;
}

.button {
  @include rounded(8px);

  @extend %placeholder;

  padding: math.div(16px, 2);
  margin: double(2px);
  color: darken($primary, 10%);

  &:hover {
    color: lighten($primary, 10%);
  }

  @each $name, $size in $sizes {
    &--#{$name} {
      font-size: $size;
    }
  }

  @if $primary == #3b82f6 {
    border: 1px solid $primary;
  } @else {
    border: none;
  }
}
`,
    expect: [],
  },
  "src/app/(marketing)/page.css": {
    content: typo,
    expect: ["property-no-unknown"],
  },
  "src/tailwind.css": {
    content: `@import "tailwindcss";

@plugin "@tailwindcss/typography";

@config "../tailwind.config.js";

@source "../node_modules/@my/ui";
@source not "../legacy";

@custom-variant dark (&:where(.dark, .dark *));

@custom-variant any-hover {
  @media (any-hover: hover) {
    &:hover {
      @slot;
    }
  }
}

@theme {
  --color-*: initial;
  --color-brand: oklch(72% 0.11 221deg);
  --font-display: "Satoshi", sans-serif;
  --text-xl--line-height: 1.75rem;
}

@theme inline {
  --color-background: var(--background);
}

@utility content-auto {
  content-visibility: auto;
}

@utility tab-* {
  tab-size: --value(integer);
}

@layer components {
  .btn {
    @apply rounded px-4 hover:bg-brand;
  }
}

.card {
  padding: --spacing(4);
  color: --alpha(var(--color-brand) / 50%);

  @variant dark {
    color: white;
  }
}

@media (width >= theme(--breakpoint-xl)) {
  .wide {
    display: grid;
  }
}
`,
    expect: [],
  },
  "src/unformatted.css": {
    content: "a{color:red}\n",
    expect: ["prettier/prettier"],
  },
} satisfies Record<string, FixtureFile>;

const writeFixture = async (root: string): Promise<void> => {
  await writeFile(
    path.join(root, "package.json"),
    JSON.stringify({ name: "stylelint-smoke", private: true })
  );
  await writeFile(
    path.join(root, "stylelint.config.mjs"),
    `export { default } from ${JSON.stringify(presetPath)};\n`
  );
  // The preset's extends, plugins and custom syntaxes resolve from the
  // project, so give the fixture this package's dependencies.
  await symlink(
    path.join(here, "../node_modules"),
    path.join(root, "node_modules"),
    "junction"
  );
  await Promise.all(
    Object.entries(files).map(async ([relative, file]) => {
      const target = path.join(root, relative);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, file.content);
    })
  );
};

const main = async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ultracite-stylelint-"));
  const failures: string[] = [];

  try {
    await writeFixture(root);
    const { results } = await stylelint.lint({
      allowEmptyInput: true,
      cwd: root,
      files: "**/*.{css,scss,less}",
    });
    const byFile = new Map(
      results.map((result) => [
        path
          .relative(root, result.source ?? "")
          .split(path.sep)
          .join("/"),
        result,
      ])
    );

    for (const [relative, file] of Object.entries(files)) {
      const result = byFile.get(relative);
      const ignored = result === undefined || result.ignored === true;
      if ("ignored" in file && file.ignored) {
        if (!ignored) {
          failures.push(`${relative}: should be ignored`);
        }
        continue;
      }
      if (!result || ignored) {
        failures.push(`${relative}: was not linted`);
        continue;
      }
      for (const warning of result.invalidOptionWarnings) {
        failures.push(`${relative}: ${warning.text}`);
      }
      const rules = new Set(result.warnings.map((warning) => warning.rule));
      if (file.expect.length === 0) {
        for (const warning of result.warnings) {
          failures.push(`${relative}:${warning.line} ${warning.text}`);
        }
      }
      for (const expected of file.expect) {
        if (!rules.has(expected)) {
          failures.push(`${relative}: expected ${expected} to report`);
        }
      }
    }
  } finally {
    await rm(root, { force: true, recursive: true });
  }

  if (failures.length > 0) {
    console.error(`${failures.length} Stylelint smoke failure(s):`);
    for (const failure of failures) {
      console.error(`  ✗ ${failure}`);
    }
    process.exit(1);
  }

  console.log("✓ stylelint lints CSS, Tailwind v4, SCSS and Less");
};

await main();
