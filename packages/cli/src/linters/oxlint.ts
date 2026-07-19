import { readFile } from "node:fs/promises";

import type { options } from "../data/options";
import { exists, validateFrameworkName, writeProjectFile } from "../utils";

const oxlintConfigPath = "./oxlint.config.ts";

const oxlintJsPluginNames = [
  "eslint-plugin-github",
  "eslint-plugin-sonarjs",
  "oxlint-plugin-react-doctor",
] as const;

type OxlintJsPlugin = (typeof oxlintJsPluginNames)[number];

interface OxlintOptions {
  frameworks?: (typeof options.frameworks)[number][];
  jsPlugins?: OxlintJsPlugin[];
}

const oxlintJsPluginConfig: Record<
  OxlintJsPlugin,
  { name: string; rulePrefix: string }
> = {
  "eslint-plugin-github": { name: "github", rulePrefix: "github" },
  "eslint-plugin-sonarjs": { name: "sonarjs", rulePrefix: "sonarjs" },
  "oxlint-plugin-react-doctor": {
    name: "react-doctor",
    rulePrefix: "react-doctor",
  },
};

// Helper to generate the module path for oxlint config imports
const getOxlintConfigPath = (name: string) => `ultracite/oxlint/${name}`;

// Helper to generate a valid import identifier from a config name
const getOxlintConfigIdentifier = (configPath: string) => {
  const name = configPath.split("/").pop() ?? configPath;
  return name.replaceAll(/-(?<letter>[a-z])/gu, (_, letter: string) =>
    letter.toUpperCase()
  );
};

const generateSelectedJsPluginsConfig = (jsPlugins: OxlintJsPlugin[]) => {
  if (jsPlugins.length === 0) {
    return "";
  }

  const pluginNames = jsPlugins.map(
    (jsPlugin) => oxlintJsPluginConfig[jsPlugin].name
  );
  const rulePrefixes = jsPlugins.map(
    (jsPlugin) => oxlintJsPluginConfig[jsPlugin].rulePrefix
  );

  return `
const selectedJsPluginNames = new Set(${JSON.stringify(pluginNames)});
const selectedJsPluginRulePrefixes = new Set(${JSON.stringify(rulePrefixes)});

const selectedJsPlugins = {
  ...jsPlugins,
  jsPlugins: jsPlugins.jsPlugins?.filter((plugin) =>
    selectedJsPluginNames.has(typeof plugin === "string" ? plugin : plugin.name)
  ),
  overrides: jsPlugins.overrides?.map((override) => ({
    ...override,
    rules: Object.fromEntries(
      Object.entries(override.rules ?? {}).filter(([ruleName]) =>
        selectedJsPluginRulePrefixes.has(ruleName.split("/")[0] ?? ruleName)
      )
    ),
  })),
  rules: Object.fromEntries(
    Object.entries(jsPlugins.rules ?? {}).filter(([ruleName]) =>
      selectedJsPluginRulePrefixes.has(ruleName.split("/")[0] ?? ruleName)
    )
  ),
};
`;
};

const generateConfigContent = (
  extendsList: string[],
  jsPlugins: OxlintJsPlugin[] = []
) => {
  const hasJsPlugins = jsPlugins.length > 0;
  const imports = [
    `import { defineConfig } from "oxlint";`,
    ...extendsList.map(
      (ext) => `import ${getOxlintConfigIdentifier(ext)} from "${ext}";`
    ),
    hasJsPlugins ? `import jsPlugins from "ultracite/oxlint/js-plugins";` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const identifiers = [
    ...extendsList.map((ext) => getOxlintConfigIdentifier(ext)),
    ...(hasJsPlugins ? ["selectedJsPlugins"] : []),
  ].join(", ");

  return `${imports}${generateSelectedJsPluginsConfig(jsPlugins)}
export default defineConfig({
  extends: [${identifiers}],
  ignorePatterns: core.ignorePatterns,
});
`;
};

export const oxlint = {
  create: async (opts?: OxlintOptions) => {
    const extendsList = [getOxlintConfigPath("core")];

    // Add framework-specific configs
    if (opts?.frameworks && opts.frameworks.length > 0) {
      for (const framework of opts.frameworks) {
        const name = validateFrameworkName(framework);
        extendsList.push(getOxlintConfigPath(name));
      }
    }

    return await writeProjectFile(
      oxlintConfigPath,
      generateConfigContent(extendsList, opts?.jsPlugins)
    );
  },
  exists: () => exists(oxlintConfigPath),
  update: async (opts?: OxlintOptions) => {
    const existingContents = await readFile(oxlintConfigPath, "utf-8");

    // Extract import paths from existing config (supports both string extends and JS imports)
    const existingExtends: string[] = [];

    // Check for JS imports: import x from "ultracite/oxlint/..."
    const importMatches = existingContents.matchAll(
      /import \w+ from ["'](?<source>[^"']+)["']/gu
    );
    for (const match of importMatches) {
      if (match[1].startsWith("ultracite/oxlint/")) {
        existingExtends.push(match[1].replace(/\/index\.[tj]s$/u, ""));
      }
    }

    // Fallback: check for string extends (legacy format)
    if (existingExtends.length === 0) {
      const extendsMatch = existingContents.match(
        /extends:\s*\[(?<body>[\s\S]*?)\]/u
      );
      if (extendsMatch?.[1]) {
        const matches = extendsMatch[1].matchAll(/"(?<value>[^"]+)"/gu);
        for (const match of matches) {
          // Convert legacy node_modules paths to new format
          const converted = match[1].replace(
            /^\.\/node_modules\/ultracite\/config\/oxlint\//u,
            "ultracite/oxlint/"
          );
          existingExtends.push(converted);
        }
      }
    }

    // Warn if the file looks like it has ultracite config but we couldn't parse it
    if (
      existingExtends.length === 0 &&
      existingContents.includes("ultracite/oxlint")
    ) {
      console.warn(
        "Warning: could not parse existing extends from oxlint.config.ts. The file will be regenerated."
      );
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
        const name = validateFrameworkName(framework);
        if (!hasConfig(name)) {
          newExtends.push(getOxlintConfigPath(name));
        }
      }
    }

    await writeProjectFile(
      oxlintConfigPath,
      generateConfigContent(newExtends, opts?.jsPlugins)
    );
  },
};
