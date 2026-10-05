import type { OxlintConfig } from "oxlint";

declare const config: OxlintConfig & {
  jsPlugins: NonNullable<OxlintConfig["jsPlugins"]>;
};

export default config;
