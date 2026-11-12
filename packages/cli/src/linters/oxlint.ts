import { readFile, rm } from "node:fs/promises";

import { log } from "@clack/prompts";
import { z } from "zod";

import { options } from "../data/options";
import type { JsonObject, JsonValue } from "../data/types";
import { parseJsoncStrict, readPackageJsonSync } from "../schemas";
import {
  exists,
  resolveEsmConfigPath,
  validateFrameworkName,
  writeProjectFile,
} from "../utils";
import { pathToRoot, readWorkspacePackageJson } from "../workspace-frameworks";
import type { WorkspaceFrameworks } from "../workspace-frameworks";
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

// The plugins the full js-plugins preset enables; the documentation plugins
// are only ever selected explicitly.
const fullPresetJsPlugins = [
  "eslint-plugin-github",
  "eslint-plugin-sonarjs",
  "oxlint-plugin-react-doctor",
] as const satisfies readonly OxlintSelectableJsPlugin[];

interface OxlintOptions {
  frameworks?: (typeof options.frameworks)[number][];
  jsPlugins?: OxlintJsPlugin[];
  /** Run the type-aware rules (needs oxlint-tsgolint installed). */
  typeAware?: boolean;
}

// Equivalent to passing --type-aware on every run, so `ultracite check` and
// the editor extension run core's typed rules once oxlint-tsgolint is there.
const typeAwareOptions = "{ typeAware: true }";
const TYPE_AWARE_RE = /\btypeAware\s*:\s*true\b/u;
const OPTIONS_PROPERTY_RE = /^["']?options["']?\s*:/u;

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

const corePath = getOxlintConfigPath("core");
const antiSlopPath = getOxlintConfigPath(antiSlopPreset);
const jsPluginsPath = getOxlintConfigPath("js-plugins");
const shadcnPath = getOxlintConfigPath(shadcnPreset);

// The js-plugins selection is bound to a `jsPlugins` const, mirroring the
// full preset's default-import identifier, or to `ultraciteJsPlugins` when
// the project already uses that name (see uniqueIdentifier).
const selectionIdentifier = getOxlintConfigIdentifier(jsPluginsPath);
const GENERATED_SELECTION_RE = /^(?:jsPlugins|ultraciteJsPlugins\d*)$/u;

// Stands in presetOrder for every preset it doesn't name, such as gdp.
const otherPresets = "*";

// The order presets are extended in. Each preset overrides the ones before
// it, so core goes first and anti-slop, which turns off core rules that pinch
// against its own, goes last. The order is fixed here rather than read from
// a config's imports, which `ultracite fix` sorts (#863).
const presetOrder = [
  corePath,
  ...options.frameworks.map(getOxlintConfigPath),
  otherPresets,
  jsPluginsPath,
  ...reactDoctorFrameworkAddOns.map((framework) =>
    getOxlintConfigPath(`${framework}/js-plugins`)
  ),
  shadcnPath,
  antiSlopPath,
];

const presetRank = (preset: string): number => {
  const rank = presetOrder.indexOf(preset);

  return rank === -1 ? presetOrder.indexOf(otherPresets) : rank;
};

/**
 * The presets a config extends, in presetOrder: core, the given presets (a
 * new config's frameworks, or what an existing config extends) and the ones
 * the js-plugins selection adds.
 */
const resolvePresets = (
  presets: string[],
  jsPlugins: OxlintJsPlugin[]
): string[] => {
  const resolved = new Set([corePath, ...presets]);

  // The js-plugins slot holds the full preset or, when plugins are selected,
  // the selection that replaces it, so the selection sits where the full
  // preset would and anti-slop still comes last.
  if (jsPlugins.some(isSelectableJsPlugin)) {
    resolved.add(jsPluginsPath);
  }

  // Framework-specific react-doctor rules live in per-framework add-on
  // presets; wire them up when the framework preset is present.
  if (jsPlugins.includes("oxlint-plugin-react-doctor")) {
    for (const framework of reactDoctorFrameworkAddOns) {
      if (resolved.has(getOxlintConfigPath(framework))) {
        resolved.add(getOxlintConfigPath(`${framework}/js-plugins`));
      }
    }
  }

  if (jsPlugins.includes(shadcnPlugin)) {
    resolved.add(shadcnPath);
  }

  if (jsPlugins.includes(antiSlopPreset)) {
    resolved.add(antiSlopPath);
  }

  return [...resolved].toSorted(
    (left, right) => presetRank(left) - presetRank(right)
  );
};

// oxfmt's print width; the generated extends array switches to one entry per
// line beyond this so the file is emitted already formatted.
const generatedLineWidth = 80;

// The properties Ultracite writes on the root config that a user may have
// customised; a customised one is kept as written instead of regenerated.
type OverridableProperty = "env" | "ignorePatterns" | "jsPlugins" | "settings";

// What the regenerated config provides, for overrides that extend it rather
// than replace it (e.g. .oxlintrc.json ignorePatterns on top of core's).
interface GeneratedProperties {
  // The name core is imported under.
  coreIdentifier: string;
  hasJsPluginSettings: boolean;
  hoistedJsPlugins: string[];
}

type PropertyOverride =
  | { build: (generated: GeneratedProperties) => RenderedEntry }
  | { entry: RenderedEntry };

// A project's own extends entries, kept where they sat among the presets:
// before the first one (so the presets override them), right after a given
// preset (the js-plugins one standing for the selection too), or after the
// last one (so they override the presets).
interface UserExtends {
  after: Map<string, RenderedEntry[]>;
  leading: RenderedEntry[];
  trailing: RenderedEntry[];
}

// Everything in an existing config that isn't Ultracite's: carried over into
// the regenerated file as written.
interface OxlintExtras {
  danglingComments: string[];
  extendsEntries: UserExtends;
  imports: string[];
  overrides: Partial<Record<OverridableProperty, PropertyOverride>>;
  oxlintSpecifiers: string[];
  // The name each imported preset is bound to, which the regenerated file
  // keeps (`import ultraciteCore from "ultracite/oxlint/core"`) so the
  // project's own references to it still resolve.
  presetIdentifiers: Map<string, string>;
  properties: RenderedEntry[];
  // The names the project's own imports and declarations bind, which a
  // generated import must not take.
  reservedIdentifiers: Set<string>;
  statements: string[];
}

const emptyExtras = (): OxlintExtras => ({
  danglingComments: [],
  extendsEntries: { after: new Map(), leading: [], trailing: [] },
  imports: [],
  overrides: {},
  oxlintSpecifiers: [],
  presetIdentifiers: new Map(),
  properties: [],
  reservedIdentifiers: new Set(),
  statements: [],
});

// The names the generated config binds besides the presets.
const generatedBindings = [
  "defineConfig",
  "jsPluginSettings",
  "selectJsPlugins",
];

// `base`, or `ultraciteBase` (then `ultraciteBase2`, ...) when it's taken.
const uniqueIdentifier = (base: string, taken: Set<string>): string => {
  const prefixed = `ultracite${base.charAt(0).toUpperCase()}${base.slice(1)}`;
  let candidate = taken.has(base) ? prefixed : base;

  for (let suffix = 2; taken.has(candidate); suffix += 1) {
    candidate = `${prefixed}${suffix}`;
  }

  taken.add(candidate);

  return candidate;
};

interface PresetBindings {
  // Presets the project imports without extending them (for their rules,
  // say), or whose extend a selection replaces while its code still uses
  // them, by the name they're imported under; their imports stay.
  importedOnly: Map<string, string>;
  // The name each extended preset is written as. The js-plugins slot is the
  // selection's const when plugins are selected.
  names: Map<string, string>;
  presets: string[];
}

// A name code reads, as opposed to a property it reads off one
// (`config.name`); a spread (`...name`) still counts.
const IDENTIFIER_RE = /(?<![\w$]|[^.]\.)[A-Za-z_$][\w$]*/gu;

/**
 * The names the code carried over from an existing config uses, such as a
 * preset's in `...fullPlugins.rules`. Comments and strings are read as code
 * too, which at worst keeps an import that's no longer needed.
 */
const carriedOverNames = (extras: OxlintExtras): Set<string> => {
  const { after, leading, trailing } = extras.extendsEntries;

  const entries = [
    ...extras.properties,
    ...leading,
    ...[...after.values()].flat(),
    ...trailing,
    ...Object.values(extras.overrides).flatMap((override) =>
      override && "entry" in override ? [override.entry] : []
    ),
  ];

  return new Set(
    [...extras.statements, ...entries.map((entry) => entry.text)].flatMap(
      (text) => text.match(IDENTIFIER_RE) ?? []
    )
  );
};

/**
 * The presets a config extends and the names it binds them to: the
 * project's own name for a preset it already imports, otherwise the usual
 * one unless the project's code binds that name already.
 */
const bindPresets = (
  extendsList: string[],
  jsPlugins: OxlintJsPlugin[],
  extras: OxlintExtras
): PresetBindings => {
  const presets = resolvePresets(extendsList, jsPlugins);
  const hasSelection = jsPlugins.some(isSelectableJsPlugin);

  // Whether a preset is written as an extended import under its own name;
  // with a selection, the js-plugins slot is the selection's const instead.
  const isExtendedImport = (preset: string) =>
    presets.includes(preset) && !(hasSelection && preset === jsPluginsPath);

  // A full js-plugins preset the config extended is replaced by a selection,
  // so it keeps its import only when the project's own code still uses it
  // (or it was never extended).
  const usedNames = carriedOverNames(extras);

  const importedOnly = new Map(
    [...extras.presetIdentifiers].filter(
      ([preset, identifier]) =>
        !isExtendedImport(preset) &&
        (!extendsList.includes(preset) || usedNames.has(identifier))
    )
  );

  const kept = [...extras.presetIdentifiers].filter(([preset]) =>
    isExtendedImport(preset)
  );

  const taken = new Set([
    ...generatedBindings,
    ...extras.reservedIdentifiers,
    ...importedOnly.values(),
    ...kept.map(([, identifier]) => identifier),
  ]);

  const names = new Map<string, string>();

  for (const preset of presets) {
    const own = isExtendedImport(preset)
      ? extras.presetIdentifiers.get(preset)
      : undefined;

    names.set(
      preset,
      own ??
        uniqueIdentifier(
          hasSelection && preset === jsPluginsPath
            ? selectionIdentifier
            : getOxlintConfigIdentifier(preset),
          taken
        )
    );
  }

  return { importedOnly, names, presets };
};

// oxlint does not merge `settings` from extended configs, so react-doctor's
// settings (curated ported-rule mode, #771) must be applied on the root
// config rather than ride along inside the js-plugins preset. The full
// preset always includes react-doctor.
const needsJsPluginSettings = (
  presets: string[],
  jsPlugins: OxlintJsPlugin[]
): boolean =>
  jsPlugins.includes("oxlint-plugin-react-doctor") ||
  (!jsPlugins.some(isSelectableJsPlugin) && presets.includes(jsPluginsPath));

// The named exports of the js-plugins preset the generated config imports.
const jsPluginsHelpers = ["jsPluginSettings", "selectJsPlugins"];

// The names the generated config binds besides its preset imports.
const generatedHelpers = (
  presets: string[],
  jsPlugins: OxlintJsPlugin[]
): string[] => [
  "defineConfig",
  ...(jsPlugins.some(isSelectableJsPlugin) ? ["selectJsPlugins"] : []),
  ...(needsJsPluginSettings(presets, jsPlugins) ? ["jsPluginSettings"] : []),
];

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
  extras: OxlintExtras = emptyExtras(),
  typeAware = false,
  bindings: PresetBindings = bindPresets(extendsList, jsPlugins, extras)
) => {
  // anti-slop and @shadcn/lint have their own presets, so they become plain
  // extends instead of selectJsPlugins entries.
  const npmJsPlugins = jsPlugins.filter(isSelectableJsPlugin);
  const hasJsPlugins = npmJsPlugins.length > 0;

  const { importedOnly, names, presets: resolvedExtends } = bindings;

  const identifierOf = (preset: string) =>
    names.get(preset) ?? getOxlintConfigIdentifier(preset);

  const hasJsPluginSettings = needsJsPluginSettings(resolvedExtends, jsPlugins);
  const helpers = generatedHelpers(resolvedExtends, jsPlugins);
  const usedNames = carriedOverNames(extras);

  // The js-plugins helpers the generated config uses, plus any the
  // project's own carried-over code still uses from the preset (say,
  // `settings: { ...jsPluginSettings }` next to a preset it only imports).
  const jsPluginsNamed = jsPluginsHelpers.filter(
    (helper) =>
      helpers.includes(helper) ||
      (usedNames.has(helper) && !extras.reservedIdentifiers.has(helper))
  );

  // The full preset's default import when it's extended, or the one the
  // project imports without extending it (alongside a selection, say).
  const jsPluginsDefault =
    !hasJsPlugins && resolvedExtends.includes(jsPluginsPath)
      ? identifierOf(jsPluginsPath)
      : (importedOnly.get(jsPluginsPath) ?? null);

  const jsPluginsImport =
    jsPluginsDefault || jsPluginsNamed.length > 0
      ? [renderImport(jsPluginsPath, jsPluginsNamed, jsPluginsDefault)]
      : [];

  const imports = [
    renderImport("oxlint", ["defineConfig", ...extras.oxlintSpecifiers]),
    ...resolvedExtends.flatMap((preset) =>
      preset === jsPluginsPath
        ? jsPluginsImport
        : [`import ${identifierOf(preset)} from "${preset}";`]
    ),
    ...[...importedOnly].flatMap(([preset, identifier]) =>
      resolvedExtends.includes(preset) || preset === jsPluginsPath
        ? []
        : [`import ${identifier} from "${preset}";`]
    ),
    ...(resolvedExtends.includes(jsPluginsPath) ? [] : jsPluginsImport),
    ...extras.imports,
  ].join("\n");

  const pluginNames = npmJsPlugins
    .map((jsPlugin) => `"${oxlintJsPluginConfig[jsPlugin].name}"`)
    .join(", ");

  // The selection is bound to a const so it can be both extended and
  // hoisted onto the root config below.
  const selectionBlock = hasJsPlugins
    ? `\nconst ${identifierOf(jsPluginsPath)} = selectJsPlugins([${pluginNames}]);\n`
    : "";

  const extendsEntries = resolvedExtends.map(identifierOf);
  const userExtends = extras.extendsEntries;

  // Entries that followed a preset init no longer extends (the js-plugins
  // selection once it's dropped) go last.
  const orphanedExtends = [...userExtends.after]
    .filter(([preset]) => !resolvedExtends.includes(preset))
    .flatMap(([, entries]) => entries);

  const allExtends: RenderedEntry[] = [
    ...userExtends.leading,
    ...resolvedExtends.flatMap((preset) => [
      { comment: null, text: identifierOf(preset) },
      ...(userExtends.after.get(preset) ?? []),
    ]),
    ...orphanedExtends,
    ...userExtends.trailing,
  ];

  // Dependency analyzers such as Knip only read `jsPlugins` off the root
  // config — they never walk `extends` — so re-declare the selected plugin
  // specifiers there or the packages are reported as unused (#784). oxlint
  // dedupes a plugin that appears in both the root and an extended config.
  // The shadcn preset declares its own plugin package, so it is hoisted the
  // same way (spread together with the js-plugins selection when both are
  // present).
  const hoistedJsPluginIdentifiers = [jsPluginsPath, shadcnPath].flatMap(
    (preset) => (resolvedExtends.includes(preset) ? [identifierOf(preset)] : [])
  );

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
    allExtends.length === extendsEntries.length
      ? singleLineExtends
      : `  extends: [\n${renderEntries(allExtends, [], "    ")}\n  ],`;

  const coreIdentifier = identifierOf(corePath);

  const generated: GeneratedProperties = {
    coreIdentifier,
    hasJsPluginSettings,
    hoistedJsPlugins: hoistedJsPluginIdentifiers,
  };

  const generatedProperty = (
    property: OverridableProperty,
    value: string | null
  ): RenderedEntry | null =>
    renderOverride(extras.overrides[property], generated) ??
    (value === null ? null : { comment: null, text: `${property}: ${value}` });

  // oxlint doesn't carry `env` through `extends` either: without it the
  // browser globals core declares are unknown, so rules such as
  // no-implied-eval never see `setTimeout("…")` as the global. It goes
  // before `extends` to keep the keys sorted.
  const envProperty = generatedProperty("env", `${coreIdentifier}.env`);

  const properties = [
    generatedProperty("ignorePatterns", `${coreIdentifier}.ignorePatterns`),
    generatedProperty("jsPlugins", jsPluginsValue),
    typeAware ? { comment: null, text: `options: ${typeAwareOptions}` } : null,
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
${envProperty ? `${renderEntries([envProperty])}\n` : ""}${extendsBlock}
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
const parseExistingJsPlugins = (
  contents: string,
  // The project binds `selectJsPlugins` itself, so its calls aren't
  // Ultracite's selection.
  ownSelectJsPlugins = false
): OxlintJsPlugin[] => {
  const match =
    (ownSelectJsPlugins ? null : SELECT_JS_PLUGINS_RE.exec(contents)) ??
    SELECTED_JS_PLUGIN_NAMES_RE.exec(contents);

  if (!match?.groups?.names) {
    return [];
  }

  return [...match.groups.names.matchAll(/"(?<name>[^"]+)"/gu)].flatMap(
    (nameMatch) => {
      const plugin = jsPluginsByConfigName.get(nameMatch.groups?.name ?? "");

      return plugin === undefined ? [] : [plugin];
    }
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
  // The presets and the js-plugins selection (as the js-plugins preset) in
  // the order the config's own `extends` has them, for the reorder notice.
  order: string[];
  // The Ultracite presets the config extends, in the order it extends them.
  presets: string[];
}

interface ReadExtends {
  order: string[];
  presets: string[];
  userExtends: UserExtends;
}

// The presets an `extends` array names, in its order, and the project's own
// entries by where they sat among them.
const readExtends = (
  elements: ConfigEntry[],
  presetsByIdentifier: Map<string, string>,
  selectionIdentifiers: Set<string>
): ReadExtends => {
  const presets: string[] = [];

  const userExtends: UserExtends = {
    after: new Map(),
    leading: [],
    trailing: [],
  };

  const order: string[] = [];
  let anchor: string | null = null;
  let pending: RenderedEntry[] = [];

  // The entries since the previous preset belong after it (or before every
  // preset, when there was none).
  const settle = (next: string) => {
    order.push(next);

    if (anchor === null) {
      userExtends.leading.push(...pending);
    } else {
      userExtends.after.set(anchor, [
        ...(userExtends.after.get(anchor) ?? []),
        ...pending,
      ]);
    }

    pending = [];
    anchor = next;
  };

  for (const element of elements) {
    // A legacy string extend names its preset by path.
    const preset =
      element.identifier === null
        ? toUltracitePreset(element.text)
        : presetsByIdentifier.get(element.identifier);

    if (preset) {
      presets.push(preset);
      settle(preset);
    } else if (
      element.identifier &&
      selectionIdentifiers.has(element.identifier)
    ) {
      settle(jsPluginsPath);
    } else {
      pending.push(toRendered(element));
    }
  }

  userExtends.trailing.push(...pending);

  return { order, presets, userExtends };
};

// Split an existing oxlint.config.ts into the Ultracite presets it extends
// and everything else, which is carried over as written.
// oxlint-disable-next-line complexity -- refactor when next touched: one branch per kind of import, statement and config property an existing config can hold
const readExistingConfig = (
  source: string,
  config: ConfigModule
): ExistingConfig | null => {
  if (config.container !== "object") {
    return null;
  }

  const extras = emptyExtras();
  const presets: string[] = [];
  let order: string[] = [];
  const presetsByIdentifier = new Map<string, string>();
  // The consts a generated js-plugins selection is declared as, found
  // below; a binding of the project's own is never one, whatever its name.
  const selectionIdentifiers = new Set<string>();
  // Whether `selectJsPlugins` is the js-plugins preset's helper; one the
  // project imports from its own module declares the project's own consts.
  let importsSelectJsPlugins = false;

  const reserve = (...names: (string | null)[]) => {
    for (const name of names) {
      if (name) {
        extras.reservedIdentifiers.add(name);
      }
    }
  };

  for (const moduleImport of config.imports) {
    const preset = toUltracitePreset(moduleImport.source);

    if (
      moduleImport.typeOnly ||
      (!preset && moduleImport.source !== "oxlint")
    ) {
      extras.imports.push(moduleImport.text);
      reserve(
        moduleImport.defaultLocal,
        moduleImport.namespaceLocal,
        ...moduleImport.namedSpecifiers.map((specifier) => specifier.local)
      );
      continue;
    }

    if (moduleImport.source === "oxlint") {
      const oxlintSpecifiers = moduleImport.namedSpecifiers.filter(
        (specifier) => specifier.local !== "defineConfig"
      );

      extras.oxlintSpecifiers.push(
        ...oxlintSpecifiers.map((specifier) => specifier.text)
      );
      reserve(...oxlintSpecifiers.map((specifier) => specifier.local));
      continue;
    }

    // A second default import of a preset already imported under another
    // name is kept as written for the project's code that uses that name.
    let ownDefault: string | null = null;

    // Whether the preset is extended is up to the `extends` array; an
    // import alone keeps the import.
    if (moduleImport.defaultLocal && preset) {
      presetsByIdentifier.set(moduleImport.defaultLocal, preset);

      if (extras.presetIdentifiers.has(preset)) {
        ownDefault = moduleImport.defaultLocal;
      } else {
        extras.presetIdentifiers.set(preset, moduleImport.defaultLocal);
      }
    }

    if (
      preset === jsPluginsPath &&
      moduleImport.namedSpecifiers.some(
        (specifier) => specifier.local === "selectJsPlugins"
      )
    ) {
      importsSelectJsPlugins = true;
    }

    const userSpecifiers = moduleImport.namedSpecifiers.filter(
      (specifier) => !generatedNamedImports.has(specifier.local)
    );

    if (userSpecifiers.length > 0 || ownDefault) {
      extras.imports.push(
        renderImport(
          moduleImport.source,
          userSpecifiers.map((specifier) => specifier.text),
          ownDefault
        )
      );
      reserve(
        ownDefault,
        ...userSpecifiers.map((specifier) => specifier.local)
      );
    }
  }

  // Older releases declared their selection consts together, starting with
  // `selectedJsPluginNames = new Set([...])`; without that, a const with one
  // of their names is the project's own.
  const hasLegacySelection = config.statements.some(
    (statement) =>
      statement.declaredNames.includes("selectedJsPluginNames") &&
      SELECTED_JS_PLUGIN_NAMES_RE.test(statement.text)
  );

  for (const statement of config.statements) {
    const isGenerated =
      statement.declaredNames.length > 0 &&
      statement.declaredNames.every(
        (name) =>
          (hasLegacySelection && legacySelectionConsts.has(name)) ||
          (GENERATED_SELECTION_RE.test(name) &&
            importsSelectJsPlugins &&
            statement.initCallee === "selectJsPlugins")
      );

    if (isGenerated) {
      for (const name of statement.declaredNames) {
        selectionIdentifiers.add(name);
      }
    } else {
      extras.statements.push(statement.text);
      reserve(...statement.declaredNames);
    }
  }

  // `core.env` is the generated value only when `core` is the imported core
  // preset; with no such import it's the project's own (`const core = ...`).
  const coreIdentifier = extras.presetIdentifiers.get(corePath) ?? null;

  const isGeneratedCoreValue = (entry: ConfigEntry, property: string) =>
    coreIdentifier !== null &&
    compact(entry.valueText) === `${coreIdentifier}.${property}`;

  for (const entry of config.entries) {
    if (entry.key === "extends") {
      const elements = arrayEntries(source, entry.value);

      if (!elements) {
        return null;
      }

      const read = readExtends(
        elements,
        presetsByIdentifier,
        selectionIdentifiers
      );

      presets.push(...read.presets);
      ({ order } = read);
      extras.extendsEntries = read.userExtends;
    } else if (entry.key === "env") {
      if (!isGeneratedCoreValue(entry, "env")) {
        extras.overrides.env = { entry: toRendered(entry) };
      }
    } else if (entry.key === "ignorePatterns") {
      if (!isGeneratedCoreValue(entry, "ignorePatterns")) {
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

  return { extras, order, presets };
};

/**
 * Whether a root config extends the core preset without declaring `env`.
 * Oxlint doesn't carry `env` through `extends` (oxc-project/oxc#20087), so
 * such a config runs `no-implied-eval` and `no-eval` without the browser and
 * Node globals they need, and they miss string timers and `window.eval`.
 * Configs init wrote before it declared `env` look like this.
 */
export const lacksCoreEnv = (contents: string): boolean => {
  const parsed = parseConfigModule(contents);

  if (parsed.kind !== "module") {
    return false;
  }

  const existing = readExistingConfig(contents, parsed.module);

  return (
    existing !== null &&
    existing.presets.includes(corePath) &&
    !parsed.module.entries.some((entry) => entry.key === "env")
  );
};

// The pre-parser way of finding presets, for a file init can't restructure:
// default imports of Ultracite presets, then legacy string extends.
const findPresetReferences = (contents: string): string[] => {
  const presets = [
    ...contents.matchAll(
      /import \w+(?:\s*,\s*\{[^}]*\})?\s+from ["'](?<source>[^"']+)["']/gu
    ),
  ].flatMap((match) => toUltracitePreset(match.groups?.source ?? "") ?? []);

  if (presets.length > 0) {
    return presets;
  }

  const body = /extends:\s*\[(?<body>[\s\S]*?)\]/u.exec(contents)?.groups?.body;

  return [...(body ?? "").matchAll(/"(?<value>[^"]+)"/gu)].flatMap(
    (match) => toUltracitePreset(match.groups?.value ?? "") ?? []
  );
};

interface LoadedPresets {
  // The plugins a js-plugins selection loads.
  jsPlugins: OxlintJsPlugin[];
  presets: string[];
}

// What a config extends, read the way init reads it: from its `extends` when
// init can read the file (otherwise from its imports), and with a
// `selectJsPlugins` of the project's own not counted as a selection.
const readLoadedPresets = (contents: string): LoadedPresets => {
  const parsed = parseConfigModule(contents);

  const existing =
    parsed.kind === "module"
      ? readExistingConfig(contents, parsed.module)
      : null;

  return {
    jsPlugins: parseExistingJsPlugins(
      contents,
      existing?.extras.reservedIdentifiers.has("selectJsPlugins")
    ),
    presets: existing?.presets ?? findPresetReferences(contents),
  };
};

/**
 * The npm JS plugins a config loads: a selectJsPlugins selection, the full
 * js-plugins preset, the React Doctor framework add-ons, the shadcn preset,
 * or a plugin package the config names itself. anti-slop is vendored inside
 * Ultracite, so it never appears here.
 */
export const findLoadedJsPlugins = (
  contents: string
): Exclude<OxlintJsPlugin, typeof antiSlopPreset>[] => {
  const { jsPlugins: selection, presets } = readLoadedPresets(contents);
  const loaded = new Set<OxlintJsPlugin>(selection);

  if (
    selection.length === 0 &&
    presets.includes(getOxlintConfigPath("js-plugins"))
  ) {
    for (const plugin of fullPresetJsPlugins) {
      loaded.add(plugin);
    }
  }

  if (
    reactDoctorFrameworkAddOns.some((framework) =>
      presets.includes(getOxlintConfigPath(`${framework}/js-plugins`))
    )
  ) {
    loaded.add("oxlint-plugin-react-doctor");
  }

  if (presets.includes(getOxlintConfigPath(shadcnPreset))) {
    loaded.add(shadcnPlugin);
  }

  for (const plugin of oxlintJsPluginNames) {
    if (contents.includes(`"${plugin}"`) || contents.includes(`'${plugin}'`)) {
      loaded.add(plugin);
    }
  }

  return [...loaded].filter(
    (plugin): plugin is Exclude<OxlintJsPlugin, typeof antiSlopPreset> =>
      plugin !== antiSlopPreset
  );
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
 * env, ignorePatterns, jsPlugins and settings are added to the ones Ultracite
 * generates, and its Ultracite extends become presets. Returns the extends
 * entries that can't be carried over (paths to other JSON configs).
 */
// oxlint-disable-next-line complexity -- refactor when next touched: one branch per .oxlintrc.json key, each merged into the config differently
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
          build: ({ coreIdentifier }) =>
            renderSpreadArray(key, [`${coreIdentifier}.ignorePatterns`], value),
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
    } else if (key === "env" && isJsonObject(value)) {
      extras.overrides.env ??= {
        build: ({ coreIdentifier }) =>
          renderSpreadObject(key, [`${coreIdentifier}.env`], value),
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
  | { kind: "namespace"; local: string; source: string }
  | { kind: "unparseable" }
> => {
  if (!configPath) {
    return {
      existing: { extras: emptyExtras(), order: [], presets: [] },
      jsPlugins: [],
      kind: "config",
    };
  }

  const contents = await readFile(configPath, "utf-8");
  const parsed = parseConfigModule(contents);

  if (parsed.kind === "unparseable") {
    return { kind: "unparseable" };
  }

  // `import * as core` reaches the preset as `core.default`, which the
  // regenerated default import would leave undefined.
  const namespaceImport =
    parsed.kind === "module"
      ? parsed.module.imports.find(
          (moduleImport) =>
            !moduleImport.typeOnly &&
            moduleImport.namespaceLocal !== null &&
            toUltracitePreset(moduleImport.source) !== null
        )
      : undefined;

  if (namespaceImport?.namespaceLocal) {
    return {
      kind: "namespace",
      local: namespaceImport.namespaceLocal,
      source: namespaceImport.source,
    };
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
    // A config that's replaced has no order of its own to keep.
    existing: existing ?? {
      extras: emptyExtras(),
      order: [],
      presets: findPresetReferences(contents),
    },
    jsPlugins: parseExistingJsPlugins(
      contents,
      existing?.extras.reservedIdentifiers.has("selectJsPlugins")
    ),
    kind: "config",
  };
};

// The identifier a workspace config imports the root config as.
const rootConfigIdentifier = "root";

const generateWorkspaceConfigContent = (
  rootConfigImport: string,
  presets: string[]
): string => {
  const imports = [
    renderImport("oxlint", ["defineConfig"]),
    ...presets.map(
      (preset) =>
        `import ${getOxlintConfigIdentifier(preset)} from "${preset}";`
    ),
  ].join("\n");

  const extendsEntries = [
    rootConfigIdentifier,
    ...presets.map(getOxlintConfigIdentifier),
  ];

  const singleLineExtends = `  extends: [${extendsEntries.join(", ")}],`;

  const extendsBlock =
    singleLineExtends.length <= generatedLineWidth
      ? singleLineExtends
      : `  extends: [\n${renderEntries(
          extendsEntries.map((text) => ({ comment: null, text })),
          [],
          "    "
        )}\n  ],`;

  return `${imports}

import ${rootConfigIdentifier} from "${rootConfigImport}";

// Oxlint lints each file with its nearest config alone, so this extends the
// root config and repeats the properties that extends doesn't carry over.
export default defineConfig({
  env: ${rootConfigIdentifier}.env,
${extendsBlock}
  ignorePatterns: ${rootConfigIdentifier}.ignorePatterns,
  settings: ${rootConfigIdentifier}.settings,
});
`;
};

const workspaceConfigNames = [
  "oxlint.config.ts",
  "oxlint.config.mts",
  oxlintRcFile,
] as const;

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
      generateConfigContent(
        extendsList,
        opts?.jsPlugins,
        emptyExtras(),
        opts?.typeAware
      )
    );
  },
  // Oxlint doesn't merge a nested config with the root one, so a workspace
  // config extends the root config and adds the workspace's presets.
  createWorkspace: async ({
    dir,
    frameworks,
  }: WorkspaceFrameworks): Promise<string> => {
    const root = resolveOxlintConfigPath();
    const rootConfigPath = root.existing ?? root.target;

    const rootContents = exists(rootConfigPath)
      ? await readFile(rootConfigPath, "utf-8")
      : "";

    const presets = frameworks.map((framework) =>
      getOxlintConfigPath(validateFrameworkName(framework))
    );

    // The root config loads react-doctor through a selection or the full
    // js-plugins preset; its framework rules live in add-on presets, wired up
    // here the way the root config wires them for its own frameworks.
    const rootPresets = readLoadedPresets(rootContents);

    const hasReactDoctor =
      rootPresets.jsPlugins.includes("oxlint-plugin-react-doctor") ||
      rootPresets.presets.includes(jsPluginsPath);

    if (hasReactDoctor) {
      for (const framework of reactDoctorFrameworkAddOns) {
        if (presets.includes(getOxlintConfigPath(framework))) {
          presets.push(getOxlintConfigPath(`${framework}/js-plugins`));
        }
      }
    }

    // Like a root config: .ts in an ES module package, .mts otherwise.
    const type = (readWorkspacePackageJson(dir) ?? readPackageJsonSync())?.type;
    const configPath = `${dir}/oxlint.config.${type === "module" ? "ts" : "mts"}`;

    await writeProjectFile(
      `./${configPath}`,
      generateWorkspaceConfigContent(
        `${pathToRoot(dir)}/${fileName(rootConfigPath)}`,
        presets
      )
    );

    return configPath;
  },
  exists: () =>
    exists(oxlintTsConfigPath) ||
    exists(oxlintMtsConfigPath) ||
    exists(oxlintRcPath),
  findWorkspaceConfig: (dir: string): string | null =>
    workspaceConfigNames
      .map((name) => `${dir}/${name}`)
      .find((configPath) => exists(`./${configPath}`)) ?? null,
  // oxlint-disable-next-line complexity -- refactor when next touched: a guard per config init can't update, then the js-plugins, type-aware, rename and migration cases
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

    if (current.kind === "namespace") {
      const { local, source } = current;

      log.warn(
        `${fileName(paths.existing ?? paths.target)} imports ${source} with \`import * as ${local}\`, which init can't carry over, so it was left unchanged. Change it to \`import ${local} from "${source}"\`, write \`${local}\` where it says \`${local}.default\`, and re-run \`ultracite init\`.`
      );

      return;
    }

    const { existing } = current;
    const unmigrated = rc ? mergeRcConfig(rc.config, existing) : [];
    // generateConfigContent adds core and puts the presets in presetOrder.
    const newExtends = [...existing.presets];

    // Helper to check if a config is already present
    const hasConfig = (name: string) =>
      newExtends.includes(getOxlintConfigPath(name));

    // Add framework-specific configs if provided
    for (const framework of opts?.frameworks ?? []) {
      const name = validateFrameworkName(framework);

      if (!hasConfig(name)) {
        newExtends.push(getOxlintConfigPath(name));
      }
    }

    // Without an explicit new selection, keep the plugins the existing
    // config had selected.
    const requestedJsPlugins = opts?.jsPlugins ?? [];
    let { jsPlugins } = current;

    if (requestedJsPlugins.length > 0) {
      // The full js-plugins preset already enables its plugins, so a
      // selection made on top of it (e.g. adding the documentation plugins)
      // keeps them rather than replacing the preset with just the new ones.
      const extendsFullJsPluginsPreset =
        current.jsPlugins.length === 0 && hasConfig("js-plugins");

      jsPlugins =
        extendsFullJsPluginsPreset &&
        requestedJsPlugins.some(isSelectableJsPlugin)
          ? [...new Set([...fullPresetJsPlugins, ...requestedJsPlugins])]
          : requestedJsPlugins;
    }

    // An `options` object of the project's own is kept as written, so
    // type-aware linting is only added to a config that has none.
    const existingOptions = existing.extras.properties.find((property) =>
      OPTIONS_PROPERTY_RE.test(property.text)
    );

    const addTypeAware = Boolean(opts?.typeAware) && !existingOptions;
    const bindings = bindPresets(newExtends, jsPlugins, existing.extras);

    // The generated config declares these itself, so a binding of the
    // project's own with the same name would be declared twice.
    const clash = generatedHelpers(bindings.presets, jsPlugins).find((name) =>
      existing.extras.reservedIdentifiers.has(name)
    );

    if (clash) {
      log.warn(
        `${configFile} declares its own \`${clash}\`, which the Ultracite config also declares, so it was left unchanged. Rename it and re-run \`ultracite init\`.`
      );

      return;
    }

    await writeProjectFile(
      paths.target,
      generateConfigContent(
        newExtends,
        jsPlugins,
        existing.extras,
        addTypeAware,
        bindings
      )
    );

    // Say so when what the config already extended moved, since that
    // changes which preset's setting wins for a rule.
    const resolvedPresets = bindings.presets;

    const previousOrder = [...new Set(existing.order)].filter((preset) =>
      resolvedPresets.includes(preset)
    );

    const newOrder = resolvedPresets.filter((preset) =>
      previousOrder.includes(preset)
    );

    if (newOrder.join(",") !== previousOrder.join(",")) {
      const identifiers = resolvedPresets.map(
        (preset) => bindings.names.get(preset) ?? preset
      );

      log.info(
        `Reordered the Ultracite presets in the \`extends\` of ${configFile} to [${identifiers.join(", ")}], the order they're built to override each other in. To change a rule a preset sets, set it under \`rules\` rather than moving the preset.`
      );
    }

    if (
      opts?.typeAware &&
      existingOptions &&
      !TYPE_AWARE_RE.test(existingOptions.text)
    ) {
      log.warn(
        `${configFile} already sets \`options\`, so type-aware linting wasn't turned on. Add \`typeAware: true\` to its \`options\` to run the type-aware rules.`
      );
    }

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

/**
 * Adds `env` to a root config that extends core without it, for
 * `ultracite upgrade`. The rewrite is init's own update, so everything else
 * in the config is carried over the way init carries it. Anything update
 * would do more to than add a property (migrating .oxlintrc.json, renaming
 * the file, replacing a config it can't read) is left for `ultracite init`.
 */
export const addMissingOxlintEnv = async (): Promise<string | null> => {
  const paths = resolveOxlintConfigPath();

  if (
    paths.conflict ||
    !paths.existing ||
    paths.existing !== paths.target ||
    exists(oxlintRcPath)
  ) {
    return null;
  }

  if (!lacksCoreEnv(await readFile(paths.existing, "utf-8"))) {
    return null;
  }

  await oxlint.update();

  return fileName(paths.target);
};
