// For each confirmed accessibility fix in results/accessibility/history.json, downloads the changed
// files at the fix's parent commit (`gh api …/contents?ref=`, falling back to
// raw.githubusercontent.com) and lints them with Ultracite's three linters, recording every
// accessibility rule that fires on the barrier's lines (and anywhere in the file).
//
//   Oxlint  the root config `ultracite init` writes (core + react), and with js-plugins
//   ESLint  core + react (jsx-a11y runs on .tsx/.jsx only, as the preset scopes it)
//   Biome   core (its a11y group)
//
// Copies are linted under the system temp directory, because the presets ignore **/out. The hand
// verdicts (does a rule on those lines point at the barrier that was fixed?) are in
// results/accessibility/history-verdicts.json, a hand input.
//
// Usage (from the repo root; needs gh, read-only):
//   node --max-old-space-size=8192 research/corpus/scripts/a11y-history.cjs [--refetch]
// Writes results/accessibility/history-lint.json; downloads go to out/accessibility/history/.
"use strict";

const { execFileSync } = require("node:child_process");
const {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} = require("node:fs");
const { dirname, extname, join } = require("node:path");

const lib = require("./a11y-lib.cjs");

const CACHE = join(lib.OUT_DIR, "history");
const LINT_DIR = join(lib.TMP_DIR, "history");

const fetchFile = (repo, sha, path) => {
  const dest = join(CACHE, repo.replace("/", "__"), sha, path);
  if (existsSync(dest) && !lib.flag("refetch")) {
    return dest;
  }
  mkdirSync(dirname(dest), { recursive: true });
  let text = null;
  try {
    text = execFileSync(
      "gh",
      [
        "api",
        `repos/${repo}/contents/${encodeURI(path)}?ref=${sha}`,
        "-H",
        "Accept: application/vnd.github.raw",
      ],
      {
        encoding: "utf8",
        maxBuffer: 1 << 26,
        stdio: ["ignore", "pipe", "pipe"],
      }
    );
  } catch {
    try {
      text = execFileSync(
        "curl",
        ["-fsSL", `https://raw.githubusercontent.com/${repo}/${sha}/${path}`],
        {
          encoding: "utf8",
          maxBuffer: 1 << 26,
        }
      );
    } catch {
      return null;
    }
  }
  writeFileSync(dest, text);
  return dest;
};

const isLintable = (path) => /\.(?:tsx|jsx|ts|js|mjs|cjs)$/.test(path);

const main = async () => {
  const history = lib.readJson(join(lib.RESULTS_DIR, "history.json"));
  const verdicts = lib.readJson(
    join(lib.RESULTS_DIR, "history-verdicts.json"),
    { verdicts: {} }
  );
  const cfg = {
    // Configs stay inside the repo so the js-plugins specifiers resolve from root node_modules.
    core: lib.writeOxlintRoot("history-core+react", ["core", "react"]),
    js: lib.writeOxlintRoot("history-core+react+js-plugins", [
      "core",
      "react",
      "js-plugins",
    ]),
  };
  const biomeDir = lib.biomeUltracite(["core"], lib.TMP_DIR);
  const out = [];
  for (const fix of history.confirmed) {
    const entry = {
      barrierKind: fix.barrierKind,
      date: fix.date,
      files: [],
      fixKind: fix.fixKind,
      fixUrl: fix.fixUrl,
      id: fix.id,
      parentSha: fix.parentSha,
      repo: fix.corpusRepo,
      staticallyVisible: fix.staticallyVisible,
      title: fix.title,
      verdict: verdicts.verdicts[fix.id] ?? null,
    };
    for (const f of fix.files) {
      const src = fetchFile(fix.repo, fix.parentSha, f.path);
      const row = { lines: f.lines, path: f.path };
      if (!src) {
        row.error = "download failed";
        entry.files.push(row);
        continue;
      }
      const text = readFileSync(src, "utf8").split("\n");
      row.excerptMatches = f.code
        ? text
            .slice(f.lines[0] - 1, f.lines[1])
            .join("\n")
            .includes(f.code.split("\n")[0].trim())
        : null;
      if (!isLintable(f.path)) {
        row.linted = false;
        row.note = `not a script file (${extname(f.path)}): no JSX rule can read it`;
        entry.files.push(row);
        continue;
      }
      // Lint a copy under a neutral name in its own directory (keeps the extension).
      const dir = join(LINT_DIR, fix.id.replaceAll(/[^\w]+/g, "_"));
      rmSync(dir, { force: true, recursive: true });
      mkdirSync(dir, { recursive: true });
      const name = `file${extname(f.path)}`;
      copyFileSync(src, join(dir, name));
      // Raw: the same file with disable comments neutralised (Oxlint honours eslint-disable
      // comments; ESLint here runs with noInlineConfig; Biome ignores both).
      mkdirSync(join(dir, "raw"), { recursive: true });
      writeFileSync(
        join(dir, "raw", name),
        lib.neutralise(readFileSync(src, "utf8"))
      );
      const [first, last] = f.lines;
      const onLines = (rows) =>
        rows
          .filter((d) => d.line >= first && d.line <= last)
          .map((d) => ({ line: d.line, message: d.message, rule: d.rule }));
      const a11y = (rows, biome = false) =>
        rows.filter((d) =>
          biome ? lib.isBiomeA11y(d.rule) : lib.isA11yRule(d.rule)
        );
      const oxlintReported = a11y(
        lib.runOxlint({ configFile: cfg.core, cwd: dir, files: [name] })
      );
      const oxlint = a11y(
        lib.runOxlint({
          configFile: cfg.core,
          cwd: join(dir, "raw"),
          files: [name],
        })
      );
      const oxlintJs = a11y(
        lib.runOxlint({
          configFile: cfg.js,
          cwd: join(dir, "raw"),
          files: [name],
        })
      );
      const crashes = [];
      const eslint = a11y(
        await lib.runEslint({ crashes, cwd: dir, files: [name] })
      );
      const biome = a11y(
        lib.runBiome({ configDir: biomeDir, cwd: dir, files: [name] }),
        true
      );
      row.linted = true;
      row.onBarrierLines = {
        biome: onLines(biome),
        eslint: onLines(eslint),
        oxlint: onLines(oxlint),
        "oxlint +js-plugins": onLines(oxlintJs).filter(
          (d) => !oxlint.some((o) => o.line === d.line && o.rule === d.rule)
        ),
      };
      const suppressed = onLines(oxlint).filter(
        (d) =>
          !onLines(oxlintReported).some(
            (r) => r.line === d.line && r.rule === d.rule
          )
      );
      if (suppressed.length > 0) {
        row.suppressedInFile = suppressed;
      }
      row.inFile = {
        biome: biome.length,
        eslint: eslint.length,
        oxlint: oxlint.length,
        "oxlint +js-plugins": oxlintJs.length,
      };
      if (crashes.length > 0) {
        row.eslintCrashes = crashes;
      }
      entry.files.push(row);
    }
    entry.anyRuleOnBarrierLines = entry.files.some(
      (r) =>
        r.onBarrierLines &&
        Object.values(r.onBarrierLines).some((x) => x.length > 0)
    );
    out.push(entry);
    console.log(
      `${fix.id}: ${entry.files
        .map((r) =>
          r.onBarrierLines
            ? Object.entries(r.onBarrierLines)
                .map(
                  ([k, v]) =>
                    `${k} ${[...new Set(v.map((d) => d.rule))].join("+") || "-"}`
                )
                .join("; ")
            : (r.error ?? r.note)
        )
        .join(" | ")}`
    );
  }
  lib.writeJson(join(lib.RESULTS_DIR, "history-lint.json"), {
    fixes: out,
    generated: new Date().toISOString().slice(0, 10),
    note: "Rules on the barrier's lines (at the parent commit) per linter. `verdict` is the hand judgement from history-verdicts.json: whether a rule that fires points at the barrier that was fixed.",
    totals: {
      anyRuleOnBarrierLines: out.filter((e) => e.anyRuleOnBarrierLines).length,
      fixes: out.length,
    },
  });
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
