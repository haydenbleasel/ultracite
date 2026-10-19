// Inventory of task-marker comments (TODO, FIXME, XXX, HACK, BUG, NOTE, OPTIMIZE, REVIEW, TBD,
// "to do", JSDoc @todo) in every corpus file, parsed with typescript-estree (the comments ESLint
// sees), so strings, template literals, identifiers and JSX text never count.
//
// Per repo and pooled: comments, marker comments and markers per 10,000 lines; line, block, JSDoc
// and JSX comments; where the term sits; its case, decoration and what follows it; and how the
// TODO is written: an owner, an issue or PR reference, a URL, a tracker key, a date, a version, a
// condition, unicorn's [conditions]. The share of bare TODOs (none of those) is the headline.
//
// Usage: node research/corpus/scripts/todo-census.cjs [--repos a,b]
// Writes results/todo-comments/comment-census.json and out/todo-comments/markers.json (every
// occurrence, gitignored; the sample and the linter join read it).
"use strict";

const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const lib = require("./todo-lib.cjs");

const { dc } = lib;
const names = lib.selectedRepos();
lib.checkPinned(names);

// Wording that often admits debt without a marker (a rough indicator, not a SATD detector).
const WORDING_RE =
  /\b(?:hack(?:y|ish)?|workaround|work around|kludge|temporar(?:y|ily)|for now|ugly|quick fix|stopgap|band-?aid)\b/i;

const rows = [];
const perRepo = {};
for (const name of names) {
  const meta = lib.repoMeta(name);
  const { files } = lib.collect(name);
  const sha = lib.shaOf(name);
  const authors = lib.authorTokens(name);
  const entry = {
    blockComments: 0,
    commentLines: 0,
    comments: 0,
    files: files.length,
    jsdocComments: 0,
    jsxComments: 0,
    lineComments: 0,
    lines: 0,
    parseErrors: [],
    set: lib.setOf(name),
    sha,
    authorsFromHistory: authors ? authors.size : null,
    wordingWithoutMarker: 0,
  };
  for (const rel of files) {
    const text = readFileSync(join(meta.root, rel), "utf8");
    entry.lines += text.split("\n").length;
    const { comments, error, occurrences } = lib.analyseFile(
      text,
      rel,
      authors
    );
    if (error) {
      entry.parseErrors.push({ error, file: rel });
      continue;
    }
    entry.comments += comments.length;
    for (const c of comments) {
      entry.commentLines += c.endLine - c.line + 1;
      if (c.type === "Line") {
        entry.lineComments++;
      } else {
        entry.blockComments++;
      }
      if (c.jsdoc) {
        entry.jsdocComments++;
      }
      if (c.jsx) {
        entry.jsxComments++;
      }
    }
    const withMarker = new Set(
      occurrences.filter((o) => o.kind === "marker").map((o) => o.commentIndex)
    );
    comments.forEach((c, i) => {
      if (!withMarker.has(i) && WORDING_RE.test(c.value)) {
        entry.wordingWithoutMarker++;
      }
    });
    for (const o of occurrences) {
      const c = comments[o.commentIndex];
      rows.push({
        caseOf: o.caseOf,
        comment: {
          codeAfter: c.codeAfter,
          endLine: c.endLine,
          jsdoc: c.jsdoc,
          jsx: c.jsx,
          line: c.line,
          trailing: c.trailing,
          type: c.type,
          value: c.value.length > 1500 ? `${c.value.slice(0, 1500)}…` : c.value,
        },
        commentId: `${name}:${rel}:${c.line}:${c.column}`,
        decoration: o.decoration,
        file: rel,
        follow: o.follow,
        format: o.format ?? null,
        id: `${name}:${rel}:${o.line}:${o.offsetInValue}`,
        kind: o.kind,
        line: o.line,
        permalink: dc.permalink(meta.github, sha, rel, c.line, c.endLine),
        position: o.position,
        raw: o.raw,
        repo: name,
        term: o.term,
        text: o.text ?? null,
      });
    }
  }
  perRepo[name] = entry;
  console.log(
    `${name}: ${files.length} files, ${entry.lines} lines, ${entry.comments} comments, ${rows.filter((r) => r.repo === name && r.kind === "marker").length} marker occurrences`
  );
}

// ── aggregation ────────────────────────────────────────────────────────
const per10k = (n, lines) =>
  lines ? Math.round((n / lines) * 1e5) / 10 : null;
const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : null);
const countBy = (items, key) => {
  const out = {};
  for (const item of items) {
    const k = typeof key === "function" ? key(item) : item[key];
    out[k] = (out[k] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(out).sort((a, b) => b[1] - a[1]));
};

const describe = (markers, lines) => {
  const comments = new Set(markers.map((m) => m.commentId));
  const fmt = markers.map((m) => m.format);
  const n = markers.length;
  const has = (pred) => fmt.filter(pred).length;
  return {
    case: countBy(markers, "caseOf"),
    commentKind: countBy(
      markers,
      (m) =>
        `${m.comment.jsx ? "jsx " : ""}${m.comment.jsdoc ? "jsdoc" : m.comment.type.toLowerCase()}${m.comment.trailing ? " (trailing)" : ""}`
    ),
    comments: comments.size,
    decoration: countBy(markers, "decoration"),
    follow: countBy(markers, "follow"),
    format: {
      bare: has((f) => f.bare),
      bareLoose: has((f) => f.bareLoose),
      bareShare: pct(
        has((f) => f.bare),
        n
      ),
      conditionWord: has((f) => f.conditionWord),
      date: has((f) => f.date),
      issueOrPr: has((f) => f.issueRefs.length > 0),
      link: has((f) => f.hasLink),
      mention: has((f) => f.mentions.length > 0),
      otherTracker: has((f) => f.otherTrackers.length > 0),
      owner: has((f) => f.owner),
      paren: countBy(
        fmt.filter((f) => f.parenKind),
        "parenKind"
      ),
      ownerOrMention: has((f) => f.hasOwner),
      condition: has((f) => f.condition),
      areaTag: has((f) => f.areaTag),
      external: has((f) => f.external),
      temporary: has((f) => f.temporary),
      trackerKey: has((f) => f.keys.length > 0),
      unicornArgs: has((f) => f.unicornArgs),
      url: has((f) => f.urls.length > 0),
      version: has((f) => f.version),
      year: has((f) => f.year),
    },
    markers: n,
    markersPer10k: per10k(n, lines),
    position: countBy(markers, "position"),
    term: countBy(markers, "term"),
  };
};

const summarise = (group) => {
  const lines = group.reduce((s, n) => s + perRepo[n].lines, 0);
  const files = group.reduce((s, n) => s + perRepo[n].files, 0);
  const comments = group.reduce((s, n) => s + perRepo[n].comments, 0);
  const rs = rows.filter((r) => group.includes(r.repo));
  const markers = rs.filter((r) => r.kind === "marker");
  const ruleTerms = markers.filter((r) => lib.RULE_TERMS.has(r.term));
  const todoLike = markers.filter((r) =>
    ["TODO", "FIXME", "XXX", "@todo", "TO DO", "TBD", "HACK", "BUG"].includes(
      r.term
    )
  );
  return {
    all: describe(markers, lines),
    comments,
    commentsPer10k: per10k(comments, lines),
    files,
    lines,
    markerComments: new Set(markers.map((m) => m.commentId)).size,
    markerCommentsPer10k: per10k(
      new Set(markers.map((m) => m.commentId)).size,
      lines
    ),
    nonMarkerOccurrences: countBy(
      rs.filter((r) => r.kind !== "marker"),
      (r) => `${r.term} ${r.kind}`
    ),
    // TODO, FIXME and XXX: the terms no-warning-comments and unicorn look for by default.
    ruleTerms: describe(ruleTerms, lines),
    taskMarkers: describe(todoLike, lines),
    wordingWithoutMarker: group.reduce(
      (s, n) => s + perRepo[n].wordingWithoutMarker,
      0
    ),
  };
};

const groups = {
  core: lib.CORE.filter((n) => names.includes(n)),
  coreWithoutNext: lib.CORE.filter((n) => names.includes(n) && n !== "next.js"),
  react: lib.REACT.filter((n) => names.includes(n)),
  dogfood: lib.DOGFOOD.filter((n) => names.includes(n)),
};
const result = {
  definitions: {
    bare: "No owner (TODO(name) naming a commit author, or an @mention of one), no link (issue/PR reference, URL, tracker key), no date, no version, no strict condition (an event to wait for: 'once X is released', 'remove when Y lands', 'blocked on Z') and no unicorn [condition].",
    bareLoose:
      "bare, and also none of the condition words once/when/whenever/after/until/unless/as soon as/pending/blocked on/waiting for/depends on anywhere in its text (they also describe code, so this undercounts bare TODOs).",
    paren:
      "TODO(x): issue (#n, URL, number), key (a tracker key such as NAR-804), date, person (every word is a commit author's name, first name, email local part or GitHub login in the history clone), topic (anything else), empty.",
    marker:
      "A term written in capitals, the JSDoc @todo tag, a term followed by ':' '(' '[' or a dash, or a term opening the comment (or a block comment's line). TODO, FIXME and TBD are markers anywhere. 'Note that…', 'review the…' and the like at the start of a sentence are prose; terms inside paths or words (foo.xxx, /xxx/) are embedded.",
    position:
      "start: only whitespace before the term in the comment (no-warning-comments' default location); start-decorated: only whitespace and * / ! # = + - before it; line-start: the start of a later line of a block comment; later: anywhere else.",
    ruleTerms:
      "TODO, FIXME, XXX (the default terms of no-warning-comments and unicorn/expiring-todo-comments).",
    taskMarkers: "TODO, FIXME, XXX, @todo, TO DO, TBD, HACK, BUG.",
    text: "The rest of the marker's comment line, plus the lines that continue it (next lines of a block comment, adjacent // comments at the same column), up to a blank line or another marker.",
    wordingWithoutMarker:
      "Comments with no marker that use hack/hacky/workaround/kludge/temporary/for now/ugly/quick fix/stopgap/band-aid (a rough indicator only).",
  },
  generated: new Date().toISOString().slice(0, 10),
  groups: Object.fromEntries(
    Object.entries(groups)
      .filter(([, g]) => g.length > 0)
      .map(([k, g]) => [k, { repos: g, ...summarise(g) }])
  ),
  repos: Object.fromEntries(
    names.map((n) => [n, { ...perRepo[n], ...summarise([n]) }])
  ),
  tools: lib.toolVersions(),
};
lib.writeJson(join(lib.RESULTS_DIR, "comment-census.json"), result);
lib.writeJson(join(lib.OUT_DIR, "markers.json"), {
  generated: result.generated,
  rows,
});
const c = result.groups.core;
console.log(
  `core: ${c.lines} lines, ${c.markerComments} marker comments (${c.markerCommentsPer10k}/10k), rule terms ${c.ruleTerms.markers}, bare ${c.ruleTerms.format.bareShare}%`
);
