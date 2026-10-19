// Shared definitions for the TODO-comments scripts (todo-*.cjs): the repos measured, the comment
// scanner, what counts as a task marker and how each marker is written, and runners for
// Ultracite's Oxlint, ESLint and Biome presets that keep each linter's full message and help text
// (what `ultracite fix --claude/--codex` hands an agent).
//
// The rules this topic is about:
//   no-warning-comments            Oxlint core, ESLint core (@eslint/js "all")
//   sonarjs/todo-tag, fixme-tag    Oxlint js-plugins (opt-in), ESLint core (eslint-plugin-sonarjs)
//   unicorn/expiring-todo-comments ESLint core (eslint-plugin-unicorn); Oxlint has no port
//   Biome                          no rule (checked against its configuration schema, inventory)
//
// Comments are taken from typescript-estree's `comments` array, which is what ESLint's
// `sourceCode.getAllComments()` returns, so strings, template literals, regexes, identifiers and
// JSX text never count. Oxlint parses with its own parser; the calibration and the corpus run
// check that both see the same comments (every diagnostic must land on a scanned comment).
"use strict";

// The four React codebases the accessibility post added are a separate, optional set here.
// Must be set before collect-files.cjs is loaded anywhere in the process.
process.env.CORPUS_REPO_LISTS ??= "repos-accessibility.json";

const { execFileSync } = require("node:child_process");
const { mkdirSync, readFileSync, writeFileSync } = require("node:fs");
const { dirname, join, resolve } = require("node:path");

const dc = require("./dead-code-lib.cjs");
const { collect, config, getRepo } = require("./collect-files.cjs");

const HERE = resolve(__dirname, "..");
const TOPIC = "todo-comments";
const RESULTS_DIR = join(HERE, "results", TOPIC);
const OUT_DIR = join(HERE, "out", TOPIC);
const CALIBRATION_DIR = join(HERE, "calibration", TOPIC);
const EXAMPLES_DIR = join(HERE, "examples", TOPIC);
const HISTORY_DIR = join(HERE, "repos", "history");
const { CLI, ULTRACITE } = dc;

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const flag = (name) => args.includes(`--${name}`);

// ── repos ──────────────────────────────────────────────────────────────
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
const DOGFOOD = ["ultracite"];
// From repos-accessibility.json. Measured here over every source file in their included
// directories (the accessibility post counted only .tsx/.jsx).
const REACT = ["shadcn", "radix", "react-aria", "supabase"];
const SETS = { core: CORE, dogfood: DOGFOOD, react: REACT };
const setOf = (name) =>
  Object.entries(SETS).find(([, names]) => names.includes(name))?.[0] ?? null;
const ALL = [...CORE, ...DOGFOOD, ...REACT];

const PINNED = Object.fromEntries(
  [
    ["zod", "284243fb0d6532665afdc9239188773bb624f73c"],
    ["hono", "f78a245abc393368583085e19c7f5b28b460bf51"],
    ["trpc", "796700d8653b3832409fff997e6f5789519b9ea7"],
    ["vite", "3b72997d42e7dd2b31898d0e68461e3025e836b6"],
    ["astro", "9050e3819c51b0383cced278c278bc6f45c63468"],
    ["excalidraw", "4c00f31ddcc20086bac1020428819fe0b9a30bce"],
    ["next.js", "d8bfc3c994670c367e6e31853b78f42e8b7fba85"],
    ["vscode", "959031245ebb1fe077e0d512e1397c0ae82006e4"],
    ...require("./repos-accessibility.json").repos.map((r) => [r.name, r.sha]),
  ].map(([k, v]) => [k, v])
);
const repoMeta = (name) => {
  const r = config.repos.find((x) => x.name === name);
  return { ...r, root: getRepo(name).root };
};
const checkPinned = (names) => {
  for (const name of names) {
    if (!PINNED[name]) {
      continue;
    }
    const head = dc.gitHead(getRepo(name).root);
    if (head !== PINNED[name]) {
      throw new Error(
        `${name} is at ${head}, not the pinned ${PINNED[name]}. Run clone.sh / a11y-clone.sh.`
      );
    }
  }
};
const shaOf = (name) => PINNED[name] ?? dc.gitHead(getRepo(name).root);
const selectedRepos = (fallback = ALL) => {
  const only = (arg("repos", "") || "").split(",").filter(Boolean);
  return only.length > 0 ? only : fallback;
};

// ── comments ───────────────────────────────────────────────────────────
const tsEstree = require(
  require.resolve("@typescript-eslint/typescript-estree", {
    paths: [
      dc.versionOf
        ? dirname(
            require.resolve("@typescript-eslint/parser", { paths: [CLI] })
          )
        : CLI,
    ],
  })
);
const tsEstreeVersion = dc.versionOf(
  "@typescript-eslint/typescript-estree",
  dirname(require.resolve("@typescript-eslint/parser", { paths: [CLI] }))
);

const lineStarts = (text) => {
  const starts = [0];
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 10) {
      starts.push(i + 1);
    }
  }
  return starts;
};

// Every comment in a file, as ESLint sees it. `jsx` marks `{/* … */}` children; `jsdoc` a `/**`
// block; `trailing` a comment with code before it on its first line.
const extractComments = (text, rel) => {
  const jsx = /\.(?:tsx|jsx)$/.test(rel);
  let ast;
  try {
    ast = tsEstree.parse(text, {
      comment: true,
      filePath: rel,
      jsx,
      loc: true,
      range: true,
    });
  } catch (error) {
    return { comments: [], error: String(error.message).split("\n")[0] };
  }
  const comments = ast.comments.map((c) => {
    const [start, end] = c.range;
    const before = text.slice(0, start);
    const lineStart = before.lastIndexOf("\n") + 1;
    const prefix = text.slice(lineStart, start);
    const after = text.slice(
      end,
      text.indexOf("\n", end) === -1 ? text.length : text.indexOf("\n", end)
    );
    const isJsx =
      c.type === "Block" &&
      /\{\s*$/.test(before.slice(-20)) &&
      /^\s*\}/.test(text.slice(end, end + 20));
    return {
      column: c.loc.start.column,
      end,
      endLine: c.loc.end.line,
      jsdoc:
        c.type === "Block" &&
        c.value.startsWith("*") &&
        !c.value.startsWith("**"),
      jsx: isJsx,
      line: c.loc.start.line,
      start,
      trailing: prefix.trim() !== "" && !(isJsx && /^\s*\{\s*$/.test(prefix)),
      codeAfter: after.trim() !== "" && !(isJsx && /^\s*\}/.test(after)),
      type: c.type,
      value: c.value,
    };
  });
  return { comments, error: null };
};

// ── task markers ───────────────────────────────────────────────────────
// Terms, in the order they're reported. "to do" also matches "to-do". `@todo` is the JSDoc tag.
// Plural or derived forms ("TODOs", "hacky", "bugfix") aren't markers.
const TERMS = [
  ["TODO", /todo/],
  ["FIXME", /fixme/],
  ["XXX", /xxx/],
  ["HACK", /hack/],
  ["BUG", /bug/],
  ["NOTE", /note/],
  ["OPTIMIZE", /optimi[sz]e/],
  ["REVIEW", /review/],
  ["TBD", /tbd/],
  ["TO DO", /to[ -]do/],
];
// The terms Ultracite's rules look for (no-warning-comments' and unicorn's defaults; sonarjs
// looks for TODO and FIXME). The others are counted for comparison only.
const RULE_TERMS = new Set(["TODO", "FIXME", "XXX"]);
const TERM_RE = new RegExp(
  `(?<![\\p{L}\\p{N}_])(@?)(${TERMS.map(([, re]) => re.source).join("|")})(?![\\p{L}\\p{N}_])`,
  "giu"
);
const termOf = (raw) => {
  const lower = raw.toLowerCase();
  return TERMS.find(([, re]) => new RegExp(`^${re.source}$`).test(lower))[0];
};
const caseOf = (raw) => {
  const letters = raw.replace(/[^A-Za-z]/g, "");
  if (letters === letters.toUpperCase()) {
    return "upper";
  }
  if (letters === letters.toLowerCase()) {
    return "lower";
  }
  if (
    letters[0] === letters[0].toUpperCase() &&
    letters.slice(1) === letters.slice(1).toLowerCase()
  ) {
    return "title";
  }
  return "mixed";
};

// What follows the term: "(…)", ":", "[…]", " -", "!", end of comment, or text.
const followOf = (rest) => {
  if (/^\s*\(/.test(rest)) {
    return "paren";
  }
  if (/^\s*:/.test(rest)) {
    return "colon";
  }
  if (/^\s*\[/.test(rest)) {
    return "bracket";
  }
  if (/^\s*[-–—]\s/.test(rest) || /^\s*[-–—]$/.test(rest)) {
    return "dash";
  }
  if (/^!/.test(rest)) {
    return "bang";
  }
  if (/^\s*$/.test(rest)) {
    return "end";
  }
  if (/^,/.test(rest)) {
    return "comma";
  }
  if (/^\.(?:\s|$)/.test(rest)) {
    return "period";
  }
  if (/^[^\s]/.test(rest)) {
    return "glued";
  }
  return "text";
};

// Where the term sits in its comment:
//   start          only whitespace before it in the comment value (no-warning-comments' default)
//   start-decorated  only whitespace and decoration (* / ! # - = +) before it, e.g. `/** TODO`
//   line-start     at the start of a later line of a block comment, after optional `*`
//   later          anywhere else
const positionOf = (value, index) => {
  const before = value.slice(0, index);
  if (/^\s*$/.test(before)) {
    return "start";
  }
  if (/^[\s*/!#=+-]*$/.test(before)) {
    return "start-decorated";
  }
  const lineBefore = before.slice(before.lastIndexOf("\n") + 1);
  if (before.includes("\n") && /^[\s*]*$/.test(lineBefore)) {
    return "line-start";
  }
  return "later";
};

// The decoration directly in front of the term on its line.
const decorationOf = (value, index, at) => {
  if (at) {
    return "@";
  }
  const lineBefore = value.slice(value.lastIndexOf("\n", index - 1) + 1, index);
  const trimmed = lineBefore.replace(/\s+$/, "");
  if (trimmed === "") {
    return "none";
  }
  const last = trimmed.at(-1);
  if (/[*/!#=+-]/.test(last) && /^[\s*/!#=+-]*$/.test(lineBefore)) {
    return `decoration ${JSON.stringify(trimmed.trim())}`;
  }
  if (/[([{]/.test(last)) {
    return "bracket";
  }
  if (/["'`]/.test(last)) {
    return "quote";
  }
  return "text";
};

// Is this occurrence a task marker, or prose / a placeholder?
//   At the start of the comment (or of a block comment's line): a marker if it's in capitals, is
//   followed by ":" "(" "[" a dash or "!", or is TODO, FIXME, TBD or XXX. "Note that …",
//   "Review the …" and "Bug in …" there are sentences.
//   Later in the comment: TODO, FIXME and TBD in any case, and the other terms in capitals.
//   The JSDoc @todo tag is always a marker. A term inside a path, word or placeholder ("foo.xxx",
//   "/xxx/", "{XXX}", "next-test-XXX") is embedded.
const markerKind = (m) => {
  if (m.at) {
    return "marker";
  }
  const prev = m.prevChar ?? "";
  const next = m.nextChar ?? "";
  if (/^[./\\]\S/.test(m.rest) && !["TODO", "FIXME"].includes(m.term)) {
    return "embedded";
  }
  // `{TODO}` is a placeholder for a value still to be written: a TODO, not a path.
  const placeholder =
    /\{$/.test(prev) && /^\}/.test(next) && ["TODO", "FIXME"].includes(m.term);
  if (!placeholder && (/[./\\{~_-]$/.test(prev) || /^[}~_]/.test(next))) {
    return "embedded";
  }
  const upper = m.caseOf === "upper" && m.raw.length > 1;
  if (m.position !== "later") {
    if (
      upper ||
      ["paren", "colon", "bracket", "dash", "bang"].includes(m.follow)
    ) {
      return "marker";
    }
    return ["TODO", "FIXME", "TBD", "XXX"].includes(m.term)
      ? "marker"
      : "prose";
  }
  if (["TODO", "FIXME", "TBD"].includes(m.term)) {
    return "marker";
  }
  return upper ? "marker" : "prose";
};

// ── how a TODO is written: owner, link, date, version, condition ────────
const URL_RE = /\bhttps?:\/\/[^\s)>\]"'`]+/g;
const ISSUE_URL_RE =
  /\bhttps?:\/\/(?:www\.)?github\.com\/([\w.-]+)\/([\w.-]+)\/(issues|pull|discussions)\/(\d+)/g;
const OTHER_TRACKER_RE =
  /\b(?:https?:\/\/)?(?:crbug\.com\/\d+|bugs\.chromium\.org\/\S+|issues\.chromium\.org\/issues\/\d+|bugzilla\.mozilla\.org\/\S+|bugs\.webkit\.org\/\S+|bugs\.webkit\.org|github\.com\/[\w.-]+\/[\w.-]+\/security\/\S+|linear\.app\/\S+|youtrack\.\S+|gitlab\.com\/\S+\/-\/issues\/\d+)/gi;
// owner/repo#123, #123, GH-123
const SHORT_REF_RE = /(?:\b([\w.-]+\/[\w.-]+))?#(\d{1,6})\b|\bGH-(\d+)\b/g;
// Tracker keys such as NEXT-1234 (Linear) or ABC-12 (Jira), the shape sonarjs/todo-tag ignores.
// Common acronyms with a number are not keys.
const KEY_RE = /\b([A-Z][A-Z0-9]+)-(\d+)\b/g;
const NOT_KEYS = new Set([
  "UTF",
  "ES",
  "ISO",
  "RFC",
  "SHA",
  "ECMA",
  "HTTP",
  "TLS",
  "WCAG",
  "IE",
  "UTF8",
  "ECMASCRIPT",
  "MD",
  "AES",
  "RSA",
  "LATIN",
  "X",
  "CP",
  "WINDOWS",
  "BASE",
  "INT",
  "UINT",
  "FLOAT",
  "IPV",
  "H",
  "TS",
]);
const DATE_RE =
  /\b(?:(?:19|20)\d\d-(?:0[1-9]|1[0-2])(?:-(?:0[1-9]|[12]\d|3[01]))?|(?:0?[1-9]|1[0-2])\/(?:0?[1-9]|[12]\d|3[01])\/(?:19|20)?\d\d|(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.? (?:\d{1,2}(?:st|nd|rd|th)?,? )?(?:19|20)\d\d|Q[1-4] ?(?:19|20)\d\d)\b/i;
const YEAR_RE = /\b20[0-3]\d\b/;
const VERSION_RE =
  /\b(?:v\d+(?:\.\d+){0,2}\b|\d+\.\d+\.\d+\b|(?:node(?:\.?js)?|typescript|ts|react|vite|webpack|turbopack|rollup|rolldown|esbuild|chrome|safari|firefox|electron|bun|deno|es|ecmascript|next(?:\.?js)?|astro|zod|hono|trpc|tanstack|v8|swc|babel|eslint|biome|oxlint|css|html)\s*v?\d+(?:\.\d+){0,2}\b|(?:next|upcoming|following|future|a) (?:major|minor|breaking)(?: version| release)?\b|major (?:version|release|bump)\b|breaking change\b|\bsemver\b)/i;
// Words that can make a TODO conditional ("loose"): they also appear in descriptions of the code
// ("handle the case when x is null"), so this over-counts.
const CONDITION_WORD_RE =
  /\b(?:once|when|whenever|after|until|unless|as soon as|blocked (?:on|by)|wait(?:ing)? (?:on|for)|depends on|pending)\b/i;
// The strict reading: the TODO names an event to wait for ("once X is released", "remove when Y
// lands", "blocked on Z"), or a removal tied to one.
const CONDITION_RE =
  /\b(?:(?:remove|delete|drop|revert|clean ?up|get rid of|replace|switch|migrate|move|update|upgrade|change|enable|disable|use|re-?enable|stop)\b[^.;\n]{0,80}?\b(?:once|when|after|until|as soon as)\b|(?:once|when|after|until|as soon as)\b[^.;\n]{0,80}?\b(?:is|are|has been|have been|gets?|becomes?|lands?|landed|ships?|shipped|merged?|fixed|resolved|stable|supported|available|released|deprecated|removed|dropped|implemented|done|ready|out|upgraded?|bumped|enabled|published|we (?:upgrade|drop|move|switch|support|remove|bump|have|can|do|migrate))\b|\b(?:blocked (?:on|by)|wait(?:ing)? (?:on|for)|depends on)\b)/i;
// Signals of a temporary measure or an external cause (counted, not part of "bare").
const TEMPORARY_RE =
  /\b(?:temporar(?:y|ily)|for now|in the meantime|stopgap|workaround|work around)\b/i;
const EXTERNAL_RE =
  /\b(?:upstream|deprecat\w*|polyfill|browsers?|safari|chrome|firefox|node(?:\.?js)? \d|bug in|issue in|fixed in|is fixed|gets? fixed)\b/i;
const MENTION_RE = /(?<![\w.])@([A-Za-z0-9][A-Za-z0-9-]{0,38})\b/g;
const JSDOC_TAGS = new Set([
  "param",
  "returns",
  "return",
  "type",
  "typedef",
  "see",
  "link",
  "deprecated",
  "example",
  "default",
  "internal",
  "private",
  "public",
  "experimental",
  "throws",
  "todo",
  "since",
  "property",
  "template",
  "remarks",
  "description",
  "ts",
  "satisfies",
  "jsx",
  "jsximportsource",
  "vite",
  "license",
  "file",
  "fileoverview",
  "module",
  "inheritdoc",
  "override",
  "readonly",
  "beta",
  "alpha",
  "category",
  "packagedocumentation",
  "group",
  "eslint",
  "returns",
  "jsxruntime",
  "jsxfrag",
  "summary",
  "enum",
  "callback",
  "extends",
  "implements",
  "augments",
  "class",
  "constructor",
  "function",
  "memberof",
  "namespace",
  "event",
  "fires",
  "listens",
  "access",
  "author",
  "version",
  "copyright",
  "import",
  "typeparam",
  "exports",
  "ignore",
  "hidden",
  "nocollapse",
  "const",
  "final",
  "abstract",
  "async",
  "generator",
  "yields",
  "this",
  "global",
  "lends",
  "name",
  "kind",
  "variation",
  "tutorial",
  "requires",
  "constant",
  "external",
  "host",
  "interface",
  "member",
  "mixes",
  "mixin",
  "static",
  "instance",
  "inner",
  "virtual",
  "ngInject",
  "nosideeffects",
  "preserve",
  "__pure__",
  "pure",
  "next",
  "check",
  "ts-ignore",
  "ts-expect-error",
  "ts-nocheck",
  "ts-check",
]);

const STARTS_MARKER = /^\s*@?(?:todo|fixme|xxx|hack|bug|note)\b/i;
const HAS_MARKER = /\b(?:TODO|FIXME|XXX|HACK)\b/;

// The text a marker owns: the rest of its comment line, plus the lines that continue it (the next
// lines of a block comment, or the next adjacent `//` comments at the same column), up to a blank
// line or another marker.
const markerText = (comment, offsetInValue, followers) => {
  const value = comment.value;
  const lineEnd = value.indexOf("\n", offsetInValue);
  const lines = [
    value.slice(offsetInValue, lineEnd === -1 ? value.length : lineEnd),
  ];
  if (comment.type === "Block" && lineEnd !== -1) {
    for (const next of value.slice(lineEnd + 1).split("\n")) {
      const stripped = next.replace(/^\s*\*?\s?/, "");
      if (stripped.trim() === "" || stripped.trim() === "/") {
        break;
      }
      if (STARTS_MARKER.test(stripped) || HAS_MARKER.test(stripped)) {
        break;
      }
      lines.push(stripped);
    }
  }
  for (const f of followers) {
    const stripped = f.value.replace(/^\s?/, "");
    if (
      stripped.trim() === "" ||
      STARTS_MARKER.test(stripped) ||
      HAS_MARKER.test(stripped)
    ) {
      break;
    }
    lines.push(stripped);
  }
  return lines.join("\n");
};

// `authors` (optional): lowercased names, first names, email local parts and GitHub logins of the
// repo's commit authors, from its history clone, to tell `TODO(person)` from `TODO(topic)`.
const describeFormat = (raw, rest, text, authors = null) => {
  const issueUrls = [...text.matchAll(ISSUE_URL_RE)].map((m) => ({
    kind: m[3] === "pull" ? "pr" : m[3] === "issues" ? "issue" : "discussion",
    number: Number(m[4]),
    repo: `${m[1]}/${m[2]}`.toLowerCase(),
    text: m[0],
  }));
  const urls = [...text.matchAll(URL_RE)].map((m) => m[0]);
  const shortRefs = [...text.matchAll(SHORT_REF_RE)]
    .filter((m) => {
      // `#123` inside a URL fragment isn't a reference.
      const before = text.slice(Math.max(0, m.index - 1), m.index);
      return !/[\w/=&?]/.test(before) || m[1];
    })
    .map((m) => ({
      number: Number(m[2] ?? m[3]),
      repo: m[1] ? m[1].toLowerCase() : null,
      text: m[0],
    }))
    .filter((r) => !urls.some((u) => u.includes(r.text)));
  const otherTrackers = [...text.matchAll(OTHER_TRACKER_RE)].map((m) => m[0]);
  const keys = [...text.matchAll(KEY_RE)]
    .filter((m) => !NOT_KEYS.has(m[1]) && !/^[A-Z]\d*$/.test(m[1]))
    .map((m) => m[0]);
  // TODO(x): an issue, a tracker key, a date, a person (a commit author) or a topic.
  const parenMatch = /^\s*\(([^)]*)\)/.exec(rest);
  const paren = parenMatch ? parenMatch[1].trim() : null;
  let parenKind = null;
  if (paren !== null) {
    const lower = paren.replace(/^@/, "").toLowerCase();
    if (paren === "") {
      parenKind = "empty";
    } else if (/#\d|https?:|^\d+$/.test(paren)) {
      parenKind = "issue";
    } else if (/\b[A-Z][A-Z0-9]+-\d+\b/.test(paren)) {
      parenKind = "key";
    } else if (/\d{4}-\d\d/.test(paren)) {
      parenKind = "date";
    } else if (
      authors &&
      lower
        .split(/[\s,/&]+/)
        .filter(Boolean)
        .every((part) => authors.has(part))
    ) {
      parenKind = "person";
    } else {
      parenKind = "topic";
    }
  }
  // TODO-APP:, TODO-METADATA: (an area tag glued to the term)
  const areaTag = /^-([A-Z][A-Z0-9_-]*)\b/.exec(rest)?.[1] ?? null;
  const mentions = [...text.matchAll(MENTION_RE)]
    .map((m) => m[1])
    .filter((name) => !JSDOC_TAGS.has(name.toLowerCase()))
    .filter(
      (name) =>
        !/^(?:types|vitejs|babel|astrojs|trpc|tanstack|vercel|next|swc|rollup|rolldown|excalidraw|typescript-eslint|jest|testing-library|emotion|mui|reach|radix-ui|react-aria|internationalized)$/i.test(
          name
        )
    )
    .filter((name) => !authors || authors.has(name.toLowerCase()));
  const unicornArgs = /^\s*\[([^\]]+)\]/.exec(rest)?.[1] ?? null;
  const date = DATE_RE.exec(text)?.[0] ?? null;
  const year = YEAR_RE.exec(text)?.[0] ?? null;
  const version = VERSION_RE.exec(text)?.[0] ?? null;
  const conditionWord = CONDITION_WORD_RE.exec(text)?.[0] ?? null;
  const condition = CONDITION_RE.exec(text)?.[0] ?? null;
  const temporary = TEMPORARY_RE.exec(text)?.[0] ?? null;
  const external = EXTERNAL_RE.exec(text)?.[0] ?? null;
  const issueRefs = [...issueUrls, ...shortRefs];
  const hasLink =
    issueRefs.length > 0 ||
    urls.length > 0 ||
    otherTrackers.length > 0 ||
    keys.length > 0;
  // TODO@name (VS Code's convention) names an owner too.
  const atOwner = /^@([A-Za-z0-9][\w-]{0,38})/.exec(rest)?.[1] ?? null;
  const owner = parenKind === "person" ? paren.replace(/^@/, "") : atOwner;
  const hasOwner = Boolean(owner) || mentions.length > 0;
  const base = !hasLink && !hasOwner && !date && !version && !unicornArgs;
  return {
    areaTag,
    atOwner,
    bare: base && !condition,
    bareLoose: base && !condition && !conditionWord,
    condition,
    conditionWord,
    date,
    external,
    hasLink,
    hasOwner,
    issueRefs,
    keys,
    mentions,
    otherTrackers,
    owner,
    paren,
    parenKind,
    temporary,
    unicornArgs,
    urls,
    version,
    year,
  };
};

// Every term occurrence in a file's comments, with how it's written.
const analyseFile = (text, rel, authors = null) => {
  const { comments, error } = extractComments(text, rel);
  const occurrences = [];
  for (let ci = 0; ci < comments.length; ci++) {
    const c = comments[ci];
    // Adjacent `//` comments that continue this one: consecutive lines, same column, nothing else
    // on the line.
    const followers = [];
    if (c.type === "Line") {
      for (let j = ci + 1; j < comments.length; j++) {
        const f = comments[j];
        const prev = j === ci + 1 ? c : comments[j - 1];
        if (
          f.type !== "Line" ||
          f.line !== prev.line + 1 ||
          f.column !== c.column ||
          f.trailing
        ) {
          break;
        }
        followers.push(f);
      }
    }
    TERM_RE.lastIndex = 0;
    for (const m of c.value.matchAll(TERM_RE)) {
      const at = m[1] === "@";
      const raw = m[2];
      const index = m.index + m[1].length;
      const term = at && raw.toLowerCase() === "todo" ? "@todo" : termOf(raw);
      if (at && term !== "@todo") {
        continue; // @note, @review … aren't task tags.
      }
      const rest = c.value.slice(index + raw.length);
      const occ = {
        at,
        caseOf: caseOf(raw),
        commentIndex: ci,
        decoration: decorationOf(c.value, m.index, at),
        follow: followOf(rest),
        nextChar: rest[0] ?? null,
        offsetInValue: index,
        position: positionOf(c.value, m.index),
        prevChar: m.index > 0 ? c.value[m.index - 1] : null,
        raw,
        rest: rest.slice(0, 120),
        term,
      };
      occ.kind = markerKind(occ);
      // The line of the term inside the file (block comments span lines).
      const valueStart = c.start + 2;
      const absolute = valueStart + index;
      occ.line = c.line + (c.value.slice(0, index).match(/\n/g)?.length ?? 0);
      occ.absolute = absolute;
      if (occ.kind === "marker") {
        const owned = markerText(c, index, followers);
        occ.text = owned.slice(0, 600);
        occ.format = describeFormat(raw, rest, owned, authors);
      }
      occurrences.push(occ);
    }
  }
  return { comments, error, occurrences };
};

// ── commit authors, to tell TODO(person) from TODO(topic) ────────────────
// From the history clone (todo-history-clone.sh). Without one, every TODO(x) that isn't an issue,
// key or date counts as a topic.
const authorCache = new Map();
const authorTokens = (name) => {
  if (authorCache.has(name)) {
    return authorCache.get(name);
  }
  const dir = join(HISTORY_DIR, `${name}.git`);
  let out = null;
  if (PINNED[name] && require("node:fs").existsSync(dir)) {
    const log = execFileSync(
      "git",
      ["-C", dir, "log", "--format=%an%x09%ae", PINNED[name]],
      {
        encoding: "utf8",
        maxBuffer: 1 << 28,
      }
    );
    out = new Set();
    for (const line of log.split("\n")) {
      const [author, email = ""] = line.split("\t");
      if (!author) {
        continue;
      }
      const lower = author.toLowerCase();
      out.add(lower);
      out.add(lower.replace(/\s+/g, ""));
      out.add(lower.split(/\s+/)[0]);
      const local = email.toLowerCase().split("@")[0];
      out.add(local);
      const noreply = /^(?:\d+\+)?([^@]+)@users\.noreply\.github\.com$/i.exec(
        email
      );
      if (noreply) {
        out.add(noreply[1].toLowerCase());
      }
    }
    out.delete("");
  }
  authorCache.set(name, out);
  return out;
};

// ── what each rule matches, reimplemented from its source ─────────────
// todo-linters.cjs checks these against the real rules on the calibration cases and the corpus,
// comment by comment; any difference fails the run. They are what explains a miss.
//
// no-warning-comments (ESLint 10.12.0 lib/rules/no-warning-comments.js; Oxlint documents the same
// options and defaults): for each term, /^[\s<decoration>]*<term>\b/iu at location "start", or
// /\b<term>\b/iu "anywhere". A directive comment that names the rule itself is skipped.
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const nwcTerms = (
  value,
  { decoration = [], location = "start", terms = ["todo", "fixme", "xxx"] } = {}
) => {
  if (
    /^\s*(?:eslint|oxlint)-(?:disable|enable)/.test(value) &&
    /\bno-warning-comments\b/.test(value)
  ) {
    return [];
  }
  return terms.filter((term) => {
    const escaped = escapeRe(term);
    const prefix =
      location === "start"
        ? `^[\\s${escapeRe(decoration.join(""))}]*`
        : /^\w/.test(term)
          ? "\\b"
          : "";
    const suffix = /\w$/.test(term) ? "\\b" : "";
    return new RegExp(`${prefix}${escaped}${suffix}`, "iu").test(value);
  });
};

// sonarjs/todo-tag and fixme-tag (eslint-plugin-sonarjs 4.2.2, S1135/rule.js): the pattern
// anywhere, case-insensitive, not next to a letter; at most one report per line of the comment;
// comments starting with "eslint-disable" are skipped. todo-tag also skips a TODO followed on its
// line by a tracker key (/\b[A-Z][A-Z0-9]+-\d+\b/), "Todo" opening a sentence or the comment, and
// "todo" in lower case anywhere else ("prose").
const SONAR_LETTER = /[\p{Letter}]/u;
const SONAR_KEY = /\b[A-Z][A-Z0-9]+-\d+\b/u;
const SONAR_COMMENT_START = /^[\s*]*$/u;
const SONAR_SENTENCE_START = /[.!?][\s([{"'*]*$/u;
const sonarLines = (value, pattern) => {
  if (value.trim().startsWith("eslint-disable")) {
    return [];
  }
  const lower = value.toLowerCase();
  if (!lower.includes(pattern)) {
    return [];
  }
  const originals = value.split(/\r\n?|\n/);
  const out = [];
  lower.split(/\r\n?|\n/).forEach((line, lineIdx) => {
    let from = 0;
    while (from < line.length) {
      const index = line.indexOf(pattern, from);
      if (index < 0) {
        break;
      }
      const end = index + pattern.length;
      const letterAround =
        (index > 0 && SONAR_LETTER.test(line.charAt(index - 1))) ||
        (end <= line.length - 1 && SONAR_LETTER.test(line.charAt(end)));
      let ignored = null;
      if (!letterAround && pattern === "todo") {
        const original = originals[lineIdx];
        const matched = original.slice(index, end);
        const prefix = original.slice(0, index);
        const sentenceStart =
          SONAR_COMMENT_START.test(prefix) || SONAR_SENTENCE_START.test(prefix);
        if (SONAR_KEY.test(original.slice(end))) {
          ignored = "key";
        } else if (
          (matched === "Todo" && sentenceStart) ||
          (matched === "todo" && !sentenceStart)
        ) {
          ignored = "prose";
        }
      }
      if (!letterAround && !ignored) {
        out.push({ index, lineIdx });
        break;
      }
      from = end;
    }
  });
  return out;
};
// Why sonarjs/todo-tag passes over each "todo" on a line (for the miss table).
const sonarTodoSkips = (value) => {
  const directive = value.trim().startsWith("eslint-disable");
  const lower = value.toLowerCase();
  const originals = value.split(/\r\n?|\n/);
  const out = [];
  lower.split(/\r\n?|\n/).forEach((line, lineIdx) => {
    let from = 0;
    while (from < line.length) {
      const index = line.indexOf("todo", from);
      if (index < 0) {
        break;
      }
      const end = index + 4;
      const original = originals[lineIdx];
      const matched = original.slice(index, end);
      const prefix = original.slice(0, index);
      const sentenceStart =
        SONAR_COMMENT_START.test(prefix) || SONAR_SENTENCE_START.test(prefix);
      let reason = null;
      if (directive) {
        reason = "an eslint-disable directive";
      } else if (
        (index > 0 && SONAR_LETTER.test(line.charAt(index - 1))) ||
        (end <= line.length - 1 && SONAR_LETTER.test(line.charAt(end)))
      ) {
        reason = "letter next to it";
      } else if (SONAR_KEY.test(original.slice(end))) {
        reason = "tracker key after it";
      } else if (matched === "Todo" && sentenceStart) {
        reason = "'Todo' opening a sentence";
      } else if (matched === "todo" && !sentenceStart) {
        reason = "lower-case 'todo' mid-sentence";
      }
      out.push({ index, lineIdx, matched, reason });
      from = end;
    }
  });
  return out;
};

// unicorn/expiring-todo-comments (eslint-plugin-unicorn 77.0.0) with Ultracite's options, which are
// its defaults: allowWarningComments true (a TODO without conditions is never reported) and
// checkDates false (an expired date is never reported). So it can only report a comment line that
// contains one of its terms and a [bracketed] argument list it can parse.
const unicornCandidate = (value) =>
  value
    .split("\n")
    .some((line) => /todo|fixme|xxx/i.test(line) && /\[[^}]+]/.test(line));

// ── linters ────────────────────────────────────────────────────────────
// Oxlint as `ultracite init` writes its root config. "default" is core + react, like the earlier
// topics' calibration; js-plugins adds the sonarjs rules.
const OXLINT_CONFIGS = {
  default: ["core", "react"],
  "js-plugins": ["core", "react", "js-plugins"],
};
const oxlintConfig = (name, dir = OUT_DIR) =>
  dc.writeOxlintConfig(OXLINT_CONFIGS[name], dir);

const FOCUS_OXLINT = [
  "no-warning-comments",
  "sonarjs/todo-tag",
  "sonarjs/fixme-tag",
];
const FOCUS_ESLINT = [
  "no-warning-comments",
  "sonarjs/todo-tag",
  "sonarjs/fixme-tag",
  "unicorn/expiring-todo-comments",
];
// Other rules that read comments and can fire on the same comment.
const RELATED = new Set([
  "no-inline-comments",
  "capitalized-comments",
  "multiline-comment-style",
  "line-comment-position",
  "spaced-comment",
  "sonarjs/no-commented-code",
  "unicorn/no-abusive-eslint-disable",
  "eslint-comments/no-unlimited-disable",
  "typescript/ban-ts-comment",
  "@typescript-eslint/ban-ts-comment",
  "jsdoc/check-tag-names",
  "jsdoc/no-bad-blocks",
  "jsdoc/require-description",
  "jsdoc/match-description",
  "react/jsx-no-comment-textnodes",
  "react/todo",
  "suspicious/noCommentText",
]);
const isFocus = (rule) => FOCUS_ESLINT.includes(dc.toOxlintName(rule));

const runOxlint = ({ cwd, files, configFile, keep = null, fix = null }) => {
  if (fix) {
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

// ESLint with Ultracite's own preset modules. `inline: true` honours the files' disable comments
// (reported); the default ignores them (raw).
const runEslint = async ({
  cwd,
  files,
  presets = ["core"],
  keep = null,
  inline = false,
  extra = [],
}) =>
  dc.runEslint({
    cwd,
    extra: [
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
    ],
    files,
    keep,
    presets,
  });

// `eslint --fix` in place (run it on copies).
const eslintFix = async ({ cwd, files, presets = ["core"] }) => {
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
    ],
    overrideConfigFile: true,
  });
  const results = await instance.lintFiles(files);
  await ESLint.outputFixes(results);
  return results.filter((r) => r.output !== undefined).length;
};

// The options a file actually gets, from ESLint's own resolver.
const eslintResolved = async ({ cwd, file, presets = ["core"] }) => {
  const { ESLint } = require(require.resolve("eslint", { paths: [CLI] }));
  const blocks = await dc.eslintBlocks({ presets });
  const instance = new ESLint({
    cwd,
    overrideConfig: blocks,
    overrideConfigFile: true,
  });
  return instance.calculateConfigForFile(file);
};

const BIOME_BASE = dc.BIOME_BASE;
const biomeUltracite = (presets = ["core"], dir = OUT_DIR) =>
  dc.writeBiomeConfig(
    `ultracite-${presets.join("+")}`,
    {
      ...BIOME_BASE,
      extends: presets.map((p) => join(CLI, "config/biome", p, "biome.jsonc")),
    },
    dir
  );
const runBiome = ({
  cwd,
  files,
  configDir,
  write = null,
  timeout = 60_000,
}) => {
  if (write) {
    const r = require("node:child_process").spawnSync(
      process.execPath,
      [dc.biomeBin, "check", `--config-path=${configDir}`, ...write, ...files],
      { cwd, encoding: "utf8", maxBuffer: 1 << 29, timeout }
    );
    return { timedOut: Boolean(r.signal) };
  }
  let stdout;
  try {
    stdout = execFileSync(
      process.execPath,
      [
        dc.biomeBin,
        "lint",
        `--config-path=${configDir}`,
        "--reporter=json",
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
    stdout = error.stdout;
  }
  const report = JSON.parse(stdout);
  return (report.diagnostics ?? []).map((d) => {
    const path = d.location?.path;
    return {
      column: d.location?.start?.column,
      file: typeof path === "string" ? path : (path?.file ?? null),
      line: d.location?.start?.line,
      message: typeof d.message === "string" ? d.message : null,
      rule: (d.category ?? "").replace(/^lint\//, ""),
    };
  });
};

const toolVersions = () => ({
  ...dc.toolVersions(),
  "@typescript-eslint/typescript-estree (comment scanner)": tsEstreeVersion,
  "eslint-plugin-sonarjs (ESLint)": dc.versionOf("eslint-plugin-sonarjs", CLI),
  git: execFileSync("git", ["--version"], { encoding: "utf8" }).trim(),
  gh: (() => {
    try {
      return execFileSync("gh", ["--version"], { encoding: "utf8" }).split(
        "\n"
      )[0];
    } catch {
      return null;
    }
  })(),
});

const writeJson = (file, data) => {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
};
const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));

module.exports = {
  ALL,
  CALIBRATION_DIR,
  CLI,
  CORE,
  DOGFOOD,
  EXAMPLES_DIR,
  FOCUS_ESLINT,
  FOCUS_OXLINT,
  HERE,
  HISTORY_DIR,
  OUT_DIR,
  OXLINT_CONFIGS,
  PINNED,
  REACT,
  RELATED,
  RESULTS_DIR,
  RULE_TERMS,
  SETS,
  TERMS,
  TOPIC,
  ULTRACITE,
  analyseFile,
  nwcTerms,
  sonarLines,
  sonarTodoSkips,
  unicornCandidate,
  authorTokens,
  arg,
  biomeUltracite,
  checkPinned,
  collect,
  dc,
  describeFormat,
  eslintFix,
  eslintResolved,
  extractComments,
  flag,
  isFocus,
  lineStarts,
  oxlintConfig,
  readJson,
  repoMeta,
  runBiome,
  runEslint,
  runOxlint,
  selectedRepos,
  setOf,
  shaOf,
  toolVersions,
  writeJson,
};
