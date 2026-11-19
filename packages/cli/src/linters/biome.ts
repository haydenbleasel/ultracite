import { readFile } from "node:fs/promises";
import nodePath from "node:path";
import process from "node:process";

import { log } from "@clack/prompts";
import { applyEdits, modify } from "jsonc-parser";
import type { z } from "zod";

import type { options } from "../data/options";
import {
  biomeConfigSchema,
  detectJsonFormatting,
  parseJsoncStrict,
} from "../schemas";
import { usesClassicJsxRuntime } from "../tsconfig";
import {
  biomeConfigNames,
  exists,
  validateFrameworkName,
  writeProjectFile,
} from "../utils";
import { pathToRoot } from "../workspace-frameworks";
import type { WorkspaceFrameworks } from "../workspace-frameworks";

const biomeCoreConfig = "ultracite/biome/core";

const defaultConfig = {
  $schema: "./node_modules/@biomejs/biome/configuration_schema.json",
  extends: [biomeCoreConfig],
};

// The core preset reads ignores from version control (`vcs.useIgnoreFile`),
// and Biome looks for them only in the folder that holds its config: without
// a .git, .gitignore or .ignore there, it stops with "couldn't find an ignore
// file". A new config in a package below the repository root points Biome at
// that root; one outside any repository gets the .gitignore the project will
// want anyway.
const VCS_FILES = [".git", ".gitignore", ".ignore"];
const DEFAULT_GITIGNORE = "node_modules\n";

const findGitRoot = (from: string): string | undefined => {
  let directory = from;

  while (!exists(nodePath.join(directory, ".git"))) {
    const parent = nodePath.dirname(directory);

    if (parent === directory) {
      return undefined;
    }

    directory = parent;
  }

  return directory;
};

/** Where Biome should look for ignore files, when it isn't the project. */
const findVcsRoot = (): string | undefined => {
  if (VCS_FILES.some((file) => exists(file))) {
    return undefined;
  }

  const cwd = process.cwd();
  const gitRoot = findGitRoot(nodePath.dirname(cwd));

  return gitRoot
    ? nodePath.relative(cwd, gitRoot).split(nodePath.sep).join("/")
    : undefined;
};

// Outside any repository, and with no ignore file of its own, the project
// gets a .gitignore for the core preset to read.
const ensureIgnoreFile = async (vcsRoot: string | undefined): Promise<void> => {
  if (!(vcsRoot || VCS_FILES.some((file) => exists(file)))) {
    await writeProjectFile(".gitignore", DEFAULT_GITIGNORE);
  }
};

// A nested config in a Biome monorepo extends "//" to inherit the root
// configuration, which is where the Ultracite presets belong.
const ROOT_CONFIG_EXTENDS = "//";

const LEGACY_EXTEND_RE = /^ultracite\/(?!biome\/)(?<rest>.+)$/u;

const getBiomeConfigPath = (): string => {
  // Check for Biome's supported configuration files, in resolution order.
  for (const file of biomeConfigNames) {
    if (exists(`./${file}`)) {
      return `./${file}`;
    }
  }

  // Default to biome.jsonc if none found
  return "./biome.jsonc";
};

// The core preset marks the noUnusedImports fix safe, so `ultracite fix`
// deletes an `import React from "react"` that only JSX uses. That is right
// under the automatic JSX runtime and breaks a project that compiles JSX to
// `React.createElement` (`"jsx": "react"` in its tsconfig), where Biome has
// to be told the import is in use.
const CLASSIC_JSX_RUNTIME = "reactClassic";

type BiomeConfig = z.infer<typeof biomeConfigSchema>;

// A config that sets a jsxRuntime, either one, has made its own choice.
const needsClassicJsxRuntime = (config: BiomeConfig): boolean =>
  config.javascript?.jsxRuntime === undefined && usesClassicJsxRuntime(".");

// Sets the one key, leaving the rest of `javascript` and any comments alone.
// jsonc-parser reformats the lines an edit touches, so in an existing
// `javascript` the key goes first: after the last setting, it would re-wrap
// that setting's value.
const withClassicJsxRuntime = (
  contents: string,
  config: BiomeConfig
): string => {
  const formattingOptions = detectJsonFormatting(contents);

  const edits = config.javascript
    ? modify(contents, ["javascript", "jsxRuntime"], CLASSIC_JSX_RUNTIME, {
        formattingOptions,
        getInsertionIndex: () => 0,
      })
    : modify(
        contents,
        ["javascript"],
        { jsxRuntime: CLASSIC_JSX_RUNTIME },
        { formattingOptions }
      );

  return applyEdits(contents, edits);
};

interface BiomeOptions {
  frameworks?: (typeof options.frameworks)[number][];
  typeAware?: boolean;
}

const getUpdatedExtends = (
  existingExtends: string[],
  opts?: BiomeOptions
): string[] => {
  // Migrate legacy ultracite/<name> entries to ultracite/biome/<name>,
  // deduping in case both legacy and new forms coexist. The bare "ultracite"
  // form (the original documented format) maps to the core config — the
  // package has no root export, so leaving it would break Biome's module
  // resolution.
  const remapped = existingExtends.map((ext) => {
    if (ext === "ultracite") {
      return biomeCoreConfig;
    }

    const legacyMatch = LEGACY_EXTEND_RE.exec(ext);

    return legacyMatch ? `ultracite/biome/${legacyMatch[1]}` : ext;
  });

  const newExtends = [...new Set(remapped)];
  // Track membership in a Set for constant-time lookups while preserving
  // the array's insertion order.
  const seenExtends = new Set(newExtends);

  const addExtend = (ext: string) => {
    if (!seenExtends.has(ext)) {
      seenExtends.add(ext);
      newExtends.push(ext);
    }
  };

  // Add ultracite/biome/core if not present
  addExtend(biomeCoreConfig);

  // Add type-aware config for project/scanner rules
  if (opts?.typeAware) {
    addExtend("ultracite/biome/type-aware");
  }

  // Add framework-specific configs if provided
  for (const framework of opts?.frameworks ?? []) {
    addExtend(`ultracite/biome/${validateFrameworkName(framework)}`);
  }

  return newExtends;
};

export const biome = {
  create: async (opts?: BiomeOptions) => {
    const configPath = getBiomeConfigPath();
    const extendsList = [biomeCoreConfig];

    // Add type-aware config for project/scanner rules
    if (opts?.typeAware) {
      extendsList.push("ultracite/biome/type-aware");
    }

    // Add framework-specific configs
    if (opts?.frameworks && opts.frameworks.length > 0) {
      for (const framework of opts.frameworks) {
        const name = validateFrameworkName(framework);
        extendsList.push(`ultracite/biome/${name}`);
      }
    }

    const vcsRoot = findVcsRoot();

    const config: typeof defaultConfig & {
      javascript?: { jsxRuntime: string };
      vcs?: { root: string };
    } = {
      ...defaultConfig,
      extends: extendsList,
    };

    if (usesClassicJsxRuntime(".")) {
      config.javascript = { jsxRuntime: CLASSIC_JSX_RUNTIME };
    }

    if (vcsRoot) {
      config.vcs = { root: vcsRoot };
    }

    await writeProjectFile(configPath, `${JSON.stringify(config, null, 2)}\n`);
    await ensureIgnoreFile(vcsRoot);
  },
  // A nested config can only inherit the root config through extends, and
  // "//" (which inherits all of it) can't be combined with other entries.
  // Extending the root config by path applies its own settings but not what
  // it extends, so the workspace config repeats the root's extends first,
  // then the root config, then the workspace's presets.
  createWorkspace: async ({
    dir,
    frameworks,
  }: WorkspaceFrameworks): Promise<string> => {
    const toRoot = pathToRoot(dir);
    const rootConfigPath = getBiomeConfigPath();

    const rootConfig = exists(rootConfigPath)
      ? parseJsoncStrict(
          await readFile(rootConfigPath, "utf-8"),
          biomeConfigSchema
        )
      : null;

    // Relative entries are rebased onto the workspace; package specifiers
    // resolve the same from anywhere in the project.
    const rootExtends = [rootConfig?.extends ?? [biomeCoreConfig]]
      .flat()
      .filter((ext) => ext !== ROOT_CONFIG_EXTENDS)
      .map((ext) => {
        if (ext.startsWith("./")) {
          return `${toRoot}/${ext.slice(2)}`;
        }

        return ext.startsWith("../") ? `${toRoot}/${ext}` : ext;
      });

    const configPath = `${dir}/biome.jsonc`;

    const config = {
      $schema: `${toRoot}/node_modules/@biomejs/biome/configuration_schema.json`,
      extends: [
        ...rootExtends,
        `${toRoot}/${rootConfigPath.slice(2)}`,
        ...frameworks.map(
          (framework) => `ultracite/biome/${validateFrameworkName(framework)}`
        ),
      ],
      root: false,
    };

    await writeProjectFile(
      `./${configPath}`,
      `${JSON.stringify(config, null, 2)}\n`
    );

    return configPath;
  },
  exists: () => {
    const path = getBiomeConfigPath();

    return exists(path);
  },
  findWorkspaceConfig: (dir: string): string | null =>
    biomeConfigNames
      .map((name) => `${dir}/${name}`)
      .find((configPath) => exists(`./${configPath}`)) ?? null,
  update: async (opts?: BiomeOptions) => {
    const path = getBiomeConfigPath();
    const fileName = path.slice(2);
    const existingContents = await readFile(path, "utf-8");
    const parsed = parseJsoncStrict(existingContents, biomeConfigSchema);

    // Rewriting a config that doesn't parse would drop whatever the parser
    // couldn't recover, so leave it for the user to fix.
    if (!parsed) {
      log.warn(
        `Could not parse ${fileName}, so it was left unchanged. Fix its syntax and re-run \`ultracite init\` to add the Ultracite presets.`
      );

      return;
    }

    const existingExtends = [parsed.extends ?? []].flat();

    if (existingExtends.includes(ROOT_CONFIG_EXTENDS)) {
      log.info(
        `${fileName} inherits the root Biome config ("${ROOT_CONFIG_EXTENDS}"), so it was left unchanged. Add the Ultracite presets to the root config instead.`
      );

      return;
    }

    // Edit the document in place so comments and formatting survive.
    const formattingOptions = detectJsonFormatting(existingContents);

    let contents = applyEdits(
      existingContents,
      modify(
        existingContents,
        ["extends"],
        getUpdatedExtends(existingExtends, opts),
        {
          formattingOptions,
          // A new extends list goes at the top, after any $schema.
          getInsertionIndex: (properties) =>
            properties[0] === "$schema" ? 1 : 0,
        }
      )
    );

    contents = applyEdits(
      contents,
      modify(contents, ["$schema"], defaultConfig.$schema, {
        formattingOptions,
        // A new $schema key goes first, where editors and Biome expect it.
        getInsertionIndex: () => 0,
      })
    );

    // The core preset this adds reads ignore files, which an existing config
    // may never have needed. One that sets `vcs` has made its own choice.
    const setsVcs = Object.hasOwn(parsed, "vcs");
    const vcsRoot = setsVcs ? undefined : findVcsRoot();

    if (vcsRoot) {
      contents = applyEdits(
        contents,
        modify(contents, ["vcs"], { root: vcsRoot }, { formattingOptions })
      );
    }

    if (needsClassicJsxRuntime(parsed)) {
      contents = withClassicJsxRuntime(contents, parsed);
    }

    await writeProjectFile(path, contents);

    if (!setsVcs) {
      await ensureIgnoreFile(vcsRoot);
    }
  },
};

/**
 * Adds `javascript.jsxRuntime` to the Biome config of a project that compiles
 * JSX with the classic runtime and doesn't say so, and returns the config's
 * name, or null when there was nothing to add. For `ultracite upgrade`:
 * configs init wrote before it set this lose their React imports to `fix`.
 */
export const addMissingBiomeJsxRuntime = async (): Promise<string | null> => {
  const path = getBiomeConfigPath();

  // The tsconfig first: most projects stop here, without the config read.
  if (!(usesClassicJsxRuntime(".") && exists(path))) {
    return null;
  }

  const contents = await readFile(path, "utf-8");
  const parsed = parseJsoncStrict(contents, biomeConfigSchema);

  // A nested config that inherits the root one is left to the root, as in
  // update.
  if (
    !parsed ||
    [parsed.extends ?? []].flat().includes(ROOT_CONFIG_EXTENDS) ||
    !needsClassicJsxRuntime(parsed)
  ) {
    return null;
  }

  await writeProjectFile(path, withClassicJsxRuntime(contents, parsed));

  return path.slice(2);
};
