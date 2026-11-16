import { readFile, rm } from "node:fs/promises";

import { log } from "@clack/prompts";

import type { options } from "../data/options";
import type { PackageJson } from "../schemas";
import {
  canHoldEsmConfig,
  eslintConfigNames,
  exists,
  validateFrameworkName,
  writeProjectFile,
} from "../utils";
import { pathToRoot, readWorkspacePackageJson } from "../workspace-frameworks";
import type { WorkspaceFrameworks } from "../workspace-frameworks";
import { parseConfigModule, renderEntries } from "./config-module";
import type {
  ConfigModule,
  ModuleImport,
  RenderedEntry,
} from "./config-module";

const eslintConfigPaths = eslintConfigNames.map((name) => `./${name}`);

const defaultConfigPath = "./eslint.config.mjs";

const ULTRACITE_PRESET_RE =
  /^ultracite\/eslint\/(?<preset>[a-z0-9-]+(?:\/[a-z0-9-]+)?)$/u;

const PRESET_WORD_BREAK_RE = /[-/](?<letter>[a-z0-9])/gu;

const TYPE_AWARE_PRESET = "type-aware";
const TYPE_AWARE_ADD_ON_SUFFIX = `/${TYPE_AWARE_PRESET}`;

// Frameworks whose plugins have rules that read type information. Those
// rules live in an add-on preset (ultracite/eslint/<framework>/type-aware)
// that goes with the type-aware preset.
const frameworksWithTypeAwareAddOn = new Set([
  "angular",
  "jest",
  "nestjs",
  "qwik",
  "tanstack",
  "vitest",
]);

const isTypeAwarePreset = (preset: string): boolean =>
  preset === TYPE_AWARE_PRESET || preset.endsWith(TYPE_AWARE_ADD_ON_SUFFIX);

// The name a preset is imported as: `type-aware` becomes `typeAware` and
// `jest/type-aware` becomes `jestTypeAware`.
const presetIdentifier = (preset: string): string =>
  preset.replaceAll(PRESET_WORD_BREAK_RE, (_match, letter: string) =>
    letter.toUpperCase()
  );

// The framework presets in order, each followed by its type-aware add-on
// when the config is type-aware.
const withTypeAwareAddOns = (
  frameworks: string[],
  typeAware: boolean
): string[] =>
  frameworks.flatMap((framework) =>
    typeAware && frameworksWithTypeAwareAddOn.has(framework)
      ? [framework, `${framework}${TYPE_AWARE_ADD_ON_SUFFIX}`]
      : [framework]
  );

// The preset's specifier in either quote style, since a project's formatter
// may have rewritten the config with single quotes.
const TYPE_AWARE_IMPORT_RE = new RegExp(
  `["']ultracite/eslint/${TYPE_AWARE_PRESET}["']`,
  "u"
);

// Whether the root config already uses the type-aware preset, which a
// workspace config's framework add-ons then go with.
const configIsTypeAware = async (configPath: string): Promise<boolean> => {
  try {
    const content = await readFile(configPath, "utf-8");

    return TYPE_AWARE_IMPORT_RE.test(content);
  } catch {
    return false;
  }
};

const getEslintConfigPath = (): string | null => {
  for (const path of eslintConfigPaths) {
    if (exists(path)) {
      return path;
    }
  }

  return null;
};

interface EslintOptions {
  frameworks?: (typeof options.frameworks)[number][];
  /**
   * Adds the type-aware preset. It is never removed, so re-running init
   * without --type-aware keeps a project's type-aware setup.
   */
  typeAware?: boolean;
}

// Everything in an existing Ultracite config besides the presets: carried
// over into the regenerated file as written.
interface EslintExtras {
  callee: string | null;
  container: "arguments" | "array";
  danglingComments: string[];
  entries: RenderedEntry[];
  imports: string[];
  // The presets the export lists, in the order it lists them.
  presets: string[];
  // Imports of presets the config only uses inside an entry of its own.
  scopedImports: { local: string; text: string }[];
  statements: string[];
}

const generateEslintConfig = (
  frameworks: string[],
  typeAware: boolean,
  extras?: EslintExtras
): string => {
  // The type-aware preset goes straight after core, which it extends, so
  // framework presets that switch its rules off for component scripts win.
  const presets = [
    "core",
    ...(typeAware ? [TYPE_AWARE_PRESET] : []),
    ...withTypeAwareAddOns(frameworks.map(validateFrameworkName), typeAware),
  ];

  const identifiers = new Set(presets.map(presetIdentifier));

  const imports = [
    ...presets.map(
      (preset) =>
        `import ${presetIdentifier(preset)} from "ultracite/eslint/${preset}";`
    ),
    // A scoped preset that is now listed too is imported once, above.
    ...(extras?.scopedImports ?? [])
      .filter(({ local }) => !identifiers.has(local))
      .map(({ text }) => text),
    ...(extras?.imports ?? []),
  ].join("\n");

  const statements = extras?.statements.join("\n\n") ?? "";

  const entries = renderEntries(
    [
      ...presets.map((preset) => ({
        comment: null,
        text: `...${presetIdentifier(preset)}`,
      })),
      ...(extras?.entries ?? []),
    ],
    extras?.danglingComments
  );

  let config = `[\n${entries}\n]`;

  if (extras?.container === "arguments") {
    config = `${extras.callee ?? ""}(\n${entries}\n)`;
  } else if (extras?.callee) {
    config = `${extras.callee}(${config})`;
  }

  return `${imports}
${statements ? `\n${statements}\n` : ""}
export default ${config};
`;
};

// How an existing config relates to Ultracite's presets: `carried` when its
// export lists them (the presets and everything else are split apart),
// `unreadable` when it imports them but not in a shape init can regenerate,
// and `foreign` when it doesn't use them at all.
type ExistingConfig =
  | { extras: EslintExtras; kind: "carried" }
  | { kind: "foreign" }
  | { kind: "unreadable" };

const readUltraciteConfig = (config: ConfigModule): ExistingConfig => {
  const presetLocals = new Map<string, string>();
  const otherImports: string[] = [];
  const presetImports = new Map<string, ModuleImport>();

  for (const moduleImport of config.imports) {
    const preset = ULTRACITE_PRESET_RE.exec(moduleImport.source)?.groups
      ?.preset;

    if (preset && moduleImport.defaultLocal && !moduleImport.typeOnly) {
      presetLocals.set(moduleImport.defaultLocal, preset);
      presetImports.set(moduleImport.defaultLocal, moduleImport);
    } else {
      otherImports.push(moduleImport.text);
    }
  }

  if (presetLocals.size === 0) {
    return { kind: "foreign" };
  }

  if (config.container === "object") {
    return { kind: "unreadable" };
  }

  // A preset is part of the config when the export lists it, spread
  // (`...core`) or, as defineConfig() also takes it, bare (`core`). One the
  // config only uses inside an entry (`{ files, extends: [vitest] }`) is
  // scoped by the user and stays that way: its import is carried over and
  // it isn't added to the whole project.
  const presetOf = (entry: ConfigModule["entries"][number]) =>
    presetLocals.get(entry.spreadOf ?? entry.identifier ?? "");

  const presets = [
    ...new Set(config.entries.flatMap((entry) => presetOf(entry) ?? [])),
  ];

  if (presets.length === 0) {
    return { kind: "unreadable" };
  }

  const listed = new Set(presets);

  const scopedImports = [...presetImports].flatMap(([local, moduleImport]) =>
    listed.has(presetLocals.get(local) ?? "")
      ? []
      : [{ local, text: moduleImport.text }]
  );

  return {
    extras: {
      callee: config.callee,
      container: config.container,
      danglingComments: config.danglingComments,
      entries: config.entries.flatMap((entry) =>
        presetOf(entry) === undefined
          ? [{ comment: entry.comment, text: entry.text }]
          : []
      ),
      imports: otherImports,
      presets,
      scopedImports,
      statements: config.statements.map((statement) => statement.text),
    },
    kind: "carried",
  };
};

const USES_ULTRACITE_PRESET_RE = /["']ultracite\/eslint\//u;

// Where update writes the config. ESLint loads a TypeScript config whatever
// the package's module type, so one stays where it is; moving it to .mjs
// would leave its type syntax in a JavaScript file. A CommonJS file can't
// hold the generated ES module, so it gets the default .mjs file (or .mts,
// from .cts), and the stale file is removed so ESLint doesn't resolve it
// over the new one.
const resolveTargetPath = (existingPath: string): string => {
  if (existingPath.endsWith(".ts") && !existingPath.endsWith(".cts")) {
    return existingPath;
  }

  if (existingPath.endsWith(".cts")) {
    return "./eslint.config.mts";
  }

  return canHoldEsmConfig(existingPath) ? existingPath : defaultConfigPath;
};

const warnReplaced = (fileName: string): void => {
  log.warn(
    `Replaced ${fileName} with the Ultracite ESLint config. It didn't use Ultracite's presets, so its previous contents were not carried over; recover anything you need from version control.`
  );
};

// The identifier a workspace config imports the root config as.
const rootConfigIdentifier = "root";

// A workspace with its own package.json imports the presets and the root
// config from the root package, which core's import-x rules flag: the presets
// as a dependency the workspace doesn't declare, the root config as a
// relative import into another package. Only the rules that would fire are
// disabled, so the directive is never reported as unused.
const getWorkspaceDirective = (
  workspacePackage: PackageJson | undefined
): string => {
  if (!workspacePackage) {
    return "";
  }

  const declaresUltracite = [
    workspacePackage.dependencies,
    workspacePackage.devDependencies,
    workspacePackage.peerDependencies,
  ].some((dependencies) => dependencies?.ultracite !== undefined);

  const rules = [
    ...(declaresUltracite ? [] : ["import-x/no-extraneous-dependencies"]),
    "import-x/no-relative-packages",
  ];

  return `/* eslint-disable ${rules.join(", ")} -- imports the presets and config of the root package */\n`;
};

const generateWorkspaceConfig = (
  rootConfigImport: string,
  frameworks: string[],
  typeAware: boolean,
  workspacePackage: PackageJson | undefined
): string => {
  const presets = withTypeAwareAddOns(
    frameworks.map(validateFrameworkName),
    typeAware
  );

  const imports = presets
    .map(
      (preset) =>
        `import ${presetIdentifier(preset)} from "ultracite/eslint/${preset}";`
    )
    .join("\n");

  const entries = renderEntries(
    [rootConfigIdentifier, ...presets.map(presetIdentifier)].map((name) => ({
      comment: null,
      text: `...${name}`,
    }))
  );

  return `${getWorkspaceDirective(workspacePackage)}${imports}

import ${rootConfigIdentifier} from "${rootConfigImport}";

// ESLint lints each file with its nearest config alone, so this spreads the
// root config before the workspace's presets.
export default [
${entries}
];
`;
};

export const eslint = {
  create: async (opts?: EslintOptions) => {
    const config = generateEslintConfig(
      opts?.frameworks ?? [],
      opts?.typeAware ?? false
    );

    await writeProjectFile(defaultConfigPath, config);
  },
  // ESLint uses the config nearest each file instead of merging it with the
  // root one, so a workspace config spreads the root config and adds the
  // workspace's presets.
  createWorkspace: async ({
    dir,
    frameworks,
  }: WorkspaceFrameworks): Promise<string> => {
    const rootConfigPath = getEslintConfigPath() ?? defaultConfigPath;
    const configPath = `${dir}/eslint.config.mjs`;

    await writeProjectFile(
      `./${configPath}`,
      generateWorkspaceConfig(
        `${pathToRoot(dir)}/${rootConfigPath.slice(2)}`,
        frameworks,
        await configIsTypeAware(rootConfigPath),
        readWorkspacePackageJson(dir)
      )
    );

    return configPath;
  },
  exists: () => {
    const path = getEslintConfigPath();

    return path !== null;
  },
  findWorkspaceConfig: (dir: string): string | null =>
    eslintConfigNames
      .map((name) => `${dir}/${name}`)
      .find((configPath) => exists(`./${configPath}`)) ?? null,
  update: async (opts?: EslintOptions) => {
    const existingPath = getEslintConfigPath() ?? defaultConfigPath;
    const fileName = existingPath.slice(2);
    const source = await readFile(existingPath, "utf-8");
    const parsed = parseConfigModule(source);

    // A config that doesn't parse can't be carried over, and ESLint can't
    // load it either; leave it for the user to fix rather than discard it.
    if (parsed.kind === "unparseable") {
      log.warn(
        `Could not parse ${fileName}, so it was left unchanged. Fix its syntax and re-run \`ultracite init\`.`
      );

      return;
    }

    const existing: ExistingConfig =
      parsed.kind === "module"
        ? readUltraciteConfig(parsed.module)
        : {
            kind: USES_ULTRACITE_PRESET_RE.test(source)
              ? "unreadable"
              : "foreign",
          };

    // A config built on the presets in a shape init can't regenerate (a
    // config held in a const, CommonJS `require`, a preset inside `extends`)
    // is the user's own work; replacing it would discard it.
    if (existing.kind === "unreadable") {
      log.warn(
        `${fileName} uses Ultracite's presets in a form init can't update, so it was left unchanged. Add any new presets to it yourself, or export an array that spreads them (\`export default [...core, ...react]\`) and re-run \`ultracite init\`.`
      );

      return;
    }

    const extras = existing.kind === "carried" ? existing.extras : undefined;

    if (!extras) {
      warnReplaced(fileName);
    }

    // Keep the presets the config already had, in its order; init adds the
    // selected ones. The type-aware presets are regenerated from whether any
    // was there.
    const existingPresets = extras?.presets ?? [];

    const frameworks = [
      ...new Set([...existingPresets, ...(opts?.frameworks ?? [])]),
    ].filter((preset) => preset !== "core" && !isTypeAwarePreset(preset));

    const typeAware =
      opts?.typeAware === true || existingPresets.some(isTypeAwarePreset);

    const config = generateEslintConfig(frameworks, typeAware, extras);
    const targetPath = resolveTargetPath(existingPath);

    await writeProjectFile(targetPath, config);

    if (existingPath !== targetPath) {
      await rm(existingPath, { force: true });
    }
  },
};
