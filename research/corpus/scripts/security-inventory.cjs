// Which security rules Ultracite turns on, per linter and preset, read from the presets
// themselves (packages/cli/config), not from documentation.
//
//   Oxlint  core, react, js-plugins (sonarjs, github and react-doctor through the JS plugin bridge)
//   ESLint  core (syntactic), type-aware, react
//   Biome   core, react (plus Biome's own recommended set, which the presets don't turn off)
//
// For each rule in the security catalogue (security-lib.cjs) it records whether the rule exists in
// the installed linter, whether each preset enables it, and whether it needs type information.
//
// Usage (from the repo root):
//   node research/corpus/scripts/security-inventory.cjs [--topic security-rules] [--print-focus]
// Writes results/<topic>/inventory.json. --print-focus prints the comma-separated Oxlint rule
// names to pass to rule-census.cjs --focus.
"use strict";

const { execFileSync } = require("node:child_process");
const { mkdirSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");

const lib = require("./security-lib.cjs");
const { biomeBin } = require("./tools.cjs");

const CLI_REQUIRE = (name) =>
  require(require.resolve(name, { paths: [lib.CLI] }));

const oxlintCatalogue = () => {
  const rows = JSON.parse(
    execFileSync(
      process.execPath,
      [lib.oxlintBin, "--rules", "--format", "json"],
      {
        encoding: "utf8",
        maxBuffer: 1 << 26,
      }
    )
  );
  const name = (scope, rule) =>
    scope === "eslint" ? rule : `${scope.replaceAll("_", "-")}/${rule}`;
  return new Map(rows.map((r) => [name(r.scope, r.value), r]));
};

const biomeExplain = (rule) => {
  const text = execFileSync(process.execPath, [biomeBin, "explain", rule], {
    encoding: "utf8",
  });
  return {
    defaultSeverity: /Default severity: (\w+)/.exec(text)?.[1] ?? null,
    recommended: /This rule is recommended/.test(text),
    since: /Available from version: ([\d.]+)/.exec(text)?.[1] ?? null,
  };
};

const main = async () => {
  const catalogue = oxlintCatalogue();
  const presets = {
    core: (await lib.oxlintPreset("core")).rules,
    react: (await lib.oxlintPreset("react")).rules,
    "js-plugins": (await lib.oxlintPreset("js-plugins")).rules,
  };
  const eslint = {
    core: await lib.eslintRules("core/eslint.config.mjs"),
    "type-aware": await lib.eslintRules("type-aware/eslint.config.mjs"),
    react: await lib.eslintRules("react/eslint.config.mjs"),
  };
  // The type-aware preset turns the base no-implied-eval off on TS files and swaps in the
  // @typescript-eslint extension.
  const biome = {
    core: lib.biomePreset("core"),
    react: lib.biomePreset("react"),
  };

  const sonarjs = CLI_REQUIRE("eslint-plugin-sonarjs");
  const react = CLI_REQUIRE("eslint-plugin-react");
  const unicorn = (
    await import(require.resolve("eslint-plugin-unicorn", { paths: [lib.CLI] }))
  ).default;
  const github = (
    await import(require.resolve("eslint-plugin-github", { paths: [lib.CLI] }))
  ).default;
  const tsPlugin = CLI_REQUIRE("@typescript-eslint/eslint-plugin");
  const reactDoctor = await lib.reactDoctorSecurity();

  const entries = [];
  const add = (plugin, table, pluginRules, prefix) => {
    for (const [rule, [cls, detects]] of Object.entries(table)) {
      entries.push({
        class: cls,
        detects,
        eslintName: prefix ? `${prefix}/${rule}` : rule,
        meta: pluginRules ? pluginRules[rule]?.meta : undefined,
        oxlintName: prefix
          ? `${plugin === "typescript" ? "typescript" : plugin}/${rule}`
          : rule,
        plugin,
        rule,
      });
    }
  };
  add("eslint", lib.ESLINT_CORE, null, "");
  add("typescript", lib.TYPESCRIPT, tsPlugin.rules, "@typescript-eslint");
  add("unicorn", lib.UNICORN, unicorn.rules, "unicorn");
  add("react", lib.REACT, react.rules, "react");
  add("github", lib.GITHUB, github.rules, "github");
  add("sonarjs", lib.SONARJS, sonarjs.rules, "sonarjs");
  add("react-doctor", reactDoctor, null, "react-doctor");
  // react-doctor's titles become the description; the class is assigned by hand below.
  const RD_CLASS = {
    "agent-tool-capability-risk": "injection",
    "artifact-baas-authority-surface": "data-exposure",
    "artifact-env-leak": "data-exposure",
    "artifact-secret-leak": "secrets",
    "auth-token-in-web-storage": "data-exposure",
    "build-pipeline-secret-boundary": "secrets",
    "clickjacking-redirect-risk": "http-headers",
    "command-execution-input-risk": "injection",
    "cors-cookie-trust-risk": "cross-origin",
    "dangerous-html-sink": "xss",
    "iframe-missing-sandbox": "xss",
    "import-metadata-execution-risk": "code-injection",
    "insecure-crypto-risk": "crypto",
    "insecure-session-cookie": "cookies",
    "jsx-no-script-url": "url-scheme",
    "jsx-no-target-blank": "tabnabbing",
    "jwt-insecure-verification": "crypto",
    "mdx-ssr-execution-risk": "code-injection",
    "no-danger": "xss",
    "no-document-write": "xss",
    "no-eval": "code-injection",
    "no-path-prefix-containment": "file-system",
    "no-secrets-in-client-code": "secrets",
    "nosql-injection-risk": "injection",
    "package-metadata-secret": "secrets",
    "path-traversal-risk": "file-system",
    "postmessage-origin-risk": "cross-origin",
    "public-env-secret-name": "secrets",
    "raw-sql-injection-risk": "injection",
    "react-markdown-unsanitized-raw-html": "xss",
    "repository-secret-file": "secrets",
    "secret-in-fallback": "secrets",
    "svg-filter-clickjacking-risk": "http-headers",
    "unsafe-json-in-html": "xss",
    "untrusted-redirect-following": "cross-origin",
    "window-open-without-noopener": "tabnabbing",
  };
  for (const e of entries) {
    if (e.plugin === "react-doctor") {
      e.class = RD_CLASS[e.rule] ?? "other";
    }
  }

  const rows = entries.map((e) => {
    const oxNative = catalogue.get(e.oxlintName);
    const isJsPlugin = ["sonarjs", "github", "react-doctor"].includes(e.plugin);
    const oxPresets = Object.entries(presets)
      .filter(([, rules]) => lib.severityOn(rules[e.oxlintName]))
      .map(([p]) => p);
    const eslintPresets = Object.entries(eslint)
      .filter(([, rules]) => lib.severityOn(rules[e.eslintName]))
      .map(([p]) => p);
    // Off in a later preset wins (type-aware turns no-implied-eval off on TS files).
    const eslintOffIn = Object.entries(eslint)
      .filter(
        ([, rules]) =>
          rules[e.eslintName] !== undefined &&
          !lib.severityOn(rules[e.eslintName])
      )
      .map(([p]) => p);
    const typeAwareEslint =
      e.meta?.docs?.requiresTypeChecking === true || e.plugin === "typescript";
    return {
      class: e.class,
      deprecated: e.meta?.deprecated === true,
      description: e.meta?.docs?.description ?? null,
      detects: e.detects,
      eslint: {
        name: e.eslintName,
        offIn: eslintOffIn,
        presets: eslintPresets,
        typeAware: typeAwareEslint,
      },
      oxlint: {
        available: isJsPlugin ? "js-plugin" : oxNative ? "native" : "missing",
        name: e.oxlintName,
        presets: oxPresets,
        typeAware: oxNative?.type_aware ?? false,
      },
      plugin: e.plugin,
      rule: e.rule,
    };
  });

  // Biome, read from the presets plus `biome explain` for the recommended set.
  const biomeRows = Object.entries(lib.BIOME).map(([key, [cls, detects]]) => {
    const [group, rule] = key.split("/");
    const configured = (preset) => {
      const value = preset.linter?.rules?.[group]?.[rule];
      if (value === undefined) {
        return undefined;
      }
      return typeof value === "string" ? value : value.level;
    };
    const explicit = configured(biome.core) ?? configured(biome.react);
    const info = biomeExplain(rule);
    const enabled =
      explicit === undefined
        ? info.recommended && group !== "nursery"
        : explicit !== "off";
    return {
      class: cls,
      detects,
      biome: {
        defaultSeverity: info.defaultSeverity,
        enabled,
        explicit: explicit ?? null,
        group,
        recommended: info.recommended,
        since: info.since,
      },
      rule: key,
    };
  });

  const result = {
    generated: new Date().toISOString().slice(0, 10),
    note: "Oxlint js-plugins is an opt-in preset; core and react are the defaults. ESLint core runs the syntactic rules; type-aware is opt-in. Biome's core preset leaves `recommended` on, so recommended rules it doesn't mention are enabled too. Nursery rules are never enabled by recommended.",
    classes: lib.CLASSES,
    tools: lib.toolVersions(),
    rules: rows,
    biome: biomeRows,
  };

  // Rules in the plugins that the presets enable but the catalogue doesn't list, whose names
  // look security-related: printed so the catalogue can be reviewed by hand.
  const SUSPECT =
    /secur|secret|password|token|eval|inject|xss|html|cookie|crypt|cipher|hash|random|cors|csrf|ssl|tls|cert|sanit|unsafe|script-url|target-blank|sandbox/i;
  const known = new Set(rows.flatMap((r) => [r.oxlint.name, r.eslint.name]));
  const on = (rules) =>
    Object.keys(rules).filter((name) => lib.severityOn(rules[name]));
  const unlisted = [
    ...on(presets.core),
    ...on(presets.react),
    ...on(presets["js-plugins"]),
    ...on(eslint.core),
    ...on(eslint.react),
    ...on(eslint["type-aware"]),
  ].filter((r) => SUSPECT.test(r) && !known.has(r));
  result.reviewedNotSecurity = [...new Set(unlisted)].sort();

  mkdirSync(lib.RESULTS_DIR, { recursive: true });
  writeFileSync(
    join(lib.RESULTS_DIR, "inventory.json"),
    `${JSON.stringify(result, null, 2)}\n`
  );

  const focus = rows
    .filter((r) => !r.deprecated && r.oxlint.presets.length > 0)
    .map((r) => r.oxlint.name);
  if (lib.flag("print-focus")) {
    console.log(focus.join(","));
    return;
  }
  const summary = (filter) => rows.filter(filter).length;
  console.log(
    `security rules in catalogue: ${rows.length}; Oxlint on: ${summary((r) => r.oxlint.presets.length > 0)} (core+react: ${summary((r) => r.oxlint.presets.some((p) => p !== "js-plugins"))}); ESLint on: ${summary((r) => r.eslint.presets.length > 0)}; Biome on: ${biomeRows.filter((r) => r.biome.enabled).length} of ${biomeRows.length}`
  );
  console.log(
    "unlisted, security-looking names enabled by Oxlint presets:",
    result.reviewedNotSecurity.join(", ")
  );
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
