import { readFile, rm } from "node:fs/promises";

import { log } from "@clack/prompts";

import type { options } from "../data/options";
import { readPackageJsonSync } from "../schemas";
import {
  canHoldEsmConfig,
  editPackageJson,
  exists,
  prettierConfigNames,
  validateFrameworkName,
  writeProjectFile,
} from "../utils";
import {
  parseConfigModule,
  renderEntries,
  stringArrayValues,
} from "./config-module";
import type { ConfigModule, RenderedEntry } from "./config-module";

const packageJsonPath = "./package.json";

const prettierConfigPaths = prettierConfigNames.map((name) => `./${name}`);

const defaultConfigPath = "./prettier.config.mjs";

const ULTRACITE_PRETTIER = "ultracite/prettier";
const TAILWIND_PLUGIN = "prettier-plugin-tailwindcss";

const hasPrettierKeyInPackageJson = (): boolean => {
  const packageJson = readPackageJsonSync(packageJsonPath);
  return packageJson?.prettier !== undefined;
};

const getPrettierConfigPath = (): string | null => {
  // Check for "prettier" key in package.json first
  if (hasPrettierKeyInPackageJson()) {
    return packageJsonPath;
  }

  // Check for config files
  for (const path of prettierConfigPaths) {
    if (exists(path)) {
      return path;
    }
  }

  return null;
};

const frameworkPlugins = new Map<string, string>([
  ["astro", "prettier-plugin-astro"],
  ["svelte", "prettier-plugin-svelte"],
]);

interface PrettierOptions {
  frameworks?: (typeof options.frameworks)[number][];
}

// Everything in an existing Ultracite config besides Ultracite's spread:
// carried over into the regenerated file as written.
interface PrettierExtras {
  callee: string | null;
  danglingComments: string[];
  entries: RenderedEntry[];
  imports: string[];
  // A plugins value init can't merge into (not a list of strings); kept as
  // written instead of the generated list.
  pluginsOverride: RenderedEntry | null;
  plugins: string[];
  statements: string[];
  ultraciteLocal: string;
}

const generatePrettierConfig = (
  opts?: PrettierOptions,
  extras?: PrettierExtras
): string => {
  const plugins: string[] = [];

  for (const fw of opts?.frameworks ?? []) {
    const plugin = frameworkPlugins.get(validateFrameworkName(fw));
    if (plugin) {
      plugins.push(plugin);
    }
  }

  // Plugins the config already had, then the Tailwind CSS plugin, which is
  // always included and must be last.
  for (const plugin of extras?.plugins ?? []) {
    if (!plugins.includes(plugin) && plugin !== TAILWIND_PLUGIN) {
      plugins.push(plugin);
    }
  }
  plugins.push(TAILWIND_PLUGIN);

  const ultraciteLocal = extras?.ultraciteLocal ?? "config";
  const imports = [
    `import ${ultraciteLocal} from "${ULTRACITE_PRETTIER}";`,
    ...(extras?.imports ?? []),
  ].join("\n");
  const statements = extras?.statements.join("\n\n") ?? "";
  const entries = renderEntries(
    [
      { comment: null, text: `...${ultraciteLocal}` },
      extras?.pluginsOverride ?? {
        comment: null,
        text: `plugins: [${plugins.map((plugin) => `"${plugin}"`).join(", ")}]`,
      },
      ...(extras?.entries ?? []),
    ],
    extras?.danglingComments
  );
  const config = `{\n${entries}\n}`;

  return `${imports}
${statements ? `\n${statements}\n` : ""}
export default ${extras?.callee ? `${extras.callee}(${config})` : config};
`;
};

// Split a config that spreads Ultracite's Prettier config into that spread,
// its plugins, and everything else. Returns null for a config that doesn't
// build on Ultracite's, which init replaces.
const readUltraciteConfig = (config: ConfigModule): PrettierExtras | null => {
  const ultraciteImport = config.imports.find(
    (moduleImport) =>
      moduleImport.source === ULTRACITE_PRETTIER && moduleImport.defaultLocal
  );
  const ultraciteLocal = ultraciteImport?.defaultLocal;

  if (
    config.container !== "object" ||
    !ultraciteLocal ||
    !config.entries.some((entry) => entry.spreadOf === ultraciteLocal)
  ) {
    return null;
  }

  const extras: PrettierExtras = {
    callee: config.callee,
    danglingComments: config.danglingComments,
    entries: [],
    imports: config.imports
      .filter((moduleImport) => moduleImport !== ultraciteImport)
      .map((moduleImport) => moduleImport.text),
    plugins: [],
    pluginsOverride: null,
    statements: config.statements.map((statement) => statement.text),
    ultraciteLocal,
  };

  for (const entry of config.entries) {
    if (entry.spreadOf === ultraciteLocal) {
      continue;
    }

    if (entry.key === "plugins") {
      const plugins = stringArrayValues(entry.value);
      if (plugins) {
        extras.plugins = plugins;
      } else {
        extras.pluginsOverride = { comment: entry.comment, text: entry.text };
      }
      continue;
    }

    extras.entries.push({ comment: entry.comment, text: entry.text });
  }

  return extras;
};

const defaultConfigFile = defaultConfigPath.slice(2);

const warnReplaced = (source: string, target = defaultConfigFile): void => {
  log.warn(
    `Replaced ${source} with ${target}, which builds on Ultracite's Prettier config. Its previous options were not carried over; recover anything you need from version control.`
  );
};

export const prettier = {
  create: async (opts?: PrettierOptions) => {
    const config = generatePrettierConfig(opts);
    await writeProjectFile(defaultConfigPath, config);
  },
  exists: () => {
    const path = getPrettierConfigPath();
    return path !== null;
  },
  update: async (opts?: PrettierOptions) => {
    const existingPath = getPrettierConfigPath() ?? defaultConfigPath;

    // Prettier reads the package.json key before any config file, so the new
    // file only takes effect once the key is gone.
    if (existingPath === packageJsonPath) {
      const existing = readPackageJsonSync(packageJsonPath)?.prettier;
      await writeProjectFile(defaultConfigPath, generatePrettierConfig(opts));
      await editPackageJson((manifest) => {
        delete manifest.prettier;
        return true;
      });
      if (existing !== ULTRACITE_PRETTIER) {
        warnReplaced('the "prettier" key in package.json');
      }
      return;
    }

    const fileName = existingPath.slice(2);
    const contents = await readFile(existingPath, "utf-8");

    // Only a config file that can hold the generated ESM module is updated in
    // place; JSON/YAML/TOML/CJS configs get the default .mjs file instead,
    // and the stale file is removed so Prettier's config resolution doesn't
    // keep picking it up over the new one.
    if (!canHoldEsmConfig(existingPath)) {
      await writeProjectFile(defaultConfigPath, generatePrettierConfig(opts));
      await rm(existingPath, { force: true });
      if (!contents.includes(ULTRACITE_PRETTIER)) {
        warnReplaced(fileName);
      }
      return;
    }

    const parsed = parseConfigModule(contents);

    if (parsed.kind === "unparseable") {
      log.warn(
        `Could not parse ${fileName}, so it was left unchanged. Fix its syntax and re-run \`ultracite init\`.`
      );
      return;
    }

    const existing =
      parsed.kind === "module" ? readUltraciteConfig(parsed.module) : null;

    if (!existing) {
      warnReplaced(fileName, fileName);
    }

    await writeProjectFile(
      existingPath,
      generatePrettierConfig(opts, existing ?? undefined)
    );
  },
};
