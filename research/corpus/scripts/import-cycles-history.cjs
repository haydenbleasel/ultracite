// For each confirmed historical bug in results/import-cycles/history.json, downloads the files
// that formed the cycle at the fix's parent commit (`gh api`, falling back to
// raw.githubusercontent.com) and lints them as Ultracite configures each linter:
//   Oxlint  the root config `ultracite init` writes (core + react), import/no-cycle
//   ESLint  core preset, import-x/no-cycle, in a fresh process started in the download directory
//           (import-x's result depends on process state; see import-cycles-linters.cjs)
//   Biome   core + type-aware (noImportCycles), from a temp copy with biome.json at its root
// Only the cycle's files (and any tsconfig the cycle's path aliases need) are downloaded, so the
// question each run answers is "does the rule see this cycle?", not "what else does it report".
// Cycles through virtual modules (code generated at build time) have no files to lint.
//
// Usage (from the repo root; needs gh or network access to raw.githubusercontent.com):
//   node research/corpus/scripts/import-cycles-history.cjs
// Writes results/import-cycles/history-lint.json; downloads go to out/import-cycles/history/.
"use strict";

const { execFileSync } = require("node:child_process");
const {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} = require("node:fs");
const { dirname, join } = require("node:path");

const ic = require("./import-cycles-lib.cjs");

const download = (repo, sha, path, dest) => {
  if (existsSync(dest)) {
    return "cached";
  }
  mkdirSync(dirname(dest), { recursive: true });
  try {
    const b64 = execFileSync(
      "gh",
      ["api", `repos/${repo}/contents/${path}?ref=${sha}`, "--jq", ".content"],
      {
        encoding: "utf8",
        maxBuffer: 1 << 26,
        stdio: ["ignore", "pipe", "pipe"],
      }
    );
    writeFileSync(dest, Buffer.from(b64.replace(/\s+/g, ""), "base64"));
    return "gh";
  } catch {
    try {
      const text = execFileSync(
        "curl",
        ["-fsSL", `https://raw.githubusercontent.com/${repo}/${sha}/${path}`],
        {
          encoding: "utf8",
          maxBuffer: 1 << 26,
        }
      );
      writeFileSync(dest, text);
      return "raw";
    } catch {
      return "missing";
    }
  }
};

const eslintChild = async (dir, files) => {
  const rows = await ic.runEslint({
    cwd: dir,
    files,
    keep: (r) => r === "import-x/no-cycle",
    presets: ["core"],
  });
  process.stdout.write(
    JSON.stringify(rows.filter((r) => r.rule === "import-x/no-cycle"))
  );
};

const main = async () => {
  if (ic.flag("eslint-dir")) {
    await eslintChild(ic.arg("eslint-dir"), ic.arg("files").split(","));
    return;
  }
  const history = ic.readJson(join(ic.RESULTS_DIR, "history.json"));
  const config = ic.oxlintConfig(["core", "react"]);
  const out = [];
  for (const bug of history.bugs) {
    const dir = join(ic.OUT_DIR, "history", bug.id);
    const fetched = {};
    for (const path of bug.files ?? []) {
      fetched[path] = download(
        bug.repo,
        bug.parentCommit,
        path,
        join(dir, path)
      );
    }
    const code = (bug.files ?? []).filter(
      (f) => /\.(?:[cm]?[jt]sx?)$/.test(f) && fetched[f] !== "missing"
    );
    const cycleFiles = new Set(bug.cycle ?? []);
    const virtual = (bug.cycle ?? []).some(
      (f) => /^virtual:|astro:/.test(f) || f.endsWith(".astro")
    );
    const row = {
      fetched,
      id: bug.id,
      kind: bug.kind,
      topLevelUse: bug.topLevelUse ?? null,
      virtual,
    };
    if (code.length === 0) {
      row.note = "no lintable files";
      out.push(row);
      continue;
    }
    const ox = ic.runOxlintFull({
      configFile: config,
      cwd: dir,
      files: code,
      keep: (r) => r === "import/no-cycle",
    });
    row.oxlint = ox.diagnostics.map((d) => ({
      file: d.file,
      line: d.line,
      path: ic.parseCycleNote(d.note),
    }));
    row.eslint = JSON.parse(
      execFileSync(
        process.execPath,
        [__filename, "--eslint-dir", dir, "--files", code.join(",")],
        {
          cwd: dir,
          encoding: "utf8",
          maxBuffer: 1 << 26,
          stdio: ["ignore", "pipe", "ignore"],
        }
      )
    ).map((d) => ({ file: d.file, line: d.line, message: d.message }));
    const tmp = join(ic.BIOME_TMP, "history", bug.id);
    rmSync(tmp, { force: true, recursive: true });
    cpSync(dir, tmp, { recursive: true });
    row.biome = ic
      .runBiomeProject({
        dir: tmp,
        files: code,
        keep: (r) => r.endsWith("noImportCycles"),
        mode: "ultracite",
      })
      .diagnostics.map((d) => ({ file: d.file, line: d.line }));
    const flagged = (rows) => rows.some((d) => cycleFiles.has(d.file));
    row.flagged = {
      biome: flagged(row.biome),
      eslint: flagged(row.eslint),
      oxlint: flagged(row.oxlint),
    };
    out.push(row);
    console.log(
      `${bug.id}: oxlint ${row.oxlint.length} eslint ${row.eslint.length} biome ${row.biome.length} flagged ${JSON.stringify(row.flagged)}${virtual ? " (virtual modules)" : ""}`
    );
  }
  ic.writeJson(join(ic.RESULTS_DIR, "history-lint.json"), {
    generated: new Date().toISOString().slice(0, 10),
    note: "Files of each bug's cycle at the fix's parent commit, linted with Ultracite's presets. 'flagged' means the cycle rule reports at least one of the cycle's files.",
    bugs: out,
    tools: ic.toolVersions(),
  });
  void readFileSync;
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
