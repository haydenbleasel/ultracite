import { readFile, rm } from "node:fs/promises";

import { log } from "@clack/prompts";
import { z } from "zod";

import type { options } from "../data/options";
import type { JsonObject, JsonValue } from "../data/types";
import { parseJsoncStrict } from "../schemas";
import {
  exists,
  resolveEsmConfigPath,
  validateFrameworkName,
  writeProjectFile,
} from "../utils";
import {
  arrayEntries,
  identifierName,
  parseConfigModule,
  renderEntries,
  renderImport,
  renderJsonProperty,
  renderJsonValue,
} from "./config-module";
import type { ConfigEntry, ConfigModule, RenderedEntry } from "./config-module";

// Written as .ts in an ES module package and .mts otherwise; an existing
// config keeps its name (see resolveEsmConfigPath).
const oxlintTsConfigPath = "./oxlint.config.ts";
const oxlintMtsConfigPath = "./oxlint.config.mts";

const resolveOxlintConfigPath = () =>
  resolveEsmConfigPath(oxlintTsConfigPath, oxlintMtsConfigPath);

const fileName = (filePath: string): string => filePath.slice(2);

// Oxlint refuses to run when this sits next to oxlint.config.ts, so init
// migrates it into the TS config and removes it.
const oxlintRcPath = "./.oxlintrc.json";
const oxlintRcFile = ".oxlintrc.json";

// Standalone presets are enabled as a plain `ultracite/oxlint/<preset>`
// extend rather than through selectJsPlugins: anti-slop is vendored inside
// the ultracite package (nothing extra to install), and @shadcn/lint ships
// its own design-system preset at ultracite/oxlint/shadcn.
const antiSlopPreset = "anti-slop";
const shadcnPlugin = "@shadcn/lint";
const shadcnPreset = "shadcn";

// Plugins bridged through the js-plugins preset and its selectJsPlugins
// helper.
const oxlintSelectableJsPluginNames = [
  "eslint-plugin-github",
  "eslint-plugin-jsdoc",
  "eslint-plugin-sonarjs",
  "eslint-plugin-tsdoc",
  "oxlint-plugin-react-doctor",
] as const;

const oxlintJsPluginNames = [
  antiSlopPreset,
  shadcnPlugin,
  ...oxlintSelectableJsPluginNames,
] as const;

type OxlintJsPlugin = (typeof oxlintJsPluginNames)[number];
type OxlintSelectableJsPlugin = (typeof oxlintSelectableJsPluginNames)[number];

const isSelectableJsPlugin = (
  jsPlugin: OxlintJsPlugin
): jsPlugin is OxlintSelectableJsPlugin =>
  jsPlugin !== antiSlopPreset && jsPlugin !== shadcnPlugin;

interface OxlintOptions {
  frameworks?: (typeof options.frameworks)[number][];
  jsPlugins?: OxlintJsPlugin[];
}

const oxlintJsPluginConfig = {
  "eslint-plugin-github": { name: "github" },
  "eslint-plugin-jsdoc": { name: "jsdoc-js" },
  "eslint-plugin-sonarjs": { name: "sonarjs" },
  "eslint-plugin-tsdoc": { name: "tsdoc" },
  "oxlint-plugin-react-doctor": { name: "react-doctor" },
} satisfies Record<OxlintSelectableJsPlugin, { name: string }>;

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

// The properties Ultracite writes on the root config that a user may have
// customised; a customised one is kept as written instead of regenerated.
type OverridableProperty = "ignorePatterns" | "jsPlugins" | "settings";

// What the regenerated config provides, for overrides that extend it rather
// than replace it (e.g. .oxlintrc.json ignorePatterns on top of core's).
interface GeneratedProperties {
  hasJsPluginSettings: boolean;
  hoistedJsPlugins: string[];
}

type PropertyOverride =
  | { build: (generated: GeneratedProperties) => RenderedEntry }
  | { entry: RenderedEntry };

// Everything in an existing config that isn't Ultracite's: carried over into
// the regenerated file as written.
interface OxlintExtras {
  danglingComments: string[];
  extendsEntries: RenderedEntry[];
  imports: string[];
  overrides: Partial<Record<OverridableProperty, PropertyOverride>>;
  oxlintSpecifiers: string[];
  properties: RenderedEntry[];
  statements: string[];
}

const emptyExtras = (): OxlintExtras => ({
  danglingComments: [],
  extendsEntries: [],
  imports: [],
  overrides: {},
  oxlintSpecifiers: [],
  properties: [],
  statements: [],
});

const renderOverride = (
  override: PropertyOverride | undefined,
  generated: GeneratedProperties
): RenderedEntry | null => {
  if (!override) {
    return null;
  }

  return "entry" in override ? override.entry : override.build(generated);
};

const generateConfigContent = (
  extendsList: string[],
  jsPlugins: OxlintJsPlugin[] = [],
  extras: OxlintExtras = emptyExtras()
) => {
  // anti-slop and @shadcn/lint have their own presets, so they become plain
  // extends below instead of selectJsPlugins entries.
  const npmJsPlugins = jsPlugins.filter(isSelectableJsPlugin);
  const hasJsPlugins = npmJsPlugins.length > 0;

  // When plugins are selected, the base js-plugins preset is imported and
  // wrapped as selectedJsPlugins below — drop it from the plain extends so
  // the import isn't declared twice (e.g. on update of an existing config).
  const resolvedExtends = extendsList.filter(
    (ext) => !(hasJsPlugins && ext === getOxlintConfigPath("js-plugins"))
  );

  // Framework-specific react-doctor rules live in per-framework add-on
  // presets; wire them up when the framework preset is present.
  if (npmJsPlugins.includes("oxlint-plugin-react-doctor")) {
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

  if (
    jsPlugins.includes(shadcnPlugin) &&
    !resolvedExtends.includes(getOxlintConfigPath(shadcnPreset))
  ) {
    resolvedExtends.push(getOxlintConfigPath(shadcnPreset));
  }

  // Last among the plain extends so its core-rule overrides win.
  if (
    jsPlugins.includes(antiSlopPreset) &&
    !resolvedExtends.includes(getOxlintConfigPath(antiSlopPreset))
  ) {
    resolvedExtends.push(getOxlintConfigPath(antiSlopPreset));
  }

  // The full js-plugins preset (every plugin, no selection) stays a plain
  // extend — e.g. a hand-written config being updated.
  const jsPluginsPath = getOxlintConfigPath("js-plugins");
  const hasFullJsPluginsPreset = resolvedExtends.includes(jsPluginsPath);

  // oxlint does not merge `settings` from extended configs, so react-doctor's
  // settings (curated ported-rule mode, #771) must be applied on the root
  // config rather than ride along inside the js-plugins preset. The full
  // preset always includes react-doctor.
  const hasJsPluginSettings =
    npmJsPlugins.includes("oxlint-plugin-react-doctor") ||
    hasFullJsPluginsPreset;
  const jsPluginImports = ["selectJsPlugins"];
  if (hasJsPluginSettings) {
    jsPluginImports.unshift("jsPluginSettings");
  }

  const imports = [
    renderImport("oxlint", ["defineConfig", ...extras.oxlintSpecifiers]),
    ...resolvedExtends.map((ext) =>
      ext === jsPluginsPath
        ? `import ${getOxlintConfigIdentifier(ext)}, { jsPluginSettings } from "${ext}";`
        : `import ${getOxlintConfigIdentifier(ext)} from "${ext}";`
    ),
    hasJsPlugins
      ? `import { ${jsPluginImports.join(", ")} } from "ultracite/oxlint/js-plugins";`
      : "",
    ...extras.imports,
  ]
    .filter(Boolean)
    .join("\n");

  const pluginNames = npmJsPlugins
    .map((jsPlugin) => `"${oxlintJsPluginConfig[jsPlugin].name}"`)
    .join(", ");
  // The selection is bound to a `jsPlugins` const (mirroring the full
  // preset's default-import identifier) so it can be both extended and
  // hoisted onto the root config below.
  const jsPluginsIdentifier = getOxlintConfigIdentifier(
    getOxlintConfigPath("js-plugins")
  );
  const selectionBlock = hasJsPlugins
    ? `\nconst ${jsPluginsIdentifier} = selectJsPlugins([${pluginNames}]);\n`
    : "";
  const extendsEntries = [
    ...resolvedExtends.map((ext) => getOxlintConfigIdentifier(ext)),
    ...(hasJsPlugins ? [jsPluginsIdentifier] : []),
  ];

  // Dependency analyzers such as Knip only read `jsPlugins` off the root
  // config — they never walk `extends` — so re-declare the selected plugin
  // specifiers there or the packages are reported as unused (#784). oxlint
  // dedupes a plugin that appears in both the root and an extended config.
  // The shadcn preset declares its own plugin package, so it is hoisted the
  // same way (spread together with the js-plugins selection when both are
  // present).
  const hoistedJsPluginIdentifiers = [
    ...(hasJsPlugins || hasFullJsPluginsPreset ? [jsPluginsIdentifier] : []),
    ...(resolvedExtends.includes(getOxlintConfigPath(shadcnPreset))
      ? [getOxlintConfigIdentifier(getOxlintConfigPath(shadcnPreset))]
      : []),
  ];
  let jsPluginsValue: string | null = null;
  if (hoistedJsPluginIdentifiers.length === 1) {
    jsPluginsValue = `${hoistedJsPluginIdentifiers[0]}.jsPlugins`;
  } else if (hoistedJsPluginIdentifiers.length > 1) {
    const spread = hoistedJsPluginIdentifiers
      .map((identifier) => `...${identifier}.jsPlugins`)
      .join(", ");
    jsPluginsValue = `[${spread}]`;
  }

  const singleLineExtends = `  extends: [${extendsEntries.join(", ")}],`;
  const extendsBlock =
    singleLineExtends.length <= generatedLineWidth &&
    extras.extendsEntries.length === 0
      ? singleLineExtends
      : `  extends: [\n${renderEntries(
          [
            ...extendsEntries.map((text) => ({ comment: null, text })),
            ...extras.extendsEntries,
          ],
          [],
          "    "
        )}\n  ],`;

  const generated: GeneratedProperties = {
    hasJsPluginSettings,
    hoistedJsPlugins: hoistedJsPluginIdentifiers,
  };
  const generatedProperty = (
    property: OverridableProperty,
    value: string | null
  ): RenderedEntry | null =>
    renderOverride(extras.overrides[property], generated) ??
    (value === null ? null : { comment: null, text: `${property}: ${value}` });

  const properties = [
    generatedProperty("ignorePatterns", "core.ignorePatterns"),
    generatedProperty("jsPlugins", jsPluginsValue),
    generatedProperty(
      "settings",
      hasJsPluginSettings ? "jsPluginSettings" : null
    ),
    ...extras.properties,
  ].filter((property) => property !== null);

  const statements = extras.statements.join("\n\n");

  return `${imports}
${selectionBlock}${statements ? `\n${statements}\n` : ""}
export default defineConfig({
${extendsBlock}
${renderEntries(properties, extras.danglingComments)}
});
`;
};

// Current generated form: const jsPlugins = selectJsPlugins(["github", ...])
const SELECT_JS_PLUGINS_RE = /selectJsPlugins\(\s*(?<names>\[[^\]]*\])\s*\)/u;

// Legacy generated form: an inlined filtering block driven by
// selectedJsPluginNames = new Set(["github", ...])
const SELECTED_JS_PLUGIN_NAMES_RE =
  /selectedJsPluginNames = new Set\((?<names>\[[^\]]*\])\)/u;

const jsPluginsByConfigName = new Map(
  oxlintSelectableJsPluginNames.map(
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
    .filter(
      (plugin): plugin is OxlintSelectableJsPlugin => plugin !== undefined
    );
};

// Any reference to an Ultracite oxlint preset: an import source
// (`ultracite/oxlint/core`), a legacy node_modules path, or an
// .oxlintrc.json extends entry.
const ULTRACITE_PRESET_RE =
  /ultracite\/(?:config\/)?oxlint\/(?<preset>[a-z0-9-]+(?:\/js-plugins)?)/u;

const toUltracitePreset = (reference: string): string | null => {
  const preset = ULTRACITE_PRESET_RE.exec(reference)?.groups?.preset;
  return preset ? getOxlintConfigPath(preset) : null;
};

// Constants earlier Ultracite releases generated for a js-plugins selection.
const legacySelectionConsts = new Set([
  "selectedJsPluginNames",
  "selectedJsPluginRulePrefixes",
  "selectedJsPlugins",
]);

// Named imports the regenerated config declares itself.
const generatedNamedImports = new Set(["jsPluginSettings", "selectJsPlugins"]);

const GENERATED_JS_PLUGINS_RE =
  /^(?:\w+\.jsPlugins|\[(?:\.\.\.\w+\.jsPlugins,?)+\])$/u;

const WHITESPACE_RE = /\s/gu;

const compact = (text: string | null): string =>
  (text ?? "").replaceAll(WHITESPACE_RE, "");

const toRendered = (entry: ConfigEntry): RenderedEntry => ({
  comment: entry.comment,
  text: entry.text,
});

interface ExistingConfig {
  extras: OxlintExtras;
  presets: string[];
}

// Split an existing oxlint.config.ts into the Ultracite presets it extends
// and everything else, which is carried over as written.
const readExistingConfig = (
  source: string,
  config: ConfigModule
): ExistingConfig | null => {
  if (config.container !== "object") {
    return null;
  }

  const extras = emptyExtras();
  const presets: string[] = [];
  const ownedIdentifiers = new Set(legacySelectionConsts);

  for (const moduleImport of config.imports) {
    const preset = toUltracitePreset(moduleImport.source);

    if (
      moduleImport.typeOnly ||
      (!preset && moduleImport.source !== "oxlint")
    ) {
      extras.imports.push(moduleImport.text);
      continue;
    }

    if (moduleImport.source === "oxlint") {
      extras.oxlintSpecifiers.push(
        ...moduleImport.namedSpecifiers
          .filter((specifier) => specifier.local !== "defineConfig")
          .map((specifier) => specifier.text)
      );
      continue;
    }

    if (moduleImport.defaultLocal && preset) {
      ownedIdentifiers.add(moduleImport.defaultLocal);
      presets.push(preset);
    }

    const userSpecifiers = moduleImport.namedSpecifiers.filter(
      (specifier) => !generatedNamedImports.has(specifier.local)
    );
    if (userSpecifiers.length > 0) {
      extras.imports.push(
        renderImport(
          moduleImport.source,
          userSpecifiers.map((specifier) => specifier.text)
        )
      );
    }
  }

  for (const statement of config.statements) {
    const isGenerated =
      statement.declaredNames.length > 0 &&
      statement.declaredNames.every(
        (name) =>
          legacySelectionConsts.has(name) ||
          (name === "jsPlugins" && statement.initCallee === "selectJsPlugins")
      );

    if (isGenerated) {
      for (const name of statement.declaredNames) {
        ownedIdentifiers.add(name);
      }
    } else {
      extras.statements.push(statement.text);
    }
  }

  for (const entry of config.entries) {
    if (entry.key === "extends") {
      const elements = arrayEntries(source, entry.value);

      if (!elements) {
        return null;
      }

      for (const element of elements) {
        const legacyPreset =
          element.identifier === null ? toUltracitePreset(element.text) : null;

        if (legacyPreset) {
          presets.push(legacyPreset);
        } else if (
          !(element.identifier && ownedIdentifiers.has(element.identifier))
        ) {
          extras.extendsEntries.push(toRendered(element));
        }
      }
    } else if (entry.key === "ignorePatterns") {
      if (compact(entry.valueText) !== "core.ignorePatterns") {
        extras.overrides.ignorePatterns = { entry: toRendered(entry) };
      }
    } else if (entry.key === "jsPlugins") {
      if (!GENERATED_JS_PLUGINS_RE.test(compact(entry.valueText))) {
        extras.overrides.jsPlugins = { entry: toRendered(entry) };
      }
    } else if (entry.key === "settings") {
      if (identifierName(entry.value) !== "jsPluginSettings") {
        extras.overrides.settings = { entry: toRendered(entry) };
      }
    } else {
      extras.properties.push(toRendered(entry));
    }
  }

  extras.danglingComments.push(...config.danglingComments);

  return { extras, presets };
};

// The pre-parser way of finding presets, for a file init can't restructure:
// default imports of Ultracite presets, then legacy string extends.
const findPresetReferences = (contents: string): string[] => {
  const presets = [
    ...contents.matchAll(
      /import \w+(?:\s*,\s*\{[^}]*\})?\s+from ["'](?<source>[^"']+)["']/gu
    ),
  ]
    .map((match) => toUltracitePreset(match.groups?.source ?? ""))
    .filter((preset) => preset !== null);

  if (presets.length > 0) {
    return presets;
  }

  const body = /extends:\s*\[(?<body>[\s\S]*?)\]/u.exec(contents)?.groups?.body;

  return [...(body ?? "").matchAll(/"(?<value>[^"]+)"/gu)]
    .map((match) => toUltracitePreset(match.groups?.value ?? ""))
    .filter((preset) => preset !== null);
};

const rcSchema = z.record(z.string(), z.json());

const JSON_ARRAY_INDENT = "    ";

const renderArrayItems = (items: JsonValue[]): string[] =>
  items.map((item) => renderJsonValue(item, JSON_ARRAY_INDENT));

const renderSpreadArray = (
  property: string,
  spreads: string[],
  items: JsonValue[]
): RenderedEntry => ({
  comment: null,
  text: `${property}: [\n${[
    ...spreads.map((spread) => `...${spread}`),
    ...renderArrayItems(items),
  ]
    .map((item) => `${JSON_ARRAY_INDENT}${item},`)
    .join("\n")}\n  ]`,
});

const renderSpreadObject = (
  property: string,
  spreads: string[],
  value: JsonObject
): RenderedEntry => ({
  comment: null,
  text: `${property}: {\n${[
    ...spreads.map((spread) => `${JSON_ARRAY_INDENT}...${spread},`),
    ...Object.entries(value).map(
      ([key, item]) =>
        `${JSON_ARRAY_INDENT}${renderJsonProperty(key, item, JSON_ARRAY_INDENT).text},`
    ),
  ].join("\n")}\n  }`,
});

const isJsonArray = (value: JsonValue): value is JsonValue[] =>
  Array.isArray(value);

const isJsonObject = (value: JsonValue): value is JsonObject =>
  value !== null && !Array.isArray(value) && value === Object(value);

/**
 * Carry an .oxlintrc.json's settings over into the regenerated config: its
 * rules, overrides, plugins and the like become root properties, its
 * ignorePatterns, jsPlugins and settings are added to the ones Ultracite
 * generates, and its Ultracite extends become presets. Returns the extends
 * entries that can't be carried over (paths to other JSON configs).
 */
const mergeRcConfig = (rc: JsonObject, existing: ExistingConfig): string[] => {
  const { extras, presets } = existing;
  const unmigrated: string[] = [];
  const presentKeys = new Set(
    extras.properties.map((property) => property.text.split(":")[0]?.trim())
  );

  for (const [key, value] of Object.entries(rc)) {
    if (key === "$schema") {
      continue;
    }

    if (key === "extends" && isJsonArray(value)) {
      for (const reference of value) {
        const preset = toUltracitePreset(String(reference));
        if (preset) {
          presets.push(preset);
        } else {
          unmigrated.push(String(reference));
        }
      }
    } else if (key === "ignorePatterns" && isJsonArray(value)) {
      if (!extras.overrides.ignorePatterns && value.length > 0) {
        extras.overrides.ignorePatterns = {
          entry: renderSpreadArray(key, ["core.ignorePatterns"], value),
        };
      }
    } else if (key === "jsPlugins" && isJsonArray(value)) {
      extras.overrides.jsPlugins ??= {
        build: ({ hoistedJsPlugins }) =>
          renderSpreadArray(
            key,
            hoistedJsPlugins.map((identifier) => `${identifier}.jsPlugins`),
            value
          ),
      };
    } else if (key === "settings" && isJsonObject(value)) {
      extras.overrides.settings ??= {
        build: ({ hasJsPluginSettings }) =>
          renderSpreadObject(
            key,
            hasJsPluginSettings ? ["jsPluginSettings"] : [],
            value
          ),
      };
    } else if (!presentKeys.has(key)) {
      extras.properties.push(renderJsonProperty(key, value));
    }
  }

  return unmigrated;
};

type OxlintRc =
  | { config: JsonObject; kind: "config" }
  | { kind: "invalid" }
  | null;

const readOxlintRc = async (): Promise<OxlintRc> => {
  if (!exists(oxlintRcPath)) {
    return null;
  }

  const config = parseJsoncStrict(
    await readFile(oxlintRcPath, "utf-8"),
    rcSchema
  );

  return config ? { config, kind: "config" } : { kind: "invalid" };
};

const readExistingOxlintConfig = async (
  configPath: string | null
): Promise<
  | { existing: ExistingConfig; jsPlugins: OxlintJsPlugin[]; kind: "config" }
  | { kind: "unparseable" }
> => {
  if (!configPath) {
    return {
      existing: { extras: emptyExtras(), presets: [] },
      jsPlugins: [],
      kind: "config",
    };
  }

  const contents = await readFile(configPath, "utf-8");
  const parsed = parseConfigModule(contents);

  if (parsed.kind === "unparseable") {
    return { kind: "unparseable" };
  }

  const existing =
    parsed.kind === "module"
      ? readExistingConfig(contents, parsed.module)
      : null;

  if (!existing) {
    log.warn(
      `${fileName(configPath)} doesn't export a config object init can update, so it was replaced with the Ultracite config. Its previous contents were not carried over; recover anything you need from version control.`
    );
  }

  return {
    existing: existing ?? {
      extras: emptyExtras(),
      presets: findPresetReferences(contents),
    },
    jsPlugins: parseExistingJsPlugins(contents),
    kind: "config",
  };
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
      resolveOxlintConfigPath().target,
      generateConfigContent(extendsList, opts?.jsPlugins)
    );
  },
  exists: () =>
    exists(oxlintTsConfigPath) ||
    exists(oxlintMtsConfigPath) ||
    exists(oxlintRcPath),
  update: async (opts?: OxlintOptions) => {
    const paths = resolveOxlintConfigPath();
    const configFile = fileName(paths.target);

    if (paths.conflict) {
      log.warn(
        `Both ${fileName(oxlintTsConfigPath)} and ${fileName(oxlintMtsConfigPath)} exist, and Oxlint won't load either, so they were left unchanged. Delete one and re-run \`ultracite init\`.`
      );
      return;
    }

    const rc = await readOxlintRc();

    // Writing the TS config next to an .oxlintrc.json that can't be migrated
    // would leave Oxlint unable to load either.
    if (rc?.kind === "invalid") {
      log.warn(
        `Could not parse ${oxlintRcFile}, so the Oxlint config was left unchanged. Oxlint won't run with both ${oxlintRcFile} and ${configFile}; fix its syntax and re-run \`ultracite init\` to migrate it.`
      );
      return;
    }

    const current = await readExistingOxlintConfig(paths.existing);

    // A config that doesn't parse can't be carried over, and Oxlint can't
    // load it either; leave it for the user to fix rather than discard it.
    if (current.kind === "unparseable") {
      log.warn(
        `Could not parse ${fileName(paths.existing ?? paths.target)}, so it was left unchanged. Fix its syntax and re-run \`ultracite init\`.`
      );
      return;
    }

    const { existing } = current;
    const unmigrated = rc ? mergeRcConfig(rc.config, existing) : [];
    const newExtends = [...new Set(existing.presets)];

    // Helper to check if a config is already present
    const hasConfig = (name: string) =>
      newExtends.includes(getOxlintConfigPath(name));

    // Add core config if not present
    if (!hasConfig("core")) {
      newExtends.unshift(getOxlintConfigPath("core"));
    }

    // Add framework-specific configs if provided
    for (const framework of opts?.frameworks ?? []) {
      const name = validateFrameworkName(framework);
      if (!hasConfig(name)) {
        newExtends.push(getOxlintConfigPath(name));
      }
    }

    // Without an explicit new selection, keep the plugins the existing
    // config had selected.
    const jsPlugins =
      opts?.jsPlugins && opts.jsPlugins.length > 0
        ? opts.jsPlugins
        : current.jsPlugins;

    await writeProjectFile(
      paths.target,
      generateConfigContent(newExtends, jsPlugins, existing.extras)
    );

    // A .ts config in a "commonjs" package can't load, so it moved to .mts.
    if (paths.existing && paths.existing !== paths.target) {
      await rm(paths.existing, { force: true });
      log.info(
        `Renamed ${fileName(paths.existing)} to ${configFile}: package.json sets "type": "commonjs", so Node can't load the ES module syntax of a .ts config.`
      );
    }

    if (rc) {
      await rm(oxlintRcPath, { force: true });
      log.info(
        `Moved the settings from ${oxlintRcFile} into ${configFile} and removed ${oxlintRcFile}.`
      );
    }

    if (unmigrated.length > 0) {
      log.warn(
        `${oxlintRcFile} extended ${unmigrated.join(", ")}, which ${configFile} can't reference by path. Import those configs and add them to its \`extends\` yourself.`
      );
    }
  },
};
