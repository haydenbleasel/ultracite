// Shared definitions for the length-limit scripts (length-*.cjs): the repos and files measured
// (source and, separately, tests), the per-function and per-file inventory, the rules this topic
// is about in each linter, runners that keep every message and help text (what
// `ultracite fix --claude/--codex` hands an agent), and the joins from a diagnostic to the function
// or file it is about.
//
// The rules, and what Ultracite does with them (read from packages/cli/config by length-rules.cjs):
//   size limits, off in every preset:
//     ESLint    max-lines, max-lines-per-function, max-statements, max-params, max-depth,
//               @typescript-eslint/max-params; sonarjs/max-lines, sonarjs/max-lines-per-function
//               (and sonarjs/nested-control-flow, "a duplicate of max-depth")
//     Oxlint    the ESLint rules' ports (no typescript/max-params); sonarjs through js-plugins
//     Biome     noExcessiveLinesPerFunction and useMaxParams ("off")
//   structural limits, on:
//     max-nested-callbacks (10) and max-classes-per-file (1) in ESLint and Oxlint; Biome's
//     noExcessiveNestedCallbacks (max 10); sonarjs/max-switch-cases (30) and max-union-size (3) in
//     ESLint core and Oxlint js-plugins; cognitive complexity at 20
//
// The inventory runs one ESLint `Linter` pass per file with the TypeScript parser and scope
// analysis: a local census rule that measures every function itself (each rule's count,
// reimplemented from its source), and the real ESLint and SonarJS rules at threshold 0 (their
// messages carry the counts). The two are joined function by function and must agree;
// length-census.cjs fails if they don't.
//
// Read-only with respect to the clones: files are parsed, never run. Linters and the formatter run
// on copies under TMP.
"use strict";

// The four React codebases from the accessibility post are a separate set. Must be set before
// collect-files.cjs is loaded anywhere in the process.
process.env.CORPUS_REPO_LISTS ??= "repos-accessibility.json";

const { execFileSync, spawnSync } = require("node:child_process");
const {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} = require("node:fs");
const { tmpdir } = require("node:os");
const { dirname, join, relative, resolve } = require("node:path");
const { pathToFileURL } = require("node:url");

const sk = require("./sort-keys-lib.cjs");
const {
  collect,
  getRepo,
  EXCLUDED_DIR_NAMES,
  EXCLUDED_FILE_PATTERNS,
} = require("./collect-files.cjs");
const tools = require("./tools.cjs");

const { dc } = sk;
const HERE = resolve(__dirname, "..");
const TOPIC = "length-limits";
const RESULTS_DIR = join(HERE, "results", TOPIC);
const OUT_DIR = join(HERE, "out", TOPIC);
const CALIBRATION_DIR = join(HERE, "calibration", TOPIC);
const EXAMPLES_DIR = join(HERE, "examples", TOPIC);
const HISTORY_DIR = join(HERE, "repos", "history");
// Copies the linters and the formatter write or lint. Ultracite's presets ignore `**/out`.
const TMP =
  process.env.LENGTH_TMP ?? join(tmpdir(), "ultracite-research-length-limits");
const { CLI, ULTRACITE } = dc;

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const flag = (name) => args.includes(`--${name}`);

// ── repos ──────────────────────────────────────────────────────────────
const { CORE, REACT, PINNED } = sk;
const DOGFOOD = ["ultracite"];
const ALL = [...CORE, ...REACT, ...DOGFOOD];
const SETS = { core: CORE, dogfood: DOGFOOD, react: REACT };
const setOf = (name) =>
  CORE.includes(name) ? "core" : REACT.includes(name) ? "react" : "dogfood";
const selectedRepos = (fallback = ALL) => {
  const only = (arg("repos", "") || "").split(",").filter(Boolean);
  return only.length > 0 ? only : fallback;
};
const { repoMeta, checkPinned } = sk;
const shaOf = (name) =>
  PINNED[name] ?? dc.gitHead(getRepo(name).root) ?? "unknown";
const permalink = (name, file, line, endLine) =>
  dc.permalink(repoMeta(name).github, shaOf(name), file, line, endLine);

// ── files ──────────────────────────────────────────────────────────────
// Source files are exactly collect-files.cjs's lists (the same as every topic). Test files are the
// files under the same included directories that collect-files.cjs drops for being tests: in a
// test directory (__tests__, __test__, __tests_dts__, test, tests) or named *.test.* / *.spec.* /
// test-utils.*. Everything else collect-files.cjs drops stays dropped for tests too: fixtures,
// mocks, snapshots, vendored, compiled and generated code, declaration files, benchmarks, stories,
// repo-specific exclusions and files with a third-party license header. Ultracite's own tests are
// in packages/cli/__tests__, outside its included directory, so they're listed here.
const TEST_DIR_NAMES = new Set([
  "__tests__",
  "__test__",
  "__tests_dts__",
  "test",
  "tests",
]);
const TEST_FILE = [
  /\.(?:test|spec)\.[cm]?[jt]sx?$/,
  /(?:^|[-_.])test-?utils?\.[cm]?[jt]sx?$/i,
];
// Test directories next to the measured source (only those present in the clones): Astro's and
// tRPC's packages keep tests in a sibling test/, React Aria in packages/react-aria-components/test,
// and Ultracite in packages/cli/__tests__. Next.js's and VS Code's test trees aren't in their
// sparse clones, so only their colocated *.test.* files count.
const EXTRA_TEST_ROOTS = {
  astro: ["packages/astro/test"],
  "react-aria": ["packages/react-aria-components/test"],
  trpc: [
    "client",
    "next",
    "openapi",
    "react-query",
    "server",
    "tanstack-react-query",
    "upgrade",
  ].map((p) => `packages/${p}/test`),
  ultracite: ["packages/cli/__tests__"],
};
const SOURCE_EXT = /\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs)$/;
const LICENSE_RE =
  /(?:MIT License|The MIT License|Copyright \(c\)|@copyright|Permission is hereby granted|Licensed under the Apache)/i;

const collectTests = (name) => {
  const repo = getRepo(name);
  const excludedPaths = (repo.exclude ?? []).map((p) => p.replace(/\/$/, ""));
  const isRepoExcluded = (rel) =>
    excludedPaths.some((p) => rel === p || rel.startsWith(`${p}/`));
  const out = [];
  const visit = (dir, inTestDir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const abs = join(dir, e.name);
      const rel = relative(repo.root, abs).split("\\").join("/");
      if (e.isSymbolicLink()) {
        continue;
      }
      if (e.isDirectory()) {
        if (TEST_DIR_NAMES.has(e.name)) {
          visit(abs, true);
          continue;
        }
        if (EXCLUDED_DIR_NAMES.has(e.name) || isRepoExcluded(rel)) {
          continue;
        }
        visit(abs, inTestDir);
        continue;
      }
      if (!SOURCE_EXT.test(e.name) || isRepoExcluded(rel)) {
        continue;
      }
      const isTestName = TEST_FILE.some((re) => re.test(e.name));
      if (!inTestDir && !isTestName) {
        continue;
      }
      // collect-files.cjs's other file exclusions: declarations, benchmarks, stories
      if (
        EXCLUDED_FILE_PATTERNS.some(
          ([re, reason]) => re.test(e.name) && !/test/.test(reason)
        )
      ) {
        continue;
      }
      const head = readFileSync(abs, "utf8")
        .split("\n")
        .slice(0, 40)
        .join("\n");
      if (
        LICENSE_RE.test(head) &&
        !(repo.ownCopyright && new RegExp(repo.ownCopyright).test(head))
      ) {
        continue;
      }
      out.push(rel);
    }
  };
  const roots = [...repo.include, ...(EXTRA_TEST_ROOTS[name] ?? [])];
  for (const inc of roots) {
    const abs = join(repo.root, inc);
    if (existsSync(abs) && statSync(abs).isDirectory()) {
      visit(
        abs,
        TEST_DIR_NAMES.has(inc.split("/").at(-1)) ||
          (EXTRA_TEST_ROOTS[name] ?? []).includes(inc)
      );
    }
  }
  return [...new Set(out)].sort();
};

// Both lists for one repo: [{ rel, test }].
const filesOf = (name) => {
  const { files } = collect(name);
  return [
    ...files.map((rel) => ({ rel, test: false })),
    ...collectTests(name).map((rel) => ({ rel, test: true })),
  ];
};

// ── tools ──────────────────────────────────────────────────────────────
const { Linter } = require(require.resolve("eslint", { paths: [CLI] }));
const { builtinRules } = require(
  require.resolve("eslint/use-at-your-own-risk", { paths: [CLI] })
);
const tsParser = require(
  require.resolve("@typescript-eslint/parser", { paths: [CLI] })
);
const tsPlugin = require(
  require.resolve("@typescript-eslint/eslint-plugin", { paths: [CLI] })
);
const sonarDir = dirname(
  require.resolve("eslint-plugin-sonarjs/package.json", { paths: [CLI] })
);
const sonarjs = require(sonarDir);
const sonarLocation = require(join(sonarDir, "cjs/helpers/location.js"));
const { UTILITY_TYPES } = require(join(sonarDir, "cjs/helpers/type.js"));
const { astUtils } = tools.load();
const oxfmtPkg = require.resolve("oxfmt/package.json", { paths: [ULTRACITE] });
const oxfmtBin = (() => {
  const json = JSON.parse(readFileSync(oxfmtPkg, "utf8"));
  const bin = typeof json.bin === "string" ? json.bin : json.bin.oxfmt;
  return join(dirname(oxfmtPkg), bin);
})();
const toolVersions = () => ({
  ...sk.toolVersions(),
  "eslint-plugin-sonarjs (ESLint, packages/cli)": dc.versionOf(
    "eslint-plugin-sonarjs",
    CLI
  ),
  oxfmt: JSON.parse(readFileSync(oxfmtPkg, "utf8")).version,
});

// ── node predicates ────────────────────────────────────────────────────
const SIGNATURE_TYPES = [
  "TSDeclareFunction",
  "TSEmptyBodyFunctionExpression",
  "TSFunctionType",
  "TSMethodSignature",
  "TSCallSignatureDeclaration",
  "TSConstructSignatureDeclaration",
  "TSConstructorType",
];
const DEPTH_TYPES = [
  "IfStatement",
  "SwitchStatement",
  "TryStatement",
  "DoWhileStatement",
  "WhileStatement",
  "WithStatement",
  "ForStatement",
  "ForInStatement",
  "ForOfStatement",
];
// SonarJS S134 (nested-control-flow): the same statements but `with`.
const SONAR_NEST_TYPES = DEPTH_TYPES.filter((t) => t !== "WithStatement");
const TS_WRAPPERS = new Set([
  "TSAsExpression",
  "TSSatisfiesExpression",
  "TSNonNullExpression",
  "TSTypeAssertion",
  "TSInstantiationExpression",
]);
const TEST_CALLEES = new Set([
  "describe",
  "it",
  "test",
  "suite",
  "bench",
  "context",
  "specify",
  "beforeEach",
  "afterEach",
  "beforeAll",
  "afterAll",
  "fdescribe",
  "xdescribe",
  "fit",
  "xit",
  "xtest",
]);

const isElseIf = (node) =>
  node.type === "IfStatement" &&
  node.parent?.type === "IfStatement" &&
  node.parent.alternate === node;
// ESLint's max-lines-per-function counts methods, getters and setters from their key
// (MethodDefinition or Property, decorators included).
const isEmbedded = (fn) =>
  Boolean(fn.parent) &&
  fn.parent.value === fn &&
  (fn.parent.type === "MethodDefinition" ||
    fn.parent.type === "TSAbstractMethodDefinition" ||
    (fn.parent.type === "Property" &&
      (fn.parent.method === true ||
        fn.parent.kind === "get" ||
        fn.parent.kind === "set")));
// ESLint's max-lines-per-function IIFE: a function or arrow that is the callee of a call.
const isIife = (fn) =>
  (fn.type === "FunctionExpression" || fn.type === "ArrowFunctionExpression") &&
  fn.parent?.type === "CallExpression" &&
  fn.parent.callee === fn;
// The first ancestor that isn't a TS wrapper (parentheses aren't nodes in ESTree).
const outerExpression = (node) => {
  let p = node.parent;
  let child = node;
  while (p && (TS_WRAPPERS.has(p.type) || p.type === "ChainExpression")) {
    child = p;
    p = p.parent;
  }
  return { child, parent: p };
};
// Oxlint's IIFE (max_lines_per_function.rs is_iife): the first outer expression is a call whose
// callee contains the function.
const isIifeLoose = (fn) => {
  const { child, parent } = outerExpression(fn);
  return parent?.type === "CallExpression" && parent.callee === child;
};
// SonarJS S138's IIFE: only a FunctionExpression that is the callee (arrow IIFEs are counted).
const isIifeSonar = (fn) =>
  fn.type === "FunctionExpression" &&
  fn.parent?.type === "CallExpression" &&
  fn.parent.callee === fn;
// ESLint's max-nested-callbacks: a function or arrow passed to a call (not its callee).
const isCallback = (fn) =>
  (fn.type === "FunctionExpression" || fn.type === "ArrowFunctionExpression") &&
  fn.parent?.type === "CallExpression" &&
  fn.parent.callee !== fn;
// Oxlint's (max_nested_callbacks.rs is_callback): the first outer expression is a CallExpression,
// callee or argument.
const isCallbackOxlint = (fn) =>
  outerExpression(fn).parent?.type === "CallExpression";
// Biome's (no_excessive_nested_callbacks.rs is_callback): directly in a call's argument list.
const isCallbackBiome = (fn) =>
  (fn.type === "FunctionExpression" || fn.type === "ArrowFunctionExpression") &&
  fn.parent?.type === "CallExpression" &&
  fn.parent.arguments.includes(fn);
const calleeRoot = (callee) => {
  let c = callee;
  while (c) {
    if (c.type === "Identifier") {
      return c.name;
    }
    if (c.type === "MemberExpression") {
      c = c.object;
    } else if (c.type === "CallExpression") {
      c = c.callee; // it.each([...])(...)
    } else if (c.type === "TaggedTemplateExpression") {
      c = c.tag; // describe.each`...`(...)
    } else {
      return null;
    }
  }
  return null;
};
const calleeText = (callee, text) =>
  text.slice(callee.range[0], callee.range[1]).replace(/\s+/g, "").slice(0, 60);
const isTestCallback = (fn) => {
  const call = fn.parent;
  if (call?.type !== "CallExpression" || !call.arguments.includes(fn)) {
    return false;
  }
  const root = calleeRoot(call.callee);
  return root !== null && TEST_CALLEES.has(root);
};

const keyName = (key, computed, text) => {
  if (!key) {
    return null;
  }
  if (!computed && key.type === "Identifier") {
    return key.name;
  }
  if (key.type === "PrivateIdentifier") {
    return `#${key.name}`;
  }
  if (key.type === "Literal") {
    return String(key.value);
  }
  return `[${text.slice(key.range[0], key.range[1]).slice(0, 40)}]`;
};
const enclosingClassName = (node) => {
  for (let p = node.parent; p; p = p.parent) {
    if (p.type === "ClassBody") {
      const cls = p.parent;
      if (cls.id) {
        return cls.id.name;
      }
      if (
        cls.parent?.type === "VariableDeclarator" &&
        cls.parent.id.type === "Identifier"
      ) {
        return cls.parent.id.name;
      }
      return "<anonymous class>";
    }
  }
  return null;
};
// The same display names as census-plugin.cjs (the cognitive-complexity topic).
const displayName = (node, text) => {
  const parent = node.parent;
  if (node.id?.name) {
    const cls =
      parent?.type === "MethodDefinition" ? enclosingClassName(node) : null;
    return cls ? `${cls}.${node.id.name}` : node.id.name;
  }
  if (
    parent?.type === "MethodDefinition" ||
    parent?.type === "TSAbstractMethodDefinition"
  ) {
    const cls = enclosingClassName(node);
    const k = keyName(parent.key, parent.computed, text);
    const prefix =
      parent.kind === "get" ? "get " : parent.kind === "set" ? "set " : "";
    return `${prefix}${cls ? `${cls}.` : ""}${parent.kind === "constructor" ? "constructor" : k}`;
  }
  if (
    parent?.type === "PropertyDefinition" ||
    parent?.type === "AccessorProperty"
  ) {
    const cls = enclosingClassName(node);
    return `${cls ? `${cls}.` : ""}${keyName(parent.key, parent.computed, text)}`;
  }
  if (parent?.type === "Property" && parent.value === node) {
    return keyName(parent.key, parent.computed, text);
  }
  if (
    parent?.type === "VariableDeclarator" &&
    parent.id.type === "Identifier"
  ) {
    return parent.id.name;
  }
  if (parent?.type === "AssignmentExpression") {
    return text.slice(parent.left.range[0], parent.left.range[1]).slice(0, 60);
  }
  if (parent?.type === "ExportDefaultDeclaration") {
    return "<default export>";
  }
  if (parent?.type === "CallExpression" || parent?.type === "NewExpression") {
    if (parent.callee === node) {
      return "<IIFE>";
    }
    return `<callback to ${calleeText(parent.callee, text)}>`;
  }
  if (parent?.type === "JSXExpressionContainer") {
    const attr =
      parent.parent?.type === "JSXAttribute" ? parent.parent.name?.name : null;
    return attr ? `<JSX ${attr} handler>` : "<JSX child function>";
  }
  return "<anonymous>";
};
const kindOf = (node) => {
  const parent = node.parent;
  if (node.type === "FunctionDeclaration") {
    return "declaration";
  }
  if (
    parent?.type === "MethodDefinition" ||
    parent?.type === "TSAbstractMethodDefinition"
  ) {
    return parent.kind === "method" ? "method" : parent.kind; // get / set / constructor
  }
  if (
    parent?.type === "Property" &&
    (parent.method || parent.kind !== "init")
  ) {
    return parent.kind === "init" ? "object-method" : `object-${parent.kind}`;
  }
  if (parent?.type === "PropertyDefinition") {
    return `class-field-${node.type === "ArrowFunctionExpression" ? "arrow" : "function"}`;
  }
  const base =
    node.type === "ArrowFunctionExpression" ? "arrow" : "function-expression";
  if (
    (parent?.type === "CallExpression" || parent?.type === "NewExpression") &&
    parent.callee !== node
  ) {
    return `${base}-callback`;
  }
  if (isIifeLoose(node)) {
    return `${base}-iife`;
  }
  return base;
};
// The name a component would have: its own, the const it's assigned to, or the const a
// forwardRef/memo/observer wrapper is assigned to.
const componentName = (node) => {
  if (node.id?.name) {
    return node.id.name;
  }
  const p = node.parent;
  if (p?.type === "VariableDeclarator" && p.id.type === "Identifier") {
    return p.id.name;
  }
  if (p?.type === "CallExpression" && p.arguments[0] === node) {
    const callee = calleeRoot(p.callee);
    const grand = p.parent;
    if (
      ["forwardRef", "memo", "React", "observer"].includes(callee) &&
      grand?.type === "VariableDeclarator" &&
      grand.id.type === "Identifier"
    ) {
      return grand.id.name;
    }
  }
  return null;
};
// SonarJS S138 exempts "React function components": a capitalised name (a function's own name, or
// `let Foo = () => {}`) and a `return <jsx>` directly in the function's own body.
const sonarCapitalName = (node) => {
  if (
    node.type === "FunctionDeclaration" ||
    node.type === "FunctionExpression"
  ) {
    return node.id
      ? node.id.name.startsWith(node.id.name[0].toUpperCase())
      : false;
  }
  const p = node.parent;
  if (
    node.type === "ArrowFunctionExpression" &&
    p?.type === "VariableDeclarator" &&
    p.id.type === "Identifier"
  ) {
    return p.id.name.startsWith(p.id.name[0].toUpperCase());
  }
  return false;
};

// ── line facts ─────────────────────────────────────────────────────────
// ESLint max-lines-per-function's comment-only lines (getCommentOnlyLines).
const commentOnlyLinesEslint = (sourceCode) => {
  const set = new Set();
  for (const comment of sourceCode.getAllComments()) {
    const before = sourceCode.getTokenBefore(comment);
    const after = sourceCode.getTokenAfter(comment);
    let start = comment.loc.start.line;
    let end = comment.loc.end.line;
    if (before && before.loc.end.line === comment.loc.start.line) {
      start++;
    }
    if (after && after.loc.start.line === comment.loc.end.line) {
      end--;
    }
    for (let l = start; l <= end; l++) {
      set.add(l);
    }
  }
  return set;
};
// ESLint max-lines' comment lines (getLinesWithoutCode: skips over neighbouring comments).
const commentOnlyLinesMaxLines = (sourceCode) => {
  const set = new Set();
  const isComment = (t) => t && (t.type === "Block" || t.type === "Line");
  for (const comment of sourceCode.getAllComments()) {
    let start = comment.loc.start.line;
    let end = comment.loc.end.line;
    let token = comment;
    do {
      token = sourceCode.getTokenBefore(token, { includeComments: true });
    } while (isComment(token));
    if (token && token.loc.end.line === comment.loc.start.line) {
      start += 1;
    }
    token = comment;
    do {
      token = sourceCode.getTokenAfter(token, { includeComments: true });
    } while (isComment(token));
    if (token && token.loc.start.line === comment.loc.end.line) {
      end -= 1;
    }
    for (let l = start; l <= end; l++) {
      set.add(l);
    }
  }
  return set;
};
// SonarJS getCommentLineNumbers + isFullLineComment (S138 and S104). The map keeps the last
// comment that covers each line, as SonarJS's does.
const sonarFullCommentLines = (sourceCode, lines) => {
  const map = new Map();
  for (const comment of sourceCode.getAllComments()) {
    for (let i = comment.loc.start.line; i <= comment.loc.end.line; i++) {
      map.set(i, comment);
    }
  }
  const full = new Set();
  for (const [lineNumber, comment] of map) {
    const line = lines[lineNumber - 1] ?? "";
    const { start, end } = comment.loc;
    const first =
      start.line === lineNumber && !line.slice(0, start.column).trim();
    const last = end.line === lineNumber && !line.slice(end.column).trim();
    if ((start.line < lineNumber || first) && (end.line > lineNumber || last)) {
      full.add(lineNumber);
    }
  }
  return full;
};
const sonarLocCount = (startLine, endLine, lines, fullComment) => {
  let n = 0;
  for (let i = startLine; i <= endLine; i++) {
    if (fullComment.has(i) || /^\s*$/u.test(lines[i - 1] ?? "")) {
      continue;
    }
    n++;
  }
  return n;
};
const LINE_BREAK = /\r\n|\r|\n/g;
const breaksOutsideComments = (text, from, to, comments, ci0) => {
  let ci = ci0;
  while (ci < comments.length && comments[ci].range[1] <= from) {
    ci++;
  }
  let n = 0;
  let cursor = from;
  let k = ci;
  while (k < comments.length && comments[k].range[0] < to) {
    n += (text.slice(cursor, comments[k].range[0]).match(LINE_BREAK) ?? [])
      .length;
    cursor = comments[k].range[1];
    k++;
  }
  n += (text.slice(cursor, to).match(LINE_BREAK) ?? []).length;
  return { ci, n };
};
const firstTokenAt = (tokens, offset) => {
  let lo = 0;
  let hi = tokens.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (tokens[mid].range[0] < offset) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return lo;
};
// The tokens of a function body as Biome sees it: for an arrow's expression body, the parentheses
// around it belong to it (a JsParenthesizedExpression), though ESTree's body range leaves them out.
const bodyTokens = (body, tokens) => {
  let start = firstTokenAt(tokens, body.range[0]);
  let end = firstTokenAt(tokens, body.range[1]); // exclusive
  if (body.type !== "BlockStatement") {
    while (
      start > 0 &&
      end < tokens.length &&
      tokens[start - 1].type === "Punctuator" &&
      tokens[start - 1].value === "(" &&
      tokens[end].type === "Punctuator" &&
      tokens[end].value === ")"
    ) {
      start--;
      end++;
    }
  }
  return [start, end];
};
// Biome's noExcessiveLinesPerFunction, reimplemented (biome_js_analyze 2.6.3,
// no_excessive_lines_per_function.rs): over every token in the function's body except `{` and
// `}`, the newlines in its leading trivia. A token's leading trivia holds every line break since
// the previous token except those inside a comment, which is a single trivia piece. JSX text is a
// token, so the line breaks it holds don't count; nor do lines that start with `{` or `}`.
// skipBlankLines counts one per token that starts a line instead.
const biomeBodyLines = (body, tokens, comments, text, skipBlank = false) => {
  if (!body) {
    return null;
  }
  const [start, end] = bodyTokens(body, tokens);
  let count = 0;
  let ci = 0;
  for (let i = start; i < end; i++) {
    const t = tokens[i];
    if (t.type === "Punctuator" && (t.value === "{" || t.value === "}")) {
      continue;
    }
    // A template's middle and tail parts start with the `}` that closes `${`, which is Biome's own
    // R_CURLY token; the chunk after it has no trivia.
    if (t.type === "Template" && t.value.startsWith("}")) {
      continue;
    }
    const prevEnd = i > 0 ? tokens[i - 1].range[1] : 0;
    const r = breaksOutsideComments(text, prevEnd, t.range[0], comments, ci);
    ci = r.ci;
    if (r.n === 0) {
      continue;
    }
    count += skipBlank ? 1 : r.n;
  }
  return count;
};
// Why Biome's count differs from max-lines-per-function's: every line break from the function's
// head (its method key, as max-lines-per-function counts) to its end, by where it falls. `counted`
// is Biome's count; the rest are line breaks Biome doesn't count: in the head (before the body), in
// front of a `{` or `}` token (including the `}` of a template's `${...}`), inside a comment, inside
// JSX text, inside a template or string. lines - 1 === the sum.
const biomeLinesExplained = (fn, body, tokens, comments, text, startOffset) => {
  const out = {
    brace: 0,
    comment: 0,
    counted: 0,
    head: 0,
    jsxText: 0,
    string: 0,
  };
  if (!body) {
    return null;
  }
  const [first, end] = bodyTokens(body, tokens);
  const breaks = (a, b) => (text.slice(a, b).match(LINE_BREAK) ?? []).length;
  let ci = 0;
  const expression = body.type !== "BlockStatement";
  // head: from the function's head to the first body token (for a block body, up to and including
  // the gap before `{`; for an expression body, up to the `=>` before it)
  const headEnd = expression
    ? (tokens[first - 1]?.range[1] ?? body.range[0])
    : tokens[first].range[0];
  out.head = breaks(startOffset, headEnd);
  for (let i = first; i < end; i++) {
    const t = tokens[i];
    const inner = breaks(t.range[0], t.range[1]);
    if (inner) {
      if (t.type === "JSXText") {
        out.jsxText += inner;
      } else {
        out.string += inner;
      }
    }
    if (i === first && !expression) {
      continue; // the gap before `{` is in the head
    }
    const prevEnd = tokens[i - 1].range[1];
    const gap = breaks(prevEnd, t.range[0]);
    if (gap === 0) {
      continue;
    }
    const r = breaksOutsideComments(text, prevEnd, t.range[0], comments, ci);
    ci = r.ci;
    out.comment += gap - r.n;
    const rest = r.n;
    const isBrace =
      (t.type === "Punctuator" && (t.value === "{" || t.value === "}")) ||
      (t.type === "Template" && t.value.startsWith("}"));
    if (isBrace) {
      out.brace += rest;
    } else {
      out.counted += rest;
    }
  }
  void fn;
  return out;
};
// Biome's noExcessiveLinesPerFile (biome_analyze utils.rs count_lines_in_file): the newlines in
// every non-EOF token's leading trivia, plus one.
const biomeFileLines = (tokens, comments, text) => {
  let count = 0;
  let ci = 0;
  for (let i = 0; i < tokens.length; i++) {
    const prevEnd = i > 0 ? tokens[i - 1].range[1] : 0;
    const r = breaksOutsideComments(
      text,
      prevEnd,
      tokens[i].range[0],
      comments,
      ci
    );
    ci = r.ci;
    count += r.n;
  }
  return count + 1;
};

// Lines covered by a set of ranges, counted in a window with prefix sums.
const coverage = (nLines) => {
  const marks = new Uint8Array(nLines + 2);
  let prefix = null;
  return {
    count(from, to) {
      if (!prefix) {
        prefix = new Int32Array(nLines + 2);
        for (let i = 1; i <= nLines + 1; i++) {
          prefix[i] = prefix[i - 1] + marks[i];
        }
      }
      const a = Math.max(1, from);
      const b = Math.min(nLines, to);
      return b < a ? 0 : prefix[b] - prefix[a - 1];
    },
    has(l) {
      return marks[l] === 1;
    },
    mark(from, to) {
      for (let l = from; l <= to; l++) {
        marks[l] = 1;
      }
      prefix = null;
    },
  };
};
const keyOf = (loc) =>
  loc
    ? `${loc.start.line}:${loc.start.column + 1}:${loc.end.line}:${loc.end.column + 1}`
    : null;

// Where a function's parameter list starts: its `(` (after any type parameters, whose defaults
// can hold parentheses of their own), or a lone arrow parameter.
const paramsStartOf = (node, sourceCode) => {
  if (node.params.length > 0) {
    // a parameter decorator sits before the parameter's own range
    const first = node.params[0].decorators?.[0] ?? node.params[0];
    const before = sourceCode.getTokenBefore(first);
    return before?.value === "(" && before.range[0] >= node.range[0]
      ? before.range[0]
      : first.range[0];
  }
  if (node.typeParameters) {
    return sourceCode.getTokenAfter(node.typeParameters).range[0];
  }
  return astUtils.getOpeningParenOfParams(node, sourceCode).range[0];
};

// Variables declared in a function's own scopes (its function scope and the block scopes inside
// it, not nested functions), and the references that leave it.
const scopeFacts = (scope) => {
  const own = [];
  const visit = (s) => {
    own.push(...s.variables.filter((v) => v.defs.length > 0));
    for (const c of s.childScopes) {
      if (c.type !== "function" && c.type !== "class") {
        visit(c);
      }
    }
  };
  visit(scope);
  const locals = own.filter((v) => v.defs.some((d) => d.type !== "Parameter"));
  const reassigned = locals.filter(
    (v) =>
      v.references.filter((r) => r.isWrite()).length >
      (v.defs.some((d) => d.node?.init) ? 1 : 0)
  );
  const free = { enclosing: new Set(), global: new Set(), module: new Set() };
  for (const r of scope.through) {
    const name = r.identifier.name;
    if (!r.resolved) {
      free.global.add(name);
    } else if (
      r.resolved.scope.type === "module" ||
      r.resolved.scope.type === "global"
    ) {
      free.module.add(name);
    } else {
      free.enclosing.add(name);
    }
  }
  return {
    freeEnclosing: [...free.enclosing].sort(),
    freeGlobal: [...free.global].sort(),
    freeModule: [...free.module].sort(),
    locals: locals.length,
    reassignedLocals: reassigned.length,
  };
};

// ── the census rule ────────────────────────────────────────────────────
// sink receives { functions, signatures, file } for one file.
const makeCensusRule = (sink) => ({
  create(context) {
    const sourceCode = context.sourceCode;
    const text = sourceCode.text;
    const lines = sourceCode.lines;
    const nLines = lines.length;
    const ast = sourceCode.ast;
    const tokens = ast.tokens;
    const comments = sourceCode.getAllComments();
    const fns = [];
    const bodies = [];
    const sigs = [];
    const stack = [];
    const stmtFrames = [];
    const depthFrames = [{ cur: 0, max: 0 }];
    const callbackStack = [];
    let sonarStack = 0;
    let sonarAtFour = 0;
    let classes = 0;
    let classesBiome = 0;
    const switches = [];
    const unions = [];
    const jsx = coverage(nLines);
    const data = coverage(nLines);
    const switchCov = coverage(nLines);
    const template = coverage(nLines);
    const top = () => (stack.length ? fns[stack.at(-1)] : null);

    const onFunction = (node) => {
      const embedded = isEmbedded(node);
      const owner = embedded ? node.parent : node;
      const thisParam =
        node.params[0]?.type === "Identifier" && node.params[0].name === "this"
          ? node.params[0]
          : null;
      const thisVoid =
        thisParam?.typeAnnotation?.typeAnnotation?.type === "TSVoidKeyword";
      let callbackDepth = null;
      if (isCallback(node)) {
        callbackStack.push(node);
        callbackDepth = callbackStack.length;
      }
      const cname = componentName(node);
      const rec = {
        async: Boolean(node.async),
        callback: isCallback(node),
        callbackBiome: isCallbackBiome(node),
        callbackDepth,
        callbackOxlint: isCallbackOxlint(node),
        callee:
          (node.parent?.type === "CallExpression" ||
            node.parent?.type === "NewExpression") &&
          node.parent.callee !== node
            ? calleeText(node.parent.callee, text)
            : null,
        componentName: cname && /^[A-Z]/.test(cname) ? cname : null,
        depth: stack.length,
        directives:
          node.body.type === "BlockStatement"
            ? node.body.body.filter((s) => typeof s.directive === "string")
                .length
            : 0,
        embedStartLine: owner.loc.start.line,
        embedded,
        endColumn: node.loc.end.column,
        endLine: node.loc.end.line,
        eslintKey: keyOf(astUtils.getFunctionHeadLoc(node, sourceCode)),
        eslintName: astUtils.getFunctionNameWithKind(node),
        expressionBody:
          node.type === "ArrowFunctionExpression" && node.expression === true,
        generator: Boolean(node.generator),
        iife: isIife(node),
        iifeLoose: isIifeLoose(node),
        iifeSonar: isIifeSonar(node),
        index: fns.length,
        kind: kindOf(node),
        maxDepth: 0,
        name: displayName(node, text),
        nodeType: node.type,
        // where the function's head starts: a method's key (decorators and modifiers included)
        ownerStart: owner.range[0],
        // where its parameter list starts (`(`, or a lone arrow parameter): Oxlint's and Biome's
        // max-params reports start here
        paramsStart: paramsStartOf(node, sourceCode),
        own: {
          arguments: 0,
          awaits: 0,
          // empty statements (a stray `;`) in the function's blocks, which max-statements counts
          emptyStatements: 0,
          ifChainMax: 0,
          returns: 0,
          switchCasesMax: 0,
          throws: 0,
          thisRefs: 0,
          tries: 0,
          yields: 0,
        },
        params: node.params.length,
        paramsDefault: node.params.filter((p) => p.type === "AssignmentPattern")
          .length,
        paramsDestructured: node.params.filter(
          (p) =>
            p.type === "ObjectPattern" ||
            p.type === "ArrayPattern" ||
            (p.type === "AssignmentPattern" &&
              (p.left.type === "ObjectPattern" ||
                p.left.type === "ArrayPattern"))
        ).length,
        paramsProperties: node.params.filter(
          (p) => p.type === "TSParameterProperty"
        ).length,
        paramsRest: node.params.some((p) => p.type === "RestElement"),
        parentIndex: stack.length ? stack.at(-1) : null,
        range: node.range,
        returnsJsx:
          node.type === "ArrowFunctionExpression" &&
          node.expression === true &&
          node.body.type.startsWith("JSX"),
        sonarCapital: sonarCapitalName(node),
        sonarKey: keyOf(
          sonarLocation.getMainFunctionTokenLocation(node, node.parent, context)
        ),
        sonarNestBase: sonarStack,
        sonarNestMax: sonarStack,
        sonarReturnsJsx: false,
        startColumn: node.loc.start.column,
        startLine: node.loc.start.line,
        statements: 0,
        testCallback: isTestCallback(node),
        thisParam: Boolean(thisParam),
        thisVoid,
      };
      rec.paramsEslint = rec.params - (thisParam && thisVoid ? 1 : 0);
      rec.paramsNoThis = rec.params - (thisParam ? 1 : 0);
      fns.push(rec);
      bodies.push(node.body);
      stack.push(rec.index);
      stmtFrames.push({ count: 0 });
      depthFrames.push({ cur: 0, max: 0 });
    };
    const onFunctionExit = (node) => {
      const rec = fns[stack.at(-1)];
      stack.pop();
      rec.statements = stmtFrames.pop().count;
      rec.maxDepth = depthFrames.pop().max;
      if (callbackStack.at(-1) === node) {
        callbackStack.pop();
      }
      Object.assign(rec, scopeFacts(sourceCode.getScope(node)));
    };
    const onDepth = (node) => {
      if (isElseIf(node)) {
        return;
      }
      const f = depthFrames.at(-1);
      f.cur++;
      f.max = Math.max(f.max, f.cur);
    };
    const onDepthExit = (node) => {
      if (!isElseIf(node)) {
        depthFrames.at(-1).cur--;
      }
    };
    const onSonarNest = (node) => {
      const rec = top();
      if (!isElseIf(node)) {
        sonarStack++;
        // S134 at its default (3) reports each statement that opens a fourth level
        if (sonarStack === 4) {
          sonarAtFour++;
        }
        if (rec) {
          rec.sonarNestMax = Math.max(rec.sonarNestMax, sonarStack);
        }
      }
      if (node.type === "SwitchStatement") {
        switches.push({
          cases: node.cases.length,
          fn: rec ? rec.index : null,
          line: node.loc.start.line,
          nonEmpty: node.cases.filter(
            (c) => c.consequent.length > 0 && c.test !== null
          ).length,
        });
        switchCov.mark(node.loc.start.line, node.loc.end.line);
        if (rec) {
          rec.own.switchCasesMax = Math.max(
            rec.own.switchCasesMax,
            node.cases.length
          );
        }
      }
      if (node.type === "IfStatement" && !isElseIf(node) && rec) {
        let n = 1;
        let alt = node.alternate;
        while (alt) {
          n++;
          alt = alt.type === "IfStatement" ? alt.alternate : null;
        }
        rec.own.ifChainMax = Math.max(rec.own.ifChainMax, n);
      }
      if (node.type === "TryStatement" && rec) {
        rec.own.tries++;
      }
    };
    const onSonarNestExit = (node) => {
      if (!isElseIf(node)) {
        sonarStack--;
      }
    };
    const visitors = {
      ":function": onFunction,
      ":function:exit": onFunctionExit,
      "ClassDeclaration, ClassExpression"(node) {
        classes++;
        // Biome counts JsClassDeclaration and JsClassExpression, not `export default class`.
        if (node.parent?.type !== "ExportDefaultDeclaration") {
          classesBiome++;
        }
      },
      "JSXElement, JSXFragment"(node) {
        if (
          !["JSXElement", "JSXFragment", "JSXExpressionContainer"].includes(
            node.parent?.type
          )
        ) {
          jsx.mark(node.loc.start.line, node.loc.end.line);
        }
      },
      "ObjectExpression, ArrayExpression"(node) {
        let p = node.parent;
        while (
          p &&
          (TS_WRAPPERS.has(p.type) ||
            p.type === "Property" ||
            p.type === "SpreadElement")
        ) {
          p = p.parent;
        }
        if (p?.type !== "ObjectExpression" && p?.type !== "ArrayExpression") {
          data.mark(node.loc.start.line, node.loc.end.line);
        }
      },
      AwaitExpression() {
        if (top()) {
          top().own.awaits++;
        }
      },
      EmptyStatement(node) {
        if (top() && node.parent?.type === "BlockStatement") {
          top().own.emptyStatements++;
        }
      },
      BlockStatement(node) {
        if (stmtFrames.length) {
          stmtFrames.at(-1).count += node.body.length;
        }
      },
      Identifier(node) {
        const rec = top();
        if (node.name !== "arguments" || !rec) {
          return;
        }
        const p = node.parent;
        if (
          !(
            p?.type === "MemberExpression" &&
            p.property === node &&
            !p.computed
          ) &&
          !(p?.type === "Property" && p.key === node && !p.computed)
        ) {
          rec.own.arguments++;
        }
      },
      ReturnStatement(node) {
        const rec = top();
        if (!rec) {
          return;
        }
        rec.own.returns++;
        if (node.argument?.type.startsWith("JSX")) {
          rec.returnsJsx = true;
          rec.sonarReturnsJsx = true;
        }
      },
      StaticBlock() {
        stmtFrames.push({ count: 0 });
        depthFrames.push({ cur: 0, max: 0 });
      },
      "StaticBlock:exit"() {
        stmtFrames.pop();
        depthFrames.pop();
      },
      TemplateLiteral(node) {
        if (node.loc.end.line > node.loc.start.line) {
          template.mark(node.loc.start.line, node.loc.end.line);
        }
      },
      ThisExpression() {
        // arrows inherit `this`: count it up to the nearest non-arrow function
        for (let i = stack.length - 1; i >= 0; i--) {
          const rec = fns[stack[i]];
          rec.own.thisRefs++;
          if (rec.nodeType !== "ArrowFunctionExpression") {
            break;
          }
        }
      },
      ThrowStatement() {
        if (top()) {
          top().own.throws++;
        }
      },
      TSUnionType(node) {
        const p = node.parent;
        unions.push({
          line: node.loc.start.line,
          // SonarJS S4622 skips unions directly in a type alias and in a utility type's arguments
          sonar:
            p?.type !== "TSTypeAliasDeclaration" &&
            !(
              p?.type === "TSTypeParameterInstantiation" &&
              p.parent?.type === "TSTypeReference" &&
              p.parent.typeName?.type === "Identifier" &&
              UTILITY_TYPES.has(p.parent.typeName.name)
            ),
          size: node.types.length,
        });
      },
      YieldExpression() {
        if (top()) {
          top().own.yields++;
        }
      },
      "Program:exit"() {
        const blank = new Uint8Array(nLines + 2);
        for (let i = 0; i < nLines; i++) {
          if (/^\s*$/u.test(lines[i])) {
            blank[i + 1] = 1;
          }
        }
        const commentOnly = commentOnlyLinesEslint(sourceCode);
        const sonarFull = sonarFullCommentLines(sourceCode, lines);
        const children = new Map();
        for (const f of fns) {
          if (f.parentIndex !== null) {
            if (!children.has(f.parentIndex)) {
              children.set(f.parentIndex, []);
            }
            children.get(f.parentIndex).push([f.startLine, f.endLine]);
          }
        }
        for (const f of fns) {
          const from = f.embedStartLine;
          const to = f.endLine;
          // direct children's lines, merged
          const kids = (children.get(f.index) ?? []).sort(
            (a, b) => a[0] - b[0]
          );
          const merged = [];
          for (const [a, b] of kids) {
            if (merged.length && a <= merged.at(-1)[1]) {
              merged.at(-1)[1] = Math.max(merged.at(-1)[1], b);
            } else {
              merged.push([a, b]);
            }
          }
          let blankN = 0;
          let commentN = 0;
          let codeN = 0;
          let nested = 0;
          let dataOwn = 0;
          let mi = 0;
          for (let l = from; l <= to; l++) {
            const isBlank = blank[l] === 1;
            const isComment = commentOnly.has(l);
            if (isBlank) {
              blankN++;
            }
            if (isComment) {
              commentN++;
            }
            if (!isBlank && !isComment) {
              codeN++;
            }
            while (mi < merged.length && merged[mi][1] < l) {
              mi++;
            }
            // A line where a child starts or ends still belongs to the parent (the child's head
            // or closing brace shares it), so only the child's strictly interior lines count.
            const inChild =
              mi < merged.length && merged[mi][0] < l && l < merged[mi][1];
            if (inChild) {
              nested++;
            } else if (data.has(l)) {
              dataOwn++;
            }
          }
          f.lines = to - from + 1;
          f.linesFn = f.endLine - f.startLine + 1;
          f.blankLines = blankN;
          f.commentLines = commentN;
          f.linesNoBlank = f.lines - blankN;
          f.linesCode = codeN;
          f.nestedLines = nested;
          f.nestedFunctions = kids.length;
          f.dataLines = dataOwn;
          f.jsxLines = jsx.count(from, to);
          f.switchLines = switchCov.count(from, to);
          f.templateLines = template.count(from, to);
          f.sonarLines = sonarLocCount(
            f.startLine,
            f.endLine,
            lines,
            sonarFull
          );
          f.sonarReactExempt = Boolean(f.sonarCapital && f.sonarReturnsJsx);
          f.component = Boolean(
            f.componentName && (f.returnsJsx || f.jsxLines > 0)
          );
          // Biome's AnyFunctionLike: no getters or setters
          const accessor = /^(?:get|set|object-get|object-set)$/.test(f.kind);
          f.biomeLines = accessor
            ? null
            : biomeBodyLines(bodies[f.index], tokens, comments, text);
          f.biomeLinesNoBlank = accessor
            ? null
            : biomeBodyLines(bodies[f.index], tokens, comments, text, true);
          f.biomeExplain = biomeLinesExplained(
            f,
            bodies[f.index],
            tokens,
            comments,
            text,
            f.ownerStart
          );
          delete f.sonarCapital;
          delete f.sonarReturnsJsx;
        }
        const maxLinesLines =
          lines.length > 1 && lines.at(-1) === ""
            ? lines.length - 1
            : lines.length;
        const mlComment = commentOnlyLinesMaxLines(sourceCode);
        let mlNoBlank = 0;
        let mlCode = 0;
        for (let l = 1; l <= maxLinesLines; l++) {
          if (blank[l] !== 1) {
            mlNoBlank++;
            if (!mlComment.has(l)) {
              mlCode++;
            }
          }
        }
        let newlines = 0;
        for (let i = 0; i < text.length; i++) {
          if (text.charCodeAt(i) === 10) {
            newlines++;
          }
        }
        sink.file = {
          biomeLines: biomeFileLines(tokens, comments, text),
          classes,
          classesBiome,
          depthTop: depthFrames[0].max,
          functions: fns.length,
          lines: maxLinesLines,
          linesCode: mlCode,
          linesNoBlank: mlNoBlank,
          oxlintLines: text.endsWith("\n") ? newlines : newlines + 1,
          physicalLines: nLines,
          signatures: sigs.length,
          sonarAtFour,
          sonarLines: sonarLocCount(1, nLines, lines, sonarFull),
          switches,
          unions,
        };
        sink.functions = fns;
        sink.signatures = sigs;
      },
    };
    // max-depth and S134 share node types: one visitor for both.
    const depthKey = DEPTH_TYPES.join(",");
    const depthExitKey = `${DEPTH_TYPES.join(",")}:exit`;
    visitors[depthKey] = (node) => {
      onDepth(node);
      if (node.type !== "WithStatement") {
        onSonarNest(node);
      }
    };
    visitors[depthExitKey] = (node) => {
      onDepthExit(node);
      if (node.type !== "WithStatement") {
        onSonarNestExit(node);
      }
    };
    visitors[SIGNATURE_TYPES.join(",")] = (node) => {
      const params = node.params ?? node.parameters ?? [];
      const thisP =
        params[0]?.type === "Identifier" && params[0].name === "this"
          ? params[0]
          : null;
      let eslintKey = null;
      try {
        eslintKey = keyOf(astUtils.getFunctionHeadLoc(node, sourceCode));
      } catch {
        eslintKey = null;
      }
      sigs.push({
        column: node.loc.start.column,
        endLine: node.loc.end.line,
        eslintKey,
        line: node.loc.start.line,
        params: params.length,
        range: node.range,
        thisParam: Boolean(thisP),
        thisVoid:
          thisP?.typeAnnotation?.typeAnnotation?.type === "TSVoidKeyword",
        type: node.type,
      });
    };
    return visitors;
  },
  meta: { schema: [], type: "suggestion" },
});

// ── the ESLint pass ────────────────────────────────────────────────────
// Each real rule runs at threshold 0 (or its minimum), so every function it measures reports its
// count. Variants of a core rule run under local aliases of the same rule module.
const alias = (name) => builtinRules.get(name);
const MEASURE_RULES = {
  complexity: ["error", { max: 0, variant: "classic" }],
  "len/census": "error",
  "len/max-lines-code": [
    "error",
    { max: 0, skipBlankLines: true, skipComments: true },
  ],
  "len/max-lines-noblank": ["error", { max: 0, skipBlankLines: true }],
  "len/mlpf-code": [
    "error",
    { max: 0, skipBlankLines: true, skipComments: true },
  ],
  "len/mlpf-iife": ["error", { IIFEs: true, max: 0 }],
  "len/mlpf-noblank": ["error", { max: 0, skipBlankLines: true }],
  "len/params-never": ["error", { countThis: "never", max: 0 }],
  // the minimum: 1 (files with 0 or 1 class don't report)
  "max-classes-per-file": ["error", 1],
  "max-depth": ["error", 0],
  "max-lines": ["error", { max: 0 }],
  "max-lines-per-function": ["error", { max: 0 }],
  "max-nested-callbacks": ["error", 0],
  "max-params": ["error", 0],
  "max-statements": ["error", 0],
  "sonarjs/cognitive-complexity": ["error", 0],
  "sonarjs/max-lines": ["error", { maximum: 0 }],
  "sonarjs/max-lines-per-function": ["error", { maximum: 0 }],
  "sonarjs/max-switch-cases": ["error", 0],
  "sonarjs/max-union-size": ["error", { threshold: 0 }],
  "sonarjs/nested-control-flow": ["error", { maximumNestingLevel: 3 }],
  "ts/max-params": ["error", { max: 0 }],
};
const lenPlugin = (sink) => ({
  rules: {
    census: makeCensusRule(sink),
    "max-lines-code": alias("max-lines"),
    "max-lines-noblank": alias("max-lines"),
    "mlpf-code": alias("max-lines-per-function"),
    "mlpf-iife": alias("max-lines-per-function"),
    "mlpf-noblank": alias("max-lines-per-function"),
    "params-never": alias("max-params"),
  },
});
const linter = new Linter({ configType: "flat" });
const configFor = (sink, withJsx) => [
  {
    files: ["**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      parser: tsParser,
      parserOptions: { ecmaFeatures: { jsx: withJsx } },
      sourceType: "module",
    },
    linterOptions: {
      noInlineConfig: true,
      reportUnusedDisableDirectives: "off",
    },
    plugins: { len: lenPlugin(sink), sonarjs, ts: tsPlugin },
    rules: MEASURE_RULES,
  },
];

// Message parsers: rule -> regex with the count in group 1.
const COUNT_RE = {
  complexity: /has a complexity of (\d+)\. Maximum allowed is 0\./,
  "len/max-lines-code": /too many lines \((\d+)\)/,
  "len/max-lines-noblank": /too many lines \((\d+)\)/,
  "len/mlpf-code": /has too many lines \((\d+)\)/,
  "len/mlpf-iife": /has too many lines \((\d+)\)/,
  "len/mlpf-noblank": /has too many lines \((\d+)\)/,
  "len/params-never": /has too many parameters \((\d+)\)/,
  "max-classes-per-file": /File has too many classes \((\d+)\)/,
  "max-depth": /Blocks are nested too deeply \((\d+)\)/,
  "max-lines": /too many lines \((\d+)\)/,
  "max-lines-per-function": /has too many lines \((\d+)\)/,
  "max-nested-callbacks": /Too many nested callbacks \((\d+)\)/,
  "max-params": /has too many parameters \((\d+)\)/,
  "max-statements": /has too many statements \((\d+)\)/,
  "sonarjs/cognitive-complexity": /Cognitive Complexity from (\d+) to the 0/,
  "sonarjs/max-lines": /This file has (\d+) lines/,
  "sonarjs/max-lines-per-function": /This function has (\d+) lines/,
  "sonarjs/max-switch-cases":
    /Reduce the number of non-empty switch cases from (\d+)/,
  "sonarjs/max-union-size": /less than (\d+) elements/,
  "sonarjs/nested-control-flow": /not nest more than (\d+)/,
  "ts/max-params": /has too many parameters \((\d+)\)/,
};
// Which census field each rule's count must equal (per function), and where it reports.
const FUNCTION_CHECKS = {
  complexity: { field: null, key: "eslintKey", store: "cyclomatic" },
  "len/mlpf-code": { field: "linesCode", key: "eslintKey" },
  "len/mlpf-iife": { field: "lines", key: "eslintKey" },
  "len/mlpf-noblank": { field: "linesNoBlank", key: "eslintKey" },
  "len/params-never": { field: "paramsNoThis", key: "eslintKey" },
  "max-lines-per-function": { field: "lines", key: "eslintKey" },
  "max-nested-callbacks": { field: "callbackDepth", key: "eslintKey" },
  "max-params": { field: "paramsEslint", key: "eslintKey" },
  "max-statements": { field: "statements", key: "eslintKey" },
  "sonarjs/cognitive-complexity": {
    field: null,
    key: "sonarKey",
    store: "cognitive",
  },
  "sonarjs/max-lines-per-function": { field: "sonarLines", key: "sonarKey" },
  "ts/max-params": { field: "paramsEslint", key: "eslintKey" },
};

const msgKey = (m) => `${m.line}:${m.column}:${m.endLine}:${m.endColumn}`;
// One file through the census and the measuring rules. Returns
// { functions, signatures, file, mismatches, unmatched, error }.
const measure = (text, rel) => {
  const run = (withJsx) => {
    const sink = {};
    const messages = linter.verify(text, configFor(sink, withJsx), {
      filename: rel,
    });
    return { messages, sink };
  };
  const jsx = /\.(?:tsx|jsx|js|mjs|cjs)$/.test(rel);
  let { messages, sink } = run(jsx);
  let fatal = messages.find((m) => m.fatal);
  if (fatal && /\.(?:js|mjs|cjs)$/.test(rel)) {
    ({ messages, sink } = run(false));
    fatal = messages.find((m) => m.fatal);
  }
  if (fatal) {
    return { error: `${fatal.message} (${fatal.line}:${fatal.column})` };
  }
  const fns = sink.functions;
  const byKey = { eslintKey: new Map(), sonarKey: new Map() };
  for (const f of fns) {
    for (const k of ["eslintKey", "sonarKey"]) {
      if (f[k]) {
        if (!byKey[k].has(f[k])) {
          byKey[k].set(f[k], []);
        }
        byKey[k].get(f[k]).push(f);
      }
    }
    f.eslint = {};
    f.cognitive = 0;
    f.cyclomatic = null;
  }
  const sigByKey = new Map(
    sink.signatures.filter((s) => s.eslintKey).map((s) => [s.eslintKey, s])
  );
  const mismatches = [];
  const unmatched = [];
  const file = sink.file;
  file.eslint = {};
  const depthReports = [];
  const nestedReports = [];
  const unionReports = [];
  const switchReports = [];
  let inlineConfigNotices = 0;
  for (const m of messages) {
    if (m.ruleId === null && /noInlineConfig/.test(m.message)) {
      inlineConfigNotices++;
      continue;
    }
    // core complexity also scores class-field initializers and static blocks, which aren't
    // functions (as in the cognitive-complexity topic)
    if (
      m.ruleId === "complexity" &&
      /^Class (?:field initializer|static block) /.test(m.message)
    ) {
      continue;
    }
    const re = COUNT_RE[m.ruleId];
    if (!re) {
      unmatched.push({ line: m.line, message: m.message, rule: m.ruleId });
      continue;
    }
    const count = Number(re.exec(m.message)?.[1]);
    if (Number.isNaN(count)) {
      unmatched.push({ line: m.line, message: m.message, rule: m.ruleId });
      continue;
    }
    const check = FUNCTION_CHECKS[m.ruleId];
    if (check) {
      const candidates = byKey[check.key].get(msgKey(m)) ?? [];
      // the head location is unique except for nested arrows sharing a head (rare): match the
      // candidate whose census count agrees
      let f = candidates[0];
      if (candidates.length > 1 && check.field) {
        f =
          candidates.find(
            (c) => c[check.field] === count && c.eslint[m.ruleId] === undefined
          ) ??
          candidates.find((c) => c.eslint[m.ruleId] === undefined) ??
          candidates[0];
      }
      if (!f) {
        // max-params also checks TS signatures
        if (
          (m.ruleId === "max-params" ||
            m.ruleId === "ts/max-params" ||
            m.ruleId === "len/params-never") &&
          sigByKey.has(msgKey(m))
        ) {
          const s = sigByKey.get(msgKey(m));
          s.eslint ??= {};
          s.eslint[m.ruleId] = count;
          continue;
        }
        unmatched.push({ line: m.line, message: m.message, rule: m.ruleId });
        continue;
      }
      f.eslint[m.ruleId] = count;
      if (check.store) {
        f[check.store] = count;
      }
      continue;
    }
    if (m.ruleId === "max-depth") {
      depthReports.push({ count, line: m.line, column: m.column });
    } else if (m.ruleId === "sonarjs/nested-control-flow") {
      nestedReports.push({ line: m.line, column: m.column });
    } else if (m.ruleId === "sonarjs/max-union-size") {
      unionReports.push({ line: m.line });
    } else if (m.ruleId === "sonarjs/max-switch-cases") {
      switchReports.push({ count, line: m.line });
    } else {
      file.eslint[m.ruleId] = count; // file-level
    }
  }
  // functions never reported have 0 for the rules that report every function with a count > 0
  for (const f of fns) {
    for (const [rule, check] of Object.entries(FUNCTION_CHECKS)) {
      if (!check.field) {
        continue;
      }
      const reported = f.eslint[rule];
      // IIFEs are skipped by max-lines-per-function unless IIFEs: true
      const skipped =
        (rule === "max-lines-per-function" ||
          rule === "len/mlpf-code" ||
          rule === "len/mlpf-noblank") &&
        f.iife;
      const sonarSkipped =
        rule === "sonarjs/max-lines-per-function" &&
        (f.iifeSonar || f.sonarReactExempt);
      const expected = f[check.field] ?? 0;
      if (skipped || sonarSkipped) {
        if (reported !== undefined) {
          mismatches.push({ expected: "skipped", fn: f.index, reported, rule });
        }
        continue;
      }
      if ((reported ?? 0) !== expected) {
        mismatches.push({
          expected,
          fn: f.index,
          reported: reported ?? 0,
          rule,
        });
      }
    }
  }
  // max-depth: each block's depth; the deepest per function must equal the census's
  const starts = sk.lineStarts(text);
  const offsetOf = (line, column) => starts[line - 1] + (column - 1);
  const innermost = (offset) => {
    let best = null;
    for (const f of fns) {
      if (f.range[0] <= offset && offset < f.range[1]) {
        if (!best || f.range[0] >= best.range[0]) {
          best = f;
        }
      }
    }
    return best;
  };
  const depthByFn = new Map();
  let depthTop = 0;
  for (const r of depthReports) {
    const f = innermost(offsetOf(r.line, r.column));
    if (f) {
      depthByFn.set(f.index, Math.max(depthByFn.get(f.index) ?? 0, r.count));
    } else {
      depthTop = Math.max(depthTop, r.count);
    }
  }
  for (const f of fns) {
    f.eslint["max-depth"] = depthByFn.get(f.index) ?? 0;
    if (f.eslint["max-depth"] !== f.maxDepth) {
      // a static block inside the function has its own frame: only flag real disagreements
      mismatches.push({
        expected: f.maxDepth,
        fn: f.index,
        reported: f.eslint["max-depth"],
        rule: "max-depth",
      });
    }
  }
  file.eslint["max-depth (top level)"] = depthTop;
  if (depthTop !== file.depthTop) {
    mismatches.push({
      expected: file.depthTop,
      fn: null,
      reported: depthTop,
      rule: "max-depth (top level)",
    });
  }
  file.eslint["sonarjs/nested-control-flow"] = nestedReports.length;
  if (nestedReports.length !== file.sonarAtFour) {
    mismatches.push({
      expected: file.sonarAtFour,
      fn: null,
      reported: nestedReports.length,
      rule: "sonarjs/nested-control-flow",
    });
  }
  file.eslint["sonarjs/max-union-size"] = unionReports.length;
  file.eslint["sonarjs/max-switch-cases"] = switchReports.map((r) => r.count);
  // file-level checks
  const fileChecks = {
    "len/max-lines-code": file.linesCode,
    "len/max-lines-noblank": file.linesNoBlank,
    "max-classes-per-file": file.classes > 1 ? file.classes : 0,
    "max-lines": file.lines,
    "sonarjs/max-lines": file.sonarLines,
  };
  for (const [rule, expected] of Object.entries(fileChecks)) {
    if ((file.eslint[rule] ?? 0) !== expected) {
      mismatches.push({
        expected,
        fn: null,
        reported: file.eslint[rule] ?? 0,
        rule,
      });
    }
  }
  const expectedUnions = file.unions.filter(
    (u) => u.sonar && u.size > 0
  ).length;
  if (unionReports.length !== expectedUnions) {
    mismatches.push({
      expected: expectedUnions,
      fn: null,
      reported: unionReports.length,
      rule: "sonarjs/max-union-size",
    });
  }
  const expectedSwitch = file.switches
    .filter((s) => s.nonEmpty > 0)
    .map((s) => s.nonEmpty);
  if (
    JSON.stringify(switchReports.map((r) => r.count).sort()) !==
    JSON.stringify(expectedSwitch.sort())
  ) {
    mismatches.push({
      expected: expectedSwitch,
      fn: null,
      reported: switchReports.map((r) => r.count),
      rule: "sonarjs/max-switch-cases",
    });
  }
  return {
    error: null,
    file,
    functions: fns,
    inlineConfigNotices,
    mismatches,
    nestedReports,
    signatures: sink.signatures,
    unmatched,
  };
};

// ── runners ────────────────────────────────────────────────────────────
// Oxlint with one or more rules alone (every category off). Keeps message, help and the label's
// span; byte offsets are converted to string indices by the caller (utf16Offset).
const oxlintBin = dc.oxlintBin;
const writeOxlintRules = (dir, name, rules, extra = {}) => {
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `oxlint.${name}.json`);
  writeFileSync(
    file,
    `${JSON.stringify(
      {
        categories: {
          correctness: "off",
          nursery: "off",
          pedantic: "off",
          perf: "off",
          restriction: "off",
          style: "off",
          suspicious: "off",
        },
        plugins: [],
        rules,
        ...extra,
      },
      null,
      2
    )}\n`
  );
  return file;
};
const runOxlint = ({ cwd, files, configFile }) => {
  const out = [];
  const CHUNK = 300;
  for (let i = 0; i < files.length; i += CHUNK) {
    const chunk = files.slice(i, i + CHUNK);
    const r = spawnSync(
      process.execPath,
      [
        oxlintBin,
        "-c",
        configFile,
        "--disable-nested-config",
        "--format",
        "json",
        ...chunk,
      ],
      { cwd, encoding: "utf8", maxBuffer: 1 << 30 }
    );
    const start = r.stdout.indexOf("{");
    if (start === -1) {
      throw new Error(`oxlint printed no JSON: ${r.stderr.slice(0, 500)}`);
    }
    const report = JSON.parse(r.stdout.slice(start));
    if (report.number_of_files !== chunk.length) {
      throw new Error(
        `oxlint linted ${report.number_of_files} of ${chunk.length} files`
      );
    }
    for (const d of report.diagnostics) {
      const span = d.labels?.[0]?.span ?? {};
      out.push({
        column: span.column ?? null,
        file: d.filename.replace(/^\.\//, ""),
        help: d.help ?? null,
        length: span.length ?? null,
        line: span.line ?? null,
        message: d.message,
        offset: span.offset ?? null,
        rule: d.code ? dc.oxlintRule(d.code) : "oxlint",
        severity: d.severity,
        url: d.url ?? null,
      });
    }
  }
  return out;
};
// Biome with its own config dir. Keeps message and the JSON reporter's advices; columns are
// 1-based code points (see codePointColumn).
const biomeBin = dc.biomeBin;
const writeBiomeConfig = (dir, body) => {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "biome.json"), `${JSON.stringify(body, null, 2)}\n`);
  return dir;
};
const BIOME_BASE = {
  assist: { enabled: false },
  files: { ignoreUnknown: true, maxSize: 10_000_000 },
  formatter: { enabled: false },
  javascript: { parser: { unsafeParameterDecoratorsEnabled: true } },
  root: true,
  vcs: { enabled: false },
};
const biomeRulesConfig = (dir, rules) =>
  writeBiomeConfig(dir, {
    ...BIOME_BASE,
    linter: { enabled: true, rules: { recommended: false, ...rules } },
  });
const runBiome = ({ cwd, files, configDir }) => {
  const out = [];
  const CHUNK = 400;
  for (let i = 0; i < files.length; i += CHUNK) {
    const r = spawnSync(
      process.execPath,
      [
        biomeBin,
        "lint",
        `--config-path=${configDir}`,
        "--reporter=json",
        "--max-diagnostics=none",
        ...files.slice(i, i + CHUNK),
      ],
      { cwd, encoding: "utf8", maxBuffer: 1 << 30 }
    );
    const start = r.stdout.indexOf("{");
    if (start === -1) {
      throw new Error(`biome printed no JSON: ${r.stderr.slice(0, 500)}`);
    }
    const report = JSON.parse(r.stdout.slice(start));
    for (const d of report.diagnostics ?? []) {
      const path = d.location?.path;
      out.push({
        advices: d.advices ?? [],
        column: d.location?.start?.column ?? null,
        endColumn: d.location?.end?.column ?? null,
        endLine: d.location?.end?.line ?? null,
        file: typeof path === "string" ? path : (path?.file ?? null),
        line: d.location?.start?.line ?? null,
        message: typeof d.message === "string" ? d.message : null,
        rule: (d.category ?? "").replace(/^lint\//, ""),
        severity: d.severity,
      });
    }
  }
  return out;
};
// Biome's terminal output carries the notes the JSON reporter leaves out.
const biomeNotes = ({ cwd, files, configDir }) => {
  const r = spawnSync(
    process.execPath,
    [
      biomeBin,
      "lint",
      `--config-path=${configDir}`,
      "--colors=off",
      "--max-diagnostics=none",
      ...files,
    ],
    { cwd, encoding: "utf8", maxBuffer: 1 << 30 }
  );
  const stdout = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  const out = [];
  for (const block of stdout.split(/\n(?=\S+:\d+:\d+ lint\/)/)) {
    const head = /^(\S+):(\d+):(\d+) lint\/(\S+)/.exec(block.trim());
    if (!head) {
      continue;
    }
    out.push({
      column: Number(head[3]),
      file: head[1],
      line: Number(head[2]),
      notes: [...block.matchAll(/^\s+[iℹ] (.+)$/gm)].map((m) => m[1].trim()),
      rule: head[4],
    });
  }
  return out;
};

// ── offsets ────────────────────────────────────────────────────────────
// Oxlint reports UTF-8 byte offsets; Biome reports 1-based code-point columns.
const utf16Offset = (text) => {
  if (!/[^\x00-\x7f]/.test(text)) {
    return (b) => b;
  }
  const buf = Buffer.from(text, "utf8");
  const map = new Int32Array(buf.length + 1);
  let u = 0;
  let b = 0;
  for (const ch of text) {
    const bytes = Buffer.byteLength(ch, "utf8");
    for (let k = 0; k < bytes; k++) {
      map[b + k] = u;
    }
    b += bytes;
    u += ch.length;
  }
  map[b] = u;
  return (byte) => map[Math.min(byte, buf.length)];
};
const codePointColumn = (text, starts) => (line, column) => {
  const lineText = text.slice(starts[line - 1], starts[line] ?? text.length);
  let u = 0;
  let cp = 1;
  for (const ch of lineText) {
    if (cp === column) {
      break;
    }
    u += ch.length;
    cp++;
  }
  return starts[line - 1] + u;
};
const innermostFunction = (fns, offset, { strictStart = false } = {}) => {
  let best = null;
  for (const f of fns) {
    const inside = strictStart
      ? f.range[0] === offset
      : f.range[0] <= offset && offset < f.range[1];
    if (inside && (!best || f.range[0] >= best.range[0])) {
      best = f;
    }
  }
  return best;
};

// The function a diagnostic that starts at a function's head is about: skip whitespace from the
// reported offset, then the function whose head (method key or node) starts there; else the
// innermost function containing the offset.
const functionAtHead = (fns, text, offset) => {
  let o = offset;
  while (o < text.length && /\s/.test(text[o])) {
    o++;
  }
  const exact = fns.filter((f) => f.ownerStart === o || f.range[0] === o);
  if (exact.length) {
    return exact.sort((a, b) => b.range[0] - a.range[0])[0];
  }
  return innermostFunction(fns, o);
};

// ── misc ───────────────────────────────────────────────────────────────
const writeJson = sk.writeJson;
const readJson = (p, fallback = null) =>
  existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : fallback;
const writeJsonl = sk.writeJsonl;
const readJsonl = (p) => (existsSync(p) ? sk.readJsonl(p) : []);
const pct = dc.pct;
const per10k = dc.per10k;
const rng = sk.rng;
const shuffle = sk.shuffle;
const fnId = (repo, file, f) =>
  `${repo}:${file}:${f.startLine}:${f.startColumn}`;
const quantile = (sorted, q) => {
  if (sorted.length === 0) {
    return null;
  }
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return lo === hi
    ? sorted[lo]
    : Math.round((sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo)) * 10) /
        10;
};
const distribution = (values) => {
  const v = values.filter((x) => x !== null && x !== undefined);
  const s = Float64Array.from(v).sort();
  const n = s.length;
  const sum = s.reduce((a, b) => a + b, 0);
  return {
    max: n ? s[n - 1] : null,
    mean: n ? Math.round((sum / n) * 100) / 100 : null,
    median: quantile(s, 0.5),
    n,
    p90: quantile(s, 0.9),
    p99: quantile(s, 0.99),
  };
};
const countBy = (xs, f) => {
  const out = {};
  for (const x of xs) {
    const k = f(x);
    if (k === null || k === undefined) {
      continue;
    }
    out[k] = (out[k] ?? 0) + 1;
  }
  return Object.fromEntries(
    Object.entries(out).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
  );
};
// Spearman's rho with average ranks for ties.
const ranks = (xs) => {
  const idx = xs.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]);
  const r = new Float64Array(xs.length);
  for (let i = 0; i < idx.length;) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) {
      j++;
    }
    const avg = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) {
      r[idx[k][1]] = avg;
    }
    i = j + 1;
  }
  return r;
};
const pearson = (a, b) => {
  const n = a.length;
  let ma = 0;
  let mb = 0;
  for (let i = 0; i < n; i++) {
    ma += a[i];
    mb += b[i];
  }
  ma /= n;
  mb /= n;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < n; i++) {
    num += (a[i] - ma) * (b[i] - mb);
    da += (a[i] - ma) ** 2;
    db += (b[i] - mb) ** 2;
  }
  return da === 0 || db === 0 ? null : num / Math.sqrt(da * db);
};
const spearman = (a, b) => {
  const r = pearson(ranks(a), ranks(b));
  return r === null ? null : Math.round(r * 1000) / 1000;
};

module.exports = {
  ALL,
  BIOME_BASE,
  CALIBRATION_DIR,
  CLI,
  CORE,
  DOGFOOD,
  EXAMPLES_DIR,
  HERE,
  HISTORY_DIR,
  MEASURE_RULES,
  OUT_DIR,
  PINNED,
  REACT,
  RESULTS_DIR,
  SETS,
  TMP,
  TOPIC,
  ULTRACITE,
  arg,
  biomeBin,
  biomeNotes,
  biomeRulesConfig,
  checkPinned,
  codePointColumn,
  collect,
  collectTests,
  countBy,
  dc,
  distribution,
  existsSync,
  filesOf,
  flag,
  fnId,
  functionAtHead,
  getRepo,
  innermostFunction,
  measure,
  mkdirSync,
  oxfmtBin,
  oxlintBin,
  pct,
  pearson,
  per10k,
  permalink,
  quantile,
  readFileSync,
  readJson,
  readJsonl,
  repoMeta,
  rmSync,
  rng,
  runBiome,
  runOxlint,
  selectedRepos,
  setOf,
  shaOf,
  shuffle,
  sk,
  spawnSync,
  spearman,
  toolVersions,
  tsParser,
  utf16Offset,
  writeBiomeConfig,
  writeFileSync,
  writeJson,
  writeJsonl,
  writeOxlintRules,
  execFileSync,
  pathToFileURL,
};
