/*
 * Function-style subject B: a file written top-down, callers above the helpers they call.
 *
 * Source:    supabase/supabase — apps/studio/components/interfaces/ConfigDrift/
 *            ConfigurationDriftPage.utils.ts, lines 14-137 (the whole file but its imports)
 * Commit:    09f80f528ec47569841408a81668dff90525c48a
 * Permalink: https://github.com/supabase/supabase/blob/09f80f528ec47569841408a81668dff90525c48a/apps/studio/components/interfaces/ConfigDrift/ConfigurationDriftPage.utils.ts#L14-L137
 * Functions: createConfigurationDriftRows, groupUnmanagedConfigFields and
 *   groupMatchedConfigFields (exported), which turn the config fields that differ between a
 *   project's dashboard and its GitHub config.toml, or exist in only one of them, into the rows
 *   and section groups Supabase Studio's configuration drift page shows; and five helpers below
 *   them: groupConfigFieldsBySection, formatConfigFieldValue, createConfigurationDriftValueDiff,
 *   getConfigFieldLabel and formatScalarValue.
 * Rules it hits: see examples.json (measured with func-style-examples.cjs).
 * Why it needs reordering: the file reads top-down. The three exports come first and every helper
 *   is defined below the functions that call it, which works because declarations are hoisted.
 *   Every one of those calls runs later, inside a function, so nothing breaks at load time either
 *   way.
 * What the project did: the file arrived with supabase/supabase#48906 (e10f7cc808, 2026-08-25,
 *   "feat: Add a config drift page in Studio") and changed in #50398 (8422045b86, 2026-09-21).
 *   The project tests it in ConfigurationDriftPage.utils.test.ts.
 * Behaviour to preserve: the three exports' results for every list of fields: each row's label
 *   (the registry's label, else the start-cased last path segment), its formatted values ("Not
 *   set" for undefined, null, an empty string or an empty array; arrays one item per line;
 *   booleans and numbers as text; anything else as indented JSON, or "Not set" when that's
 *   undefined), the drift rows' settingHref called with the project ref, sections in
 *   CONFIG_SECTIONS order with their labels, and rows in first-seen order.
 * Expected response: rewrite the eight declarations as const arrow functions and move each helper
 *   above the functions that use it (or the exports below their helpers), so every function is
 *   defined before any reference to it. Behaviour stays the same.
 * Tempting responses: converting without reordering (no-use-before-define then reports every
 *   helper); function expressions instead of arrows (the same reports); inlining the helpers into
 *   their callers; changing a value's formatting while touching formatConfigFieldValue.
 * Gaming moves (measured in examples.json): suppression comments; function expressions; the
 *   helpers as methods of an object; var.
 * Lines 14-137 are copied verbatim. The import below (marked STUB) replaces lines 1-12, which
 *   import lodash's startCase and two Studio modules; func-style-b-stubs.ts stands in for them.
 *
 * License of the source repository (supabase/supabase/LICENSE), Apache License 2.0 (in full in
 * research/corpus/examples/licenses/supabase-LICENSE). This file is a copy of part of a Supabase
 * file with its imports replaced, as marked.
 */
// STUB: replaces lines 1-12 of the original (lodash's startCase and two Studio modules).
import {
  CONFIG_SECTIONS,
  type ConfigSection,
  getFieldDefinition,
  type GitHubConfigDriftField,
  type MatchedConfigField,
  startCase,
  type UnmanagedConfigField,
} from "./func-style-b-stubs";

const CONFIG_SECTION_LABELS: Record<ConfigSection, string> = {
  api: 'API',
  auth: 'Auth',
  db: 'Database',
  storage: 'Storage',
  compute: 'Compute',
  experimental: 'Experimental',
}

interface ConfigurationIssueRowMeta {
  settingLabel: string
  settingHref: string
  valueDiff: ConfigurationDriftValueDiff
}

export type ConfigurationDriftRow = Omit<GitHubConfigDriftField, 'settingHref'> &
  ConfigurationIssueRowMeta & { status: 'drifted' }

type ConfigurationDriftValueDiff = {
  kind: 'scalar'
  dashboardValue: string
  configValue: string
}

interface UnmanagedConfigRow {
  configPath: string
  label: string
  value: string
}

export interface ConfigSectionGroup {
  section: ConfigSection
  sectionLabel: string
  rows: UnmanagedConfigRow[]
}

export function createConfigurationDriftRows(
  fields: GitHubConfigDriftField[],
  projectRef: string
): ConfigurationDriftRow[] {
  return fields.map((field) => ({
    ...field,
    status: 'drifted' as const,
    settingLabel: getConfigFieldLabel(field.configPath),
    settingHref: field.settingHref(projectRef),
    valueDiff: createConfigurationDriftValueDiff(field),
  }))
}

export function groupUnmanagedConfigFields(
  fields: readonly UnmanagedConfigField[]
): ConfigSectionGroup[] {
  return groupConfigFieldsBySection(fields, (field) => field.dashboardValue)
}

export function groupMatchedConfigFields(
  fields: readonly MatchedConfigField[]
): ConfigSectionGroup[] {
  return groupConfigFieldsBySection(fields, (field) => field.value)
}

function groupConfigFieldsBySection<T extends { section: ConfigSection; configPath: string }>(
  fields: readonly T[],
  getValue: (field: T) => unknown
): ConfigSectionGroup[] {
  const bySection = new Map<ConfigSection, UnmanagedConfigRow[]>()

  for (const field of fields) {
    const rows = bySection.get(field.section) ?? []
    rows.push({
      configPath: field.configPath,
      label: getConfigFieldLabel(field.configPath),
      value: formatConfigFieldValue(getValue(field)),
    })
    bySection.set(field.section, rows)
  }

  return CONFIG_SECTIONS.filter((section) => bySection.has(section)).map((section) => ({
    section,
    sectionLabel: CONFIG_SECTION_LABELS[section],
    rows: bySection.get(section)!,
  }))
}

function formatConfigFieldValue(value: unknown): string {
  const normalizedValue = value

  if (normalizedValue === undefined || normalizedValue === null || normalizedValue === '') {
    return 'Not set'
  }
  if (Array.isArray(normalizedValue)) {
    return normalizedValue.length === 0
      ? 'Not set'
      : normalizedValue.map((item) => formatScalarValue(item)).join('\n')
  }

  return formatScalarValue(normalizedValue)
}

function createConfigurationDriftValueDiff(
  field: GitHubConfigDriftField
): ConfigurationDriftValueDiff {
  return {
    kind: 'scalar',
    dashboardValue: formatConfigFieldValue(field.dashboardValue),
    configValue: formatConfigFieldValue(field.githubValue),
  }
}

/**
 * Prefers the registry's hand-written label, and otherwise title-cases the last path segment —
 * never the whole path, which would leave the dots in.
 */
function getConfigFieldLabel(configPath: string): string {
  const label = getFieldDefinition(configPath)?.label
  return label ?? startCase(configPath.split('.').at(-1) ?? configPath)
}

function formatScalarValue(value: unknown): string {
  if (typeof value === 'string') return value || 'Not set'
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'number') return String(value)
  return JSON.stringify(value, null, 2) ?? 'Not set'
}
