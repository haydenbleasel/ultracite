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
  "anti-slop",
  "eslint-plugin-github",
  "eslint-plugin-sonarjs",
  "oxlint-plugin-react-doctor",
] as const;

export type OxlintJsPlugin = (typeof oxlintJsPlugins)[number];

// anti-slop is vendored inside the ultracite package, so it has no dev
// dependency to install.
type OxlintNpmJsPlugin = Exclude<OxlintJsPlugin, "anti-slop">;

export const isOxlintNpmJsPlugin = (
  jsPlugin: OxlintJsPlugin
): jsPlugin is OxlintNpmJsPlugin => jsPlugin !== "anti-slop";

export const OXLINT_JS_PLUGIN_DEV_DEPENDENCIES = {
  "eslint-plugin-github": packageJson.devDependencies["eslint-plugin-github"],
  "eslint-plugin-sonarjs": packageJson.devDependencies["eslint-plugin-sonarjs"],
  "oxlint-plugin-react-doctor":
    packageJson.devDependencies["oxlint-plugin-react-doctor"],
} satisfies Record<OxlintNpmJsPlugin, string>;

// Widened view of the list so `.includes` can take an arbitrary string.
const oxlintJsPluginNames: readonly string[] = oxlintJsPlugins;

const isOxlintJsPlugin = (value: string): value is OxlintJsPlugin =>
  oxlintJsPluginNames.includes(value);

export const assertOxlintJsPlugin = (value: string): OxlintJsPlugin => {
  if (isOxlintJsPlugin(value)) {
    return value;
  }

  throw new Error(
    `Unsupported Oxlint JS plugin "${value}". Supported plugins: ${oxlintJsPlugins.join(
      ", "
    )}`
  );
};

// eslint-plugin-unicorn@72 and eslint-plugin-astro@3 require ESLint >= 10;
// the whole preset is verified against ESLint 10.
const supportedEslintVersion = toolchainPeerRanges.eslint;
export const eslintCoreDevDependencies = {
  "@eslint/js": supportedEslintVersion,
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
  "eslint-plugin-cypress": packageJson.devDependencies["eslint-plugin-cypress"],
  "eslint-plugin-github": packageJson.devDependencies["eslint-plugin-github"],
  "eslint-plugin-html": packageJson.devDependencies["eslint-plugin-html"],
  "eslint-plugin-import-x":
    packageJson.devDependencies["eslint-plugin-import-x"],
  "eslint-plugin-jsdoc": packageJson.devDependencies["eslint-plugin-jsdoc"],
  "eslint-plugin-n": packageJson.devDependencies["eslint-plugin-n"],
  "eslint-plugin-prettier":
    packageJson.devDependencies["eslint-plugin-prettier"],
  "eslint-plugin-promise": packageJson.devDependencies["eslint-plugin-promise"],
  "eslint-plugin-sonarjs": packageJson.devDependencies["eslint-plugin-sonarjs"],
  "eslint-plugin-storybook":
    packageJson.devDependencies["eslint-plugin-storybook"],
  "eslint-plugin-unicorn": packageJson.devDependencies["eslint-plugin-unicorn"],
  "eslint-plugin-unused-imports":
    packageJson.devDependencies["eslint-plugin-unused-imports"],
  globals: packageJson.devDependencies.globals,
  prettier: toolchainPeerRanges.prettier,
  "prettier-plugin-tailwindcss":
    packageJson.devDependencies["prettier-plugin-tailwindcss"],
  // Required peer of eslint-plugin-storybook, which the flat config imports
  // unconditionally — without it the config fails to load.
  storybook: packageJson.devDependencies.storybook,
  stylelint: toolchainPeerRanges.stylelint,
  // The generated stylelint config extends/uses these; `stylelint` alone
  // cannot resolve them.
  "stylelint-config-idiomatic-order":
    packageJson.devDependencies["stylelint-config-idiomatic-order"],
  "stylelint-config-standard":
    packageJson.devDependencies["stylelint-config-standard"],
  "stylelint-prettier": packageJson.devDependencies["stylelint-prettier"],
} satisfies Record<string, string>;
// Extra ESLint devDependencies, keyed by the framework that needs them.
export const eslintFrameworkDevDependencies = {
  angular: {
    "@angular-eslint/eslint-plugin": "latest",
  },
  astro: {
    "eslint-plugin-astro": packageJson.devDependencies["eslint-plugin-astro"],
    "prettier-plugin-astro":
      packageJson.devDependencies["prettier-plugin-astro"],
  },
  jest: {
    "eslint-plugin-jest": packageJson.devDependencies["eslint-plugin-jest"],
  },
  // NestJS needs no ESLint plugins beyond the core set.
  nestjs: {},
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

const eslintDevDependencyNames = new Set([
  ...Object.keys(eslintCoreDevDependencies),
  ...Object.values(eslintFrameworkDevDependencies).flatMap((dependencies) =>
    Object.keys(dependencies ?? {})
  ),
]);

export const dependencyNamesByLinter = {
  biome: new Set(["@biomejs/biome"]),
  eslint: eslintDevDependencyNames,
  oxlint: new Set([
    "eslint-plugin-github",
    "eslint-plugin-sonarjs",
    "oxfmt",
    "oxlint",
    "oxlint-plugin-react-doctor",
    "oxlint-tsgolint",
  ]),
} satisfies Record<Linter, Set<string>>;
