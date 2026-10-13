// Token-based clone detector for the dead-code post: how much of each repo is duplicated, where the
// copies live (source, tests, vendored or generated code), and how much of it the lint rules can
// see (sonarjs/no-identical-functions, no-duplicated-branches).
//
// Tokens come from typescript-estree (this repo's parser), so comments and layout are already
// gone. Two normalisations, following the usual clone taxonomy (Svajlenko & Roy, arXiv:2006.15682):
//   Type-1  identical token sequences (whitespace, layout and comments ignored)
//   Type-2  identifiers (including JSX names and contextual keywords) replaced by ID, and string,
//           numeric, regex, bigint, template and JSX text literals by LIT; keywords, operators,
//           punctuation, true/false/null and `this` kept
// Import and re-export declarations are left out of the token stream: their repeated shape
// (`import { ID } from LIT ;`) is boilerplate, not logic, and would dominate Type-2 matches.
//
// Three detectors:
//   window    maximal clone classes of at least --min-tokens tokens (default 50, jscpd's default)
//             whose every fragment spans at least --min-lines lines (default 5, jscpd's default);
//             fragments of one class don't overlap. Duplicated lines = code lines (lines with at
//             least one token) covered by any fragment, both the "original" and the copies.
//             Also run at 100 tokens (maven-pmd-plugin's CPD default) as a sensitivity check.
//   function  whole function bodies (declarations, expressions, arrows, class and object methods),
//             Type-1 and Type-2, at least --min-tokens tokens; and the subset sonarjs's
//             no-identical-functions can see (same file, Type-1 body, body spans >= 3 lines,
//             declarations, functions assigned to variables and class methods), joined to the
//             rule's actual hits from the rule census.
//   branch    if/else-if chains and switch cases with identical (Type-1) branch bodies, split by
//             whether the body spans more than one line (no-duplicated-branches needs that), joined
//             to the rule's hits.
//
// File universe: every source file under each repo's included directories (repos.json),
// classified as `source` (the measured corpus, collect-files.cjs), `test` (test, fixture, mock,
// bench, example and story files and directories), `vendored` (vendor/compiled/bundles/polyfills/
// dist directories, third-party license headers, repo-specific exclusions) or `declaration`
// (*.d.ts). Minified or huge files (> 1 MB, or a mean line over 300 characters) are skipped and
// counted. Read-only: files are parsed, never executed.
//
// Usage (from the repo root):
//   node --max-old-space-size=12288 research/corpus/scripts/dead-code-clones.cjs [--repos zod,hono]
// Writes results/dead-code/clones.json and out/dead-code/clones/<repo>.json (every class).
"use strict";

const {
  readFileSync,
  readdirSync,
  mkdirSync,
  writeFileSync,
  existsSync,
} = require("node:fs");
const { join, relative, sep } = require("node:path");

const lib = require("./dead-code-lib.cjs");
const {
  collect,
  getRepo,
  EXCLUDED_DIR_NAMES,
  EXCLUDED_FILE_PATTERNS,
} = require("./collect-files.cjs");
const config = require("./repos.json");
const { dirs } = require("./tools.cjs");

const te = require(
  require.resolve("@typescript-eslint/typescript-estree", {
    paths: [dirs.tsParser],
  })
);

const MIN_TOKENS = Number(lib.arg("min-tokens", "50"));
const MIN_LINES = Number(lib.arg("min-lines", "5"));
const SENSITIVITY_TOKENS = 100;
const ONLY = (lib.arg("repos", "") || "").split(",").filter(Boolean);
const OUT = join(lib.OUT_DIR, "clones");
const SOURCE_EXT = /\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs)$/;

// ── file universe ──────────────────────────────────────────────────────
const TEST_DIRS = new Set([
  "__tests__",
  "__tests_dts__",
  "__test__",
  "__mocks__",
  "__fixtures__",
  "__snapshots__",
  "test",
  "tests",
  "fixtures",
  "fixture",
  "benchmarks",
  "bench",
  "examples",
  "example",
]);
const VENDORED_DIRS = new Set([
  "vendor",
  "vendored",
  "compiled",
  "bundles",
  "polyfills",
  "dist",
  "build-output",
]);

const universe = (name) => {
  const repo = getRepo(name);
  const measured = new Set(collect(name).files);
  const excludedPaths = repo.exclude.map((p) => p.replace(/\/$/, ""));
  const files = [];
  const walk = (dir, inherited) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (
        e.isSymbolicLink() ||
        e.name === "node_modules" ||
        e.name === ".git"
      ) {
        continue;
      }
      const abs = join(dir, e.name);
      const rel = relative(repo.root, abs).split(sep).join("/");
      if (e.isDirectory()) {
        let category = inherited;
        if (!category && TEST_DIRS.has(e.name)) {
          category = "test";
        } else if (!category && VENDORED_DIRS.has(e.name)) {
          category = "vendored";
        } else if (!category && EXCLUDED_DIR_NAMES.has(e.name)) {
          category = "vendored";
        } else if (
          !category &&
          excludedPaths.some((p) => rel === p || rel.startsWith(`${p}/`))
        ) {
          category = "vendored";
        }
        walk(abs, category);
        continue;
      }
      if (!SOURCE_EXT.test(e.name)) {
        continue;
      }
      let category = inherited;
      if (!category) {
        if (measured.has(rel)) {
          category = "source";
        } else if (/\.d\.[cm]?ts$/.test(e.name)) {
          category = "declaration";
        } else if (
          EXCLUDED_FILE_PATTERNS.some(
            ([re, reason]) => re.test(e.name) && !/declaration/.test(reason)
          )
        ) {
          category = "test";
        } else {
          // third-party license header or a repo-specific exclusion
          category = "vendored";
        }
      }
      files.push({ category, rel });
    }
  };
  for (const inc of repo.include) {
    walk(join(repo.root, inc), null);
  }
  files.sort((a, b) => a.rel.localeCompare(b.rel));
  return { files, measured, repo };
};

// ── tokenising ─────────────────────────────────────────────────────────
const KEEP_VALUE = new Set(["Keyword", "Punctuator", "Boolean", "Null"]);
const normalise = (token) => {
  switch (token.type) {
    case "Identifier":
    case "JSXIdentifier":
    case "PrivateIdentifier":
      return token.value === "this" ? "this" : "ID";
    case "Template": {
      const open = token.value.startsWith("`") ? "`" : "}";
      const close = token.value.endsWith("`") ? "`" : "${";
      return `TPL${open}${close}`;
    }
    case "String":
    case "Numeric":
    case "RegularExpression":
    case "JSXText":
      return "LIT";
    default:
      return KEEP_VALUE.has(token.type) ? token.value : token.value;
  }
};

const parseFile = (abs, rel) => {
  const text = readFileSync(abs, "utf8");
  const lines = text.split("\n");
  const meanLine = text.length / Math.max(1, lines.length);
  if (text.length > 1_000_000 || meanLine > 300) {
    return { lines: lines.length, skipped: true, bytes: text.length };
  }
  let ast;
  try {
    ast = te.parse(text, {
      comment: false,
      filePath: rel,
      jsx: /\.(?:tsx|jsx|js|mjs|cjs)$/.test(rel),
      loc: true,
      range: true,
      tokens: true,
    });
  } catch (error) {
    return { error: String(error.message).slice(0, 160), lines: lines.length };
  }
  // Token ranges inside import / re-export declarations are dropped.
  const dropped = [];
  for (const node of ast.body) {
    if (
      node.type === "ImportDeclaration" ||
      node.type === "TSImportEqualsDeclaration" ||
      ((node.type === "ExportNamedDeclaration" ||
        node.type === "ExportAllDeclaration") &&
        node.source)
    ) {
      dropped.push(node.range);
    }
  }
  const tokens = ast.tokens.filter(
    (t) => !dropped.some(([a, b]) => t.range[0] >= a && t.range[1] <= b)
  );
  return { ast, lines: lines.length, text, tokens };
};

// ── window detector ────────────────────────────────────────────────────
// Global token arrays for one repo and one normalisation; windows never cross files.
const detectWindows = (files, mode, minTokens) => {
  // Concatenate
  let total = 0;
  for (const f of files) {
    total += f.ids[mode].length;
  }
  const ids = new Int32Array(total);
  const fileOf = new Int32Array(total);
  const offsets = [];
  let pos = 0;
  files.forEach((f, fi) => {
    offsets.push(pos);
    ids.set(f.ids[mode], pos);
    fileOf.fill(fi, pos, pos + f.ids[mode].length);
    pos += f.ids[mode].length;
  });
  // Window starts: positions where a full window fits inside the same file.
  const starts = [];
  files.forEach((f, fi) => {
    const n = f.ids[mode].length;
    for (let i = 0; i + minTokens <= n; i++) {
      starts.push(offsets[fi] + i);
    }
  });
  const W = minTokens;
  // Two independent rolling hashes, combined into a 53-bit key.
  const B1 = 1_000_003;
  const B2 = 92_821;
  const M2 = 2_097_152; // 2^21
  let pow1 = 1;
  let pow2 = 1;
  for (let i = 0; i < W - 1; i++) {
    pow1 = Math.imul(pow1, B1) >>> 0;
    pow2 = (pow2 * B2) % M2;
  }
  const key = new Float64Array(starts.length);
  {
    let k = 0;
    files.forEach((f, fi) => {
      const n = f.ids[mode].length;
      if (n < W) {
        return;
      }
      const base = offsets[fi];
      let h1 = 0;
      let h2 = 0;
      for (let i = 0; i < W; i++) {
        h1 = (Math.imul(h1, B1) + ids[base + i] + 1) >>> 0;
        h2 = (h2 * B2 + ids[base + i] + 1) % M2;
      }
      key[k++] = h1 * M2 + h2;
      for (let i = 1; i + W <= n; i++) {
        const out = ids[base + i - 1] + 1;
        const inn = ids[base + i + W - 1] + 1;
        h1 = (h1 - Math.imul(out, pow1)) >>> 0;
        h1 = (Math.imul(h1, B1) + inn) >>> 0;
        h2 = (((h2 - ((out * pow2) % M2) + M2) % M2) * B2 + inn) % M2;
        key[k++] = h1 * M2 + h2;
      }
    });
  }
  const order = new Uint32Array(starts.length);
  for (let i = 0; i < order.length; i++) {
    order[i] = i;
  }
  order.sort((a, b) => key[a] - key[b] || a - b);
  const sameWindow = (p, q) => {
    for (let i = 0; i < W; i++) {
      if (ids[p + i] !== ids[q + i]) {
        return false;
      }
    }
    return true;
  };
  // Groups of identical, non-overlapping windows with at least two members.
  const groupOf = new Int32Array(total).fill(-1); // by window start position
  const groups = [];
  let i = 0;
  while (i < order.length) {
    let j = i + 1;
    while (j < order.length && key[order[j]] === key[order[i]]) {
      j++;
    }
    if (j - i >= 2) {
      // verify, splitting on collisions
      let rest = [];
      for (let k = i; k < j; k++) {
        rest.push(starts[order[k]]);
      }
      while (rest.length >= 2) {
        const head = rest[0];
        const same = rest.filter((p) => sameWindow(head, p));
        rest = rest.filter((p) => !sameWindow(head, p));
        same.sort((a, b) => a - b);
        const members = [];
        for (const p of same) {
          const last = members.at(-1);
          if (
            last !== undefined &&
            fileOf[last] === fileOf[p] &&
            p - last < W
          ) {
            continue;
          }
          members.push(p);
        }
        if (members.length >= 2) {
          const g = groups.length;
          groups.push(members);
          for (const p of members) {
            groupOf[p] = g;
          }
        }
      }
    }
    i = j;
  }
  // Chain groups into classes: a group continues the class of the group one token earlier when
  // every member shifted by -1 is a member of that group and the sizes match.
  const classOfGroup = new Int32Array(groups.length).fill(-1);
  const classes = [];
  const byMin = groups
    .map((m, g) => g)
    .sort((a, b) => groups[a][0] - groups[b][0]);
  for (const g of byMin) {
    const members = groups[g];
    const prev = groupOf[members[0] - 1] ?? -1;
    const continues =
      members[0] > 0 &&
      prev >= 0 &&
      groups[prev].length === members.length &&
      members.every(
        (p) => fileOf[p - 1] === fileOf[p] && groupOf[p - 1] === prev
      );
    if (continues) {
      const c = classOfGroup[prev];
      classOfGroup[g] = c;
      classes[c].length++;
    } else {
      classOfGroup[g] = classes.length;
      classes.push({ length: W, starts: members });
    }
  }
  return { classes, fileOf, offsets };
};

// ── functions and branches ─────────────────────────────────────────────
const FUNCTION_TYPES = new Set([
  "FunctionDeclaration",
  "FunctionExpression",
  "ArrowFunctionExpression",
]);

const functionKind = (node, parent) => {
  if (node.type === "FunctionDeclaration") {
    return "declaration";
  }
  if (parent?.type === "VariableDeclarator") {
    return "variable";
  }
  if (
    parent?.type === "MethodDefinition" ||
    parent?.type === "TSAbstractMethodDefinition"
  ) {
    return "class-method";
  }
  if (parent?.type === "PropertyDefinition") {
    return "class-property";
  }
  if (parent?.type === "Property") {
    return "object-property";
  }
  if (parent?.type === "CallExpression" || parent?.type === "NewExpression") {
    return "argument";
  }
  return "other";
};
// The kinds sonarjs/no-identical-functions visits (its selectors).
const SONAR_KINDS = new Set(["declaration", "variable", "class-method"]);

const walkAst = (node, visit, parent = null) => {
  if (!node || typeof node.type !== "string") {
    return;
  }
  visit(node, parent);
  for (const key of Object.keys(node)) {
    if (key === "parent" || key === "loc" || key === "range") {
      continue;
    }
    const value = node[key];
    if (Array.isArray(value)) {
      for (const v of value) {
        if (v && typeof v.type === "string") {
          walkAst(v, visit, node);
        }
      }
    } else if (value && typeof value.type === "string") {
      walkAst(value, visit, node);
    }
  }
};

// Token index range [a, b) covering a node, by binary search over token start offsets.
const tokenSpan = (tokens, range) => {
  let lo = 0;
  let hi = tokens.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (tokens[mid].range[0] < range[0]) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  let b = lo;
  while (b < tokens.length && tokens[b].range[1] <= range[1]) {
    b++;
  }
  return [lo, b];
};

const bodyLines = (tokens, a, b) => {
  // sonarjs's isBigEnough: drop the braces, then count lines from the first to the last token.
  let x = a;
  let y = b - 1;
  if (x <= y && tokens[x].value === "{") {
    x++;
  }
  if (x <= y && tokens[y].value === "}") {
    y--;
  }
  if (x > y) {
    return 0;
  }
  return tokens[y].loc.end.line - tokens[x].loc.start.line + 1;
};

// ── main ───────────────────────────────────────────────────────────────
const quantile = (values, q) => {
  if (values.length === 0) {
    return null;
  }
  const s = [...values].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))];
};
const sizeBucket = (n) =>
  n === 2 ? "2" : n === 3 ? "3" : n <= 9 ? "4-9" : "10+";

const analyseRepo = (name, sonarHits) => {
  const { files: list, repo } = universe(name);
  const files = [];
  const skipped = [];
  const parseErrors = [];
  const intern = [new Map(), new Map()];
  const idOf = (mode, s) => {
    const m = intern[mode];
    let v = m.get(s);
    if (v === undefined) {
      v = m.size;
      m.set(s, v);
    }
    return v;
  };
  const functions = [];
  const branches = [];
  for (const { category, rel } of list) {
    const parsed = parseFile(join(repo.root, rel), rel);
    if (parsed.skipped) {
      skipped.push({
        bytes: parsed.bytes,
        category,
        file: rel,
        lines: parsed.lines,
      });
      continue;
    }
    if (parsed.error) {
      parseErrors.push({ category, error: parsed.error, file: rel });
      continue;
    }
    const { tokens, ast } = parsed;
    const t1 = new Int32Array(tokens.length);
    const t2 = new Int32Array(tokens.length);
    const lineOf = new Int32Array(tokens.length);
    tokens.forEach((t, i) => {
      t1[i] = idOf(0, `${t.type[0]}${t.value}`);
      t2[i] = idOf(1, normalise(t));
      lineOf[i] = t.loc.start.line;
    });
    const codeLines = new Set();
    for (const t of tokens) {
      for (let l = t.loc.start.line; l <= t.loc.end.line; l++) {
        codeLines.add(l);
      }
    }
    // also count code lines inside the dropped import declarations
    for (const t of ast.tokens) {
      codeLines.add(t.loc.start.line);
    }
    const fileIndex = files.length;
    files.push({
      category,
      codeLines,
      endLineOf: Int32Array.from(tokens, (t) => t.loc.end.line),
      ids: [t1, t2],
      lineOf,
      lines: parsed.lines,
      rel,
    });
    // functions
    const allTokens = ast.tokens;
    walkAst(ast, (node, parent) => {
      if (FUNCTION_TYPES.has(node.type) && node.body) {
        const [a, b] = tokenSpan(allTokens, node.body.range);
        if (b - a === 0) {
          return;
        }
        const body = allTokens.slice(a, b);
        functions.push({
          bodyLines: bodyLines(allTokens, a, b),
          category,
          endLine: node.loc.end.line,
          file: rel,
          fileIndex,
          kind: functionKind(node, parent),
          line: node.loc.start.line,
          name:
            node.id?.name ??
            parent?.id?.name ??
            parent?.key?.name ??
            parent?.key?.value ??
            null,
          t1: body.map((t) => `${t.type[0]}${t.value}`).join("\u0001"),
          t2: body.map(normalise).join("\u0001"),
          tokens: b - a,
        });
      }
      // if/else-if chains (outermost if only) and switch statements
      if (node.type === "IfStatement" && parent?.type !== "IfStatement") {
        const bs = [];
        let cur = node;
        while (cur?.type === "IfStatement") {
          bs.push(cur.consequent);
          cur = cur.alternate;
        }
        if (cur) {
          bs.push(cur);
        }
        branches.push({
          bodies: bs.map((s) => {
            const inner = s.type === "BlockStatement" ? s.body : [s];
            if (inner.length === 0) {
              return null;
            }
            const [a] = tokenSpan(allTokens, inner[0].range);
            const [, b] = tokenSpan(allTokens, inner.at(-1).range);
            return {
              line: s.loc.start.line,
              multiLine:
                allTokens[b - 1].loc.end.line > allTokens[a].loc.start.line,
              t1: allTokens
                .slice(a, b)
                .map((t) => t.value)
                .join("\u0001"),
            };
          }),
          category,
          endsWithElse: Boolean(cur),
          file: rel,
          kind: "if",
          line: node.loc.start.line,
        });
      }
      if (node.type === "SwitchStatement") {
        branches.push({
          bodies: node.cases.map((c) => {
            let stmts =
              c.consequent.length === 1 &&
              c.consequent[0].type === "BlockStatement"
                ? c.consequent[0].body
                : c.consequent;
            // sonarjs's takeWithoutBreak
            if (stmts.at(-1)?.type === "BreakStatement") {
              stmts = stmts.slice(0, -1);
            }
            if (stmts.length === 0) {
              return null;
            }
            const [a] = tokenSpan(allTokens, stmts[0].range);
            const [, b] = tokenSpan(allTokens, stmts.at(-1).range);
            return {
              line: c.loc.start.line,
              multiLine:
                allTokens[b - 1].loc.end.line > allTokens[a].loc.start.line,
              t1: allTokens
                .slice(a, b)
                .map((t) => t.value)
                .join("\u0001"),
            };
          }),
          category,
          endsWithElse: node.cases.some((c) => c.test === null),
          file: rel,
          kind: "switch",
          line: node.loc.start.line,
        });
      }
    });
  }

  const categories = ["source", "test", "vendored", "declaration"];
  const totals = Object.fromEntries(
    categories.map((c) => [c, { codeLines: 0, files: 0, lines: 0 }])
  );
  for (const f of files) {
    totals[f.category].files++;
    totals[f.category].lines += f.lines;
    totals[f.category].codeLines += f.codeLines.size;
  }

  // window detector, both modes and two thresholds
  const windowResults = {};
  const classRows = [];
  for (const [mode, label] of [
    [0, "type1"],
    [1, "type2"],
  ]) {
    for (const minTokens of [MIN_TOKENS, SENSITIVITY_TOKENS]) {
      const { classes, fileOf, offsets } = detectWindows(
        files,
        mode,
        minTokens
      );
      const covered = files.map(() => new Set());
      const kept = [];
      for (const c of classes) {
        const fragments = c.starts.map((g) => {
          const fi = fileOf[g];
          const local = g - offsets[fi];
          const f = files[fi];
          return {
            category: f.category,
            endLine: f.endLineOf[local + c.length - 1],
            file: f.rel,
            fileIndex: fi,
            line: f.lineOf[local],
          };
        });
        if (fragments.some((fr) => fr.endLine - fr.line + 1 < MIN_LINES)) {
          continue;
        }
        kept.push({ fragments, tokens: c.length });
        for (const fr of fragments) {
          for (let l = fr.line; l <= fr.endLine; l++) {
            if (files[fr.fileIndex].codeLines.has(l)) {
              covered[fr.fileIndex].add(l);
            }
          }
        }
      }
      const dup = Object.fromEntries(categories.map((c) => [c, 0]));
      files.forEach((f, fi) => {
        dup[f.category] += covered[fi].size;
      });
      const placement = (k) => {
        const cats = new Set(k.fragments.map((fr) => fr.category));
        const filesIn = new Set(k.fragments.map((fr) => fr.file));
        return {
          cats: [...cats].sort().join("+"),
          crossFile: filesIn.size > 1,
        };
      };
      const sourceOnly = kept.filter((k) => placement(k).cats === "source");
      windowResults[`${label}@${minTokens}`] = {
        classes: kept.length,
        classesByPlacement: kept.reduce((acc, k) => {
          const p = placement(k);
          const keyName = `${p.cats}${p.crossFile ? " (cross-file)" : " (same file)"}`;
          acc[keyName] = (acc[keyName] ?? 0) + 1;
          return acc;
        }, {}),
        classSize: kept.reduce((acc, k) => {
          const b = sizeBucket(k.fragments.length);
          acc[b] = (acc[b] ?? 0) + 1;
          return acc;
        }, {}),
        duplicatedCodeLines: dup,
        duplicatedShare: Object.fromEntries(
          categories.map((c) => [c, lib.pct(dup[c], totals[c].codeLines)])
        ),
        sourceClassTokens: {
          max: quantile(
            sourceOnly.map((k) => k.tokens),
            1
          ),
          median: quantile(
            sourceOnly.map((k) => k.tokens),
            0.5
          ),
          p90: quantile(
            sourceOnly.map((k) => k.tokens),
            0.9
          ),
        },
        sourceClasses: sourceOnly.length,
        sourceClassesCrossFile: sourceOnly.filter((k) => placement(k).crossFile)
          .length,
      };
      if (minTokens === MIN_TOKENS) {
        for (const k of kept) {
          classRows.push({ mode: label, ...k, ...placement(k) });
        }
      }
    }
  }

  // function clones
  const functionResults = {};
  const functionClasses = [];
  for (const mode of ["t1", "t2"]) {
    const groups = new Map();
    for (const fn of functions) {
      if (fn.tokens < MIN_TOKENS) {
        continue;
      }
      const k = fn[mode];
      if (!groups.has(k)) {
        groups.set(k, []);
      }
      groups.get(k).push(fn);
    }
    const classes = [...groups.values()].filter((g) => g.length >= 2);
    // drop classes whose every member sits inside a member of another class (nested functions)
    const ranges = classes.flatMap((g, ci) =>
      g.map((fn) => ({ ci, endLine: fn.endLine, file: fn.file, line: fn.line }))
    );
    const nested = (g, ci) =>
      g.every((fn) =>
        ranges.some(
          (r) =>
            r.ci !== ci &&
            r.file === fn.file &&
            r.line <= fn.line &&
            r.endLine >= fn.endLine &&
            (r.line < fn.line || r.endLine > fn.endLine)
        )
      );
    const outer = classes.filter((g, ci) => !nested(g, ci));
    const summary = (cs) => ({
      classes: cs.length,
      crossFile: cs.filter((g) => new Set(g.map((f) => f.file)).size > 1)
        .length,
      functions: cs.reduce((s, g) => s + g.length, 0),
      byPlacement: cs.reduce((acc, g) => {
        const cats = [...new Set(g.map((f) => f.category))].sort().join("+");
        acc[cats] = (acc[cats] ?? 0) + 1;
        return acc;
      }, {}),
      size: cs.reduce((acc, g) => {
        const b = sizeBucket(g.length);
        acc[b] = (acc[b] ?? 0) + 1;
        return acc;
      }, {}),
    });
    functionResults[mode] = {
      all: summary(classes),
      outermost: summary(outer),
    };
    for (const g of outer) {
      functionClasses.push({
        exact: new Set(g.map((f) => f.t1)).size === 1,
        members: g.map(({ t1, t2, fileIndex, ...rest }) => rest),
        mode,
      });
    }
  }

  // sonarjs/no-identical-functions, as the rule sees it: same file, Type-1 body, body spans >= 3
  // lines, the rule's node kinds; the rule reports each later duplicate once.
  const sonarExpected = [];
  const byFile = new Map();
  for (const fn of functions) {
    if (
      !SONAR_KINDS.has(fn.kind) ||
      fn.bodyLines < 3 ||
      fn.category !== "source"
    ) {
      continue;
    }
    if (!byFile.has(fn.file)) {
      byFile.set(fn.file, []);
    }
    byFile.get(fn.file).push(fn);
  }
  for (const [file, fns] of byFile) {
    fns.sort((a, b) => a.line - b.line);
    for (let i = 1; i < fns.length; i++) {
      for (let j = 0; j < i; j++) {
        if (fns[i].t1 === fns[j].t1) {
          sonarExpected.push({
            file,
            line: fns[i].line,
            original: fns[j].line,
          });
          break;
        }
      }
    }
  }
  const sonarActual = sonarHits.filter(
    (h) => h.rule === "sonarjs/no-identical-functions"
  );
  const matched = sonarExpected.filter((e) =>
    sonarActual.some((h) => h.file === e.file && Math.abs(h.line - e.line) <= 1)
  );
  const sourceFnT1 = functions.filter(
    (f) => f.category === "source" && f.tokens >= MIN_TOKENS
  );
  // Where the source Type-1/Type-2 function clones sit relative to the rule's reach, for clones of
  // at least MIN_TOKENS tokens and for clones whose bodies span at least 3 lines (the rule's own
  // threshold, any token count).
  const reachFor = (population) => {
    const reach = { t1: {}, t2: {} };
    for (const mode of ["t1", "t2"]) {
      const groups = new Map();
      for (const fn of population) {
        if (!groups.has(fn[mode])) {
          groups.set(fn[mode], []);
        }
        groups.get(fn[mode]).push(fn);
      }
      for (const g of groups.values()) {
        if (g.length < 2) {
          continue;
        }
        let why;
        const isT1 = new Set(g.map((f) => f.t1)).size === 1;
        const files = new Set(g.map((f) => f.file));
        if (mode === "t2" && !isT1) {
          why = "renamed identifiers or changed literals (Type-2 only)";
        } else if (files.size > 1) {
          why = "in different files";
        } else if (!g.every((f) => SONAR_KINDS.has(f.kind))) {
          why =
            "a function kind the rule doesn't visit (callback, object method, class property)";
        } else if (g.some((f) => f.bodyLines < 3)) {
          why = "body spans fewer than 3 lines";
        } else {
          why = "visible to the rule";
        }
        reach[mode][why] = (reach[mode][why] ?? 0) + 1;
      }
    }
    return reach;
  };
  const reach = reachFor(sourceFnT1);
  const reachSonarThreshold = reachFor(
    functions.filter(
      (f) => f.category === "source" && f.bodyLines >= 3 && f.tokens > 0
    )
  );

  // branches: identical bodies within one if-chain or switch
  const branchStats = {
    identicalPairsMultiLine: 0,
    identicalPairsSingleLine: 0,
    statements: 0,
    statementsWithDuplicate: 0,
  };
  const branchSites = [];
  for (const b of branches) {
    if (b.category !== "source") {
      continue;
    }
    branchStats.statements++;
    let found = false;
    const bodies = b.bodies;
    for (let i = 1; i < bodies.length; i++) {
      if (!bodies[i]) {
        continue;
      }
      for (let j = 0; j < i; j++) {
        if (bodies[j] && bodies[j].t1 === bodies[i].t1) {
          found = true;
          if (bodies[i].multiLine) {
            branchStats.identicalPairsMultiLine++;
          } else {
            branchStats.identicalPairsSingleLine++;
          }
          branchSites.push({
            file: b.file,
            kind: b.kind,
            line: bodies[i].line,
            multiLine: bodies[i].multiLine,
            original: bodies[j].line,
          });
          break;
        }
      }
    }
    if (found) {
      branchStats.statementsWithDuplicate++;
    }
  }
  const branchActual = sonarHits.filter((h) =>
    [
      "sonarjs/no-duplicated-branches",
      "sonarjs/no-all-duplicated-branches",
    ].includes(h.rule)
  );

  return {
    classRows,
    functionClasses,
    branchSites,
    summary: {
      branches: {
        ...branchStats,
        sonarHits: tally(branchActual),
        sonarMatchedMultiLine: branchSites.filter(
          (s) =>
            s.multiLine &&
            branchActual.some(
              (h) => h.file === s.file && Math.abs(h.line - s.line) <= 1
            )
        ).length,
      },
      functions: functionResults,
      functionsTotal: {
        all: functions.length,
        source: functions.filter((f) => f.category === "source").length,
        sourceAtLeastMinTokens: sourceFnT1.length,
      },
      parseErrors,
      reachOfSourceFunctionClones: reach,
      reachOfSourceFunctionClonesAtRuleThreshold: reachSonarThreshold,
      skipped,
      sonarIdenticalFunctions: {
        actual: sonarActual.length,
        expectedByDetector: sonarExpected.length,
        matched: matched.length,
        unmatchedActual: sonarActual
          .filter(
            (h) =>
              !sonarExpected.some(
                (e) => e.file === h.file && Math.abs(h.line - e.line) <= 1
              )
          )
          .map((h) => `${h.file}:${h.line}`),
      },
      totals,
      window: windowResults,
    },
  };
};

const tally = (hits) => {
  const counts = {};
  for (const h of hits) {
    counts[h.rule] = (counts[h.rule] ?? 0) + 1;
  }
  return counts;
};

const main = () => {
  mkdirSync(OUT, { recursive: true });
  const path = join(lib.RESULTS_DIR, "clones.json");
  const previous = existsSync(path)
    ? JSON.parse(readFileSync(path, "utf8"))
    : { repos: {} };
  const result = {
    generated: new Date().toISOString().slice(0, 10),
    method: {
      branchRule:
        "no-duplicated-branches compares if-chain branches and switch cases token by token and needs the duplicate to span more than one line (braces excluded).",
      functionMinTokens: MIN_TOKENS,
      imports:
        "import and re-export declarations excluded from the token stream",
      minLines: MIN_LINES,
      minTokens: MIN_TOKENS,
      sensitivityTokens: SENSITIVITY_TOKENS,
      sonarIdenticalFunctions:
        "same file; Type-1 body; body spans >= 3 lines (braces excluded); FunctionDeclaration, functions assigned to variables, class methods; each later duplicate reported once",
      thresholds:
        "50 tokens and 5 lines are jscpd's defaults (docs/rust.md at kucherenko/jscpd@19f2c885); 100 tokens is maven-pmd-plugin's CPD default (CpdReport.java at apache/maven-pmd-plugin@8250c2ab; PMD's own CLI makes --minimum-tokens mandatory); Svajlenko & Roy (arXiv:2006.15682) give 30-100 tokens and 6-15 lines as typical minimums. CCFinder's manual makes the minimum length mandatory without a default.",
      type1:
        "identical tokens (typescript-estree), layout and comments ignored",
      type2:
        "identifiers -> ID, string/number/regex/bigint/template/JSX-text literals -> LIT",
    },
    repos: { ...previous.repos },
    tools: {
      node: process.version,
      "typescript-estree": lib.versionOf(
        "@typescript-eslint/typescript-estree",
        dirs.tsParser
      ),
    },
  };
  const names = config.repos
    .map((r) => r.name)
    .filter((n) => ONLY.length === 0 || ONLY.includes(n));
  for (const name of names) {
    const started = Date.now();
    const censusPath = join(
      lib.HERE,
      "out",
      "rule-census",
      lib.TOPIC,
      `${name}.raw.json`
    );
    const sonarHits = existsSync(censusPath)
      ? JSON.parse(readFileSync(censusPath, "utf8")).hits
      : [];
    const { classRows, functionClasses, branchSites, summary } = analyseRepo(
      name,
      sonarHits
    );
    summary.seconds = Math.round((Date.now() - started) / 100) / 10;
    summary.dogfood = lib.DOGFOOD.has(name);
    result.repos[name] = summary;
    writeFileSync(
      join(OUT, `${name}.json`),
      JSON.stringify({
        branchSites,
        classes: classRows,
        functionClasses,
        repo: name,
      })
    );
    const w = summary.window;
    console.log(
      `${name}: source ${summary.totals.source.codeLines} code lines; T1@50 ${w["type1@50"].duplicatedShare.source}% T2@50 ${w["type2@50"].duplicatedShare.source}% T1@100 ${w["type1@100"].duplicatedShare.source}%; tests ${w["type2@50"].duplicatedShare.test}% ; sonar idf ${summary.sonarIdenticalFunctions.matched}/${summary.sonarIdenticalFunctions.actual} (expected ${summary.sonarIdenticalFunctions.expectedByDetector}); skipped ${summary.skipped.length}, parse errors ${summary.parseErrors.length} (${summary.seconds}s)`
    );
  }
  writeFileSync(path, `${JSON.stringify(result, null, 2)}\n`);
};

main();
