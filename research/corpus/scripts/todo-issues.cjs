// Linked issues: for every TODO-family marker (TODO, FIXME, XXX, @todo, HACK, BUG, TBD) that
// references a GitHub issue or pull request (a URL, `owner/repo#123`, or `#123` for its own repo),
// whether that issue is open or closed now, read-only with `gh api repos/<repo>/issues/<n>`.
// Responses are cached in out/todo-comments/issues-cache.json with the fetch date; --fetch
// fetches again. Tracker keys (NAR-804, a Linear key) and other trackers can't be checked this
// way and are counted.
//
// A marker pointing at a closed issue or a merged pull request is a candidate stale TODO. The hand
// verdicts on those candidates are an input (results/todo-comments/stale-check.json, one rater),
// joined here.
//
// Usage: node research/corpus/scripts/todo-issues.cjs [--fetch]
// Writes results/todo-comments/issues.json.
"use strict";

const { execFileSync } = require("node:child_process");
const { existsSync } = require("node:fs");
const { join } = require("node:path");

const lib = require("./todo-lib.cjs");
const { config } = require("./collect-files.cjs");

const TERMS = new Set(["TODO", "FIXME", "XXX", "@todo", "HACK", "BUG", "TBD"]);
const github = Object.fromEntries(
  config.repos.map((r) => [r.name, r.github.toLowerCase()])
);
const markers = lib
  .readJson(join(lib.OUT_DIR, "markers.json"))
  .rows.filter((m) => m.kind === "marker" && TERMS.has(m.term) && m.format);

const cacheFile = join(lib.OUT_DIR, "issues-cache.json");
const cache =
  existsSync(cacheFile) && !lib.flag("fetch")
    ? lib.readJson(cacheFile)
    : { fetched: {}, issues: {} };

const fetchIssue = (key) => {
  if (cache.issues[key]) {
    return cache.issues[key];
  }
  const [repo, number] = key.split("#");
  let data;
  try {
    const raw = JSON.parse(
      execFileSync("gh", ["api", `repos/${repo}/issues/${number}`], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      })
    );
    data = {
      closedAt: raw.closed_at,
      createdAt: raw.created_at,
      isPull: Boolean(raw.pull_request),
      mergedAt: raw.pull_request?.merged_at ?? null,
      repository:
        raw.repository_url?.replace("https://api.github.com/repos/", "") ??
        repo,
      state: raw.state,
      stateReason: raw.state_reason ?? null,
      title: raw.title,
      url: raw.html_url,
    };
  } catch (error) {
    data = {
      error: String(error.stderr ?? error.message)
        .split("\n")[0]
        .slice(0, 200),
      state: "unavailable",
    };
  }
  cache.issues[key] = data;
  cache.fetched[key] = new Date().toISOString().slice(0, 10);
  return data;
};

// Pinned commit dates, from the history clones when present.
const pinnedDates = Object.fromEntries(
  Object.entries(lib.PINNED).map(([name, sha]) => {
    try {
      return [
        name,
        execFileSync(
          "git",
          [
            "-C",
            join(lib.HISTORY_DIR, `${name}.git`),
            "log",
            "-1",
            "--format=%cs",
            sha,
          ],
          { encoding: "utf8" }
        ).trim(),
      ];
    } catch {
      return [name, null];
    }
  })
);
const rows = [];
for (const m of markers) {
  const refs = m.format.issueRefs.map(
    (r) => `${r.repo ?? github[m.repo]}#${r.number}`
  );
  if (
    refs.length === 0 &&
    m.format.keys.length === 0 &&
    m.format.otherTrackers.length === 0
  ) {
    continue;
  }
  const issues = [...new Set(refs)].map((key) => ({ key, ...fetchIssue(key) }));
  const status = (i) => {
    if (i.state === "unavailable") {
      return "unavailable";
    }
    if (i.state === "open") {
      return "open";
    }
    if (i.isPull) {
      return i.mergedAt ? "merged" : "closed unmerged";
    }
    return `closed (${i.stateReason ?? "no reason"})`;
  };
  // The state at the pinned commit: an issue closed after it was still open then.
  const pinnedDate = pinnedDates[m.repo];
  const atPinned = (i) =>
    i.closedAt && pinnedDate && i.closedAt.slice(0, 10) > pinnedDate
      ? "open"
      : status(i);
  rows.push({
    id: m.id,
    issues: issues.map((i) => ({
      closedAt: i.closedAt ?? null,
      key: i.key,
      status: status(i),
      statusAtPinned: atPinned(i),
      title: i.title ?? null,
      url: i.url ?? null,
    })),
    keys: m.format.keys,
    otherTrackers: m.format.otherTrackers,
    permalink: m.permalink,
    repo: m.repo,
    set: lib.setOf(m.repo),
    term: m.term,
    text: m.text,
  });
}
lib.writeJson(cacheFile, cache);

// A candidate stale marker: every issue it references is closed as completed, or merged.
const closedDone = (s) =>
  s === "merged" || s === "closed (completed)" || s === "closed (no reason)";
const candidates = rows.filter(
  (r) =>
    r.issues.length > 0 && r.issues.every((i) => closedDone(i.statusAtPinned))
);
const verdictsFile = join(lib.RESULTS_DIR, "stale-check.json");
const verdicts = existsSync(verdictsFile) ? lib.readJson(verdictsFile) : null;
const tally = (rs) =>
  rs.reduce((acc, r) => ({ ...acc, [r]: (acc[r] ?? 0) + 1 }), {});
const result = {
  candidates: candidates.map((c) => ({
    ...c,
    verdict: verdicts?.items?.find((v) => v.id === c.id) ?? null,
  })),
  fetched: [...new Set(Object.values(cache.fetched))].sort(),
  generated: new Date().toISOString().slice(0, 10),
  note: "TODO-family markers (TODO, FIXME, XXX, @todo, HACK, BUG, TBD) with a GitHub issue or PR reference, a tracker key or another tracker URL. Issue states are as of the fetch date. A candidate stale marker references only issues closed as completed (or with no reason) or merged PRs; the verdicts are hand inputs in stale-check.json.",
  rows,
  summary: Object.fromEntries(
    ["core", "react", "dogfood"].map((set) => {
      const rs = rows.filter((r) => r.set === set);
      const allMarkers = markers.filter((m) => lib.setOf(m.repo) === set);
      const issues = rs.flatMap((r) => r.issues);
      return [
        set,
        {
          issueStatus: tally(issues.map((i) => i.status)),
          issueStatusAtPinned: tally(issues.map((i) => i.statusAtPinned)),
          markers: allMarkers.length,
          markersWithGitHubRef: rs.filter((r) => r.issues.length > 0).length,
          markersWithKeyOnly: rs.filter(
            (r) => r.issues.length === 0 && r.keys.length > 0
          ).length,
          markersWithOtherTracker: rs.filter(
            (r) =>
              r.issues.length === 0 &&
              r.keys.length === 0 &&
              r.otherTrackers.length > 0
          ).length,
          staleCandidates: candidates.filter((c) => c.set === set).length,
          uniqueIssues: new Set(issues.map((i) => i.key)).size,
          verdicts: verdicts
            ? tally(
                candidates
                  .filter((c) => c.set === set)
                  .map(
                    (c) =>
                      verdicts.items.find((v) => v.id === c.id)?.verdict ??
                      "unlabelled"
                  )
              )
            : null,
        },
      ];
    })
  ),
};
lib.writeJson(join(lib.RESULTS_DIR, "issues.json"), result);
console.log(JSON.stringify(result.summary, null, 1));
