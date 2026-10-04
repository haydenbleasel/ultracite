import { readFile } from "node:fs/promises";

import { log } from "@clack/prompts";
import { applyEdits, modify } from "jsonc-parser";

import type { options } from "../data/options";
import {
  biomeConfigSchema,
  detectJsonFormatting,
  parseJsoncStrict,
} from "../schemas";
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
  create: (opts?: BiomeOptions) => {
    const path = getBiomeConfigPath();
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

    const config = {
      ...defaultConfig,
      extends: extendsList,
    };

    return writeProjectFile(path, `${JSON.stringify(config, null, 2)}\n`);
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

    await writeProjectFile(path, contents);
  },
};
