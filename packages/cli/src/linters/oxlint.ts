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

const oxlintJsPluginConfig = {
  "eslint-plugin-github": { name: "github" },
  "eslint-plugin-sonarjs": { name: "sonarjs" },
  "oxlint-plugin-react-doctor": { name: "react-doctor" },
} satisfies Record<OxlintJsPlugin, { name: string }>;

// Helper to generate the module path for oxlint config imports
const getOxlintConfigPath = (name: string) => `ultracite/oxlint/${name}`;

// Frameworks with a react-doctor add-on preset (ultracite/oxlint/<name>/js-plugins)
// holding their framework-specific rules.
const reactDoctorFrameworkAddOns = ["next", "tanstack"];

// Helper to generate a valid import identifier from a config name. Nested
// paths keep every segment (next/js-plugins -> nextJsPlugins) so they never
// collide with the base js-plugins identifier.
const getOxlintConfigIdentifier = (configPath: string) => {
  const name = configPath
    .replace(/^ultracite\/oxlint\//u, "")
    .replaceAll("/", "-");
  return name.replaceAll(/-(?<letter>[a-z])/gu, (_, letter: string) =>
    letter.toUpperCase()
  );
};

// oxfmt's print width; the generated extends array switches to one entry per
// line beyond this so the file is emitted already formatted.
const generatedLineWidth = 80;

const generateConfigContent = (
  extendsList: string[],
  jsPlugins: OxlintJsPlugin[] = []
) => {
  const hasJsPlugins = jsPlugins.length > 0;

  // When plugins are selected, the base js-plugins preset is imported and
  // wrapped as selectedJsPlugins below — drop it from the plain extends so
  // the import isn't declared twice (e.g. on update of an existing config).
  const resolvedExtends = extendsList.filter(
    (ext) => !(hasJsPlugins && ext === getOxlintConfigPath("js-plugins"))
  );

  // Framework-specific react-doctor rules live in per-framework add-on
  // presets; wire them up when the framework preset is present.
  if (jsPlugins.includes("oxlint-plugin-react-doctor")) {
    for (const framework of reactDoctorFrameworkAddOns) {
      const addOn = getOxlintConfigPath(`${framework}/js-plugins`);
      if (
        resolvedExtends.includes(getOxlintConfigPath(framework)) &&
        !resolvedExtends.includes(addOn)
      ) {
        resolvedExtends.push(addOn);
      }
    }
  }

  const imports = [
    `import { defineConfig } from "oxlint";`,
    ...resolvedExtends.map(
      (ext) => `import ${getOxlintConfigIdentifier(ext)} from "${ext}";`
    ),
    hasJsPlugins
      ? `import { selectJsPlugins } from "ultracite/oxlint/js-plugins";`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const pluginNames = jsPlugins
    .map((jsPlugin) => `"${oxlintJsPluginConfig[jsPlugin].name}"`)
    .join(", ");
  const extendsEntries = [
    ...resolvedExtends.map((ext) => getOxlintConfigIdentifier(ext)),
    ...(hasJsPlugins ? [`selectJsPlugins([${pluginNames}])`] : []),
  ];

  const singleLineExtends = `  extends: [${extendsEntries.join(", ")}],`;
  const extendsBlock =
    singleLineExtends.length <= generatedLineWidth
      ? singleLineExtends
      : `  extends: [\n${extendsEntries
          .map((entry) => `    ${entry},`)
          .join("\n")}\n  ],`;

  return `${imports}

export default defineConfig({
${extendsBlock}
  ignorePatterns: core.ignorePatterns,
});
`;
};

// Current generated form: extends: [..., selectJsPlugins(["github", ...])]
const SELECT_JS_PLUGINS_RE = /selectJsPlugins\(\s*(?<names>\[[^\]]*\])\s*\)/u;

// Legacy generated form: an inlined filtering block driven by
// selectedJsPluginNames = new Set(["github", ...])
const SELECTED_JS_PLUGIN_NAMES_RE =
  /selectedJsPluginNames = new Set\((?<names>\[[^\]]*\])\)/u;

const jsPluginsByConfigName = new Map(
  oxlintJsPluginNames.map(
    (plugin) => [oxlintJsPluginConfig[plugin].name, plugin] as const
  )
);

/**
 * Recover the js-plugins selection encoded in a previously generated config
 * so re-running init without an explicit selection preserves it — otherwise
 * the regenerated config would extend the full js-plugins preset and silently
 * enable plugins the user never opted into. Supports both the current
 * selectJsPlugins([...]) form and the legacy inlined-filtering form.
 */
const parseExistingJsPlugins = (contents: string): OxlintJsPlugin[] => {
  const match =
    SELECT_JS_PLUGINS_RE.exec(contents) ??
    SELECTED_JS_PLUGIN_NAMES_RE.exec(contents);
  if (!match?.groups?.names) {
    return [];
  }

  return [...match.groups.names.matchAll(/"(?<name>[^"]+)"/gu)]
    .map((nameMatch) => jsPluginsByConfigName.get(nameMatch.groups?.name ?? ""))
    .filter((plugin): plugin is OxlintJsPlugin => plugin !== undefined);
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

    // Without an explicit new selection, keep the plugins the existing
    // config had selected.
    const jsPlugins =
      opts?.jsPlugins && opts.jsPlugins.length > 0
        ? opts.jsPlugins
        : parseExistingJsPlugins(existingContents);

    await writeProjectFile(
      oxlintConfigPath,
      generateConfigContent(newExtends, jsPlugins)
    );
  },
};
