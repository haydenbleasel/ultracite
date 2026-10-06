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
import type { ConfigModule, RenderedEntry } from "./config-module";

const eslintConfigPaths = eslintConfigNames.map((name) => `./${name}`);

const defaultConfigPath = "./eslint.config.mjs";

const ULTRACITE_PRESET_RE = /^ultracite\/eslint\/(?<preset>[a-z0-9-]+)$/u;

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
  gdp?: boolean;
}

// Everything in an existing Ultracite config besides the presets: carried
// over into the regenerated file as written.
interface EslintExtras {
  callee: string | null;
  container: "arguments" | "array";
  danglingComments: string[];
  entries: RenderedEntry[];
  imports: string[];
  presets: string[];
  statements: string[];
}

const generateEslintConfig = (
  frameworks: string[],
  extras?: EslintExtras,
  gdp = false
): string => {
  const presets = [
    "core",
    ...frameworks.map(validateFrameworkName),
    ...(gdp ? ["gdp"] : []),
  ];
  const imports = [
    ...presets.map(
      (preset) => `import ${preset} from "ultracite/eslint/${preset}";`
    ),
    ...(extras?.imports ?? []),
  ].join("\n");
  const statements = extras?.statements.join("\n\n") ?? "";
  const entries = renderEntries(
    [
      ...presets.map((preset) => ({ comment: null, text: `...${preset}` })),
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

// Split a config that spreads Ultracite presets into those presets and
// everything else. Returns null for a config that doesn't use Ultracite's
// presets, which init replaces.
const readUltraciteConfig = (config: ConfigModule): EslintExtras | null => {
  if (config.container === "object") {
    return null;
  }

  const presetLocals = new Map<string, string>();
  const imports: string[] = [];

  for (const moduleImport of config.imports) {
    const preset = ULTRACITE_PRESET_RE.exec(moduleImport.source)?.groups
      ?.preset;

    if (preset && moduleImport.defaultLocal && !moduleImport.typeOnly) {
      presetLocals.set(moduleImport.defaultLocal, preset);
    } else {
      imports.push(moduleImport.text);
    }
  }

  const entries = config.entries.filter(
    (entry) => !(entry.spreadOf && presetLocals.has(entry.spreadOf))
  );

  if (entries.length === config.entries.length) {
    return null;
  }

  return {
    callee: config.callee,
    container: config.container,
    danglingComments: config.danglingComments,
    entries: entries.map(({ comment, text }) => ({ comment, text })),
    imports,
    presets: [...presetLocals.values()],
    statements: config.statements.map((statement) => statement.text),
  };
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
  workspacePackage: PackageJson | undefined
): string => {
  const presets = frameworks.map(validateFrameworkName);
  const imports = presets
    .map((preset) => `import ${preset} from "ultracite/eslint/${preset}";`)
    .join("\n");
  const entries = renderEntries(
    [rootConfigIdentifier, ...presets].map((name) => ({
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
      undefined,
      opts?.gdp
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
    const parsed = parseConfigModule(await readFile(existingPath, "utf-8"));

    // A config that doesn't parse can't be carried over, and ESLint can't
    // load it either; leave it for the user to fix rather than discard it.
    if (parsed.kind === "unparseable") {
      log.warn(
        `Could not parse ${fileName}, so it was left unchanged. Fix its syntax and re-run \`ultracite init\`.`
      );
      return;
    }

    const existing =
      parsed.kind === "module" ? readUltraciteConfig(parsed.module) : null;

    if (!existing) {
      warnReplaced(fileName);
    }

    // Keep the presets the config already had; init adds the selected ones.
    const frameworks = [
      ...new Set([...(existing?.presets ?? []), ...(opts?.frameworks ?? [])]),
      ...(opts?.gdp ? ["gdp"] : []),
    ].filter((preset) => preset !== "core");
    const config = generateEslintConfig(
      frameworks.filter((preset) => preset !== "gdp"),
      existing ?? undefined,
      frameworks.includes("gdp")
    );

    // Only overwrite a config file that can hold the generated ESM module;
    // CJS configs (eslint.config.cjs/.cts) get the default .mjs file instead,
    // and the stale file is removed so ESLint doesn't resolve it over the
    // new one.
    const targetPath = canHoldEsmConfig(existingPath)
      ? existingPath
      : defaultConfigPath;
    await writeProjectFile(targetPath, config);

    if (existingPath !== targetPath) {
      await rm(existingPath, { force: true });
    }
  },
};
