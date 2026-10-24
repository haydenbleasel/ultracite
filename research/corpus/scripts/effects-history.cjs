// What the projects did with the dependency rule and with effect bugs, from git history alone.
// Needs the history clones (todo-history-clone.sh). Only `git log` and `git show` run on them, with
// GIT_NO_LAZY_FETCH=1, so a missing blob is counted, never fetched. Nothing from a clone runs.
//
// Repos: the corpus repos with React code that have history clones: Excalidraw, Next.js (its
// client code, the scopes todo-history.cjs uses for packages/next), tRPC's React packages and
// Hono's hono/jsx. The React set (shadcn/ui, Radix, React Aria, Supabase) has only shallow clones,
// so its history isn't measured.
//
//   --disables  every line that adds or removes a disable comment naming a hooks rule
//               (react-hooks/*, react-compiler, Biome's useExhaustiveDependencies and
//               useHookAtTopLevel) on the mainline (--first-parent, merges diffed against their
//               first parent, renames followed), paired into lives: added, removed (or alive at the
//               pinned commit), and what the removing commit did to the hook's dependency array.
//   --bugs      commits whose message points at an effect bug (stale closure, infinite or render
//               loop, missing dependency, exhaustive-deps, useEffectEvent, runs/fires twice,
//               maximum update depth, useEffect/useLayoutEffect, dependency array). For each, the
//               hook-bearing files it changed are linted at the parent and at the commit with each
//               linter's dependency rule (on copies under TMP), and every flagged hook that overlaps
//               a changed line is recorded. Writes a worksheet for the hand reading.
//   --scale     how many mainline commits touch a hook's dependency array at all (a denominator).
//
// Usage: node --max-old-space-size=8192 research/corpus/scripts/effects-history.cjs --disables --bugs --scale
// Writes results/react-effects/history.json, out/react-effects/history/*.jsonl and
// out/react-effects/history-worksheet.md.
"use strict";

const { spawnSync } = require("node:child_process");
const { existsSync, mkdirSync, rmSync, writeFileSync } = require("node:fs");
const { dirname, join } = require("node:path");

const lib = require("./effects-lib.cjs");

const GIT_ENV = { ...process.env, GIT_NO_LAZY_FETCH: "1" };
const OUT = join(lib.OUT_DIR, "history");
// The measured package's source directories, in every layout its history has had (from
// todo-history.cjs SCOPES; tRPC also gets the old packages/react, hono only src/jsx).
const NEXT_DIRS = [
  "agent-feedback",
  "api",
  "bin",
  "build",
  "cli",
  "client",
  "diagnostics",
  "experimental",
  "export",
  "lib",
  "next-devtools",
  "pages",
  "server",
  "shared",
  "telemetry",
  "trace",
];
const SCOPES = {
  excalidraw: [
    "packages/excalidraw",
    "packages/element/src",
    "packages/common/src",
    "packages/math/src",
    "packages/utils/src",
    "src",
  ],
  hono: ["src/jsx"],
  "next.js": [
    ...NEXT_DIRS.map((d) => `packages/next/src/${d}`),
    ...[
      "bin",
      "build",
      "cli",
      "client",
      "export",
      "lib",
      "pages",
      "server",
      "shared",
      "telemetry",
      "trace",
      "next-server",
      "types",
    ].map((d) => `packages/next/${d}`),
  ],
  trpc: ["react", "react-query", "next", "tanstack-react-query"].map(
    (p) => `packages/${p}/src`
  ),
};
const REPOS = lib.selectedRepos(Object.keys(SCOPES));
const SOURCE = /\.(?:[cm]?[jt]sx?)$/;
const EXCLUDED =
  /(?:^|\/)(?:__tests__|test|tests|fixtures?|examples?|node_modules|dist|compiled)\//;
const testFile = /\.(?:test|spec|stories)\.[cm]?[jt]sx?$|\.d\.ts$/;
const inScope = (path) =>
  SOURCE.test(path) && !EXCLUDED.test(path) && !testFile.test(path);

const git = (name, argv, opts = {}) =>
  spawnSync(
    "git",
    [
      "-C",
      join(lib.HISTORY_DIR, `${name}.git`),
      "-c",
      "core.quotePath=false",
      ...argv,
    ],
    {
      encoding: "utf8",
      env: GIT_ENV,
      maxBuffer: 1 << 30,
      ...opts,
    }
  );

const DIRECTIVE =
  /(?:eslint|oxlint)-disable(?:-next-line|-line)?\s+([^\n*]*?(?:react-hooks\/[\w-]+|react-compiler\/[\w-]+|react\/(?:exhaustive-deps|rules-of-hooks))[^\n*]*?)(?:\*\/|-->|$)|biome-ignore(?:-all|-start|-end)?\s+(lint\/correctness\/(?:useExhaustiveDependencies|useHookAtTopLevel))/;
const rulesOf = (m) =>
  (m[1] ?? m[2])
    .split(/\s--\s/)[0]
    .split(",")
    .map((r) => r.trim().split(/\s+/)[0])
    .filter((r) =>
      /react-hooks|react-compiler|react\/|useExhaustive|useHookAt/.test(r)
    );

// Parse `git log -p -U0` output into commits with per-file added and removed lines.
const parseLog = (text) => {
  const commits = [];
  let c = null;
  let file = null;
  let oldLine = 0;
  let newLine = 0;
  for (const line of text.split("\n")) {
    if (line.startsWith("@@@COMMIT ")) {
      const [, sha, time] = line.split(" ");
      c = { files: [], sha, subject: null, time: Number(time) };
      commits.push(c);
      file = null;
      continue;
    }
    if (c && c.subject === null && !line.startsWith("diff --git")) {
      c.subject = line;
      continue;
    }
    if (line.startsWith("diff --git ")) {
      file = { added: [], from: null, removed: [], to: null };
      c.files.push(file);
      continue;
    }
    if (!file) {
      continue;
    }
    if (line.startsWith("--- ")) {
      file.from = line === "--- /dev/null" ? null : line.slice(6);
      continue;
    }
    if (line.startsWith("+++ ")) {
      file.to = line === "+++ /dev/null" ? null : line.slice(6);
      continue;
    }
    const h = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(line);
    if (h) {
      oldLine = Number(h[1]);
      newLine = Number(h[3]);
      file.hunks ??= [];
      file.hunks.push({
        newCount: h[4] === undefined ? 1 : Number(h[4]),
        newStart: newLine,
        oldCount: h[2] === undefined ? 1 : Number(h[2]),
        oldStart: oldLine,
      });
      continue;
    }
    if (line.startsWith("+") && !line.startsWith("+++")) {
      file.added.push({ line: newLine++, text: line.slice(1) });
    } else if (line.startsWith("-") && !line.startsWith("---")) {
      file.removed.push({ line: oldLine++, text: line.slice(1) });
    }
  }
  return commits;
};

// ── disables ──────────────────────────────────────────────────────────
const disables = (name) => {
  const r = git(name, [
    "-c",
    "diff.renameLimit=100000",
    "log",
    lib.PINNED[name],
    "--first-parent",
    "--diff-merges=first-parent",
    "--reverse",
    "-M",
    "-p",
    "-U0",
    "--no-color",
    "--no-ext-diff",
    "-G",
    "(eslint|oxlint)-disable.*(react-hooks|react-compiler|react/exhaustive-deps|react/rules-of-hooks)|biome-ignore.*(useExhaustiveDependencies|useHookAtTopLevel)",
    "--format=@@@COMMIT %H %ct%n%s",
    "--",
    ...SCOPES[name],
  ]);
  if (r.status !== 0) {
    return { error: r.stderr.slice(0, 500), events: [], lives: [] };
  }
  const commits = parseLog(r.stdout);
  const events = [];
  for (const c of commits) {
    for (const f of c.files) {
      const path = f.to ?? f.from;
      if (!path || !inScope(path)) {
        continue;
      }
      for (const [sign, lines] of [
        ["+", f.added],
        ["-", f.removed],
      ]) {
        for (const l of lines) {
          const m = DIRECTIVE.exec(l.text);
          if (!m) {
            continue;
          }
          events.push({
            commit: c.sha,
            date: new Date(c.time * 1000).toISOString().slice(0, 10),
            file: sign === "+" ? f.to : f.from,
            line: l.line,
            rules: rulesOf(m),
            sign,
            subject: c.subject,
            text: l.text.trim().slice(0, 200),
            time: c.time,
            // did the same file change a dependency array in this commit?
            depsArrayEdited: [...f.added, ...f.removed].some((x) =>
              /\}\s*,\s*\[[^\]]*\]\s*\)/.test(x.text)
            ),
          });
        }
      }
    }
  }
  // Pair into lives. A removal closes the oldest open addition with the same rules in the same
  // file; a removal and an addition in the same commit with the same rules in other files is a move.
  const open = [];
  const lives = [];
  const pinTime = Number(
    git(name, ["log", "-1", "--format=%ct", lib.PINNED[name]]).stdout.trim()
  );
  const byCommit = new Map();
  for (const e of events) {
    if (!byCommit.has(e.commit)) {
      byCommit.set(e.commit, []);
    }
    byCommit.get(e.commit).push(e);
  }
  for (const [, es] of byCommit) {
    const adds = es.filter((e) => e.sign === "+");
    const rems = es.filter((e) => e.sign === "-");
    const usedAdds = new Set();
    for (const rm of rems) {
      const key = rm.rules.join(",");
      // a move within the commit (same rules, added elsewhere or re-added in the same file)
      const moved = adds.find(
        (a) => !usedAdds.has(a) && a.rules.join(",") === key
      );
      const idx = open.findIndex(
        (o) => o.file === rm.file && o.rules.join(",") === key
      );
      const idxAny =
        idx === -1
          ? open.findIndex((o) => o.rules.join(",") === key && moved)
          : idx;
      if (moved) {
        usedAdds.add(moved);
        if (idxAny !== -1) {
          open[idxAny].file = moved.file;
          open[idxAny].moves = (open[idxAny].moves ?? 0) + 1;
        }
        continue;
      }
      if (idx !== -1) {
        const life = open.splice(idx, 1)[0];
        lives.push({
          ...life,
          removed: {
            commit: rm.commit,
            date: rm.date,
            depsArrayEdited: rm.depsArrayEdited,
            subject: rm.subject,
          },
          days: Math.round((rm.time - life.time) / 86400),
        });
      } else {
        lives.push({
          addedBeforeHistory: true,
          file: rm.file,
          removed: {
            commit: rm.commit,
            date: rm.date,
            depsArrayEdited: rm.depsArrayEdited,
            subject: rm.subject,
          },
          rules: rm.rules,
          text: rm.text,
        });
      }
    }
    for (const a of adds) {
      if (!usedAdds.has(a)) {
        open.push({
          added: { commit: a.commit, date: a.date, subject: a.subject },
          file: a.file,
          rules: a.rules,
          text: a.text,
          time: a.time,
        });
      }
    }
  }
  for (const o of open) {
    lives.push({
      ...o,
      alive: true,
      days: Math.round((pinTime - o.time) / 86400),
    });
  }
  return { commits: commits.length, events, lives };
};

// ── bugs ───────────────────────────────────────────────────────────────
const BUG_GREP =
  "stale closure|stale (state|value|props?)|infinite (re-?render|loop|update)|render loop|re-?render(ing)? loop|missing dep|exhaustive.?deps|useEffectEvent|use-effect-event|runs? twice|double.?(render|invok|fire|mount|call)|fires? twice|called twice|maximum update depth|useEffect|useLayoutEffect|useInsertionEffect|dependency array|deps array|effect cleanup|strict ?mode";
const lintFiles = async (dir, files) => {
  const ox = lib.writeOxlintOnly(
    join(lib.TMP, "configs", "history"),
    "exhaustive-deps",
    {
      "react/exhaustive-deps": "error",
    }
  );
  const biomeDir = lib.writeBiomeConfig(
    join(lib.TMP, "configs", "history"),
    "exhaustive-deps",
    {
      ...lib.BIOME_HOOK_RULES,
      linter: {
        enabled: true,
        rules: {
          correctness: { useExhaustiveDependencies: "error" },
          recommended: false,
        },
      },
    }
  );
  return {
    biome: lib.runBiome({
      configDir: biomeDir,
      cwd: dir,
      files,
      keep: (r) => /useExhaustiveDependencies/.test(r),
    }),
    eslint: (
      await lib.runEslint({
        cwd: dir,
        extra: await lib.eslintReactOnAllFiles(),
        files,
        keep: (r) => r === "react-hooks/exhaustive-deps",
      })
    ).filter((d) => d.rule === "react-hooks/exhaustive-deps"),
    oxlint: lib.runOxlint({
      configFile: ox,
      cwd: dir,
      files,
      keep: (r) => r === "react/exhaustive-deps",
    }),
  };
};
const bugs = async (name) => {
  const r = git(name, [
    "-c",
    "diff.renameLimit=100000",
    "log",
    lib.PINNED[name],
    "--first-parent",
    "--diff-merges=first-parent",
    "-M",
    "-p",
    "-U0",
    "--no-color",
    "--no-ext-diff",
    "-i",
    "-E",
    `--grep=${BUG_GREP}`,
    "--format=@@@COMMIT %H %ct%n%s",
    "--",
    ...SCOPES[name],
  ]);
  if (r.status !== 0) {
    return { error: r.stderr.slice(0, 500), rows: [] };
  }
  const commits = parseLog(r.stdout);
  const rows = [];
  for (const c of commits) {
    const files = c.files.filter((f) => f.to && f.from && inScope(f.to));
    const hookFiles = [];
    let missingBlobs = 0;
    const work = join(lib.TMP, "history", name, c.sha.slice(0, 10));
    rmSync(work, { force: true, recursive: true });
    for (const f of files) {
      const before = git(name, ["show", `${c.sha}^:${f.from}`]);
      const after = git(name, ["show", `${c.sha}:${f.to}`]);
      if (before.status !== 0 || after.status !== 0) {
        missingBlobs++;
        continue;
      }
      if (
        !/\buse(?:Effect|LayoutEffect|InsertionEffect|Callback|Memo|ImperativeHandle)\s*\(/.test(
          before.stdout + after.stdout
        )
      ) {
        continue;
      }
      for (const [side, text, path] of [
        ["before", before.stdout, f.from],
        ["after", after.stdout, f.to],
      ]) {
        const dest = join(work, side, path);
        mkdirSync(dirname(dest), { recursive: true });
        writeFileSync(dest, text);
      }
      hookFiles.push(f);
    }
    const row = {
      commit: c.sha,
      date: new Date(c.time * 1000).toISOString().slice(0, 10),
      filesChanged: c.files.length,
      hookFiles: hookFiles.map((f) => f.to),
      missingBlobs,
      subject: c.subject,
    };
    if (hookFiles.length > 0) {
      // Hooks whose range overlaps a changed line, and the dependency rule's view of them.
      const sides = {};
      for (const side of ["before", "after"]) {
        const dir = join(work, side);
        const rel = hookFiles.map((f) => (side === "before" ? f.from : f.to));
        const lint = await lintFiles(dir, rel);
        const hooks = [];
        for (const [i, f] of hookFiles.entries()) {
          const path = rel[i];
          const text = require("node:fs").readFileSync(join(dir, path), "utf8");
          const rowsH = lib
            .analyse(text, path)
            .rows.map((h) => ({ ...h, id: `${path}:${h.line}:${h.column}` }));
          const changed = new Set(
            (side === "before" ? f.removed : f.added).map((x) => x.line)
          );
          // a pure insertion leaves no removed line on the old side; use the hunk anchor
          for (const hk of f.hunks ?? []) {
            if (side === "before" && hk.oldCount === 0) {
              changed.add(hk.oldStart);
            }
          }
          const starts = lib.lineStarts(text);
          for (const h of rowsH) {
            const touched = [...changed].some(
              (l) => l >= h.line && l <= h.endLine
            );
            if (!touched) {
              continue;
            }
            const flags = {};
            for (const [linter, ds] of Object.entries(lint)) {
              const mine = ds.filter(
                (d) =>
                  d.file === path &&
                  lib.matchHook(rowsH, starts, d)?.id === h.id
              );
              flags[linter] = mine.map((d) =>
                d.message.split("\n")[0].slice(0, 200)
              );
            }
            hooks.push({
              deps: h.deps.map((d) => d.text),
              depsForm: h.depsForm,
              file: path,
              flags,
              kind: h.kind,
              line: h.line,
              name: h.name,
            });
          }
        }
        sides[side] = hooks;
      }
      row.hooksTouched = sides;
      row.flaggedBefore = sides.before.some((h) =>
        Object.values(h.flags).some((m) => m.length > 0)
      );
      row.flaggedAfter = sides.after.some((h) =>
        Object.values(h.flags).some((m) => m.length > 0)
      );
      row.depsArrayChanged = sides.before.some((b) => {
        const a = sides.after.find(
          (x) =>
            x.name === b.name &&
            x.file === b.file &&
            Math.abs(x.line - b.line) < 40
        );
        return a && JSON.stringify(a.deps) !== JSON.stringify(b.deps);
      });
    }
    rows.push(row);
  }
  return { commits: commits.length, rows };
};

// ── scale ──────────────────────────────────────────────────────────────
const scale = (name) => {
  const all = git(name, [
    "rev-list",
    "--first-parent",
    "--count",
    lib.PINNED[name],
    "--",
    ...SCOPES[name],
  ]);
  const deps = git(name, [
    "log",
    lib.PINNED[name],
    "--first-parent",
    "--diff-merges=first-parent",
    "--format=%H",
    "-G",
    "\\}[[:space:]]*,[[:space:]]*\\[[^]]*\\][[:space:]]*\\)",
    "--",
    ...SCOPES[name],
  ]);
  const since = git(name, [
    "log",
    "--first-parent",
    "--reverse",
    "--format=%cs",
    lib.PINNED[name],
    "--",
    ...SCOPES[name],
  ]);
  return {
    // --diff-merges turns patch output on, so count the commit lines only
    commitsTouchingDepsArrays:
      deps.status === 0
        ? deps.stdout.split("\n").filter((l) => /^[0-9a-f]{40}$/.test(l)).length
        : null,
    mainlineCommits: Number(all.stdout.trim()),
    since: since.stdout.split("\n")[0] || null,
  };
};

const main = async () => {
  const resultFile = join(lib.RESULTS_DIR, "history.json");
  const result = lib.readJson(resultFile, { repos: {} });
  result.generated = new Date().toISOString().slice(0, 10);
  result.note =
    "Mainline history (--first-parent) of the measured source, in the layouts listed under scopes. `lives` pair disable comments that name a hooks rule from addition to removal (or to the pinned commit). `bugs` are commits whose message matches `grep`; each hook-bearing file they changed is linted before and after with each linter's dependency rule. Missing blobs are never fetched.";
  result.grep = BUG_GREP;
  result.scopes = SCOPES;
  for (const name of REPOS) {
    result.repos[name] ??= {};
    const t0 = Date.now();
    if (lib.flag("scale")) {
      result.repos[name].scale = scale(name);
    }
    if (lib.flag("disables")) {
      const d = disables(name);
      lib.writeJsonl(join(OUT, `${name}.disables.jsonl`), d.events);
      const lives = d.lives;
      const removed = lives.filter((l) => l.removed);
      const days = removed
        .filter((l) => typeof l.days === "number")
        .map((l) => l.days)
        .sort((a, b) => a - b);
      result.repos[name].disables = {
        added: d.events.filter((e) => e.sign === "+").length,
        alive: lives.filter((l) => l.alive).length,
        commits: d.commits,
        error: d.error ?? null,
        lives,
        medianDaysToRemoval: days.length
          ? days[Math.floor(days.length / 2)]
          : null,
        removed: removed.length,
        removedWithDepsArrayEdit: removed.filter(
          (l) => l.removed.depsArrayEdited
        ).length,
        byRule: lib.countBy(
          d.events.filter((e) => e.sign === "+").flatMap((e) => e.rules),
          (x) => x
        ),
      };
    }
    if (lib.flag("bugs")) {
      const b = await bugs(name);
      lib.writeJsonl(join(OUT, `${name}.bugs.jsonl`), b.rows);
      const withHooks = b.rows.filter((r) => r.hookFiles.length > 0);
      result.repos[name].bugs = {
        commits: b.commits,
        depsArrayChanged: withHooks.filter((r) => r.depsArrayChanged).length,
        error: b.error ?? null,
        flaggedAfter: withHooks.filter((r) => r.flaggedAfter).length,
        flaggedBefore: withHooks.filter((r) => r.flaggedBefore).length,
        missingBlobs: b.rows.reduce((s, r) => s + r.missingBlobs, 0),
        touchingHookFiles: withHooks.length,
      };
    }
    console.log(
      `${name}: ${JSON.stringify({ ...result.repos[name], disables: result.repos[name].disables ? { ...result.repos[name].disables, lives: result.repos[name].disables.lives.length } : undefined })} (${((Date.now() - t0) / 1000).toFixed(1)} s)`
    );
  }
  // the worksheet for the hand reading: every bug-grep commit that changed a hook-bearing file
  if (lib.flag("bugs")) {
    const blocks = [];
    for (const name of REPOS) {
      for (const r of lib
        .readJsonl(join(OUT, `${name}.bugs.jsonl`))
        .filter((x) => x.hookFiles.length > 0)) {
        const id = `${name}@${r.commit.slice(0, 10)}`;
        const diff = git(name, [
          "show",
          "--format=%B",
          "-U3",
          "--no-color",
          r.commit,
          "--",
          ...r.hookFiles,
        ]).stdout;
        blocks.push(
          [
            `### ${id} — ${r.date} — ${r.subject}`,
            "",
            `Link: https://github.com/${lib.repoMeta(name).github}/commit/${r.commit}`,
            `Hooks touched before: ${JSON.stringify(r.hooksTouched.before.map((h) => ({ deps: h.deps, flags: h.flags, hook: `${h.file}:${h.line} ${h.name}` })))}`,
            `Hooks touched after: ${JSON.stringify(r.hooksTouched.after.map((h) => ({ deps: h.deps, flags: h.flags, hook: `${h.file}:${h.line} ${h.name}` })))}`,
            "",
            "```diff",
            diff.length > 12000
              ? `${diff.slice(0, 12000)}\n… (truncated)`
              : diff,
            "```",
            "",
          ].join("\n")
        );
      }
    }
    writeFileSync(join(lib.OUT_DIR, "history-worksheet.md"), blocks.join("\n"));
    console.log(`worksheet: ${blocks.length} commits`);
  }
  lib.writeJson(resultFile, result);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
