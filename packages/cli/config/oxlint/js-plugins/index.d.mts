import type { OxlintConfig } from "oxlint";

declare const config: OxlintConfig;

export default config;

export type OxlintJsPluginName = "github" | "sonarjs" | "react-doctor";

/**
 * react-doctor settings (the "curated" ported-rule mode). Oxlint does not
 * merge `settings` from extended configs, so apply these on the root
 * config: `settings: jsPluginSettings`.
 */
export declare const jsPluginSettings: NonNullable<OxlintConfig["settings"]>;

/**
 * Returns a copy of the js-plugins preset narrowed to the given plugin
 * names: only the selected jsPlugins entries are loaded and only their
 * rules (top-level and per-override) are kept.
 */
export declare const selectJsPlugins: (
  pluginNames: readonly OxlintJsPluginName[]
) => OxlintConfig;
