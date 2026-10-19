// TODO-family comments in the agent experiment's own committed runs: what Claude Code and Codex
// added or removed while fixing other rules for the earlier posts.
//
// Every run under research/agent-experiment/results/<topic>/runs/ and superseded-runs/:
//   - its net diff (diff.patch, the subject before against the agent's final file or tree)
//   - each attempt's or step's own agent edit, where the run kept one (attempt*/agent.patch,
//     step*/diff.patch), so a marker added and later removed again is still seen
//   - the subject files before and after (before.*, after.*, or before/ and after/ trees)
// Counted on added and removed lines: TODO, FIXME, XXX, HACK (and @todo) after a comment opener,
// any case; NOTE / Note: comments for comparison. The context of each added marker is kept.
//
// Usage: node research/corpus/scripts/todo-agent-runs.cjs
// Writes results/todo-comments/agent-runs.json.
"use strict";

const { existsSync, readdirSync, readFileSync, statSync } = require("node:fs");
const { join, relative } = require("node:path");

const lib = require("./todo-lib.cjs");

const RESULTS = join(lib.ULTRACITE, "research", "agent-experiment", "results");
const MARKER =
  /(?:\/\/|\/\*|^\s*\*|\{\/\*)[^\n]*?(?<![\p{L}\p{N}_])(?:todo|fixme|xxx|hack)(?![\p{L}\p{N}_])|@todo\b/iu;
const NOTE = /(?:\/\/|\/\*|^\s*\*)\s*(?:note|nb)\b\s*[:-]/i;
// A line that holds a comment (or a block comment's continuation), for the denominator.
const COMMENT = /(?:^|\s)(?:\/\/|\/\*)|^\s*\*(?!\*?\/?\s*\w+\s*[=(])/;

const patchLines = (text) => {
  const added = [];
  const removed = [];
  for (const line of text.split("\n")) {
    if (line.startsWith("+++") || line.startsWith("---")) {
      continue;
    }
    if (line.startsWith("+")) {
      added.push(line.slice(1));
    } else if (line.startsWith("-")) {
      removed.push(line.slice(1));
    }
  }
  return { added, removed };
};
const filesUnder = (dir) => {
  if (!existsSync(dir)) {
    return [];
  }
  if (statSync(dir).isFile()) {
    return [dir];
  }
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? filesUnder(join(dir, e.name)) : [join(dir, e.name)]
  );
};
const countIn = (files) =>
  files
    .filter((f) => /\.(?:[cm]?[jt]sx?)$/.test(f))
    .reduce(
      (n, f) =>
        n +
        readFileSync(f, "utf8")
          .split("\n")
          .filter((l) => MARKER.test(l)).length,
      0
    );

const runs = [];
for (const topic of readdirSync(RESULTS).sort()) {
  for (const group of ["runs", "superseded-runs"]) {
    const dir = join(RESULTS, topic, group);
    if (!existsSync(dir)) {
      continue;
    }
    for (const id of readdirSync(dir).sort()) {
      const runDir = join(dir, id);
      if (!statSync(runDir).isDirectory()) {
        continue;
      }
      const meta = existsSync(join(runDir, "meta.json"))
        ? JSON.parse(readFileSync(join(runDir, "meta.json"), "utf8"))
        : {};
      const patches = filesUnder(runDir).filter(
        (f) =>
          /(?:^|\/)(?:diff|agent)\.patch$/.test(f) && !/verify\.patch$/.test(f)
      );
      const net = join(runDir, "diff.patch");
      const perPatch = patches.map((f) => {
        const { added, removed } = patchLines(readFileSync(f, "utf8"));
        return {
          added: added.filter((l) => MARKER.test(l)),
          commentLinesAdded: added.filter((l) => COMMENT.test(l)).length,
          notesAdded: added.filter((l) => NOTE.test(l)).length,
          patch: relative(runDir, f),
          removed: removed.filter((l) => MARKER.test(l)),
        };
      });
      const netPatch = perPatch.find((p) => p.patch === "diff.patch") ?? null;
      const before = filesUnder(runDir).filter((f) =>
        /(?:^|\/)before(?:\.[a-z]+$|\/)/.test(relative(runDir, f))
      );
      const after = filesUnder(runDir).filter(
        (f) =>
          /(?:^|\/)after(?:\.[a-z]+$|\/)/.test(relative(runDir, f)) &&
          !/attempt\d|step\d/.test(relative(runDir, f))
      );
      runs.push({
        agent: meta.agent ?? /(claude|codex)/.exec(id)?.[1] ?? null,
        group,
        id,
        markersAfter: countIn(after),
        markersBefore: countIn(before),
        net: netPatch
          ? {
              added: netPatch.added,
              commentLinesAdded: netPatch.commentLinesAdded,
              notesAdded: netPatch.notesAdded,
              removed: netPatch.removed,
            }
          : null,
        patches: perPatch.length,
        subject: meta.subject ?? null,
        topic,
        // Any marker line added or removed in any of the run's agent patches.
        anyAdded: perPatch.flatMap((p) =>
          p.added.map((line) => ({ line, patch: p.patch }))
        ),
        anyRemoved: perPatch.flatMap((p) =>
          p.removed.map((line) => ({ line, patch: p.patch }))
        ),
        hasNetPatch: existsSync(net),
      });
    }
  }
}

const sum = (rs, f) => rs.reduce((n, r) => n + f(r), 0);
const summary = {};
for (const r of runs) {
  const key = `${r.topic} · ${r.agent ?? "?"}${r.group === "superseded-runs" ? " (superseded)" : ""}`;
  summary[key] ??= [];
  summary[key].push(r);
}
const result = {
  generated: new Date().toISOString().slice(0, 10),
  note: "Marker lines are TODO, FIXME, XXX or HACK (any case) after a comment opener, or @todo. 'net' compares the subject before the run with the agent's final file; 'any' covers every agent patch the run kept (attempt*/agent.patch, step*/diff.patch, diff.patch), not the fix pass's verify.patch.",
  runs: runs.map(({ anyAdded, anyRemoved, ...r }) => ({
    ...r,
    anyAdded,
    anyRemoved,
  })),
  summary: Object.fromEntries(
    Object.entries(summary).map(([k, rs]) => [
      k,
      {
        markersAddedAny: sum(rs, (r) => r.anyAdded.length),
        markersAddedNet: sum(rs, (r) => r.net?.added.length ?? 0),
        markersInSubjectsBefore: sum(rs, (r) => r.markersBefore),
        markersRemovedAny: sum(rs, (r) => r.anyRemoved.length),
        markersRemovedNet: sum(rs, (r) => r.net?.removed.length ?? 0),
        commentLinesAddedNet: sum(rs, (r) => r.net?.commentLinesAdded ?? 0),
        notesAddedNet: sum(rs, (r) => r.net?.notesAdded ?? 0),
        patches: sum(rs, (r) => r.patches),
        runs: rs.length,
        runsAddingAMarker: rs.filter((r) => r.anyAdded.length > 0).length,
      },
    ])
  ),
  totals: {
    commentLinesAddedNet: sum(runs, (r) => r.net?.commentLinesAdded ?? 0),
    runsAddingComments: runs.filter((r) => (r.net?.commentLinesAdded ?? 0) > 0)
      .length,
    markersAddedAny: sum(runs, (r) => r.anyAdded.length),
    markersRemovedAny: sum(runs, (r) => r.anyRemoved.length),
    notesAddedNet: sum(runs, (r) => r.net?.notesAdded ?? 0),
    patches: sum(runs, (r) => r.patches),
    runs: runs.length,
    runsByAgent: runs.reduce(
      (a, r) => ({ ...a, [r.agent]: (a[r.agent] ?? 0) + 1 }),
      {}
    ),
    subjectsWithMarkersBefore: [
      ...new Set(
        runs
          .filter((r) => r.markersBefore > 0)
          .map((r) => `${r.topic}/${r.subject}`)
      ),
    ],
  },
};
lib.writeJson(join(lib.RESULTS_DIR, "agent-runs.json"), result);
console.log(JSON.stringify(result.totals, null, 1));
for (const [k, v] of Object.entries(result.summary)) {
  console.log(k, JSON.stringify(v));
}
