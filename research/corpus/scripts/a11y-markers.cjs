// Suppression comments that name accessibility rules, and each repo's own lint config lines for
// them. Read-only: scans the measured files of every repo (all source files, not only JSX), and the
// lint configs at each clone's root.
//
//   suppressions  every `eslint-disable[-next-line|-line]`, `oxlint-disable…` and `biome-ignore`
//                 comment that names an accessibility rule (a11y-lib.cjs), with its reason text (after
//                 `--`, or Biome's `: reason`), the code it covers, a permalink, and whether any linter
//                 reports that rule there in raw mode (out/accessibility/corpus/*.raw.json), i.e.
//                 whether the suppression is still needed by Ultracite's rules. Blanket disables
//                 (no rule list) in JSX files are counted separately.
//   configs       every line of each repo's root ESLint/Oxlint/Biome config (and Supabase's shared
//                 eslint-config-supabase) that names an accessibility rule or plugin
//
// Usage (from the repo root):
//   node research/corpus/scripts/a11y-markers.cjs
// Writes results/accessibility/markers.json.
"use strict";

const { existsSync, readFileSync } = require("node:fs");
const { join } = require("node:path");

const lib = require("./a11y-lib.cjs");

const { dc } = lib;

const COMMENT =
  /(?:\/\/|\/\*|\{\/\*)\s*(eslint-disable(?:-next-line|-line)?|oxlint-disable(?:-next-line|-line)?|eslint-enable|oxlint-enable)\b([^\n]*?)(?:\*\/\}?|$)/gm;
const BIOME =
  /\/\/\s*biome-ignore(?:-all|-start|-end)?\s+(lint\/[A-Za-z]+\/[A-Za-z]+|lint\/[A-Za-z]+|lint)(?:\(([^)]*)\))?\s*:?\s*([^\n]*)/gm;

const biomeIsA11y = (cat) => /^lint\/a11y\b/.test(cat);

const parseRuleList = (rest) => {
  // "rule1, rule2 -- reason"
  const [rules, ...reason] = rest.split(/\s--\s|\s--$/);
  const list = rules
    .split(",")
    .map((r) => r.trim().split(/\s+/)[0])
    .filter(Boolean);
  return { reason: reason.join(" -- ").trim() || null, rules: list };
};

const loadRaw = (name, tool) => {
  const f = join(lib.OUT_DIR, "corpus", `${name}.${tool}.raw.json`);
  return existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : [];
};

const scanRepo = (name) => {
  const { files, repo } = lib.collect(name);
  const raw = {
    biome: loadRaw(name, "biome"),
    eslint: loadRaw(name, "eslint"),
    oxlint: loadRaw(name, "oxlint"),
  };
  const firesAt = (file, lines, rules, tool) =>
    raw[tool].some(
      (d) =>
        d.file === file &&
        lines.includes(d.line) &&
        (rules.length === 0 ||
          rules.some(
            (r) =>
              dc.toOxlintName(r) === dc.toOxlintName(d.rule) ||
              `lint/${d.rule}` === r ||
              r === `lint/${d.rule.split("/")[0]}`
          ))
    );
  const out = [];
  let blanketInJsx = 0;
  const blanket = [];
  for (const rel of files) {
    const text = readFileSync(join(repo.root, rel), "utf8");
    const lines = text.split("\n");
    const lineOf = (index) => text.slice(0, index).split("\n").length;
    for (const m of text.matchAll(COMMENT)) {
      const kind = m[1];
      if (/enable$/.test(kind)) {
        continue;
      }
      const { reason, rules } = parseRuleList(m[2].trim());
      const line = lineOf(m.index);
      const a11yRules = rules.filter((r) => lib.isA11yRule(r));
      if (rules.length === 0 && lib.isJsxFile(rel)) {
        blanketInJsx++;
        blanket.push({
          file: rel,
          kind,
          line,
          text: m[0].trim().slice(0, 160),
        });
        continue;
      }
      if (a11yRules.length === 0) {
        continue;
      }
      const target = kind.endsWith("-next-line")
        ? [line + 1]
        : kind.endsWith("-line")
          ? [line]
          : Array.from({ length: lines.length - line + 1 }, (_, i) => line + i);
      // A JSX comment `{/* eslint-disable-next-line */}` covers the next line too.
      out.push({
        code: (lines[target[0] - 1] ?? "").trim().slice(0, 200),
        context: lines.slice(Math.max(0, line - 3), line + 4).join("\n"),
        file: rel,
        kind,
        line,
        permalink: lib.permalink(
          name,
          rel,
          line,
          target.length === 1 ? target[0] : line
        ),
        reason,
        rules: a11yRules,
        otherRules: rules.filter((r) => !lib.isA11yRule(r)),
        stillFires: {
          eslint: firesAt(rel, target.slice(0, 400), a11yRules, "eslint"),
          oxlint: firesAt(rel, target.slice(0, 400), a11yRules, "oxlint"),
        },
        text: m[0].trim().slice(0, 300),
        tool: kind.startsWith("oxlint") ? "oxlint" : "eslint",
      });
    }
    for (const m of text.matchAll(BIOME)) {
      const cat = m[1];
      const line = lineOf(m.index);
      if (!biomeIsA11y(cat) && cat !== "lint") {
        continue;
      }
      out.push({
        code: (lines[line] ?? "").trim().slice(0, 200),
        context: lines.slice(Math.max(0, line - 3), line + 4).join("\n"),
        file: rel,
        kind: "biome-ignore",
        line,
        permalink: lib.permalink(name, rel, line, line + 1),
        reason: m[3].trim() || null,
        rules: [cat],
        stillFires: { biome: firesAt(rel, [line + 1], [cat], "biome") },
        text: m[0].trim().slice(0, 300),
        tool: "biome",
      });
    }
  }
  return { blanket, blanketInJsx, suppressions: out };
};

// ── repo configs ───────────────────────────────────────────────────────
const CONFIGS = {
  excalidraw: [".eslintrc.json"],
  "next.js": ["eslint.config.mjs", "eslint.cli.config.mjs"],
  radix: [".oxlintrc.json"],
  "react-aria": [".oxlintrc.json"],
  shadcn: [".eslintrc.json"],
  supabase: [
    "apps/studio/eslint.config.cjs",
    "packages/eslint-config-supabase/next.js",
  ],
  trpc: ["eslint.config.js"],
};
const configLines = (name) => {
  const root = lib.getRepo(name).root;
  const out = [];
  for (const rel of CONFIGS[name] ?? []) {
    const abs = join(root, rel);
    if (!existsSync(abs)) {
      out.push({ file: rel, missing: true });
      continue;
    }
    readFileSync(abs, "utf8")
      .split("\n")
      .forEach((text, i) => {
        if (
          /a11y|jsx-a11y|accessib|react-app|core-web-vitals|next\/core|plugin:react|"extends"|extends:/i.test(
            text
          )
        ) {
          out.push({
            file: rel,
            line: i + 1,
            permalink: lib.permalink(name, rel, i + 1),
            text: text.trim().slice(0, 200),
          });
        }
      });
  }
  return out;
};

const main = () => {
  lib.checkPinned();
  const repos = {};
  for (const name of lib.REPOS) {
    const { blanket, blanketInJsx, suppressions } = scanRepo(name);
    repos[name] = {
      blanketDisablesInJsx: blanketInJsx,
      blanketSample: blanket.slice(0, 20),
      configLines: configLines(name),
      suppressions,
    };
    const byRule = {};
    for (const s of suppressions) {
      for (const r of s.rules) {
        byRule[r] = (byRule[r] ?? 0) + 1;
      }
    }
    repos[name].byRule = byRule;
    console.log(
      `${name}: ${suppressions.length} a11y suppressions, ${blanketInJsx} blanket disables in JSX files`
    );
  }
  const all = Object.values(repos).flatMap((r) => r.suppressions);
  lib.writeJson(join(lib.RESULTS_DIR, "markers.json"), {
    generated: new Date().toISOString().slice(0, 10),
    note: "Suppression comments naming an accessibility rule, in every measured file (all extensions). `stillFires` checks the raw-mode rows (disable comments neutralised) for that rule on the covered lines: Oxlint (core + react + js-plugins census), ESLint (core + react, a11y rules), Biome (a11y rules).",
    repos,
    totals: {
      blanketInJsx: Object.values(repos).reduce(
        (s, r) => s + r.blanketDisablesInJsx,
        0
      ),
      suppressions: all.length,
      withReason: all.filter((s) => s.reason).length,
    },
  });
};

main();
