import { readFile, writeFile } from "node:fs/promises";

import type { options } from "@repo/data/options";
import { parse } from "jsonc-parser";

import { exists } from "../utils";

const oxlintConfigPath = "./oxlint.config.ts";
const oxlintLegacyConfigPath = "./.oxlintrc.json";

interface OxlintOptions {
  frameworks?: (typeof options.frameworks)[number][];
}

// Helper to generate the full node_modules path for oxlint configs
// Oxlint doesn't support Node.js package exports, so we need explicit paths
const getOxlintConfigPath = (name: string) =>
  `./node_modules/ultracite/config/oxlint/${name}/.oxlintrc.json`;

const generateOxlintConfig = (extendsList: string[]): string => {
  const extendsStr = extendsList.map((p) => `    "${p}",`).join("\n");
  return `import { defineConfig } from "oxlint";

export default defineConfig({
  extends: [
${extendsStr}
  ],
  // Alpha: JS plugin for complexity checking (feature parity with Biome's noExcessiveCognitiveComplexity)
  jsPlugins: ["oxlint-plugin-complexity"],
  rules: {
    "complexity/cognitive-complexity": ["error", 20],
  },
});
`;
};

const extractExtendsFromTs = (content: string): string[] => {
  const match = content.match(/extends:\s*\[([\s\S]*?)\]/);
  if (!match) return [];
  return match[1]
    .split(",")
    .map((s) => s.trim().replace(/^["']|["']$/g, ""))
    .filter((s) => s.length > 0);
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

    return await writeFile(oxlintConfigPath, generateOxlintConfig(extendsList));
  },
  exists: async () =>
    (await exists(oxlintConfigPath)) || (await exists(oxlintLegacyConfigPath)),
  update: async (opts?: OxlintOptions) => {
    let existingExtends: string[] = [];

    // Check for new TS config format first
    if (await exists(oxlintConfigPath)) {
      const content = await readFile(oxlintConfigPath, "utf-8");
      existingExtends = extractExtendsFromTs(content);
    } else if (await exists(oxlintLegacyConfigPath)) {
      // Migrate from legacy JSON format
      const content = await readFile(oxlintLegacyConfigPath, "utf-8");
      const parsed = parse(content) as Record<string, unknown> | undefined;
      if (parsed?.extends && Array.isArray(parsed.extends)) {
        existingExtends = parsed.extends as string[];
      }
    }

    // Helper to check if a config is already present
    const hasConfig = (name: string) =>
      existingExtends.some((ext: string) => ext === getOxlintConfigPath(name));

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

    await writeFile(oxlintConfigPath, generateOxlintConfig(newExtends));
  },
};
