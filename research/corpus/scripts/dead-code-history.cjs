// Verifies the history search (results/dead-code/history.json): for every confirmed bug, downloads
// the buggy files at the fix's parent commit with `gh api` and lints them as Ultracite would, then
// records which rules fire on the buggy lines.
//
// Configurations: Oxlint core + react, the same + js-plugins (sonarjs), ESLint core (untyped),
// Biome (Ultracite's core preset) and `tsc` with noUnusedLocals/noUnusedParameters (one file at a
// time, a strict default tsconfig; imports don't resolve, which the unused checks don't need).
// For inconsistent-clone bugs it also compares the two copies (Type-1/Type-2 tokens) and records
// whether sonarjs/no-identical-functions or no-duplicated-branches fires anywhere in the file.
//
// Downloaded files are data: they're parsed and linted, never executed.
//
// Usage (from the repo root):
//   node --max-old-space-size=8192 research/corpus/scripts/dead-code-history.cjs [--refetch]
// Writes results/dead-code/history-lint.json; files go to out/dead-code/history/<id>/.
"use strict";

const { execFileSync } = require("node:child_process");
const {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} = require("node:fs");
const { dirname, join } = require("node:path");

const lib = require("./dead-code-lib.cjs");
const { dirs } = require("./tools.cjs");

const te = require(
  require.resolve("@typescript-eslint/typescript-estree", {
    paths: [dirs.tsParser],
  })
);

const HIST_DIR = join(lib.OUT_DIR, "history");
const TSCONFIG = {
  compilerOptions: {
    jsx: "preserve",
    lib: ["ES2023", "DOM"],
    module: "ESNext",
    moduleResolution: "Bundler",
    noEmit: true,
    skipLibCheck: true,
    strict: true,
    target: "ES2023",
    types: [],
  },
};

const fetchFile = (slug, path, ref, dest) => {
  if (existsSync(dest) && !lib.flag("refetch")) {
    return true;
  }
  try {
    const text = execFileSync(
      "gh",
      [
        "api",
        "-H",
        "Accept: application/vnd.github.raw",
        `repos/${slug}/contents/${path}?ref=${ref}`,
      ],
      {
        encoding: "utf8",
        maxBuffer: 1 << 27,
        stdio: ["ignore", "pipe", "pipe"],
      }
    );
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, text);
    return true;
  } catch (error) {
    // The REST API shares a rate limit with every other gh call; raw.githubusercontent.com serves
    // the same blob at the same commit without it.
    try {
      const text = execFileSync(
        "curl",
        ["-sfL", `https://raw.githubusercontent.com/${slug}/${ref}/${path}`],
        {
          encoding: "utf8",
          maxBuffer: 1 << 27,
          stdio: ["ignore", "pipe", "pipe"],
        }
      );
      mkdirSync(dirname(dest), { recursive: true });
      writeFileSync(dest, text);
      return true;
    } catch {
      return String(error.stderr ?? error.message).slice(0, 200);
    }
  }
};

const tokens = (text, file, from, to) => {
  const ast = te.parse(text, {
    jsx: /\.(?:tsx|jsx|js)$/.test(file),
    loc: true,
    range: true,
    tokens: true,
  });
  return ast.tokens.filter(
    (t) => t.loc.start.line >= from && t.loc.end.line <= to
  );
};
const norm = (t) =>
  ["Identifier", "JSXIdentifier", "PrivateIdentifier"].includes(t.type)
    ? "ID"
    : [
          "String",
          "Numeric",
          "RegularExpression",
          "Template",
          "JSXText",
        ].includes(t.type)
      ? "LIT"
      : t.value;

const main = async () => {
  const history = JSON.parse(
    readFileSync(join(lib.RESULTS_DIR, "history.json"), "utf8")
  );
  const rows = [];
  for (const bug of history.confirmed ?? []) {
    const id = bug.id.replace(/[^\w.-]+/g, "_");
    const dir = join(HIST_DIR, id);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "tsconfig.json"), JSON.stringify(TSCONFIG));
    const files = [];
    for (const f of bug.files ?? []) {
      // keep the file name, flatten the path
      const local = f.path.split("/").join("__");
      const status = fetchFile(
        bug.repo,
        f.path,
        bug.parentSha,
        join(dir, local)
      );
      files.push({
        ...f,
        fetched: status === true,
        fetchError: status === true ? null : status,
        local,
      });
    }
    const ok = files.filter(
      (f) => f.fetched && /\.(?:[cm]?[jt]sx?)$/.test(f.local)
    );
    const locals = [...new Set(ok.map((f) => f.local))];
    const runs = {};
    if (locals.length > 0) {
      runs.oxlint = lib.runOxlint({
        cwd: dir,
        files: locals,
        presets: ["core", "react"],
      });
      runs["oxlint +js-plugins"] = lib.runOxlint({
        cwd: dir,
        files: locals,
        presets: ["core", "react", "js-plugins"],
      });
      runs.eslint = await lib.runEslint({
        cwd: dir,
        files: locals,
        presets: ["core", "react"],
      });
      // Ultracite's Biome preset ignores `**/out` (build output), and these downloads live under
      // out/, so Biome lints a copy in the system temp directory.
      {
        const { cpSync, mkdtempSync, rmSync } = require("node:fs");
        const { tmpdir } = require("node:os");
        const tmp = mkdtempSync(join(tmpdir(), "dead-code-history-"));
        for (const f of locals) {
          cpSync(join(dir, f), join(tmp, f));
        }
        runs.biome = lib.runBiome({
          cwd: tmp,
          files: locals,
          mode: "ultracite",
          presets: ["core", "react"],
        });
        rmSync(tmp, { force: true, recursive: true });
      }
      runs.tsc = lib.runTsc({
        dir,
        files: locals.filter((f) => /\.(?:[cm]?tsx?)$/.test(f)),
      });
    }
    const onLines = {};
    const otherOnLines = {};
    for (const f of ok) {
      const [from, to] = f.lines ?? [1, 1e9];
      for (const [tool, diags] of Object.entries(runs)) {
        const hits = diags.filter(
          (d) => d.file === f.local && d.line >= from && d.line <= to
        );
        otherOnLines[tool] ??= [];
        for (const d of hits) {
          if (!otherOnLines[tool].includes(d.rule)) {
            otherOnLines[tool].push(d.rule);
          }
        }
        const dead = hits.filter((d) =>
          tool === "biome"
            ? lib.biomeCategoryOf(d.rule)
            : tool === "tsc"
              ? d.unused
              : lib.categoryOf(lib.toOxlintName(d.rule))
        );
        onLines[tool] ??= [];
        onLines[tool].push(
          ...dead.map((d) => ({
            file: f.path,
            line: d.line,
            message: d.message,
            rule: d.rule,
          }))
        );
      }
    }
    // clone comparison for inconsistent-clone bugs
    let clone = null;
    if (bug.kind === "inconsistent-clone") {
      const sonar = Object.fromEntries(
        Object.entries(runs).map(([tool, diags]) => [
          tool,
          diags
            .filter((d) =>
              /no-identical-functions|no-duplicated-branches|no-all-duplicated-branches|no-duplicate-if-branches/.test(
                d.rule
              )
            )
            .map((d) => `${d.file}:${d.line} ${d.rule}`),
        ])
      );
      clone = { rulesAnywhereInFiles: sonar };
      if (ok.length >= 2 || (ok.length === 1 && bug.files.length >= 2)) {
        try {
          const [a, b] = bug.files.slice(0, 2).map((f) => {
            const local = f.path.split("/").join("__");
            const text = readFileSync(join(dir, local), "utf8");
            return tokens(text, local, f.lines[0], f.lines[1]);
          });
          clone.type1 =
            a.map((t) => t.value).join(" ") === b.map((t) => t.value).join(" ");
          clone.type2 = a.map(norm).join(" ") === b.map(norm).join(" ");
          clone.tokens = [a.length, b.length];
          clone.sameFile = bug.files[0].path === bug.files[1].path;
        } catch (error) {
          clone.error = String(error.message).slice(0, 160);
        }
      }
    }
    const flaggedBy = Object.fromEntries(
      Object.entries(onLines).map(([tool, hits]) => [
        tool,
        [...new Set(hits.map((h) => h.rule))].sort(),
      ])
    );
    for (const list of Object.values(otherOnLines)) {
      list.sort();
    }
    rows.push({
      allRulesOnLines: otherOnLines,
      clone,
      expectedRules: bug.expectedRules ?? null,
      files: files.map(({ local, ...f }) => f),
      fixUrl: bug.fixUrl,
      flaggedBy,
      hits: onLines,
      id: bug.id,
      kind: bug.kind,
      parentSha: bug.parentSha,
      repo: bug.repo,
    });
    console.log(
      `${bug.id} [${bug.kind}] ${JSON.stringify(flaggedBy)}${clone ? ` clone ${JSON.stringify({ t1: clone.type1, t2: clone.type2, sameFile: clone.sameFile, rules: clone.rulesAnywhereInFiles?.["oxlint +js-plugins"]?.length })}` : ""}`
    );
  }
  writeFileSync(
    join(lib.RESULTS_DIR, "history-lint.json"),
    `${JSON.stringify({ generated: new Date().toISOString().slice(0, 10), note: "Each confirmed bug's files at its parent commit, linted with Ultracite's presets; flaggedBy lists the dead-code/duplication rules (and tsc unused diagnostics) that fire on the buggy lines.", rows, tools: lib.toolVersions() }, null, 2)}\n`
  );
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
