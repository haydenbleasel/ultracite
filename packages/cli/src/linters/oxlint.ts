import { readFile, writeFile } from "node:fs/promises";

import type { options } from "@repo/data/options";

import { exists } from "../utils";

const oxlintConfigPath = "./oxlint.config.ts";

interface OxlintOptions {
  frameworks?: (typeof options.frameworks)[number][];
}

// Helper to generate the module path for oxlint config imports
const getOxlintConfigPath = (name: string) => `ultracite/config/oxlint/${name}`;

// Helper to generate a valid import identifier from a config name
const getOxlintConfigIdentifier = (configPath: string) => {
  const name = configPath.split("/").pop();
  return name === "core" ? "core" : name;
};

const generateConfigContent = (extendsList: string[]) => {
  const imports = extendsList
    .map(
      (ext) =>
        `import ${getOxlintConfigIdentifier(ext)} from "${ext}/index.ts";`
    )
    .join("\n");

  const identifiers = extendsList
    .map((ext) => `    ${getOxlintConfigIdentifier(ext)},`)
    .join("\n");

  return `import { defineConfig } from "oxlint";

${imports}

export default defineConfig({
  extends: [
${identifiers}
  ],
});
`;
};

export const oxlint = {
  create: async (opts?: OxlintOptions) => {
    const extendsList = [getOxlintConfigPath("core")];

    // Add framework-specific configs
    if (opts?.frameworks && opts.frameworks.length > 0) {
      for (const framework of opts.frameworks) {
        extendsList.push(getOxlintConfigPath(framework));
      }
    }

    return await writeFile(
      oxlintConfigPath,
      generateConfigContent(extendsList)
    );
  },
  exists: async () => await exists(oxlintConfigPath),
  update: async (opts?: OxlintOptions) => {
    const existingContents = await readFile(oxlintConfigPath, "utf-8");

    // Extract import paths from existing config (supports both string extends and JS imports)
    const existingExtends: string[] = [];

    // Check for JS imports: import x from "ultracite/config/oxlint/..."
    const importMatches = existingContents.matchAll(
      /import \w+ from ["']([^"']+)["']/g
    );
    for (const match of importMatches) {
      if (match[1].startsWith("ultracite/config/oxlint/")) {
        existingExtends.push(match[1].replace(/\/index\.ts$/, ""));
      }
    }

    // Fallback: check for string extends (legacy format)
    if (existingExtends.length === 0) {
      const extendsMatch = existingContents.match(/extends:\s*\[([\s\S]*?)\]/);
      if (extendsMatch?.[1]) {
        const matches = extendsMatch[1].matchAll(/"([^"]+)"/g);
        for (const match of matches) {
          // Convert legacy node_modules paths to new format
          const converted = match[1].replace(
            /^\.\/node_modules\/ultracite\/config\/oxlint\//,
            "ultracite/config/oxlint/"
          );
          existingExtends.push(converted);
        }
      }
    }

    // Helper to check if a config is already present
    const hasConfig = (name: string) =>
      existingExtends.some((ext) => ext === getOxlintConfigPath(name));

    const newExtends = [...existingExtends];

    // Add core config if not present
    if (!hasConfig("core")) {
      newExtends.push(getOxlintConfigPath("core"));
    }

    // Add framework-specific configs if provided
    if (opts?.frameworks && opts.frameworks.length > 0) {
      for (const framework of opts.frameworks) {
        if (!hasConfig(framework)) {
          newExtends.push(getOxlintConfigPath(framework));
        }
      }
    }

    await writeFile(oxlintConfigPath, generateConfigContent(newExtends));
  },
};
