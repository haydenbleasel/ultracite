/*
 * STUB for func-style subject B. Stands in for the three modules the original file imports:
 * lodash's startCase, Supabase Studio's ConfigurationDriftPage.constants (CONFIG_SECTIONS,
 * getFieldDefinition, ConfigSection) and github-config-drift (the field types). The types copy
 * the originals at supabase/supabase@09f80f528ec47569841408a81668dff90525c48a; the values are
 * small stand-ins (a six-section list and a three-entry label registry). Not part of the source.
 */
export const CONFIG_SECTIONS = ["api", "auth", "db", "storage", "compute", "experimental"] as const;
export type ConfigSection = (typeof CONFIG_SECTIONS)[number];

interface ConfigFieldDefinition {
  settingHref: (projectRef: string) => string;
  label: string;
}
export type ResolvedConfigFieldDefinition = ConfigFieldDefinition & { configPath: string };

const REGISTRY: Record<string, ConfigFieldDefinition> = {
  "api.max_rows": { label: "Max rows", settingHref: (ref) => `/project/${ref}/settings/api` },
  "auth.jwt_expiry": { label: "JWT expiry", settingHref: (ref) => `/project/${ref}/auth` },
  "db.pooler.default_pool_size": {
    label: "Pool size",
    settingHref: (ref) => `/project/${ref}/database/settings`,
  },
};

export const getFieldDefinition = (
  configPath: string
): ResolvedConfigFieldDefinition | undefined => {
  const definition = REGISTRY[configPath];
  return definition ? { ...definition, configPath } : undefined;
};

// lodash's startCase for the inputs the oracle uses: words split on non-alphanumerics and
// lower-to-upper case changes, each capitalised, joined with spaces.
export const startCase = (value: string): string =>
  value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

export interface GitHubConfigDriftField {
  section: ConfigSection;
  configPath: string;
  settingHref: (projectRef: string) => string;
  dashboardValue: unknown;
  githubValue: unknown;
}

export interface UnmanagedConfigField {
  section: ConfigSection;
  configPath: string;
  dashboardValue: unknown;
}

export interface MatchedConfigField {
  section: ConfigSection;
  configPath: string;
  value: unknown;
}
