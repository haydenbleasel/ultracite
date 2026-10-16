// Shared definitions for the accessibility scripts: the repos measured (the three corpus repos with
// JSX plus the React codebases in repos-accessibility.json), which rules count as accessibility
// rules in each linter, the concepts they share, and runners for Ultracite's Oxlint, ESLint and
// Biome presets that keep each linter's full message and help text (what `ultracite fix
// --claude/--codex` hands an agent).
//
// "Accessibility rule" here means a rule whose purpose is that people using assistive technology,
// a keyboard, or reduced motion can perceive and operate the UI:
//   jsx-a11y/*                  Oxlint (react preset) and ESLint (eslint-plugin-jsx-a11y, react preset)
//   astro/jsx-a11y/*            ESLint astro preset (eslint-plugin-astro wraps jsx-a11y)
//   a11y/*                      Biome's a11y group (core preset)
//   github/a11y-*               ESLint core and Oxlint js-plugins (eslint-plugin-github)
//   sonarjs table/object rules  ESLint core and Oxlint js-plugins (S5256, S5257, S5260, S5264)
//   react/button-has-type       ESLint and Oxlint react (Biome files the same check under a11y);
//                               svelte/button-has-type in the ESLint svelte preset
//   react-doctor/*              the rules react-doctor itself files under "Accessibility"
//   svelte/valid-compile        ESLint svelte preset (it reports the Svelte compiler's a11y_* warnings)
"use strict";

// Must be set before collect-files.cjs is loaded anywhere in the process.
process.env.CORPUS_REPO_LISTS ??= "repos-accessibility.json";

const { execFileSync } = require("node:child_process");
const {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} = require("node:fs");
const { dirname, join, resolve } = require("node:path");
const { pathToFileURL } = require("node:url");

const dc = require("./dead-code-lib.cjs");
const { collect, config, getRepo } = require("./collect-files.cjs");

const HERE = resolve(__dirname, "..");
const TOPIC = "accessibility";
const RESULTS_DIR = join(HERE, "results", TOPIC);
const OUT_DIR = join(HERE, "out", TOPIC);
const CALIBRATION_DIR = join(HERE, "calibration", TOPIC);
const EXAMPLES_DIR = join(HERE, "examples", TOPIC);
const { CLI, ULTRACITE, ts } = dc;

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const flag = (name) => args.includes(`--${name}`);

// ── repos ──────────────────────────────────────────────────────────────
// The corpus repos with JSX (repos.json), then the ones added for this post.
const ORIGINAL = ["trpc", "excalidraw", "next.js"];
const ADDED = ["shadcn", "radix", "react-aria", "supabase"];
const REPOS = [...ORIGINAL, ...ADDED];
const REPO_KIND = {
  excalidraw: "app (whiteboard)",
  "next.js": "framework (dev overlay, built-in components)",
  radix: "a11y-focused primitives library",
  "react-aria": "a11y-focused component library (hooks + spread props)",
  shadcn: "copy-paste component registry",
  supabase: "app (dashboard) on a shadcn-derived design system",
  trpc: "library (React adapters)",
};
const only = () =>
  (arg("repos", "") || "")
    .split(",")
    .filter(Boolean)
    .filter((n) => REPOS.includes(n));
const selectedRepos = () => (only().length > 0 ? only() : REPOS);

const isJsxFile = (rel) => /\.(?:tsx|jsx)$/.test(rel);
const jsxFiles = (name) => {
  const { repo, files } = collect(name);
  return { files: files.filter(isJsxFile), repo };
};
const repoMeta = (name) => {
  const r = config.repos.find((x) => x.name === name);
  return { ...r, root: getRepo(name).root };
};

const PINNED = {
  excalidraw: "4c00f31ddcc20086bac1020428819fe0b9a30bce",
  "next.js": "d8bfc3c994670c367e6e31853b78f42e8b7fba85",
  trpc: "796700d8653b3832409fff997e6f5789519b9ea7",
  ...Object.fromEntries(
    require("./repos-accessibility.json").repos.map((r) => [r.name, r.sha])
  ),
};
const checkPinned = () => {
  for (const name of REPOS) {
    const head = dc.gitHead(getRepo(name).root);
    if (head !== PINNED[name]) {
      throw new Error(
        `${name} is at ${head}, not the pinned ${PINNED[name]}. Run clone.sh / a11y-clone.sh.`
      );
    }
  }
};

// ── which rules are accessibility rules ────────────────────────────────
const SONAR_A11Y = new Set([
  "sonarjs/no-table-as-layout",
  "sonarjs/object-alt-content",
  "sonarjs/table-header",
  "sonarjs/table-header-reference",
]);
// Biome files the button-type check under a11y; React and Svelte file it under their own plugins.
const REACT_A11Y = new Set(["react/button-has-type", "svelte/button-has-type"]);

// react-doctor files each rule under a category in its rule registry (dist/core.js:
// `{key:\`react-doctor/<id>\`, … category:\`Accessibility\` …}`). 102 of its 904 rules are
// "Accessibility" in 0.9.16.
let reactDoctorCats = null;
const reactDoctorCategories = () => {
  if (reactDoctorCats) {
    return reactDoctorCats;
  }
  // The package's "exports" hides package.json; its main entry is dist/index.js.
  const main = require.resolve("oxlint-plugin-react-doctor", {
    paths: [ULTRACITE],
  });
  const registry = readFileSync(join(dirname(main), "core.js"), "utf8");
  reactDoctorCats = new Map();
  const starts = [
    ...registry.matchAll(/\{key:`react-doctor\/([a-z0-9-]+)`,id:`/g),
  ];
  for (let i = 0; i < starts.length; i++) {
    const block = registry.slice(
      starts[i].index,
      starts[i + 1]?.index ?? registry.length
    );
    reactDoctorCats.set(starts[i][1], {
      category: /category:`([^`]+)`/.exec(block)?.[1] ?? null,
      title: /title:`([^`]+)`/.exec(block)?.[1] ?? null,
    });
  }
  return reactDoctorCats;
};
const isReactDoctorA11y = (id) =>
  reactDoctorCategories().get(id)?.category === "Accessibility";

// Oxlint and ESLint names, normalised to Oxlint's spelling.
const isA11yRule = (rawName) => {
  const name = dc.toOxlintName(rawName);
  if (/^(?:astro\/)?jsx-a11y\//.test(name)) {
    return true;
  }
  if (/^github\/a11y-/.test(name)) {
    return true;
  }
  if (SONAR_A11Y.has(name) || REACT_A11Y.has(name)) {
    return true;
  }
  if (name.startsWith("react-doctor/")) {
    return isReactDoctorA11y(name.slice("react-doctor/".length));
  }
  return name === "svelte/valid-compile";
};
const isBiomeA11y = (rule) => /^a11y\//.test(rule);

// Which family a rule belongs to, for tables.
const familyOf = (rawName) => {
  const name = dc.toOxlintName(rawName);
  if (name.startsWith("astro/jsx-a11y/")) {
    return "astro/jsx-a11y";
  }
  if (name.startsWith("jsx-a11y/")) {
    return "jsx-a11y";
  }
  if (name.startsWith("github/")) {
    return "github";
  }
  if (name.startsWith("sonarjs/")) {
    return "sonarjs";
  }
  if (name.startsWith("react-doctor/")) {
    return "react-doctor";
  }
  if (name.startsWith("react/")) {
    return "react";
  }
  if (name.startsWith("a11y/")) {
    return "biome a11y";
  }
  return name.split("/")[0];
};

// ── concepts shared across linters ─────────────────────────────────────
// jsx-a11y names are the same in Oxlint and ESLint; Biome names are group/rule.
const CONCEPTS = [
  ["alt text", "jsx-a11y/alt-text", "a11y/useAltText"],
  ["redundant alt words", "jsx-a11y/img-redundant-alt", "a11y/noRedundantAlt"],
  [
    "anchor has content",
    "jsx-a11y/anchor-has-content",
    "a11y/useAnchorContent",
  ],
  ["anchor is valid", "jsx-a11y/anchor-is-valid", "a11y/useValidAnchor"],
  [
    "ambiguous link text",
    "jsx-a11y/anchor-ambiguous-text",
    "a11y/noAmbiguousAnchorText",
  ],
  [
    "aria-activedescendant needs tabindex",
    "jsx-a11y/aria-activedescendant-has-tabindex",
    "a11y/useAriaActivedescendantWithTabindex",
  ],
  ["valid aria-* names", "jsx-a11y/aria-props", "a11y/useValidAriaProps"],
  ["valid aria-* values", "jsx-a11y/aria-proptypes", "a11y/useValidAriaValues"],
  ["valid role", "jsx-a11y/aria-role", "a11y/useValidAriaRole"],
  [
    "aria on unsupported elements",
    "jsx-a11y/aria-unsupported-elements",
    "a11y/noAriaUnsupportedElements",
  ],
  [
    "valid autocomplete",
    "jsx-a11y/autocomplete-valid",
    "a11y/useValidAutocomplete",
  ],
  [
    "click needs key events",
    "jsx-a11y/click-events-have-key-events",
    "a11y/useKeyWithClickEvents",
  ],
  [
    "control needs a label",
    "jsx-a11y/control-has-associated-label",
    "nursery/useControlLabel",
  ],
  [
    "heading has content",
    "jsx-a11y/heading-has-content",
    "a11y/useHeadingContent",
  ],
  ["html has lang", "jsx-a11y/html-has-lang", "a11y/useHtmlLang"],
  ["iframe has title", "jsx-a11y/iframe-has-title", "a11y/useIframeTitle"],
  [
    "interactive role is focusable",
    "jsx-a11y/interactive-supports-focus",
    "a11y/useFocusableInteractive",
  ],
  [
    "label has a control",
    "jsx-a11y/label-has-associated-control",
    "a11y/noLabelWithoutControl",
  ],
  ["valid lang", "jsx-a11y/lang", "a11y/useValidLang"],
  ["media has captions", "jsx-a11y/media-has-caption", "a11y/useMediaCaption"],
  [
    "mouse events need focus events",
    "jsx-a11y/mouse-events-have-key-events",
    "a11y/useKeyWithMouseEvents",
  ],
  ["no accessKey", "jsx-a11y/no-access-key", "a11y/noAccessKey"],
  [
    "no aria-hidden on focusable",
    "jsx-a11y/no-aria-hidden-on-focusable",
    "a11y/noAriaHiddenOnFocusable",
  ],
  ["no autofocus", "jsx-a11y/no-autofocus", "a11y/noAutofocus"],
  [
    "no distracting elements",
    "jsx-a11y/no-distracting-elements",
    "a11y/noDistractingElements",
  ],
  [
    "interactive element to non-interactive role",
    "jsx-a11y/no-interactive-element-to-noninteractive-role",
    "a11y/noInteractiveElementToNoninteractiveRole",
  ],
  [
    "handlers on non-interactive elements",
    "jsx-a11y/no-noninteractive-element-interactions",
    "a11y/noNoninteractiveElementInteractions",
  ],
  [
    "non-interactive element to interactive role",
    "jsx-a11y/no-noninteractive-element-to-interactive-role",
    "a11y/noNoninteractiveElementToInteractiveRole",
  ],
  [
    "tabindex on non-interactive elements",
    "jsx-a11y/no-noninteractive-tabindex",
    "a11y/noNoninteractiveTabindex",
  ],
  ["redundant roles", "jsx-a11y/no-redundant-roles", "a11y/noRedundantRoles"],
  [
    "handlers on static elements",
    "jsx-a11y/no-static-element-interactions",
    "a11y/noStaticElementInteractions",
  ],
  [
    "prefer a tag over a role",
    "jsx-a11y/prefer-tag-over-role",
    "a11y/useSemanticElements",
  ],
  [
    "role needs its aria-* props",
    "jsx-a11y/role-has-required-aria-props",
    "a11y/useAriaPropsForRole",
  ],
  [
    "aria-* props supported by role",
    "jsx-a11y/role-supports-aria-props",
    "a11y/useAriaPropsSupportedByRole",
  ],
  ["scope only on th", "jsx-a11y/scope", "a11y/noHeaderScope"],
  [
    "no positive tabindex",
    "jsx-a11y/tabindex-no-positive",
    "a11y/noPositiveTabindex",
  ],
  ["button has type", "react/button-has-type", "a11y/useButtonType"],
  [
    "svg has an accessible name",
    "github/a11y-svg-has-accessible-name",
    "a11y/noSvgWithoutTitle",
  ],
].map(([concept, jsx, biome]) => ({ biome, concept, jsx }));
const conceptOfJsx = new Map(CONCEPTS.map((c) => [c.jsx, c.concept]));
const conceptOfBiome = new Map(CONCEPTS.map((c) => [c.biome, c.concept]));

// ── tools ──────────────────────────────────────────────────────────────
const versionOf = dc.versionOf;
const toolVersions = () => ({
  node: process.version,
  oxlint: versionOf("oxlint", ULTRACITE),
  eslint: versionOf("eslint", CLI),
  "eslint-plugin-jsx-a11y": versionOf("eslint-plugin-jsx-a11y", CLI),
  "eslint-plugin-react": versionOf("eslint-plugin-react", CLI),
  "eslint-plugin-react-doctor": versionOf("eslint-plugin-react-doctor", CLI),
  "oxlint-plugin-react-doctor": versionOf(
    "oxlint-plugin-react-doctor",
    ULTRACITE
  ),
  "eslint-plugin-github": versionOf("eslint-plugin-github", CLI),
  "eslint-plugin-sonarjs": versionOf("eslint-plugin-sonarjs", CLI),
  "eslint-plugin-astro": versionOf("eslint-plugin-astro", CLI),
  "eslint-plugin-svelte": versionOf("eslint-plugin-svelte", CLI),
  "eslint-plugin-vue": versionOf("eslint-plugin-vue", CLI),
  "@angular-eslint/eslint-plugin": versionOf(
    "@angular-eslint/eslint-plugin",
    CLI
  ),
  "@typescript-eslint/parser": versionOf("@typescript-eslint/parser", CLI),
  "@biomejs/biome": versionOf("@biomejs/biome", CLI),
  typescript: ts.version,
  react: versionOf("react", ULTRACITE),
  "react-dom": versionOf("react-dom", ULTRACITE),
});

// ── Oxlint ─────────────────────────────────────────────────────────────
// The root config `ultracite init` writes for a React project (packages/cli/src/linters/oxlint.ts):
// `env: core.env`, `extends` core and react (plus js-plugins, with its jsPlugins and settings
// re-declared on the root, when selected) and `ignorePatterns: core.ignorePatterns`. With
// `init: false` only `extends` is written, as rule-census.cjs does; use that for copies under out/,
// which core's ignorePatterns would skip. `extra` adds root keys (the component-mapping experiment
// adds `settings["jsx-a11y"]`).
const writeOxlintRoot = (
  name,
  presets,
  extra = {},
  { dir = OUT_DIR, init = true } = {}
) => {
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `oxlint.${name}${init ? "" : ".extends"}.config.mjs`);
  const url = (p) =>
    JSON.stringify(
      pathToFileURL(join(CLI, "config/oxlint", p, "index.mjs")).href
    );
  const ids = presets.map((_, i) => `preset${i}`);
  const lines = presets.map((p, i) => `import ${ids[i]} from ${url(p)};`);
  const hasJs = presets.includes("js-plugins");
  if (hasJs) {
    lines.push(`import { jsPluginSettings } from ${url("js-plugins")};`);
  }
  const core = ids[presets.indexOf("core")];
  const settings = extra.settings
    ? `{ ...${hasJs ? "jsPluginSettings" : "{}"}, ...${JSON.stringify(extra.settings)} }`
    : hasJs
      ? "jsPluginSettings"
      : null;
  const rest = { ...extra };
  delete rest.settings;
  const props = [
    init && core ? `env: ${core}.env` : null,
    `extends: [${ids.join(", ")}]`,
    init && core ? `ignorePatterns: ${core}.ignorePatterns` : null,
    hasJs ? `jsPlugins: ${ids[presets.indexOf("js-plugins")]}.jsPlugins` : null,
    settings ? `settings: ${settings}` : null,
    Object.keys(rest).length > 0 ? `...${JSON.stringify(rest)}` : null,
  ].filter(Boolean);
  lines.push(
    "",
    "// Generated by a11y-lib.cjs: Ultracite's presets, wired the way `ultracite init` does.",
    `export default { ${props.join(", ")} };`,
    ""
  );
  writeFileSync(file, lines.join("\n"));
  return file;
};
// Copies that a preset's ignore list would skip (it ignores **/out) go here.
const TMP_DIR = join(
  require("node:os").tmpdir(),
  "ultracite-research-accessibility"
);
const runOxlint = ({ cwd, files, configFile, keep = null, fix = null }) => {
  if (fix) {
    // --fix / --fix-dangerously: run once, ignore output.
    try {
      execFileSync(
        process.execPath,
        [
          dc.oxlintBin,
          "-c",
          configFile,
          "--disable-nested-config",
          fix,
          ...files,
        ],
        { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
      );
    } catch {
      // diagnostics left after fixing exit non-zero
    }
    return [];
  }
  return dc.runOxlint({ configFile, cwd, files, keep });
};

// ── ESLint ─────────────────────────────────────────────────────────────
// Ultracite's own preset modules (dead-code-lib.cjs drops the shared ignores block, which would
// skip `build/` and `out/`). `inline: true` honours the files' own disable comments (reported
// mode); the default ignores them (raw mode).
//
// A rule that throws aborts ESLint's whole run (eslint-plugin-jsx-a11y 6.10.2's
// prefer-tag-over-role throws on a `role` prop whose value is an object). So a chunk that throws
// is linted file by file, and a file that throws is linted again without the rule that threw; each
// crash is returned in `crashes` (the rows still include everything else on that file).
const runEslint = async ({
  cwd,
  files,
  presets = ["core", "react"],
  keep = isA11yRule,
  inline = false,
  extra = [],
  crashes = null,
}) => {
  const base = [
    ...(inline
      ? [
          {
            linterOptions: {
              noInlineConfig: false,
              reportUnusedDisableDirectives: "off",
            },
          },
        ]
      : []),
    ...extra,
  ];
  const lint = (fs, more = []) =>
    dc.runEslint({ cwd, extra: [...base, ...more], files: fs, keep, presets });
  const out = [];
  const CHUNK = 300;
  for (let i = 0; i < files.length; i += CHUNK) {
    const chunk = files.slice(i, i + CHUNK);
    try {
      out.push(...(await lint(chunk)));
      continue;
    } catch {
      // fall through to one file at a time
    }
    for (const file of chunk) {
      const off = [];
      for (;;) {
        try {
          out.push(
            ...(await lint(
              [file],
              off.length > 0
                ? [{ rules: Object.fromEntries(off.map((r) => [r, "off"])) }]
                : []
            ))
          );
          break;
        } catch (error) {
          const rule =
            error.ruleId ?? /Rule: "([^"]+)"/.exec(String(error.message))?.[1];
          if (!rule || off.includes(rule)) {
            throw error;
          }
          off.push(rule);
          crashes?.push({
            error: String(error.message).split("\n")[0].slice(0, 200),
            file,
            line:
              Number(
                /:(\d+)\s*$/m.exec(
                  String(error.message).split("\n")[1] ?? ""
                )?.[1] ?? 0
              ) || null,
            rule,
          });
        }
      }
    }
  }
  return out;
};

// `eslint --fix` with the same config, writing the fixes in place (run it on copies).
const eslintFix = async ({
  cwd,
  files,
  presets = ["core", "react"],
  extra = [],
}) => {
  const { ESLint } = require(require.resolve("eslint", { paths: [CLI] }));
  const blocks = await dc.eslintBlocks({ presets });
  const instance = new ESLint({
    cwd,
    errorOnUnmatchedPattern: false,
    fix: true,
    ignore: false,
    overrideConfig: [
      ...blocks,
      {
        linterOptions: {
          noInlineConfig: true,
          reportUnusedDisableDirectives: "off",
        },
      },
      ...extra,
    ],
    overrideConfigFile: true,
  });
  const results = await instance.lintFiles(files);
  await ESLint.outputFixes(results);
  return results.filter((r) => r.output !== undefined).length;
};

// ── Biome ──────────────────────────────────────────────────────────────
const BIOME_BASE = dc.BIOME_BASE;
const writeBiomeConfig = (name, body, dir = OUT_DIR) => {
  const configDir = join(dir, `biome-${name}`);
  mkdirSync(configDir, { recursive: true });
  writeFileSync(join(configDir, "biome.json"), JSON.stringify(body, null, 2));
  return configDir;
};
// Ultracite's presets as published, extended by absolute path.
const biomeUltracite = (presets = ["core"], dir = OUT_DIR, extra = {}) =>
  writeBiomeConfig(
    `ultracite-${presets.join("+")}`,
    {
      ...BIOME_BASE,
      extends: presets.map((p) => join(CLI, "config/biome", p, "biome.jsonc")),
      ...extra,
    },
    dir
  );
// Exactly the a11y rules Ultracite's Biome core preset sets, at its levels, and nothing else. For
// the corpus, whose copies live under out/ (which the preset's overrides disable).
const biomeCorePreset = () => {
  const { parse } = require(require.resolve("jsonc-parser", { paths: [CLI] }));
  return parse(
    readFileSync(join(CLI, "config/biome/core/biome.jsonc"), "utf8")
  );
};
const biomeA11yOnly = (dir = OUT_DIR) => {
  const a11y = biomeCorePreset().linter.rules.a11y;
  return writeBiomeConfig(
    "a11y-rules",
    {
      ...BIOME_BASE,
      linter: { enabled: true, rules: { a11y, recommended: false } },
    },
    dir
  );
};
// With `write` (extra args such as ["--write", "--unsafe"]) it runs `biome check` and returns
// { timedOut } instead of diagnostics: Biome 2.5.15's unsafe fixes can loop forever (see
// calibration/accessibility/biome-fix-loop.tsx), so writes take a timeout.
const runBiome = ({
  cwd,
  files,
  configDir,
  keep = null,
  write = null,
  timeout = 60_000,
}) => {
  const out = [];
  const CHUNK = 400;
  for (let i = 0; i < files.length; i += CHUNK) {
    let stdout;
    if (write) {
      const r = require("node:child_process").spawnSync(
        process.execPath,
        [
          dc.biomeBin,
          "check",
          `--config-path=${configDir}`,
          ...write,
          ...files.slice(i, i + CHUNK),
        ],
        { cwd, encoding: "utf8", maxBuffer: 1 << 29, timeout }
      );
      if (r.signal) {
        return { timedOut: true };
      }
      continue;
    }
    try {
      stdout = execFileSync(
        process.execPath,
        [
          dc.biomeBin,
          "lint",
          `--config-path=${configDir}`,
          "--reporter=json",
          "--max-diagnostics=none",
          ...files.slice(i, i + CHUNK),
        ],
        {
          cwd,
          encoding: "utf8",
          maxBuffer: 1 << 29,
          stdio: ["ignore", "pipe", "pipe"],
        }
      );
    } catch (error) {
      stdout = error.stdout;
    }
    const report = JSON.parse(stdout);
    for (const d of report.diagnostics ?? []) {
      const rule = (d.category ?? "").replace(/^lint\//, "");
      if (keep && !keep(rule)) {
        continue;
      }
      const path = d.location?.path;
      out.push({
        advices: d.advices ?? [],
        column: d.location?.start?.column,
        endLine: d.location?.end?.line ?? d.location?.start?.line,
        file: typeof path === "string" ? path : (path?.file ?? null),
        line: d.location?.start?.line,
        message: typeof d.message === "string" ? d.message : null,
        rule,
        severity: d.severity ?? null,
      });
    }
  }
  return write ? { timedOut: false } : out;
};
// The terminal reporter's notes ("i …" lines), which the JSON reporter leaves out.
const biomeConsoleNotes = ({ cwd, files, configDir }) => {
  let stdout;
  try {
    stdout = execFileSync(
      process.execPath,
      [
        dc.biomeBin,
        "lint",
        `--config-path=${configDir}`,
        "--colors=off",
        "--max-diagnostics=none",
        ...files,
      ],
      {
        cwd,
        encoding: "utf8",
        maxBuffer: 1 << 29,
        stdio: ["ignore", "pipe", "pipe"],
      }
    );
  } catch (error) {
    stdout = `${error.stdout ?? ""}${error.stderr ?? ""}`;
  }
  const out = [];
  for (const block of stdout.split(/\n(?=\S+:\d+:\d+ lint\/)/)) {
    const head = /^(\S+):(\d+):(\d+) lint\/(\S+)/.exec(block.trim());
    if (!head) {
      continue;
    }
    out.push({
      column: Number(head[3]),
      file: head[1],
      line: Number(head[2]),
      notes: [...block.matchAll(/^\s+[iℹ] (.+)$/gm)].map((m) => m[1].trim()),
      rule: head[4],
    });
  }
  return out;
};

// ── mirrors ────────────────────────────────────────────────────────────
// Same-length neutralisation of suppression directives, so positions don't move.
const ESLINT_DIRECTIVE = /\b(eslint|oxlint)-(disable|enable)/g;
const BIOME_DIRECTIVE = /\bbiome-ignore/g;
const neutralise = (text) =>
  text
    .replace(
      ESLINT_DIRECTIVE,
      (_, tool, verb) => `${"x".repeat(tool.length)}-${verb}`
    )
    .replace(BIOME_DIRECTIVE, "xxxxx-ignore");
const writeMirror = (name, files, root, transform = neutralise) => {
  rmSync(root, { force: true, recursive: true });
  const src = getRepo(name).root;
  for (const rel of files) {
    const dest = join(root, rel);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, transform(readFileSync(join(src, rel), "utf8"), rel));
  }
  return root;
};

// ── small helpers ──────────────────────────────────────────────────────
const readJson = (path, fallback = null) =>
  existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : fallback;
const writeJson = (path, value) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
};
const lineCount = (abs) => readFileSync(abs, "utf8").split("\n").length;
const permalink = (name, file, line, endLine) => {
  const meta = repoMeta(name);
  return dc.permalink(meta.github, PINNED[name], file, line, endLine);
};
const median = (xs) => {
  if (xs.length === 0) {
    return null;
  }
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
// Seeded PRNG (mulberry32), as the other samplers use.
const rng = (seed) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

module.exports = {
  ADDED,
  BIOME_BASE,
  CALIBRATION_DIR,
  CLI,
  CONCEPTS,
  EXAMPLES_DIR,
  HERE,
  ORIGINAL,
  OUT_DIR,
  PINNED,
  REPOS,
  REPO_KIND,
  RESULTS_DIR,
  SONAR_A11Y,
  TMP_DIR,
  TOPIC,
  ULTRACITE,
  arg,
  biomeA11yOnly,
  biomeConsoleNotes,
  biomeCorePreset,
  biomeUltracite,
  checkPinned,
  collect,
  conceptOfBiome,
  conceptOfJsx,
  config,
  dc,
  eslintFix,
  familyOf,
  flag,
  getRepo,
  isA11yRule,
  isBiomeA11y,
  isJsxFile,
  isReactDoctorA11y,
  jsxFiles,
  lineCount,
  median,
  neutralise,
  per10k: dc.per10k,
  pct: dc.pct,
  permalink,
  reactDoctorCategories,
  readJson,
  repoMeta,
  rng,
  runBiome,
  runEslint,
  runOxlint,
  selectedRepos,
  toolVersions,
  ts,
  writeBiomeConfig,
  writeJson,
  writeMirror,
  writeOxlintRoot,
};
