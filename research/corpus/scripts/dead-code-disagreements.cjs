// Explains every line where Oxlint, ESLint and Biome disagree on the shared dead-code concepts
// (dead-code-linters.cjs --corpus), by reading the code at that line with typescript-estree.
//
//   unused names        why a name is reported by one linter and not another: a `_` prefix (Oxlint
//                       and Biome skip it, typescript-eslint's defaults don't), a parameter before a
//                       used one (ESLint and Oxlint check only parameters after the last used one;
//                       Biome checks all), a destructuring rest sibling (Biome skips the omitted
//                       key), a catch binding, a variable that is only updated (`x += 1`), an import
//   unused expressions  `x satisfies T;` (exhaustiveness checks) and the rest
//   useless assignment  ESLint's no-useless-assignment vs sonarjs/no-dead-store: initializers
//                       (`let x = ''` overwritten before it's read) and the rest
//   duplicate imports   whether `import type` statements are involved
//
// Usage (from the repo root):
//   node research/corpus/scripts/dead-code-disagreements.cjs
// Reads results/dead-code/linters.json; writes results/dead-code/disagreements.json.
"use strict";

const { readFileSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");

const lib = require("./dead-code-lib.cjs");
const { dirs } = require("./tools.cjs");

const te = require(
  require.resolve("@typescript-eslint/typescript-estree", {
    paths: [dirs.tsParser],
  })
);
const mirror = (repo) =>
  join(lib.HERE, "out", "rule-census", lib.TOPIC, "mirror", repo);

const parsed = new Map();
const parse = (repo, file) => {
  const key = `${repo}/${file}`;
  if (!parsed.has(key)) {
    const text = readFileSync(join(mirror(repo), file), "utf8");
    try {
      parsed.set(key, {
        ast: te.parse(text, {
          jsx: /\.(?:tsx|jsx|js)$/.test(file),
          loc: true,
          range: true,
        }),
        lines: text.split("\n"),
      });
    } catch {
      parsed.set(key, { ast: null, lines: text.split("\n") });
    }
  }
  return parsed.get(key);
};

const walk = (node, visit, parent = null) => {
  if (!node || typeof node.type !== "string") {
    return;
  }
  visit(node, parent);
  for (const k of Object.keys(node)) {
    if (k === "parent" || k === "loc" || k === "range") {
      continue;
    }
    const v = node[k];
    if (Array.isArray(v)) {
      for (const x of v) {
        if (x && typeof x.type === "string") {
          walk(x, visit, node);
        }
      }
    } else if (v && typeof v.type === "string") {
      walk(v, visit, node);
    }
  }
};

// The binding identifier for `name` declared on `line`, with its ancestors.
const findBinding = (ast, line, name) => {
  let found = null;
  const stack = [];
  const visit = (node, parent) => {
    stack.length = 0;
    void parent;
  };
  void visit;
  const rec = (node, ancestors) => {
    if (!node || typeof node.type !== "string" || found) {
      return;
    }
    if (
      node.type === "Identifier" &&
      node.name === name &&
      node.loc.start.line === line
    ) {
      found = { ancestors: [...ancestors], node };
      return;
    }
    for (const k of Object.keys(node)) {
      if (k === "parent" || k === "loc" || k === "range") {
        continue;
      }
      const v = node[k];
      if (Array.isArray(v)) {
        for (const x of v) {
          rec(x, [...ancestors, node]);
        }
      } else if (v && typeof v.type === "string") {
        rec(v, [...ancestors, node]);
      }
    }
  };
  rec(ast, []);
  return found;
};

const FUNCTIONS = new Set([
  "FunctionDeclaration",
  "FunctionExpression",
  "ArrowFunctionExpression",
  "TSDeclareFunction",
  "TSEmptyBodyFunctionExpression",
]);

const reasonForName = (ast, line, name) => {
  if (name?.startsWith("_")) {
    return "underscore-prefixed name";
  }
  const hit = ast && name ? findBinding(ast, line, name) : null;
  if (!hit) {
    return "other";
  }
  const anc = hit.ancestors;
  const parent = anc.at(-1);
  if (anc.some((a) => a.type === "ImportDeclaration")) {
    return "import";
  }
  if (parent?.type === "CatchClause") {
    return "catch binding";
  }
  if (
    anc.some((a) => a.type === "TSTypeParameter") ||
    parent?.type === "TSTypeParameter"
  ) {
    return "type parameter";
  }
  // destructuring with a rest sibling
  const pattern = [...anc].reverse().find((a) => a.type === "ObjectPattern");
  if (pattern && pattern.properties.some((p) => p.type === "RestElement")) {
    return "rest sibling (destructuring omit)";
  }
  // a parameter: is a later parameter used? (after-used)
  const fnIndex = anc.map((a) => FUNCTIONS.has(a.type)).lastIndexOf(true);
  if (fnIndex >= 0) {
    const fn = anc[fnIndex];
    const paramRoot = [...anc, hit.node][fnIndex + 1];
    const idx = fn.params.findIndex(
      (p) => p === paramRoot || p.parameter === paramRoot
    );
    if (idx >= 0) {
      return idx < fn.params.length - 1
        ? "parameter before a later parameter"
        : "last parameter";
    }
  }
  // updated only (x += …, x++)
  if (parent?.type === "VariableDeclarator") {
    return "local variable";
  }
  return "other";
};

const main = () => {
  const linters = JSON.parse(
    readFileSync(join(lib.RESULTS_DIR, "linters.json"), "utf8")
  );
  const comparisons = linters.corpus.comparisons;
  const out = {};

  // unused names
  {
    const rows = {};
    const examples = {};
    for (const m of comparisons["unused names"].mismatches) {
      const { ast, lines } = parse(m.repo, m.file);
      const names = [...new Set(Object.values(m.names).flat())];
      const sig = m.present.join("+");
      if (names.length === 0) {
        // Biome's import messages carry no name.
        const reason = /^\s*import\b/.test(lines[m.line - 1] ?? "")
          ? "import"
          : "other";
        rows[sig] ??= {};
        rows[sig][reason] = (rows[sig][reason] ?? 0) + 1;
        continue;
      }
      for (const name of names) {
        const tools = m.present.filter(
          (t) => m.names[t]?.includes(name) || m.names[t]?.length === 0
        );
        const s = tools.length ? tools.join("+") : sig;
        let reason = reasonForName(ast, m.line, name);
        if (reason === "local variable") {
          const text = lines.join("\n");
          const escaped = lib.escapeRegExp(name);
          const re = new RegExp(`\\b${escaped}\\b`, "g");
          const uses = text.match(re)?.length ?? 0;
          const updates =
            text.match(
              new RegExp(
                `\\b${escaped}\\s*(?:[-+*/%|&^]|\\?\\?|&&|\\|\\|)?=(?!=)|\\b${escaped}\\s*(?:\\+\\+|--)|(?:\\+\\+|--)\\s*${escaped}\\b`,
                "g"
              )
            )?.length ?? 0;
          reason =
            updates >= uses - 1
              ? "local only written (assigned or updated, never read)"
              : "local variable";
        }
        rows[s] ??= {};
        rows[s][reason] = (rows[s][reason] ?? 0) + 1;
        examples[`${s} | ${reason}`] ??= [];
        if (examples[`${s} | ${reason}`].length < 3) {
          examples[`${s} | ${reason}`].push(
            `${m.repo} ${m.file}:${m.line} ${name}: ${m.code.slice(0, 120)}`
          );
        }
      }
    }
    out["unused names"] = { byToolsAndReason: rows, examples };
  }

  // unused expressions
  {
    const rows = {};
    for (const m of comparisons["unused expressions"].mismatches) {
      const reason = /\bsatisfies\b/.test(m.code)
        ? "`x satisfies T;` (exhaustiveness check)"
        : "other";
      const sig = m.present.join("+");
      rows[sig] ??= {};
      rows[sig][reason] = (rows[sig][reason] ?? 0) + 1;
    }
    out["unused expressions"] = { byToolsAndReason: rows };
  }

  // useless assignment vs dead store
  {
    const rows = {};
    const examples = {};
    for (const m of comparisons[
      "useless assignment (ESLint) vs dead store (sonarjs)"
    ].mismatches) {
      let reason = "other assignment";
      if (/^\s*(?:let|var|const)\b/.test(m.code)) {
        reason =
          /=\s*(?:''|""|``|0|-1|false|true|null|undefined|\[\]|\{\}|new (?:Map|Set)\(\))\s*;?\s*$/.test(
            m.code
          )
            ? "declaration initialised with a neutral literal ('' 0 false null [] {})"
            : "declaration initialised with another value";
      } else if (/(?:\+\+|--)/.test(m.code)) {
        reason = "increment/decrement";
      }
      const sig = m.present.join("+");
      rows[sig] ??= {};
      rows[sig][reason] = (rows[sig][reason] ?? 0) + 1;
      examples[`${sig} | ${reason}`] ??= [];
      if (examples[`${sig} | ${reason}`].length < 3) {
        examples[`${sig} | ${reason}`].push(
          `${m.repo} ${m.file}:${m.line}: ${m.code.slice(0, 110)}`
        );
      }
    }
    out["useless assignment vs dead store"] = {
      byToolsAndReason: rows,
      examples,
    };
  }

  // duplicate imports
  {
    const rows = {};
    for (const m of comparisons["duplicate imports"].mismatches) {
      const { lines } = parse(m.repo, m.file);
      // the whole statement around the line
      let start = m.line - 1;
      while (start > 0 && !/^\s*import\b/.test(lines[start])) {
        start--;
      }
      const statement = lines.slice(start, m.line + 1).join(" ");
      const reason = /^\s*import\s+type\b/.test(lines[start] ?? "")
        ? "the statement is `import type`"
        : /\btype\s+[A-Za-z_$]/.test(statement)
          ? "the statement mixes inline `type` specifiers"
          : "value import";
      const sig = m.present.join("+");
      rows[sig] ??= {};
      rows[sig][reason] = (rows[sig][reason] ?? 0) + 1;
    }
    out["duplicate imports"] = { byToolsAndReason: rows };
  }

  for (const k of [
    "unreachable",
    "dead stores",
    "identical functions",
    "duplicated branches",
    "duplicate strings",
    "unused private members",
  ]) {
    out[k] = {
      lines: comparisons[k].lines,
      mismatches: comparisons[k].mismatches.map(
        (m) =>
          `${m.repo} ${m.file}:${m.line} [${m.present.join("+")}] ${m.code.slice(0, 100)}`
      ),
    };
  }
  writeFileSync(
    join(lib.RESULTS_DIR, "disagreements.json"),
    `${JSON.stringify({ generated: new Date().toISOString().slice(0, 10), ...out }, null, 2)}\n`
  );
  for (const [k, v] of Object.entries(out)) {
    console.log(k, JSON.stringify(v.byToolsAndReason ?? v.lines));
  }
};

main();
void walk;
