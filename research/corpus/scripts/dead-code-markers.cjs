// Syntactic markers around dead code in the corpus (syntax only, typescript-estree):
//   - suppression comments (eslint-/oxlint-disable, biome-ignore, @ts-ignore/@ts-expect-error) that
//     name a dead-code or duplication rule, by rule
//   - `void x;` and bare `x;` statements whose operand is a plain identifier: the idioms that make a
//     name count as used without using it
//   - `_`-prefixed bindings by kind (parameter, local, catch, destructured element, import, type
//     parameter), and how many of them ESLint's no-unused-vars (no ignore pattern) reports unused
//   - what each repo's own lint and TypeScript configs say about these rules (lines that name them)
//
// Usage (from the repo root):
//   node research/corpus/scripts/dead-code-markers.cjs
// Writes results/dead-code/markers.json.
"use strict";

const {
  existsSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} = require("node:fs");
const { join } = require("node:path");

const lib = require("./dead-code-lib.cjs");
const { collect, getRepo } = require("./collect-files.cjs");
const { dirs } = require("./tools.cjs");
const { nameOf } = require("./dead-code-linters.cjs");

const te = require(
  require.resolve("@typescript-eslint/typescript-estree", {
    paths: [dirs.tsParser],
  })
);

const RULE_NAMES =
  /(?:no-unused-vars|no-unused-expressions|no-unused-private-class-members|no-unused-labels|no-unreachable|no-useless-[a-z-]+|no-dead-store|no-unused-function-argument|no-unused-collection|no-identical-functions|no-duplicated-branches|no-all-duplicated-branches|no-duplicate-string|no-duplicate-imports|no-duplicates|no-dupe-[a-z-]+|noUnused[A-Za-z]+|noUnreachable|noUseless[A-Za-z]+|noDuplicate[A-Za-z]+|unused-imports\/[a-z-]+|unused-import)/g;
const SUPPRESSION =
  /(?:eslint|oxlint)-disable(?:-next-line|-line)?|biome-ignore(?:-all|-start)?/;

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

const FUNCTIONS = new Set([
  "FunctionDeclaration",
  "FunctionExpression",
  "ArrowFunctionExpression",
  "TSDeclareFunction",
  "TSEmptyBodyFunctionExpression",
  "TSMethodSignature",
  "TSFunctionType",
  "TSCallSignatureDeclaration",
  "TSConstructSignatureDeclaration",
  "TSConstructorType",
]);

const CONFIG_FILES =
  /^(?:\.eslintrc(?:\.[cm]?js|\.json|\.ya?ml)?|eslint\.config\.[cm]?[jt]s|biome\.jsonc?|\.oxlintrc\.json|oxlint\.config\.[cm]?[jt]s|tsconfig(?:\.[\w-]+)?\.json)$/;
const repoConfigs = (root) => {
  const out = [];
  const visit = (dir, depth) => {
    if (depth > 3 || !existsSync(dir)) {
      return;
    }
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (
        e.isSymbolicLink() ||
        [
          "node_modules",
          ".git",
          "dist",
          "test",
          "tests",
          "fixtures",
          "examples",
          "playground",
          "e2e",
        ].includes(e.name)
      ) {
        continue;
      }
      const abs = join(dir, e.name);
      if (e.isDirectory()) {
        visit(abs, depth + 1);
      } else if (CONFIG_FILES.test(e.name)) {
        const lines = readFileSync(abs, "utf8").split("\n");
        lines.forEach((text, i) => {
          if (
            /no-unused|noUnused|unused-imports|IgnorePattern|ignoreRestSiblings|caughtErrors|no-unreachable|noUnreachable|no-useless-assignment|no-dead-store|identical-functions|duplicat|noDuplicate|no-dupe/.test(
              text
            )
          ) {
            out.push({
              file: abs.slice(root.length + 1),
              line: i + 1,
              text: text.trim().slice(0, 200),
            });
          }
        });
      }
    }
  };
  visit(root, 0);
  return out;
};

const main = () => {
  const result = {
    generated: new Date().toISOString().slice(0, 10),
    note: "Syntax only. underscore.unusedByEslint joins ESLint's raw @typescript-eslint/no-unused-vars hits (no ignore pattern) by file, line and name. configLines are lines of each repo's lint and TypeScript configs (depth <= 3, outside test/fixture/example dirs) that mention these rules or their options.",
    repos: {},
  };
  for (const name of [...lib.EXTERNAL, "ultracite"]) {
    const { repo, files } = collect(name);
    const eslintPath = join(lib.OUT_DIR, "corpus", `${name}.eslint.json`);
    const eslintHits = existsSync(eslintPath)
      ? JSON.parse(readFileSync(eslintPath, "utf8")).hits.filter((h) =>
          ["@typescript-eslint/no-unused-vars", "no-unused-vars"].includes(
            h.rule
          )
        )
      : [];
    const unusedKeys = new Set(
      eslintHits.map((h) => `${h.file}:${h.line}:${nameOf(h.message)}`)
    );
    const entry = {
      bareIdentifierStatements: 0,
      configLines: name === "ultracite" ? [] : repoConfigs(repo.root),
      suppressions: { byRule: {}, comments: 0, tsIgnore: 0 },
      underscore: { byKind: {}, total: 0, unusedByEslint: 0, usedOrExempt: 0 },
      voidIdentifier: 0,
      voidIdentifierExamples: [],
    };
    for (const rel of files) {
      const text = readFileSync(join(repo.root, rel), "utf8");
      let ast;
      try {
        ast = te.parse(text, {
          comment: true,
          jsx: /\.(?:tsx|jsx|js|mjs|cjs)$/.test(rel),
          loc: true,
          range: true,
        });
      } catch {
        continue;
      }
      for (const c of ast.comments ?? []) {
        if (/@ts-(?:ignore|expect-error)/.test(c.value)) {
          entry.suppressions.tsIgnore++;
        }
        if (!SUPPRESSION.test(c.value)) {
          continue;
        }
        const rules = c.value.match(RULE_NAMES);
        if (rules) {
          entry.suppressions.comments++;
          for (const r of new Set(rules)) {
            entry.suppressions.byRule[r] =
              (entry.suppressions.byRule[r] ?? 0) + 1;
          }
        }
      }
      walk(ast, (node, parent) => {
        if (node.type === "ExpressionStatement") {
          const e = node.expression;
          if (
            e.type === "UnaryExpression" &&
            e.operator === "void" &&
            e.argument.type === "Identifier"
          ) {
            entry.voidIdentifier++;
            if (entry.voidIdentifierExamples.length < 8) {
              entry.voidIdentifierExamples.push(
                `${rel}:${node.loc.start.line} void ${e.argument.name}`
              );
            }
          }
          if (e.type === "Identifier") {
            entry.bareIdentifierStatements++;
          }
        }
        if (node.type === "Identifier" && node.name.startsWith("_") && parent) {
          let kind = null;
          if (parent.type === "CatchClause" && parent.param === node) {
            kind = "catch";
          } else if (
            FUNCTIONS.has(parent.type) &&
            parent.params?.includes(node)
          ) {
            kind = "parameter";
          } else if (
            parent.type === "AssignmentPattern" &&
            parent.left === node
          ) {
            kind = "parameter";
          } else if (
            parent.type === "VariableDeclarator" &&
            parent.id === node
          ) {
            kind = "local";
          } else if (parent.type === "ArrayPattern") {
            kind = "array-destructured";
          } else if (
            parent.type === "Property" &&
            parent.value === node &&
            parent.parent?.type === "ObjectPattern"
          ) {
            kind = "object-destructured";
          } else if (
            [
              "ImportSpecifier",
              "ImportDefaultSpecifier",
              "ImportNamespaceSpecifier",
            ].includes(parent.type) &&
            parent.local === node
          ) {
            kind = "import";
          } else if (parent.type === "TSTypeParameter") {
            kind = "type-parameter";
          }
          if (kind) {
            entry.underscore.total++;
            entry.underscore.byKind[kind] =
              (entry.underscore.byKind[kind] ?? 0) + 1;
            if (unusedKeys.has(`${rel}:${node.loc.start.line}:${node.name}`)) {
              entry.underscore.unusedByEslint++;
            }
          }
        }
      });
    }
    entry.underscore.usedOrExempt =
      entry.underscore.total - entry.underscore.unusedByEslint;
    result.repos[name] = entry;
    console.log(
      name,
      JSON.stringify({
        sup: entry.suppressions,
        us: entry.underscore,
        void: entry.voidIdentifier,
        bare: entry.bareIdentifierStatements,
        cfg: entry.configLines.length,
      })
    );
  }
  writeFileSync(
    join(lib.RESULTS_DIR, "markers.json"),
    `${JSON.stringify(result, null, 2)}\n`
  );
};

main();
void getRepo;
