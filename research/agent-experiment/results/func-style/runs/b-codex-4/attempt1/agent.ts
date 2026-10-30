/*
 * Source:    supabase/supabase — apps/studio/components/interfaces/ConfigDrift/
 *            ConfigurationDriftPage.utils.ts, lines 14-137 (the whole file but its imports)
 * Commit:    09f80f528ec47569841408a81668dff90525c48a
 * Permalink: https://github.com/supabase/supabase/blob/09f80f528ec47569841408a81668dff90525c48a/apps/studio/components/interfaces/ConfigDrift/ConfigurationDriftPage.utils.ts#L14-L137
 * Functions: createConfigurationDriftRows, groupUnmanagedConfigFields and
 *   groupMatchedConfigFields (exported), which turn the config fields that differ between a
 *   project's dashboard and its GitHub config.toml, or exist in only one of them, into the rows
 *   and section groups Supabase Studio's configuration drift page shows; and the five helpers
 *   they use: groupConfigFieldsBySection, formatConfigFieldValue, createConfigurationDriftValueDiff,
 *   getConfigFieldLabel and formatScalarValue.
 * Lines 14-137 are copied, with their formatting changed. The import marked STUB replaces lines
 *   1-12, which import lodash's startCase and two Studio modules; stubs.ts stands in for them.
 *
 * License of the source repository: Apache License 2.0 (supabase/supabase/LICENSE). Licensed under the
 * Apache License, Version 2.0; you may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0. This file is a copy of part of a Supabase file with its
 * imports replaced, as marked.
 */
// STUB: replaces lines 1-12 of the original (lodash's startCase and two Studio modules).
import { CONFIG_SECTIONS, getFieldDefinition, startCase } from "./stubs";
import type {
  ConfigSection,
  GitHubConfigDriftField,
  MatchedConfigField,
  UnmanagedConfigField,
} from "./stubs";

const CONFIG_SECTION_LABELS: Record<ConfigSection, string> = {
  api: "API",
  auth: "Auth",
  compute: "Compute",
  db: "Database",
  experimental: "Experimental",
  storage: "Storage",
};

interface ConfigurationIssueRowMeta {
  settingLabel: string;
  settingHref: string;
  valueDiff: ConfigurationDriftValueDiff;
}

export type ConfigurationDriftRow = Omit<
  GitHubConfigDriftField,
  "settingHref"
> &
  ConfigurationIssueRowMeta & { status: "drifted" };

interface ConfigurationDriftValueDiff {
  kind: "scalar";
  dashboardValue: string;
  configValue: string;
}

interface UnmanagedConfigRow {
  configPath: string;
  label: string;
  value: string;
}

export interface ConfigSectionGroup {
  section: ConfigSection;
  sectionLabel: string;
  rows: UnmanagedConfigRow[];
}

/**
 * Prefers the registry's hand-written label, and otherwise title-cases the last path segment —
 * never the whole path, which would leave the dots in.
 */
const getConfigFieldLabel = (configPath: string): string => {
  const label = getFieldDefinition(configPath)?.label;
  return label ?? startCase(configPath.split(".").at(-1) ?? configPath);
};

const formatScalarValue = (value: unknown): string => {
  if (typeof value === "string") {
    return value || "Not set";
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  if (typeof value === "number") {
    return String(value);
  }
  return JSON.stringify(value, null, 2) ?? "Not set";
};

const formatConfigFieldValue = (value: unknown): string => {
  const normalizedValue = value;

  if (
    normalizedValue === undefined ||
    normalizedValue === null ||
    normalizedValue === ""
  ) {
    return "Not set";
  }
  if (Array.isArray(normalizedValue)) {
    return normalizedValue.length === 0
      ? "Not set"
      : normalizedValue.map((item) => formatScalarValue(item)).join("\n");
  }

  return formatScalarValue(normalizedValue);
};

const createConfigurationDriftValueDiff = (
  field: GitHubConfigDriftField
): ConfigurationDriftValueDiff => {
  return {
    configValue: formatConfigFieldValue(field.githubValue),
    dashboardValue: formatConfigFieldValue(field.dashboardValue),
    kind: "scalar",
  };
};

export const createConfigurationDriftRows = (
  fields: GitHubConfigDriftField[],
  projectRef: string
): ConfigurationDriftRow[] => {
  return fields.map((field) => ({
    ...field,
    settingHref: field.settingHref(projectRef),
    settingLabel: getConfigFieldLabel(field.configPath),
    status: "drifted" as const,
    valueDiff: createConfigurationDriftValueDiff(field),
  }));
};

const groupConfigFieldsBySection = <
  T extends { section: ConfigSection; configPath: string },
>(fields: readonly T[], getValue: (field: T) => unknown): ConfigSectionGroup[] => {
  const bySection = new Map<ConfigSection, UnmanagedConfigRow[]>();

  for (const field of fields) {
    const rows = bySection.get(field.section) ?? [];
    rows.push({
      configPath: field.configPath,
      label: getConfigFieldLabel(field.configPath),
      value: formatConfigFieldValue(getValue(field)),
    });
    bySection.set(field.section, rows);
  }

  return CONFIG_SECTIONS.filter((section) => bySection.has(section)).map(
    (section) => ({
      rows: bySection.get(section)!,
      section,
      sectionLabel: CONFIG_SECTION_LABELS[section],
    })
  );
};

export const groupUnmanagedConfigFields = (
  fields: readonly UnmanagedConfigField[]
): ConfigSectionGroup[] => {
  return groupConfigFieldsBySection(fields, (field) => field.dashboardValue);
};

export const groupMatchedConfigFields = (
  fields: readonly MatchedConfigField[]
): ConfigSectionGroup[] => {
  return groupConfigFieldsBySection(fields, (field) => field.value);
};
