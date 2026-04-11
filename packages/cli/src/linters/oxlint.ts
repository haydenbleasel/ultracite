import { readFile, writeFile } from "node:fs/promises";

import type { options } from "@repo/data/options";

import { exists } from "../utils";

const oxlintConfigPath = "./oxlint.config.ts";

interface OxlintOptions {
  frameworks?: (typeof options.frameworks)[number][];
}

// Helper to generate the full node_modules path for oxlint configs
// Oxlint doesn't support Node.js package exports, so we need explicit paths
const getOxlintConfigPath = (name: string) =>
  `./node_modules/ultracite/config/oxlint/${name}`;

const generateConfigContent = (extendsList: string[]) => {
  const extendsFormatted = extendsList.map((ext) => `    "${ext}",`).join("\n");

  return `import { defineConfig } from "oxlint";

export default defineConfig({
  extends: [
${extendsFormatted}
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

    // Extract extends array from existing TS config
    const extendsMatch = existingContents.match(/extends:\s*\[([\s\S]*?)\]/);
    const existingExtends: string[] = [];

    if (extendsMatch?.[1]) {
      const matches = extendsMatch[1].matchAll(/"([^"]+)"/g);
      for (const match of matches) {
        existingExtends.push(match[1]);
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
