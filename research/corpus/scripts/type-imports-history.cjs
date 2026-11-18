// History of type-only imports in the eight corpus repos (the TODO post's history clones; only
// `git log` and `git show`, with GIT_NO_LAZY_FETCH=1 so a missing blob is never fetched).
//
//   --churn     every mainline commit (--first-parent) that changes a measured source file (the
//               layouts in length-history.cjs SCOPES), over all the history the clone has and in the
//               three-year window before the pinned commit: import lines converted to `import
//               type` (a removed `import {…}` / `import X` and an added `import type …` of the same
//               specifier in the same file, or a multi-line `import {` that became `import type {`),
//               converted back, inline `type` written as top-level and back, and imports added already
//               typed. Commits with 20+ conversions or 10+ converted files are mass conversions.
//   --adoption  each change to a tsconfig flag (verbatimModuleSyntax, isolatedModules,
//               importsNotUsedAsValues, preserveValueImports, emitDecoratorMetadata) and to a lint
//               config line naming one of the type-import rules (`git log -S` over the repo's own
//               config files), with the commit's message verbatim and the conversions in that commit
//               and in the 30 days after it
//   --keywords  commits whose message mentions type-only imports, elision, these rules and flags, or
//               the runtime errors they cause ("does not provide an export named", decorator
//               metadata, "before initialization"), with each commit's files and its import
//               conversions, as a worksheet for the hand reading in history-labels.json
//
// Usage: node research/corpus/scripts/type-imports-history.cjs --churn --adoption --keywords [--repos zod]
// Writes results/type-imports/history.json and out/type-imports/history-worksheet.md.
"use strict";

const { spawn } = require("node:child_process");
const { existsSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");
const { createInterface } = require("node:readline");

const lib = require("./type-imports-lib.cjs");
const lh = require("./length-history.cjs");

const CORE = [
  "zod",
  "hono",
  "trpc",
  "vite",
  "astro",
  "excalidraw",
  "next.js",
  "vscode",
];
const env = { ...process.env, GIT_NO_LAZY_FETCH: "1" };
const gitDir = (name) => join(lib.HISTORY_DIR, `${name}.git`);
const git = (name, argv) =>
  lib.spawnSync(
    "git",
    ["-C", gitDir(name), "-c", "core.quotePath=false", ...argv],
    {
      encoding: "utf8",
      env,
      maxBuffer: 1 << 30,
    }
  );
const KEYWORDS =
  /import type|type[- ]only|type imports?\b|\belid|elision|verbatimModuleSyntax|importsNotUsedAsValues|preserveValueImports|isolatedModules|consistent-type-imports|consistent-type-exports|no-import-type-side-effects|useImportType|useExportType|emitDecoratorMetadata|decorator metadata|paramtypes|does not provide an export|side[- ]effect import|before initiali[sz]ation|export type/i;
const MASS = { conversions: 20, files: 10 };
// Next.js (32,000 mainline commits) and VS Code (84,000) are read over the three-year window only;
// the others over all the history their clones have.
const WINDOW_ONLY = new Set(["next.js", "vscode"]);

// Import lines of one diff side: { spec, typed, inline, line }.
const IMPORT_LINE = /^import\s+(type\s+)?(.*?)\s*from\s*["']([^"']+)["']/;
const parseImportLine = (l) => {
  const m = IMPORT_LINE.exec(l.trim());
  if (!m) {
    return null;
  }
  return {
    inline: /\{[^}]*\btype\s+[A-Za-z_$]/.test(m[2]),
    spec: m[3],
    typed: Boolean(m[1]),
  };
};

// One pass over `git log -p -U0` for a repo: per commit, per file, the conversions.
const churn = (name) =>
  new Promise((resolveChurn, reject) => {
    const sha = lib.PINNED[name];
    const pinnedTime = Number(
      git(name, ["log", "-1", "--format=%ct", sha]).stdout.trim()
    );
    const since = pinnedTime - lh.WINDOW_DAYS * 86_400;
    const child = spawn(
      "git",
      [
        "-C",
        gitDir(name),
        "-c",
        "core.quotePath=false",
        "log",
        sha,
        "--first-parent",
        "--diff-merges=first-parent",
        "-p",
        "-U0",
        "--no-renames",
        "--no-color",
        "--no-ext-diff",
        "--format=@@@COMMIT %H %ct %s",
        ...(WINDOW_ONLY.has(name) ? [`--since=${since}`] : []),
        "--",
        ...lh.SCOPES[name],
      ],
      { env }
    );
    const commits = [];
    let commit = null;
    let file = null;
    let stderr = "";
    child.stderr.on("data", (d) => {
      stderr += d;
    });
    const finishFile = () => {
      if (!commit || !file) {
        return;
      }
      const removed = file.removed;
      const added = file.added;
      const c = commit.counts;
      // conversions: same specifier, removed untyped, added typed
      const remBySpec = new Map();
      for (const r of removed) {
        if (r.parsed) {
          remBySpec.set(r.parsed.spec, [
            ...(remBySpec.get(r.parsed.spec) ?? []),
            r.parsed,
          ]);
        }
      }
      let conv = 0;
      for (const a of added) {
        if (!a.parsed) {
          continue;
        }
        const before = remBySpec.get(a.parsed.spec) ?? [];
        if (a.parsed.typed && before.some((b) => !b.typed && !b.inline)) {
          conv += 1;
          c.toTypeImport += 1;
        } else if (a.parsed.typed && before.some((b) => b.inline && !b.typed)) {
          c.inlineToTopLevel += 1;
        } else if (
          !a.parsed.typed &&
          a.parsed.inline &&
          before.some((b) => b.typed)
        ) {
          c.topLevelToInline += 1;
        } else if (
          !a.parsed.typed &&
          before.some((b) => b.typed) &&
          !a.parsed.inline
        ) {
          c.fromTypeImport += 1;
        } else if (
          a.parsed.inline &&
          before.some((b) => !b.typed && !b.inline)
        ) {
          conv += 1;
          c.inlineAdded += 1;
        } else if (before.length === 0 && (a.parsed.typed || a.parsed.inline)) {
          c.newTypedImports += 1;
        }
      }
      // multi-line imports: only the head line changes
      const remHeads = removed.filter((r) =>
        /^import\s*\{\s*$/.test(r.text.trim())
      ).length;
      const addTypedHeads = added.filter((r) =>
        /^import\s+type\s*\{\s*$/.test(r.text.trim())
      ).length;
      const multi = Math.min(remHeads, addTypedHeads);
      conv += multi;
      c.toTypeImport += multi;
      if (conv) {
        commit.files.push({ conversions: conv, file: file.path });
      }
      file = null;
    };
    const finishCommit = () => {
      finishFile();
      if (commit) {
        commit.conversions = commit.files.reduce(
          (s, f) => s + f.conversions,
          0
        );
        commits.push(commit);
      }
    };
    const rl = createInterface({ input: child.stdout });
    rl.on("line", (line) => {
      if (line.startsWith("@@@COMMIT ")) {
        finishCommit();
        const [, h, t, ...rest] = line.split(" ");
        commit = {
          counts: {
            fromTypeImport: 0,
            inlineAdded: 0,
            inlineToTopLevel: 0,
            newTypedImports: 0,
            toTypeImport: 0,
            topLevelToInline: 0,
          },
          files: [],
          sha: h,
          subject: rest.join(" "),
          time: Number(t),
          window: Number(t) >= since,
        };
        return;
      }
      if (line.startsWith("diff --git ")) {
        finishFile();
        const m = / b\/(.*)$/.exec(line);
        file = { added: [], path: m?.[1] ?? null, removed: [] };
        return;
      }
      if (!file || line.startsWith("+++") || line.startsWith("---")) {
        return;
      }
      if (line.startsWith("+") || line.startsWith("-")) {
        const text = line.slice(1);
        if (!/^\s*import\b/.test(text)) {
          return;
        }
        const row = { parsed: parseImportLine(text), text };
        (line.startsWith("+") ? file.added : file.removed).push(row);
      }
    });
    rl.on("close", () => {
      finishCommit();
      child.on("close", (code) => {
        if (code !== 0) {
          reject(
            new Error(`git log failed for ${name}: ${stderr.slice(0, 300)}`)
          );
          return;
        }
        resolveChurn({ commits, pinnedTime, since });
      });
    });
  });

const summarise = (commits) => {
  const sum = (k) => commits.reduce((s, c) => s + c.counts[k], 0);
  const mass = commits.filter(
    (c) => c.conversions >= MASS.conversions || c.files.length >= MASS.files
  );
  return {
    commits: commits.length,
    commitsWithConversions: commits.filter((c) => c.conversions > 0).length,
    conversions: commits.reduce((s, c) => s + c.conversions, 0),
    counts: {
      fromTypeImport: sum("fromTypeImport"),
      inlineAdded: sum("inlineAdded"),
      inlineToTopLevel: sum("inlineToTopLevel"),
      newTypedImports: sum("newTypedImports"),
      toTypeImport: sum("toTypeImport"),
      topLevelToInline: sum("topLevelToInline"),
    },
    massConversions: mass.length,
    massConversionShare: lib.pct(
      mass.reduce((s, c) => s + c.conversions, 0),
      commits.reduce((s, c) => s + c.conversions, 0)
    ),
  };
};

const ADOPTION_TERMS = [
  "verbatimModuleSyntax",
  "isolatedModules",
  "importsNotUsedAsValues",
  "preserveValueImports",
  "emitDecoratorMetadata",
  "consistent-type-imports",
  "consistent-type-exports",
  "no-import-type-side-effects",
  "consistent-type-specifier-style",
  "useImportType",
  "useExportType",
];
const CONFIG_PATHS = [
  "*tsconfig*.json",
  "**/tsconfig*.json",
  "*eslint*",
  "**/*eslint*",
  "biome.json",
  "biome.jsonc",
  "**/biome.json*",
  ".oxlintrc.json",
  "**/.oxlintrc.json",
  "vite.config.*",
  "oxlint.config.*",
];
const adoption = (name, churnCommits, since) => {
  const sha = lib.PINNED[name];
  const out = [];
  const errors = [];
  for (const term of ADOPTION_TERMS) {
    const r = git(name, [
      "log",
      sha,
      "--format=%H %cs %s",
      ...(WINDOW_ONLY.has(name) ? [`--since=${since}`] : []),
      "-S",
      term,
      "--",
      ...CONFIG_PATHS,
    ]);
    // a blob:none clone lacks the config files' older blobs; the pickaxe stops at the first
    // missing one, so what it printed before that is all there is for this term
    if (r.status !== 0) {
      errors.push({
        error: (r.stderr ?? "").trim().split("\n").pop().slice(0, 200),
        term,
      });
    }
    for (const line of r.stdout.split("\n").filter(Boolean)) {
      const [h, date, ...subject] = line.split(" ");
      const files = git(name, [
        "diff-tree",
        "--no-commit-id",
        "--name-only",
        "-r",
        "--no-renames",
        "-m",
        "--first-parent",
        h,
      ])
        .stdout.split("\n")
        .filter(
          (f) =>
            f &&
            CONFIG_PATHS.some(() =>
              /tsconfig|eslint|biome|oxlint|vite\.config/.test(f)
            )
        );
      const body = git(name, ["log", "-1", "--format=%B", h])
        .stdout.trim()
        .slice(0, 1200);
      const t = Number(
        git(name, ["log", "-1", "--format=%ct", h]).stdout.trim()
      );
      const same = churnCommits.find((c) => c.sha === h);
      const after30 = churnCommits.filter(
        (c) => c.time > t && c.time <= t + 30 * 86_400
      );
      // what the term's lines say before and after this commit, in the changed config files
      const lines = [];
      for (const f of files.slice(0, 6)) {
        for (const [side, ref] of [
          ["after", h],
          ["before", `${h}^`],
        ]) {
          const text = git(name, ["show", `${ref}:${f}`]);
          if (text.status !== 0) {
            continue;
          }
          text.stdout.split("\n").forEach((l, i) => {
            if (l.includes(term)) {
              lines.push({
                file: f,
                line: i + 1,
                side,
                text: l.trim().slice(0, 200),
              });
            }
          });
        }
      }
      out.push({
        body,
        conversionsAfter30Days: after30.reduce((s, c) => s + c.conversions, 0),
        conversionsInCommit: same?.conversions ?? 0,
        date,
        files,
        lines,
        permalink: `https://github.com/${lib.repoMeta(name).github}/commit/${h}`,
        sha: h,
        subject: subject.join(" "),
        term,
      });
    }
  }
  return { errors, events: out };
};

const keywords = (name, churnCommits) => {
  const sha = lib.PINNED[name];
  const r = git(name, [
    "log",
    sha,
    "--format=@@@%H%x1f%cs%x1f%an%x1f%B",
    "-i",
    "-E",
    `--grep=${KEYWORDS.source}`,
  ]);
  const out = [];
  for (const block of r.stdout.split("@@@").filter(Boolean)) {
    const [h, date, author, ...msg] = block.split("\x1f");
    const message = msg.join("\x1f").trim();
    if (!KEYWORDS.test(message)) {
      continue;
    }
    const files = git(name, [
      "diff-tree",
      "--no-commit-id",
      "--name-only",
      "-r",
      "--no-renames",
      "-m",
      "--first-parent",
      h,
    ])
      .stdout.split("\n")
      .filter(Boolean);
    const c = churnCommits.find((x) => x.sha === h);
    out.push({
      author,
      conversions: c?.conversions ?? null,
      date,
      files: files.slice(0, 40),
      filesTotal: files.length,
      matched: [
        ...new Set(
          [...message.matchAll(new RegExp(KEYWORDS.source, "gi"))].map((m) =>
            m[0].toLowerCase()
          )
        ),
      ],
      message: message.slice(0, 2500),
      permalink: `https://github.com/${lib.repoMeta(name).github}/commit/${h}`,
      repo: name,
      sha: h,
    });
  }
  return out;
};

const main = async () => {
  const names = lib.selectedRepos(CORE).filter((n) => CORE.includes(n));
  const file = join(lib.RESULTS_DIR, "history.json");
  const out = existsSync(file) ? lib.readJson(file) : { repos: {} };
  out.generated = new Date().toISOString();
  out.mass = MASS;
  out.windowDays = lh.WINDOW_DAYS;
  out.tools = {
    git: lib
      .spawnSync("git", ["--version"], { encoding: "utf8" })
      .stdout.trim(),
  };
  const worksheet = [];
  for (const name of names) {
    const r = (out.repos[name] ??= {});
    let commits = null;
    let since = null;
    if (lib.flag("churn") || lib.flag("adoption") || lib.flag("keywords")) {
      const c = await churn(name);
      commits = c.commits;
      since = c.since;
      r.scope = WINDOW_ONLY.has(name)
        ? "the three-year window"
        : "all the history the clone has";
      r.firstCommit = new Date(Math.min(...commits.map((x) => x.time)) * 1000)
        .toISOString()
        .slice(0, 10);
      r.pinnedDate = new Date(c.pinnedTime * 1000).toISOString().slice(0, 10);
      r.windowStart = new Date(c.since * 1000).toISOString().slice(0, 10);
    }
    if (lib.flag("churn")) {
      r.all = summarise(commits);
      r.window = summarise(commits.filter((c) => c.window));
      r.massCommits = commits
        .filter(
          (c) =>
            c.conversions >= MASS.conversions || c.files.length >= MASS.files
        )
        .map((c) => ({
          conversions: c.conversions,
          date: new Date(c.time * 1000).toISOString().slice(0, 10),
          files: c.files.length,
          permalink: `https://github.com/${lib.repoMeta(name).github}/commit/${c.sha}`,
          sha: c.sha,
          subject: c.subject,
          window: c.window,
        }));
      // conversions per year
      r.byYear = {};
      for (const c of commits) {
        const y = new Date(c.time * 1000).getUTCFullYear();
        r.byYear[y] ??= { commits: 0, conversions: 0, newTypedImports: 0 };
        r.byYear[y].commits += 1;
        r.byYear[y].conversions += c.conversions;
        r.byYear[y].newTypedImports += c.counts.newTypedImports;
      }
    }
    if (lib.flag("adoption")) {
      const a = adoption(name, commits, since);
      r.adoption = a.events;
      r.adoptionErrors = a.errors;
    }
    // A blob:none clone holds only the blobs the measured scopes needed, so the config-file
    // pickaxe in --adoption can't read older config files and stops early (adoptionErrors).
    r.partialCloneFilter =
      git(name, [
        "config",
        "--get",
        "remote.origin.partialclonefilter",
      ]).stdout.trim() || null;
    r.adoptionComplete =
      r.partialCloneFilter !== "blob:none" && !(r.adoptionErrors ?? []).length;
    if (lib.flag("keywords")) {
      r.keywords = keywords(name, commits);
      worksheet.push(...r.keywords);
    }
    lib.writeJson(file, out);
    console.log(
      `${name}: ${r.all?.commits ?? "?"} commits since ${r.firstCommit}, ${r.all?.conversions ?? "?"} conversions (${r.massCommits?.length ?? "?"} mass commits), ${r.adoption?.length ?? "?"} adoption events, ${r.keywords?.length ?? "?"} keyword commits`
    );
  }
  lib.writeJson(file, out);
  if (lib.flag("keywords")) {
    // every repo's keyword commits, from this run and earlier ones
    worksheet.length = 0;
    for (const n of CORE) {
      worksheet.push(...(out.repos[n]?.keywords ?? []));
    }
    const md = [
      "# Type-imports history worksheet",
      "",
      "Each commit whose message matches the keyword list in type-imports-history.cjs. Label each in history-labels.json: `bug` (a bug caused by an elided, kept or type-only import: a side effect that stopped running, an export that doesn't exist at runtime, decorator metadata, a runtime cycle or evaluation order), `conversion` (converted imports to `import type`, by hand or with a tool), `config` (turned a flag or rule on or off), `tooling` (build or compiler support for type imports), `style` (inline against top-level, merging, ordering), `unrelated`. Say what the commit did in one sentence, from its message and files only.",
      "",
      ...worksheet.map((k, i) =>
        [
          `## ${i + 1}. ${k.repo} ${k.sha.slice(0, 10)} (${k.date})`,
          "",
          `- Link: ${k.permalink}`,
          `- Matched: ${k.matched.join(", ")}`,
          `- Conversions in measured source: ${k.conversions ?? "n/a (no measured file)"}`,
          `- Files (${k.filesTotal}): ${k.files.slice(0, 12).join(", ")}${k.filesTotal > 12 ? ", …" : ""}`,
          "",
          "```",
          k.message.slice(0, 1500),
          "```",
          "",
        ].join("\n")
      ),
    ].join("\n");
    writeFileSync(join(lib.OUT_DIR, "history-worksheet.md"), md);
  }
};

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
