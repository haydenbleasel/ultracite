import packageJson from "../package.json" with { type: "json" };
import type { options } from "./data/options";

type Linter = (typeof options.linters)[number];

type Frameworks = (typeof options.frameworks)[number];

/**
 * The single source of truth for which toolchain packages each linter setup
 * needs and which versions this Ultracite release was verified against.
 * `ultracite init` installs from these tables and `ultracite upgrade`
 * re-syncs an existing project against them.
 */

/**
 * The Biome release the presets are verified against. Init installs it
 * exactly so the generated config's rule keys always exist.
 */
export const biomeVersion = packageJson.devDependencies["@biomejs/biome"];

/**
 * Version ranges the presets require of the tools they configure. Declared as
 * optional peer dependencies so package managers warn on a mismatch, and read
 * by `ultracite doctor` to fail loudly when the installed tool is too old.
 */
export const toolchainPeerRanges = packageJson.peerDependencies;

export type ToolchainPackageName = keyof typeof toolchainPeerRanges;

export const oxlintJsPlugins = [
  "@shadcn/lint",
  "anti-slop",
  "eslint-plugin-github",
  "eslint-plugin-jsdoc",
  "eslint-plugin-sonarjs",
  "eslint-plugin-tsdoc",
  "oxlint-plugin-react-doctor",
] as const;

export type OxlintJsPlugin = (typeof oxlintJsPlugins)[number];

// anti-slop is vendored inside the ultracite package, so it has no dev
// dependency to install.
type OxlintNpmJsPlugin = Exclude<OxlintJsPlugin, "anti-slop">;

export const isOxlintNpmJsPlugin = (
  jsPlugin: OxlintJsPlugin
): jsPlugin is OxlintNpmJsPlugin => jsPlugin !== "anti-slop";

/**
 * The first Bun release with `bun lint` and `bun fmt`, which the Bun
 * provider runs. Bun isn't an npm dependency of the project, so `ultracite
 * doctor` and the Bun commands name this version when the Bun on PATH can't
 * run them. Bun 1.4.4 shipped `bun fmt` but kept `bun lint` to canary builds
 * (oven-sh/bun#46438), so this is the earliest release that could have both.
 */
export const MIN_BUN_VERSION = "1.4.5";

/**
 * The Oxlint toolchain `init` installs and `upgrade` re-syncs, at the ranges
 * the presets were verified against. oxfmt is pre-1.0, so its caret range
 * holds the minor version and formatting doesn't change under a project
 * between Ultracite releases.
 */
export const OXLINT_TOOLCHAIN_DEV_DEPENDENCIES = {
  oxfmt: packageJson.devDependencies.oxfmt,
  oxlint: packageJson.devDependencies.oxlint,
  "oxlint-tsgolint": packageJson.devDependencies["oxlint-tsgolint"],
};

export const OXLINT_JS_PLUGIN_DEV_DEPENDENCIES = {
  "@shadcn/lint": packageJson.devDependencies["@shadcn/lint"],
  "eslint-plugin-github": packageJson.devDependencies["eslint-plugin-github"],
  "eslint-plugin-jsdoc": packageJson.devDependencies["eslint-plugin-jsdoc"],
  "eslint-plugin-sonarjs": packageJson.devDependencies["eslint-plugin-sonarjs"],
  "eslint-plugin-tsdoc": packageJson.devDependencies["eslint-plugin-tsdoc"],
  "oxlint-plugin-react-doctor":
    packageJson.devDependencies["oxlint-plugin-react-doctor"],
} satisfies Record<OxlintNpmJsPlugin, string>;

// The core preset sets no-unmodified-loop-condition's
// checkConditionalExpressions option, which ESLint 10.9 added, so the peer
// range starts there. @eslint/js is versioned separately from ESLint since 10
// (its latest is 10.0.x), so it takes its own range.
const supportedEslintVersion = toolchainPeerRanges.eslint;

export const eslintCoreDevDependencies = {
  "@eslint/js": packageJson.devDependencies["@eslint/js"],
  "@typescript-eslint/eslint-plugin":
    packageJson.devDependencies["@typescript-eslint/eslint-plugin"],
  "@typescript-eslint/parser":
    packageJson.devDependencies["@typescript-eslint/parser"],
  eslint: supportedEslintVersion,
  "eslint-config-prettier":
    packageJson.devDependencies["eslint-config-prettier"],
  "eslint-import-resolver-typescript":
    packageJson.devDependencies["eslint-import-resolver-typescript"],
  "eslint-plugin-compat": packageJson.devDependencies["eslint-plugin-compat"],
  "eslint-plugin-github": packageJson.devDependencies["eslint-plugin-github"],
  "eslint-plugin-html": packageJson.devDependencies["eslint-plugin-html"],
  "eslint-plugin-import-x":
    packageJson.devDependencies["eslint-plugin-import-x"],
  "eslint-plugin-jsdoc": packageJson.devDependencies["eslint-plugin-jsdoc"],
  "eslint-plugin-n": packageJson.devDependencies["eslint-plugin-n"],
  "eslint-plugin-promise": packageJson.devDependencies["eslint-plugin-promise"],
  "eslint-plugin-sonarjs": packageJson.devDependencies["eslint-plugin-sonarjs"],
  "eslint-plugin-unicorn": packageJson.devDependencies["eslint-plugin-unicorn"],
  "eslint-plugin-unused-imports":
    packageJson.devDependencies["eslint-plugin-unused-imports"],
  globals: packageJson.devDependencies.globals,
  // The Stylelint preset parses .less and .scss files with these syntaxes.
  "postcss-less": packageJson.devDependencies["postcss-less"],
  "postcss-scss": packageJson.devDependencies["postcss-scss"],
  prettier: toolchainPeerRanges.prettier,
  "prettier-plugin-tailwindcss":
    packageJson.devDependencies["prettier-plugin-tailwindcss"],
  stylelint: toolchainPeerRanges.stylelint,
  // The generated stylelint config extends/uses these; `stylelint` alone
  // cannot resolve them.
  "stylelint-config-idiomatic-order":
    packageJson.devDependencies["stylelint-config-idiomatic-order"],
  "stylelint-config-standard":
    packageJson.devDependencies["stylelint-config-standard"],
} satisfies Record<string, string>;

// Extra ESLint devDependencies, keyed by the framework that needs them.
export const eslintFrameworkDevDependencies = {
  angular: {
    "@angular-eslint/eslint-plugin":
      packageJson.devDependencies["@angular-eslint/eslint-plugin"],
  },
  astro: {
    "eslint-plugin-astro": packageJson.devDependencies["eslint-plugin-astro"],
    // Loaded by the astro/jsx-a11y/* rules the Astro preset enables; without
    // it every .astro file reports "you need to install eslint-plugin-jsx-a11y".
    "eslint-plugin-jsx-a11y":
      packageJson.devDependencies["eslint-plugin-jsx-a11y"],
    "prettier-plugin-astro":
      packageJson.devDependencies["prettier-plugin-astro"],
  },
  cypress: {
    "eslint-plugin-cypress":
      packageJson.devDependencies["eslint-plugin-cypress"],
  },
  jest: {
    "eslint-plugin-jest": packageJson.devDependencies["eslint-plugin-jest"],
  },
  nestjs: {
    "@darraghor/eslint-plugin-nestjs-typed":
      packageJson.devDependencies["@darraghor/eslint-plugin-nestjs-typed"],
  },
  next: {
    "@next/eslint-plugin-next":
      packageJson.devDependencies["@next/eslint-plugin-next"],
    "eslint-plugin-react-doctor":
      packageJson.devDependencies["eslint-plugin-react-doctor"],
  },
  qwik: {
    "eslint-plugin-qwik": packageJson.devDependencies["eslint-plugin-qwik"],
  },
  react: {
    "eslint-plugin-jsx-a11y":
      packageJson.devDependencies["eslint-plugin-jsx-a11y"],
    "eslint-plugin-react": packageJson.devDependencies["eslint-plugin-react"],
    "eslint-plugin-react-doctor":
      packageJson.devDependencies["eslint-plugin-react-doctor"],
    "eslint-plugin-react-hooks":
      packageJson.devDependencies["eslint-plugin-react-hooks"],
  },
  remix: {
    "eslint-plugin-remix": packageJson.devDependencies["eslint-plugin-remix"],
  },
  solid: {
    "eslint-plugin-solid": packageJson.devDependencies["eslint-plugin-solid"],
  },
  storybook: {
    "eslint-plugin-storybook":
      packageJson.devDependencies["eslint-plugin-storybook"],
    // Required peer of eslint-plugin-storybook, which the preset imports;
    // without it the config fails to load.
    storybook: packageJson.devDependencies.storybook,
  },
  svelte: {
    "eslint-plugin-svelte": packageJson.devDependencies["eslint-plugin-svelte"],
    "prettier-plugin-svelte":
      packageJson.devDependencies["prettier-plugin-svelte"],
  },
  tanstack: {
    "@tanstack/eslint-plugin-query":
      packageJson.devDependencies["@tanstack/eslint-plugin-query"],
    "@tanstack/eslint-plugin-router":
      packageJson.devDependencies["@tanstack/eslint-plugin-router"],
    "@tanstack/eslint-plugin-start":
      packageJson.devDependencies["@tanstack/eslint-plugin-start"],
    "eslint-plugin-react-doctor":
      packageJson.devDependencies["eslint-plugin-react-doctor"],
  },
  vitest: {
    "@vitest/eslint-plugin":
      packageJson.devDependencies["@vitest/eslint-plugin"],
  },
  vue: {
    "eslint-plugin-vue": packageJson.devDependencies["eslint-plugin-vue"],
  },
} satisfies Record<Frameworks, Record<string, string>>;

// Opens a dependency→version literal into a mutable accumulator so entries can
// be added under computed names without widening the literal's known type.
export const asDependencyVersionMap = (map: Record<string, string>) => map;

export const buildEslintDevDependencies = (frameworks: Frameworks[]) => {
  const devDependencies = asDependencyVersionMap({
    ...eslintCoreDevDependencies,
  });

  for (const framework of frameworks) {
    Object.assign(devDependencies, eslintFrameworkDevDependencies[framework]);
  }

  return devDependencies;
};

/**
 * ESLint plugins whose `eslint` peer range stops before ESLint 10, though they
 * run on it. npm refuses to install them next to ESLint 10 (ERESOLVE), and
 * `--legacy-peer-deps` would only get that one install through, so for npm
 * projects init and upgrade add an `overrides` entry pointing their `eslint`
 * peer at the project's own. A test checks this list against the installed
 * plugins' peer ranges.
 */
export const eslintPeerOverridePackages: readonly string[] = [
  "@tanstack/eslint-plugin-start",
  "eslint-plugin-jsx-a11y",
  "eslint-plugin-react",
];

/** The package name of a `name@version` spec. */
const specName = (spec: string): string => {
  const versionAt = spec.lastIndexOf("@");

  return versionAt > 0 ? spec.slice(0, versionAt) : spec;
};

/** The packages among `name@version` specs whose ESLint peer npm rejects. */
export const eslintPeerOverridesFor = (specs: readonly string[]): string[] =>
  eslintPeerOverridePackages.filter((name) =>
    specs.some((spec) => specName(spec) === name)
  );

const eslintDevDependencyNames = new Set([
  ...Object.keys(eslintCoreDevDependencies),
  ...Object.values(eslintFrameworkDevDependencies).flatMap((dependencies) =>
    Object.keys(dependencies ?? {})
  ),
]);

// The Oxlint toolchain and the JS plugins an Oxlint config can load. Bun
// reads the same configs and runs their JS plugins, and the editor
// extensions run oxlint, oxfmt and oxlint-tsgolint on them, so switching
// between Oxlint and Bun prunes nothing either way.
const oxlintDependencyNames = new Set([
  "@shadcn/lint",
  "eslint-plugin-github",
  "eslint-plugin-jsdoc",
  "eslint-plugin-sonarjs",
  "eslint-plugin-tsdoc",
  "oxfmt",
  "oxlint",
  "oxlint-plugin-react-doctor",
  "oxlint-tsgolint",
]);

export const dependencyNamesByLinter = {
  biome: new Set(["@biomejs/biome"]),
  bun: oxlintDependencyNames,
  // Only the Oxlint setup installs eslint-plugin-tsdoc, but it's an ESLint
  // plugin an ESLint config may load too, so ESLint setups don't prune it.
  // eslint-plugin-prettier and stylelint-prettier are what earlier versions
  // installed to run Prettier inside ESLint and Stylelint, so switching
  // linters still removes them.
  eslint: new Set([
    ...eslintDevDependencyNames,
    "eslint-plugin-prettier",
    "eslint-plugin-tsdoc",
    "stylelint-prettier",
  ]),
  oxlint: oxlintDependencyNames,
} satisfies Record<Linter, Set<string>>;
