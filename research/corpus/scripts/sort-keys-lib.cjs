// Shared definitions for the sort-keys scripts (sort-keys-*.cjs): the repos measured, the three
// rules' key names and comparators reimplemented from their sources, the per-object description
// the inventory and the fix analysis share, and runners for Oxlint, ESLint and Biome that keep each
// linter's full message and help text (what `ultracite fix --claude/--codex` hands an agent).
//
// The rules this topic is about:
//   sort-keys        Oxlint core ("error", no options), with a fix that `oxlint --fix` applies;
//                    ESLint core, through @eslint/js `configs.all` (default options, no fix);
//                    both "off" in the TanStack presets
//   useSortedKeys    Biome core, an assist source action ("on"), applied by `biome check --write`;
//                    "off" in the TanStack preset and for package.json
//
// Reimplemented from source, and checked object by object against the real linters on the
// calibration and the corpus (sort-keys-linters.cjs):
//   ESLint 10.12.0 lib/rules/sort-keys.js: one report per adjacent pair out of order; the name is
//     getStaticPropertyName(), or the identifier of a computed `[foo]` key; a spread resets the
//     previous name; a key with no name is skipped without resetting it; `<=` on UTF-16 strings.
//   Oxlint 1.86.0 crates/oxc_linter/src/rules/eslint/sort_keys.rs: one report per object; the name
//     is PropertyKey::static_name() (no name for any computed expression that isn't a literal);
//     spreads reset; byte order of the UTF-8 strings. The fix sorts one group of named keys and is
//     offered only when there is exactly one such group, spreads sit only at its ends, every key
//     has a name, and no comment sits between keys except a leading JSDoc block or a `// ...`
//     after the comma on the same line.
//   Biome 2.5.15 crates/biome_js_analyze/src/assist/source/use_sorted_keys.rs: one report per
//     object; a member with no name (spread, computed non-literal key) ends a chunk; chunks sort
//     separately, stably, by CldrAsciiCollator's natural order (biome_string_case); the fix always
//     applies.
"use strict";

// The four React codebases the accessibility post added are an optional separate set. Must be set
// before collect-files.cjs is loaded anywhere in the process.
process.env.CORPUS_REPO_LISTS ??= "repos-accessibility.json";

const { execFileSync, spawnSync } = require("node:child_process");
const {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} = require("node:fs");
const { tmpdir } = require("node:os");
const { dirname, join, resolve } = require("node:path");

const dc = require("./dead-code-lib.cjs");
const { collect, config, getRepo } = require("./collect-files.cjs");
const { load, dirs } = require("./tools.cjs");

const { astUtils } = load();
const HERE = resolve(__dirname, "..");
const TOPIC = "sort-keys";
const RESULTS_DIR = join(HERE, "results", TOPIC);
const OUT_DIR = join(HERE, "out", TOPIC);
const CALIBRATION_DIR = join(HERE, "calibration", TOPIC);
const EXAMPLES_DIR = join(HERE, "examples", TOPIC);
const HISTORY_DIR = join(HERE, "repos", "history");
// Copies the linters write to. Ultracite's presets ignore `**/out`, so they can't live under out/.
const TMP =
  process.env.SORT_KEYS_TMP ?? join(tmpdir(), "ultracite-research-sort-keys");
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
const REACT = ["shadcn", "radix", "react-aria", "supabase"];
const SETS = { core: CORE, dogfood: DOGFOOD, react: REACT };
const setOf = (name) =>
  Object.entries(SETS).find(([, names]) => names.includes(name))?.[0] ?? null;
const ALL = [...CORE, ...DOGFOOD, ...REACT];
const PINNED = Object.fromEntries([
  ["zod", "284243fb0d6532665afdc9239188773bb624f73c"],
  ["hono", "f78a245abc393368583085e19c7f5b28b460bf51"],
  ["trpc", "796700d8653b3832409fff997e6f5789519b9ea7"],
  ["vite", "3b72997d42e7dd2b31898d0e68461e3025e836b6"],
  ["astro", "9050e3819c51b0383cced278c278bc6f45c63468"],
  ["excalidraw", "4c00f31ddcc20086bac1020428819fe0b9a30bce"],
  ["next.js", "d8bfc3c994670c367e6e31853b78f42e8b7fba85"],
  ["vscode", "959031245ebb1fe077e0d512e1397c0ae82006e4"],
  ...require("./repos-accessibility.json").repos.map((r) => [r.name, r.sha]),
]);
const repoMeta = (name) => {
  const r = config.repos.find((x) => x.name === name);
  return { ...r, root: getRepo(name).root };
};
const shaOf = (name) => PINNED[name] ?? dc.gitHead(getRepo(name).root);
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
const selectedRepos = (fallback = ALL) => {
  const only = (arg("repos", "") || "").split(",").filter(Boolean);
  return only.length > 0 ? only : fallback;
};
const permalink = (name, file, line, endLine) =>
  dc.permalink(repoMeta(name).github, shaOf(name), file, line, endLine);

// ── parsing ────────────────────────────────────────────────────────────
const tsParserDir = dirname(
  require.resolve("@typescript-eslint/parser", { paths: [CLI] })
);
const tsEstree = require(
  require.resolve("@typescript-eslint/typescript-estree", {
    paths: [tsParserDir],
  })
);
const parse = (text, rel) =>
  tsEstree.parse(text, {
    comment: true,
    filePath: rel,
    jsx: /\.(?:tsx|jsx)$/.test(rel) || /\.(?:js|mjs|cjs)$/.test(rel),
    loc: true,
    range: true,
    tokens: false,
  });
// A JSX-free parse for .js files that use `<T>x` casts would fail with jsx on; retry without it.
const safeParse = (text, rel) => {
  try {
    return { ast: parse(text, rel), error: null };
  } catch (error) {
    if (/\.(?:js|mjs|cjs)$/.test(rel)) {
      try {
        return {
          ast: tsEstree.parse(text, {
            comment: true,
            filePath: rel,
            jsx: false,
            loc: true,
            range: true,
          }),
          error: null,
        };
      } catch {
        // fall through
      }
    }
    return { ast: null, error: String(error.message).split("\n")[0] };
  }
};

const VISITOR_SKIP = new Set(["parent", "loc", "range", "tokens", "comments"]);
// Every child node with the field it hangs off, in source order.
const children = (node) => {
  const out = [];
  for (const key of Object.keys(node)) {
    if (VISITOR_SKIP.has(key)) {
      continue;
    }
    const v = node[key];
    if (Array.isArray(v)) {
      v.forEach((c, i) => {
        if (c && typeof c.type === "string") {
          out.push({ field: key, index: i, node: c });
        }
      });
    } else if (v && typeof v.type === "string") {
      out.push({ field: key, index: null, node: v });
    }
  }
  return out;
};
// Walks the tree, setting `parent`, and calls visit(node) for each node.
const walk = (root, visit) => {
  const stack = [[root, null]];
  while (stack.length > 0) {
    const [node, parent] = stack.pop();
    node.parent = parent;
    visit(node);
    const kids = children(node);
    for (let i = kids.length - 1; i >= 0; i--) {
      stack.push([kids[i].node, node]);
    }
  }
};

// ── key names, per linter ──────────────────────────────────────────────
// ESLint (sort-keys.js getPropertyName): the static name, or `node.key.name` (so `[foo]` is "foo").
const eslintName = (prop) => {
  if (prop.type !== "Property") {
    return null;
  }
  const s = astUtils.getStaticPropertyName(prop);
  if (s !== null) {
    return s;
  }
  return prop.key.name || null;
};
// Oxlint (PropertyKey::static_name): identifiers that aren't computed, string, numeric, bigint,
// regex and null literals, and template literals without expressions. A numeric key is Rust's
// f64 Display, which differs from JavaScript's String() only for exponent forms.
const rustNumber = (v) => {
  if (Number.isInteger(v) && Math.abs(v) >= 1e21) {
    return BigInt(v).toString();
  }
  if (!Number.isInteger(v) && /e-/.test(String(v))) {
    return v.toFixed(20).replace(/0+$/, "");
  }
  return String(v);
};
const oxlintName = (prop) => {
  if (prop.type !== "Property") {
    return null;
  }
  const k = prop.key;
  if (k.type === "Identifier") {
    return prop.computed ? null : k.name;
  }
  if (k.type === "Literal") {
    if (k.regex) {
      return `/${k.regex.pattern}/${k.regex.flags}`;
    }
    if (typeof k.bigint === "string") {
      return k.bigint;
    }
    if (k.value === null) {
      return "null";
    }
    if (typeof k.value === "number") {
      return rustNumber(k.value);
    }
    if (typeof k.value === "string") {
      return k.value;
    }
    return null;
  }
  if (k.type === "TemplateLiteral" && k.expressions.length === 0) {
    return k.quasis[0].value.cooked;
  }
  return null;
};
// Biome (AnyJsObjectMember::name): the key token's text without quotes, so numbers keep their raw
// spelling (`0x10`) and escapes stay escaped. Computed keys have a name only if they're a literal
// or a template without expressions.
const biomeName = (prop, text) => {
  if (prop.type !== "Property") {
    return null;
  }
  const k = prop.key;
  const raw = text.slice(k.range[0], k.range[1]);
  if (k.type === "Identifier") {
    return prop.computed ? null : k.name;
  }
  if (k.type === "Literal") {
    if (typeof k.value === "string") {
      return raw.slice(1, -1);
    }
    return raw;
  }
  if (
    k.type === "TemplateLiteral" &&
    k.expressions.length === 0 &&
    prop.computed
  ) {
    return raw.slice(1, -1);
  }
  return null;
};

// ── comparators ────────────────────────────────────────────────────────
const eslintCompare = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const oxlintCompare = (a, b) =>
  Buffer.compare(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
// biome_string_case CldrAsciiCollator: this table lists ASCII in collation order; bytes >= 128
// weigh themselves.
const COLLATION = [
  ...[0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08],
  ...[
    0x0e, 0x0f, 0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18, 0x19,
    0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f,
  ],
  0x7f,
  ...[0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x20],
  ...[..."_-,;:!?.'\"()[]{}@*/\\&#%`^+<=>|~$0123456789"].map((c) =>
    c.charCodeAt(0)
  ),
  ...[..."AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz"].map((c) =>
    c.charCodeAt(0)
  ),
];
const WEIGHTS = (() => {
  if (COLLATION.length !== 128 || new Set(COLLATION).size !== 128) {
    throw new Error(`collation table has ${COLLATION.length} entries`);
  }
  const w = new Array(256);
  COLLATION.forEach((byte, i) => {
    w[byte] = i;
  });
  for (let i = 128; i < 256; i++) {
    w[i] = i;
  }
  return w;
})();
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const then = (a, b) => (a !== 0 ? a : b);
const isDigit = (c) => c >= 0x30 && c <= 0x39;
// A port of biome_string_case's Collator::cmp over UTF-8 bytes.
const biomeCompare = (left, right) => {
  const a = Buffer.from(left, "utf8");
  const b = Buffer.from(right, "utf8");
  let i = 0;
  let j = 0;
  let prev = null;
  for (;;) {
    const c1 = i < a.length ? a[i++] : null;
    const c2 = j < b.length ? b[j++] : null;
    if (c1 === null && c2 === null) {
      return 0;
    }
    if (c1 === null) {
      return -1;
    }
    if (c2 === null) {
      return 1;
    }
    if (c1 === c2) {
      prev = c1;
      continue;
    }
    let x = c1;
    let y = c2;
    let numberOrdering = 0;
    let decided = null;
    for (;;) {
      const dx = isDigit(x);
      const dy = isDigit(y);
      if (!dx && !dy) {
        if (numberOrdering === 0) {
          break;
        }
        decided = numberOrdering;
        break;
      }
      if (!dx && dy) {
        if (prev !== null && isDigit(prev)) {
          decided = -1;
        }
        break;
      }
      if (dx && !dy) {
        if (prev !== null && isDigit(prev)) {
          decided = 1;
        }
        break;
      }
      numberOrdering = then(numberOrdering, cmp(x, y));
      const n1 = i < a.length ? a[i++] : null;
      const n2 = j < b.length ? b[j++] : null;
      if (n1 === null && n2 === null) {
        return numberOrdering;
      }
      if (n1 === null) {
        return isDigit(n2) ? -1 : then(numberOrdering, -1);
      }
      if (n2 === null) {
        return isDigit(n1) ? 1 : then(numberOrdering, 1);
      }
      prev = x;
      x = n1;
      y = n2;
    }
    if (decided !== null) {
      return decided;
    }
    const ordering = cmp(WEIGHTS[x], WEIGHTS[y]);
    if (ordering !== 0) {
      return ordering;
    }
    prev = x;
  }
};
const COMPARE = {
  biome: biomeCompare,
  eslint: eslintCompare,
  oxlint: oxlintCompare,
};

// ── comments and gaps ──────────────────────────────────────────────────
const lineOf = (starts, offset) => {
  let lo = 0;
  let hi = starts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (starts[mid] <= offset) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  return lo + 1;
};
const lineStarts = (text) => {
  const starts = [0];
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 10) {
      starts.push(i + 1);
    }
  }
  return starts;
};
// Comments whose range lies in [from, to).
const commentsIn = (comments, from, to) =>
  comments.filter((c) => c.range[0] >= from && c.range[1] <= to);
const isJsdoc = (c) =>
  c.type === "Block" && c.value.startsWith("*") && c.value !== "*";

// ── one object, as each linter sees it ─────────────────────────────────
// Expressions whose evaluation can run code or change state, not counting function bodies:
// calls, `new`, assignments, `++`/`--`, `await`, `yield`, `delete`, tagged templates, `import()`.
const EFFECT_TYPES = new Set([
  "CallExpression",
  "NewExpression",
  "AssignmentExpression",
  "UpdateExpression",
  "AwaitExpression",
  "YieldExpression",
  "TaggedTemplateExpression",
  "ImportExpression",
]);
const FUNCTION_TYPES = new Set([
  "ArrowFunctionExpression",
  "FunctionExpression",
  "FunctionDeclaration",
  "ClassExpression",
]);
const effectsOf = (node) => {
  let effect = false;
  let read = false;
  const stack = [node];
  while (stack.length > 0) {
    const n = stack.pop();
    if (FUNCTION_TYPES.has(n.type)) {
      continue;
    }
    if (
      EFFECT_TYPES.has(n.type) ||
      (n.type === "UnaryExpression" && n.operator === "delete")
    ) {
      effect = true;
    }
    if (n.type === "MemberExpression" || n.type === "Identifier") {
      read = true;
    }
    for (const c of children(n)) {
      // Type annotations and the key of a nested non-computed property don't evaluate.
      if (/^TS/.test(c.node.type) && c.field !== "expression") {
        continue;
      }
      stack.push(c.node);
    }
  }
  return { effect, read };
};
const valueKindOf = (prop) => {
  if (prop.type === "SpreadElement") {
    return "spread";
  }
  if (prop.kind === "get" || prop.kind === "set") {
    return prop.kind;
  }
  if (prop.method) {
    return "method";
  }
  let v = prop.value;
  while (
    [
      "TSAsExpression",
      "TSSatisfiesExpression",
      "TSNonNullExpression",
      "TSTypeAssertion",
    ].includes(v.type)
  ) {
    v = v.expression;
  }
  switch (v.type) {
    case "ArrowFunctionExpression":
    case "FunctionExpression":
      return "function";
    case "ObjectExpression":
      return "object";
    case "ArrayExpression":
      return "array";
    case "Literal":
      return v.regex ? "regex" : v.value === null ? "null" : typeof v.value;
    case "TemplateLiteral":
      return v.expressions.length === 0 ? "string" : "template";
    case "Identifier":
      return v.name === "undefined" ? "undefined" : "identifier";
    case "MemberExpression":
      return "member";
    case "CallExpression":
    case "NewExpression":
      return "call";
    case "JSXElement":
    case "JSXFragment":
      return "jsx";
    default:
      return "other";
  }
};
const keyTypeOf = (prop) => {
  if (prop.type === "SpreadElement") {
    return "spread";
  }
  const k = prop.key;
  if (!prop.computed) {
    if (k.type === "Identifier") {
      return "identifier";
    }
    if (k.type === "Literal") {
      return typeof k.value === "number"
        ? "number"
        : typeof k.value === "string"
          ? "string"
          : "other-literal";
    }
    return "other";
  }
  if (
    k.type === "Literal" ||
    (k.type === "TemplateLiteral" && k.expressions.length === 0)
  ) {
    return "computed-literal";
  }
  if (k.type === "Identifier") {
    return "computed-identifier";
  }
  return "computed-expression";
};

// Groups of named keys, split the way each rule splits them, and what each rule reports.
//   eslint: spreads reset; a key with no name is skipped (no reset); reports per descent
//   oxlint: same splitting, with its own names; one report if any descent
//   biome:  any member with no name (spreads, computed non-literal keys) ends a chunk
const groupsFor = (props, linter, text) => {
  const groups = [];
  let current = [];
  props.forEach((p, i) => {
    if (p.type === "SpreadElement") {
      if (current.length) {
        groups.push(current);
      }
      current = [];
      return;
    }
    const name =
      linter === "eslint"
        ? eslintName(p)
        : linter === "oxlint"
          ? oxlintName(p)
          : biomeName(p, text);
    if (name === null) {
      if (linter === "biome") {
        if (current.length) {
          groups.push(current);
        }
        current = [];
      }
      return;
    }
    current.push({ index: i, name });
  });
  if (current.length) {
    groups.push(current);
  }
  return groups;
};
const descents = (groups, compare) => {
  let n = 0;
  for (const g of groups) {
    for (let i = 1; i < g.length; i++) {
      if (compare(g[i - 1].name, g[i].name) > 0) {
        n++;
      }
    }
  }
  return n;
};
// Probability that a random order of each group is sorted: product over groups of
// (ties' factorials) / size!.
const factorial = (n) => {
  let f = 1;
  for (let i = 2; i <= n; i++) {
    f *= i;
  }
  return f;
};
const chanceSorted = (groups) =>
  groups.reduce((p, g) => {
    const counts = {};
    for (const k of g) {
      counts[k.name] = (counts[k.name] ?? 0) + 1;
    }
    const ties = Object.values(counts).reduce((x, c) => x * factorial(c), 1);
    return p * (ties / factorial(g.length));
  }, 1);
// Kendall distance to sorted: the share of key pairs inside a group that are out of order
// (0 sorted, 1 reversed), pooled over groups.
const disorder = (groups, compare) => {
  let pairs = 0;
  let inverted = 0;
  for (const g of groups) {
    for (let i = 0; i < g.length; i++) {
      for (let j = i + 1; j < g.length; j++) {
        pairs++;
        if (compare(g[i].name, g[j].name) > 0) {
          inverted++;
        }
      }
    }
  }
  return pairs === 0 ? null : inverted / pairs;
};

// Why Oxlint would report this object without a fix (sort_keys.rs collect_fixable_properties), or
// null if it would offer one. `comments` are the file's comments, `text` its source.
const oxlintFixBlocker = (node, text, comments) => {
  const props = node.properties;
  const groups = groupsFor(props, "oxlint", text);
  if (groups.length !== 1) {
    return groups.length === 0
      ? "no named keys"
      : "spreads split the keys into groups";
  }
  // lift_property_span: a key's span grows backwards over the JSDoc blocks right above it, and
  // forwards over a `// ...` that follows its comma on the same line.
  const lifted = props.map((p, i) => {
    const prevEnd = i > 0 ? props[i - 1].range[1] : node.range[0] + 1;
    const boundary =
      i + 1 < props.length ? props[i + 1].range[0] : node.range[1];
    const leading = commentsIn(comments, prevEnd, p.range[0]);
    let start = p.range[0];
    for (let k = leading.length - 1; k >= 0; k--) {
      const c = leading[k];
      // A comment that trails the previous key on its own line isn't attached to this one.
      if (
        i > 0 &&
        !text.slice(props[i - 1].range[1], c.range[0]).includes("\n")
      ) {
        break;
      }
      if (isJsdoc(c)) {
        start = c.range[0];
      }
    }
    let end = p.range[1];
    const after = commentsIn(comments, p.range[1], boundary)[0];
    if (after && after.type === "Line") {
      const between = text.slice(p.range[1], after.range[0]);
      if (between.includes(",") && !between.includes("\n")) {
        end = after.range[1];
      }
    }
    return { end, start };
  });
  if (
    commentsIn(comments, node.range[0] + 1, lifted[0].start).length > 0 ||
    commentsIn(comments, lifted.at(-1).end, node.range[1] - 1).length > 0
  ) {
    return "a comment before the first key or after the last";
  }
  let spreadPos = "start";
  for (let i = 0; i < props.length; i++) {
    const p = props[i];
    const gap =
      i + 1 < props.length
        ? commentsIn(comments, lifted[i].end, lifted[i + 1].start)
        : [];
    if (p.type === "SpreadElement") {
      if (props[i + 1]?.type === "Property" && gap.length > 0) {
        return "a comment between keys";
      }
      if (spreadPos === "canEnd") {
        spreadPos = "end";
      }
      continue;
    }
    if (spreadPos === "start") {
      spreadPos = "canEnd";
    } else if (spreadPos === "end") {
      return "a spread between keys";
    }
    if (oxlintName(p) === null) {
      return "a computed key";
    }
    if (gap.length > 0) {
      return "a comment between keys";
    }
  }
  return null;
};

// The key order each fix would produce, as indices into node.properties (null: no fix).
//   oxlint: the one group of named keys sorted (sort_unstable_by, which for short lists keeps
//           ties in place), spreads left at the ends
//   biome:  every chunk sorted stably
const predictedOrder = (node, text, comments, linter) => {
  const props = node.properties;
  const order = props.map((_, i) => i);
  if (linter === "oxlint") {
    if (oxlintFixBlocker(node, text, comments) !== null) {
      return null;
    }
    const named = props
      .map((p, i) => ({ i, p }))
      .filter(({ p }) => p.type === "Property");
    const sorted = [...named].sort(
      (x, y) => oxlintCompare(oxlintName(x.p), oxlintName(y.p)) || x.i - y.i
    );
    named.forEach(({ i }, k) => {
      order[i] = sorted[k].i;
    });
    return order;
  }
  const chunks = [];
  let current = [];
  props.forEach((p, i) => {
    const name = biomeName(p, text);
    if (name === null) {
      if (current.length) {
        chunks.push(current);
      }
      current = [];
      return;
    }
    current.push({ i, name });
  });
  if (current.length) {
    chunks.push(current);
  }
  for (const chunk of chunks) {
    const sorted = [...chunk].sort(
      (x, y) => biomeCompare(x.name, y.name) || x.i - y.i
    );
    chunk.forEach(({ i }, k) => {
      order[i] = sorted[k].i;
    });
  }
  return order;
};

// ── matching objects across a fix ──────────────────────────────────────
// A fix only reorders properties, so an object is identified by its path from the root, naming
// properties by their key's source text (and occurrence, for duplicates) instead of their index.
const propSig = (prop, text) => {
  if (prop.type === "SpreadElement") {
    // By position among the spreads (propSigs numbers repeats): a fix can rewrite objects inside
    // the spread's argument, but never moves a spread.
    return "...";
  }
  const k = text.slice(prop.key.range[0], prop.key.range[1]);
  return `${prop.computed ? "[" : ""}${k}${prop.computed ? "]" : ""}${prop.kind === "get" ? " get" : prop.kind === "set" ? " set" : ""}`;
};
const propSigs = (node, text) => {
  const seen = new Map();
  return node.properties.map((p) => {
    const s = propSig(p, text);
    const n = seen.get(s) ?? 0;
    seen.set(s, n + 1);
    return n === 0 ? s : `${s}#${n}`;
  });
};
const pathOf = (node, text, sigCache) => {
  const segs = [];
  let cur = node;
  while (cur.parent) {
    const p = cur.parent;
    if (p.type === "ObjectExpression") {
      let sigs = sigCache.get(p);
      if (!sigs) {
        sigs = propSigs(p, text);
        sigCache.set(p, sigs);
      }
      segs.push(`{${sigs[p.properties.indexOf(cur)]}}`);
    } else {
      const c = children(p).find((x) => x.node === cur);
      segs.push(
        `${p.type}.${c.field}${c.index === null ? "" : `[${c.index}]`}`
      );
    }
    cur = p;
  }
  return segs.reverse().join("/");
};
// Every object literal in a file with its path, start and property signatures.
const objectsByPath = (text, rel) => {
  const { ast, error } = safeParse(text, rel);
  if (!ast) {
    return { error, objects: null };
  }
  const objects = new Map();
  const sigCache = new Map();
  walk(ast, (n) => {
    if (n.type === "ObjectExpression") {
      objects.set(pathOf(n, text, sigCache), {
        node: n,
        sigs: propSigs(n, text),
        start: n.range[0],
      });
    }
  });
  return { ast, error: null, objects };
};

// Rewrites an object's properties into a new order, each property's source text moving into
// another property's slot; whatever sits between properties (commas, comments, blank lines) stays
// where it was. This is a hand sort that ignores comments.
const reorderText = (text, node, order) => {
  const props = node.properties;
  let out = "";
  let pos = props[0].range[0];
  out += text.slice(0, pos);
  props.forEach((p, i) => {
    out += text.slice(pos, p.range[0]);
    const src = props[order[i]];
    out += text.slice(src.range[0], src.range[1]);
    pos = p.range[1];
  });
  out += text.slice(pos);
  return out;
};
// Sorts every object by ESLint's own reading (spreads end a group, a key with no name stays in
// its slot, names compared with `<`), innermost objects first, until ESLint's rule would be
// satisfied: the least an author or agent must do to clear ESLint's sort-keys by hand.
const handSortEslint = (text, rel) => {
  let current = text;
  for (let guard = 0; guard < 1000; guard++) {
    const { ast } = safeParse(current, rel);
    let target = null;
    walk(ast, (n) => {
      if (n.type !== "ObjectExpression" || n.properties.length < 2) {
        return;
      }
      if (
        descents(groupsFor(n.properties, "eslint", current), eslintCompare) > 0
      ) {
        // Prefer the innermost: walk visits parents first, so the last one found wins.
        target = n;
      }
    });
    if (!target) {
      return current;
    }
    const order = target.properties.map((_, i) => i);
    for (const g of groupsFor(target.properties, "eslint", current)) {
      const sorted = [...g].sort(
        (x, y) => eslintCompare(x.name, y.name) || x.index - y.index
      );
      g.forEach((k, j) => {
        order[k.index] = sorted[j].index;
      });
    }
    current = reorderText(current, target, order);
  }
  throw new Error(`handSortEslint did not converge on ${rel}`);
};

// ── linters ────────────────────────────────────────────────────────────
// Oxlint with sort-keys alone (Ultracite's core sets it to "error" with no options, so this is the
// same rule with the same options), every category off so no other rule's fix can run.
const oxlintSortKeysConfig = (dir) => {
  mkdirSync(dir, { recursive: true });
  const file = join(dir, "oxlint.sort-keys.json");
  writeFileSync(
    file,
    `${JSON.stringify({ categories: { correctness: "off" }, plugins: [], rules: { "sort-keys": "error" } }, null, 2)}\n`
  );
  return file;
};
// The root config `ultracite init` writes for core + react (dead-code-lib.cjs).
const oxlintInitConfig = (dir, presets = ["core", "react"]) =>
  dc.writeOxlintConfig(presets, dir);
const runOxlint = ({
  cwd,
  files,
  configFile,
  keep = (r) => r === "sort-keys",
}) => dc.runOxlint({ configFile, cwd, files, keep });
const oxlintFix = ({ cwd, files, configFile, dangerously = false }) => {
  const CHUNK = 400;
  for (let i = 0; i < files.length; i += CHUNK) {
    spawnSync(
      process.execPath,
      [
        dc.oxlintBin,
        "-c",
        configFile,
        "--disable-nested-config",
        dangerously ? "--fix-dangerously" : "--fix",
        ...files.slice(i, i + CHUNK),
      ],
      { cwd, encoding: "utf8", maxBuffer: 1 << 29 }
    );
  }
};

// ESLint with Ultracite's own preset modules (dead-code-lib.cjs drops only the shared ignores
// block). `inline: true` honours the files' disable comments (reported); the default ignores them
// (raw). `keep` filters the rules before linting.
const runEslint = ({
  cwd,
  files,
  presets = ["core"],
  keep = (r) => r === "sort-keys",
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

// Biome. `biome check` reports assist actions; `--write` applies them.
const BIOME_ASSIST_ONLY = {
  assist: {
    actions: { recommended: false, source: { useSortedKeys: "on" } },
    enabled: true,
  },
  files: { ignoreUnknown: true, maxSize: 10_000_000 },
  formatter: { enabled: false },
  javascript: { parser: { unsafeParameterDecoratorsEnabled: true } },
  linter: { enabled: false },
  root: true,
  vcs: { enabled: false },
};
const writeBiomeConfig = (dir, name, body) => {
  const configDir = join(dir, `biome-${name}`);
  mkdirSync(configDir, { recursive: true });
  writeFileSync(
    join(configDir, "biome.json"),
    `${JSON.stringify(body, null, 2)}\n`
  );
  return configDir;
};
const biomeAssistConfig = (dir) =>
  writeBiomeConfig(dir, "use-sorted-keys", BIOME_ASSIST_ONLY);
// Ultracite's presets as published, extended by absolute path (`ultracite init` extends
// "ultracite/biome/core"). The formatter stays as the preset sets it.
const biomeUltraciteConfig = (dir, presets = ["core"]) =>
  writeBiomeConfig(dir, `ultracite-${presets.join("+")}`, {
    extends: presets.map((p) => join(CLI, "config/biome", p, "biome.jsonc")),
    javascript: { parser: { unsafeParameterDecoratorsEnabled: true } },
    root: true,
    vcs: { enabled: false },
  });
const biomeBin = dc.biomeBin;
const runBiome = ({
  cwd,
  files,
  configDir,
  keep = (r) => r === "assist/source/useSortedKeys",
}) => {
  const out = [];
  const CHUNK = 400;
  for (let i = 0; i < files.length; i += CHUNK) {
    const r = spawnSync(
      process.execPath,
      [
        biomeBin,
        "check",
        `--config-path=${configDir}`,
        "--reporter=json",
        "--max-diagnostics=none",
        ...files.slice(i, i + CHUNK),
      ],
      { cwd, encoding: "utf8", maxBuffer: 1 << 30 }
    );
    const json = r.stdout.slice(r.stdout.indexOf("{"));
    const report = JSON.parse(json);
    for (const d of report.diagnostics ?? []) {
      const rule = d.category ?? "";
      if (keep && !keep(rule)) {
        continue;
      }
      const path = d.location?.path;
      out.push({
        column: d.location?.start?.column,
        endColumn: d.location?.end?.column,
        endLine: d.location?.end?.line,
        file: typeof path === "string" ? path : (path?.file ?? null),
        line: d.location?.start?.line,
        message: typeof d.message === "string" ? d.message : null,
        rule,
        severity: d.severity,
      });
    }
  }
  return out;
};
// The terminal reporter's notes for each diagnostic (the JSON reporter leaves `advices` empty).
const biomeConsole = ({ cwd, files, configDir }) => {
  const r = spawnSync(
    process.execPath,
    [
      biomeBin,
      "check",
      `--config-path=${configDir}`,
      "--colors=off",
      "--max-diagnostics=none",
      ...files,
    ],
    { cwd, encoding: "utf8", maxBuffer: 1 << 30 }
  );
  const text = `${r.stdout}${r.stderr}`;
  return text
    .split(/\n(?=\S+:\d+:\d+ (?:assist|lint)\/)/)
    .map((block) => {
      const head = /^(\S+):(\d+):(\d+) ((?:assist|lint)\/\S+)/.exec(
        block.trim()
      );
      if (!head) {
        return null;
      }
      return {
        column: Number(head[3]),
        file: head[1],
        fixable: /FIXABLE/.test(block.split("\n")[0]),
        line: Number(head[2]),
        message: /^\s*[×!i] (.+)$/m.exec(block)?.[1]?.trim() ?? null,
        notes: [...block.matchAll(/^\s+[iℹ] (.+)$/gm)].map((m) => m[1].trim()),
        rule: head[4],
      };
    })
    .filter(Boolean);
};
const biomeWrite = ({
  cwd,
  files,
  configDir,
  unsafe = false,
  timeout = 300_000,
}) => {
  const CHUNK = 400;
  let timedOut = false;
  for (let i = 0; i < files.length; i += CHUNK) {
    const r = spawnSync(
      process.execPath,
      [
        biomeBin,
        "check",
        `--config-path=${configDir}`,
        "--write",
        ...(unsafe ? ["--unsafe"] : []),
        "--max-diagnostics=none",
        ...files.slice(i, i + CHUNK),
      ],
      { cwd, encoding: "utf8", maxBuffer: 1 << 30, timeout }
    );
    timedOut ||= Boolean(r.signal);
  }
  return { timedOut };
};

const toolVersions = () => ({
  ...dc.toolVersions(),
  "@typescript-eslint/typescript-estree (inventory parser)": dc.versionOf(
    "@typescript-eslint/typescript-estree",
    tsParserDir
  ),
  git: execFileSync("git", ["--version"], { encoding: "utf8" }).trim(),
});

const writeJson = (file, data) => {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
};
const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));
const writeJsonl = (file, rows) => {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(
    file,
    rows.map((r) => JSON.stringify(r)).join("\n") + (rows.length ? "\n" : "")
  );
};
const readJsonl = (file) =>
  readFileSync(file, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l));

// Seeded random numbers (mulberry32, as classification-agreement.cjs uses).
const rng = (seed) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d_2b_79_f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
};
const shuffle = (xs, random) => {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const pct = dc.pct;
const per10k = dc.per10k;

module.exports = {
  ALL,
  BIOME_ASSIST_ONLY,
  biomeAssistConfig,
  biomeConsole,
  biomeUltraciteConfig,
  biomeWrite,
  eslintResolved,
  oxlintFix,
  oxlintInitConfig,
  oxlintSortKeysConfig,
  pct,
  per10k,
  readJson,
  readJsonl,
  rng,
  runBiome,
  runEslint,
  runOxlint,
  shuffle,
  toolVersions,
  writeJson,
  writeJsonl,
  CALIBRATION_DIR,
  CLI,
  COMPARE,
  CORE,
  DOGFOOD,
  EXAMPLES_DIR,
  HERE,
  HISTORY_DIR,
  OUT_DIR,
  PINNED,
  REACT,
  RESULTS_DIR,
  SETS,
  TMP,
  TOPIC,
  ULTRACITE,
  arg,
  astUtils,
  biomeCompare,
  biomeName,
  chanceSorted,
  checkPinned,
  children,
  collect,
  commentsIn,
  dc,
  descents,
  dirs,
  disorder,
  effectsOf,
  eslintCompare,
  eslintName,
  existsSync,
  flag,
  groupsFor,
  isJsdoc,
  keyTypeOf,
  lineOf,
  lineStarts,
  oxlintCompare,
  oxlintFixBlocker,
  oxlintName,
  handSortEslint,
  objectsByPath,
  parse,
  pathOf,
  permalink,
  predictedOrder,
  propSigs,
  reorderText,
  repoMeta,
  safeParse,
  selectedRepos,
  setOf,
  shaOf,
  spawnSync,
  execFileSync,
  tsEstree,
  valueKindOf,
  walk,
  writeFileSync,
  mkdirSync,
  readFileSync,
};
