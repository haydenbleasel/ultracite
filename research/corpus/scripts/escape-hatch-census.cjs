// Escape-hatch census: counts TypeScript's escape hatches in the corpus by parsing every file
// (syntax only, no type information) and classifying each occurrence by where it sits.
//
//   any        every `any` keyword, by site (cast, parameter, type argument, ...) and form
//   unknown    every `unknown` keyword, for comparison
//   !          every non-null assertion, by what it asserts (Map.get, regex match, ref, ...)
//   definite   definite-assignment assertions (`let x!: T`, `field!: T`)
//   as / <T>   every type assertion: `as const`, `as any`, `as unknown`, double assertions, other
//   satisfies  every `satisfies` expression
//   @ts-*      @ts-ignore / @ts-expect-error / @ts-nocheck comments, with or without a reason
//   disables   eslint/oxlint/biome suppression comments that name an escape-hatch rule
//
// It cross-checks the Oxlint rule census (rule-census.cjs): the raw `no-explicit-any` and
// `no-non-null-assertion` counts should equal the `any` and `!` counts here.
//
// Usage (from the repo root):
//   node research/corpus/scripts/escape-hatch-census.cjs [--topic type-escape-hatches] [--repos a,b]
// Writes results/<topic>/escape-hatch-census.json and out/escape-hatches/<repo>.sites.json
// (every site, gitignored, for sample-escape-hatches.cjs).
"use strict";

const { mkdirSync, readFileSync, writeFileSync } = require("node:fs");
const { join, resolve } = require("node:path");

const { collect } = require("./collect-files.cjs");
const config = require("./repos.json");
const { dirs } = require("./tools.cjs");

const HERE = resolve(__dirname, "..");
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const TOPIC = arg("topic", process.env.RESEARCH_TOPIC ?? "type-escape-hatches");
const ONLY = (arg("repos", "") || "").split(",").filter(Boolean);
const RESULTS_DIR = join(HERE, "results", TOPIC);
const OUT_DIR = join(HERE, "out", "escape-hatches");
const DOGFOOD = new Set(["ultracite"]);

const estreePath = require.resolve("@typescript-eslint/typescript-estree", {
  paths: [dirs.tsParser],
});
const { parse } = require(estreePath);
const { visitorKeys } = require(
  require.resolve("@typescript-eslint/visitor-keys", { paths: [dirs.tsParser] })
);
const estreeVersion = require(
  join(estreePath.slice(0, estreePath.lastIndexOf("/dist/")), "package.json")
).version;

// ── classification ─────────────────────────────────────────────────────
const FUNCTION_TYPES = new Set([
  "ArrowFunctionExpression",
  "FunctionDeclaration",
  "FunctionExpression",
  "TSDeclareFunction",
  "TSEmptyBodyFunctionExpression",
]);
const SIGNATURE_TYPES = new Set([
  "TSCallSignatureDeclaration",
  "TSConstructSignatureDeclaration",
  "TSConstructorType",
  "TSFunctionType",
  "TSMethodSignature",
]);
const CALL_TYPES = new Set([
  "CallExpression",
  "JSXOpeningElement",
  "NewExpression",
  "TSInstantiationExpression",
  "TaggedTemplateExpression",
]);
const TYPE_COMPUTATION = new Set([
  "TSConditionalType",
  "TSIndexedAccessType",
  "TSInferType",
  "TSMappedType",
]);

// Walks up from a type keyword to the construct it annotates. `stack` holds {node, key} pairs,
// innermost last; `key` is the property of the parent the node sits under.
const siteOf = (stack) => {
  for (let i = stack.length - 2; i >= 0; i--) {
    const { node } = stack[i];
    const { key } = stack[i + 1];
    const t = node.type;
    if (t === "TSAsExpression" || t === "TSTypeAssertion") {
      return key === "typeAnnotation" ? "cast" : "expression inside a cast";
    }
    if (t === "TSSatisfiesExpression") {
      return "satisfies";
    }
    if (t === "TSTypeParameter") {
      return "type parameter constraint or default";
    }
    if (t === "TSTypeParameterInstantiation") {
      const parent = stack[i - 1]?.node.type;
      if (CALL_TYPES.has(parent)) {
        return "type argument at a call site";
      }
      if (
        parent === "TSClassImplements" ||
        parent === "TSInterfaceHeritage" ||
        parent === "ClassDeclaration" ||
        parent === "ClassExpression"
      ) {
        return "extends or implements clause";
      }
    }
    if (TYPE_COMPUTATION.has(t)) {
      return "conditional, mapped or indexed type";
    }
    if (SIGNATURE_TYPES.has(t)) {
      return "function type or method signature";
    }
    if (t === "TSIndexSignature") {
      return "index signature";
    }
    if (t === "TSPropertySignature") {
      return "interface or type-literal property";
    }
    if (t === "PropertyDefinition" || t === "TSParameterProperty") {
      return "class property";
    }
    if (t === "CatchClause") {
      return "catch parameter";
    }
    if (FUNCTION_TYPES.has(t)) {
      if (key === "returnType") {
        return "return type";
      }
      if (key === "params") {
        return stack[i + 1].node.type === "RestElement"
          ? "rest parameter"
          : "parameter";
      }
    }
    if (t === "VariableDeclarator") {
      return "variable annotation";
    }
    if (t === "TSTypeAliasDeclaration") {
      return "type alias";
    }
  }
  return "other";
};

const formOf = (stack) => {
  const parent = stack.at(-2)?.node.type;
  if (parent === "TSArrayType") {
    return "any[]";
  }
  if (parent === "TSTypeParameterInstantiation") {
    return "generic argument";
  }
  if (parent === "TSUnionType" || parent === "TSIntersectionType") {
    return "union or intersection member";
  }
  return "bare";
};

const memberName = (node) =>
  node?.type === "MemberExpression" && !node.computed
    ? node.property.name
    : null;

const DOM_LOOKUPS = new Set([
  "closest",
  "getContext",
  "getElementById",
  "querySelector",
  "shadowRoot",
]);
const SEARCHES = new Set(["at", "find", "findLast", "pop", "shift"]);
const REGEX = new Set(["exec", "match"]);

// What a non-null assertion asserts about.
const assertedOf = (expr) => {
  if (expr.type === "CallExpression") {
    const name = memberName(expr.callee);
    if (name === "get") {
      return "a .get() result (Map, WeakMap, ...)";
    }
    if (REGEX.has(name)) {
      return "a regex match";
    }
    if (DOM_LOOKUPS.has(name)) {
      return "a DOM lookup";
    }
    if (SEARCHES.has(name)) {
      return "an array search or pop";
    }
    return "another call's result";
  }
  if (expr.type === "MemberExpression") {
    if (expr.computed) {
      return "an indexed access (x[i])";
    }
    if (expr.property.name === "current") {
      return "a ref's .current";
    }
    if (expr.object.type === "ThisExpression") {
      return "a field on this";
    }
    return "another property";
  }
  if (expr.type === "Identifier") {
    return "a variable or parameter";
  }
  return "another expression";
};

const usageOf = (stack) => {
  const parent = stack.at(-2);
  // `x!.y` / `x![i]`: the assertion is the member expression's object. As the computed
  // property (`a[x!]`) it's an ordinary value.
  if (parent?.node.type === "MemberExpression") {
    return stack.at(-1).key === "object" ? "member access (x!.y)" : "value";
  }
  if (parent?.node.type === "CallExpression" && stack.at(-1).key === "callee") {
    return "call (f!())";
  }
  return "value";
};

const typeKind = (typeNode) => {
  if (!typeNode) {
    return "other";
  }
  if (typeNode.type === "TSAnyKeyword") {
    return "any";
  }
  if (typeNode.type === "TSUnknownKeyword") {
    return "unknown";
  }
  if (typeNode.type === "TSNeverKeyword") {
    return "never";
  }
  if (
    typeNode.type === "TSTypeReference" &&
    typeNode.typeName.type === "Identifier" &&
    typeNode.typeName.name === "const"
  ) {
    return "const";
  }
  return "other";
};

const isAssertion = (node) =>
  node?.type === "TSAsExpression" || node?.type === "TSTypeAssertion";

const assertionKind = (node) => {
  const kind = typeKind(node.typeAnnotation);
  if (kind === "const") {
    return "as const";
  }
  if (isAssertion(node.expression)) {
    const inner = typeKind(node.expression.typeAnnotation);
    return inner === "unknown" || inner === "any"
      ? `double, through ${inner}`
      : "double, other";
  }
  if (kind === "any" || kind === "unknown" || kind === "never") {
    return `as ${kind}`;
  }
  return "as T (other)";
};

// ── comments ───────────────────────────────────────────────────────────
// Mirrors typescript-eslint ban-ts-comment's directive patterns.
const TS_LINE = /^\/*\s*@ts-(expect-error|ignore|check|nocheck)(.*)/;
const TS_BLOCK = /^\s*(?:\/|\*)*\s*@ts-(expect-error|ignore|check|nocheck)(.*)/;
const DISABLE =
  /^\s*(eslint|oxlint)-disable(?:-next-line|-line)?(?:\s+([^\n]*?))?\s*(?:--.*)?$/;
const BIOME = /^\s*biome-ignore(?:-all|-start)?\s+(\S+)/;
const HATCH_RULE =
  /no-explicit-any|no-non-null-assertion|ban-ts-comment|prefer-ts-expect-error|(?:typescript-eslint|typescript)\/no-unsafe-|consistent-type-assertions|code-no-any-casts|code-no-dangerous-type-assertions|noExplicitAny|noNonNullAssertion|noTsIgnore/;

// ban-ts-comment's allow-with-description measures the trimmed text after the directive, so
// "- ??" (4 characters) counts as a reason. Match that rather than judging the reason.
const describe = (rest) => rest.replace(/\*\/$/, "").trim();

const classifyComment = (comment) => {
  const value = comment.value;
  const ts =
    comment.type === "Line"
      ? TS_LINE.exec(value)
      : TS_BLOCK.exec(value.split("\n").at(-1));
  if (ts) {
    const reason = describe(ts[2]);
    return {
      directive: `@ts-${ts[1]}`,
      kind: "ts",
      reason,
      reasoned: reason.length >= 3,
    };
  }
  const disable = DISABLE.exec(value.trim());
  if (disable) {
    const rules = (disable[2] ?? "")
      .split(",")
      .map((r) => r.trim())
      .filter(Boolean);
    return {
      blanket: rules.length === 0,
      kind: "disable",
      rules: rules.filter((r) => HATCH_RULE.test(r)),
      tool: disable[1],
    };
  }
  const biome = BIOME.exec(value);
  if (biome) {
    return {
      kind: "disable",
      rules: HATCH_RULE.test(biome[1]) ? [biome[1]] : [],
      tool: "biome",
    };
  }
  return null;
};

// ── traversal ──────────────────────────────────────────────────────────
const bump = (obj, key, n = 1) => {
  obj[key] = (obj[key] ?? 0) + n;
};

const emptyTally = () => ({
  any: { by: { form: {}, site: {} }, total: 0 },
  assertions: { angleBracket: 0, by: {}, total: 0 },
  definite: 0,
  disables: { blanketFiles: 0, byRule: {}, total: 0 },
  nonNull: { by: { asserted: {}, usage: {} }, total: 0 },
  satisfies: 0,
  tsComments: {},
  unknown: { by: { site: {} }, total: 0 },
});

const lineOf = (node) => node.loc.start.line;

const scanFile = (text, rel, tally, sites) => {
  const ast = parse(text, {
    comment: true,
    errorOnUnknownASTType: false,
    jsx: /\.[jt]sx$/.test(rel),
    loc: true,
    range: true,
  });

  const stack = [];
  const visit = (node, key) => {
    stack.push({ key, node });
    switch (node.type) {
      case "TSAnyKeyword": {
        const site = siteOf(stack);
        const form = formOf(stack);
        tally.any.total++;
        bump(tally.any.by.site, site);
        bump(tally.any.by.form, form);
        sites.push({
          col: node.loc.start.column + 1,
          file: rel,
          form,
          kind: "any",
          line: lineOf(node),
          site,
        });
        break;
      }
      case "TSUnknownKeyword": {
        tally.unknown.total++;
        bump(tally.unknown.by.site, siteOf(stack));
        break;
      }
      case "TSNonNullExpression": {
        const asserted = assertedOf(node.expression);
        const usage = usageOf(stack);
        tally.nonNull.total++;
        bump(tally.nonNull.by.asserted, asserted);
        bump(tally.nonNull.by.usage, usage);
        sites.push({
          asserted,
          col: node.loc.start.column + 1,
          file: rel,
          kind: "nonNull",
          line: lineOf(node),
          usage,
        });
        break;
      }
      case "TSAsExpression":
      case "TSTypeAssertion": {
        // Count the outer assertion of a double cast once, as "double".
        if (!(isAssertion(stack.at(-2)?.node) && key === "expression")) {
          const kind = assertionKind(node);
          tally.assertions.total++;
          bump(tally.assertions.by, kind);
          if (node.type === "TSTypeAssertion") {
            tally.assertions.angleBracket++;
          }
          sites.push({
            assertion: kind,
            col: node.loc.start.column + 1,
            file: rel,
            kind: "assertion",
            line: lineOf(node),
          });
        }
        break;
      }
      case "TSSatisfiesExpression": {
        tally.satisfies++;
        break;
      }
      case "VariableDeclarator":
      case "PropertyDefinition": {
        if (node.definite) {
          tally.definite++;
        }
        break;
      }
      default:
    }
    for (const childKey of visitorKeys[node.type] ?? []) {
      const child = node[childKey];
      if (Array.isArray(child)) {
        for (const c of child) {
          if (c && typeof c.type === "string") {
            visit(c, childKey);
          }
        }
      } else if (child && typeof child.type === "string") {
        visit(child, childKey);
      }
    }
    stack.pop();
  };
  visit(ast, null);

  let blanket = false;
  for (const comment of ast.comments) {
    const c = classifyComment(comment);
    if (!c) {
      continue;
    }
    if (c.kind === "ts") {
      tally.tsComments[c.directive] ??= { reasoned: 0, total: 0 };
      tally.tsComments[c.directive].total++;
      if (c.reasoned) {
        tally.tsComments[c.directive].reasoned++;
      }
      sites.push({
        col: comment.loc.start.column + 1,
        directive: c.directive,
        file: rel,
        kind: "tsComment",
        line: comment.loc.start.line,
        reason: c.reason,
        reasoned: c.reasoned,
      });
      continue;
    }
    if (c.blanket) {
      blanket = true;
    }
    if (c.rules.length > 0) {
      tally.disables.total++;
      for (const rule of c.rules) {
        bump(tally.disables.byRule, `${c.tool}: ${rule}`);
      }
    }
  }
  if (blanket) {
    tally.disables.blanketFiles++;
  }
};

// Adds b's counts into a.
const merge = (a, b) => {
  for (const [k, v] of Object.entries(b)) {
    if (typeof v === "number") {
      a[k] = (a[k] ?? 0) + v;
    } else {
      a[k] ??= {};
      merge(a[k], v);
    }
  }
  return a;
};

const per10k = (n, lines) => Math.round((n / lines) * 1e5) / 10;

const main = () => {
  mkdirSync(RESULTS_DIR, { recursive: true });
  mkdirSync(OUT_DIR, { recursive: true });
  const names = config.repos
    .map((r) => r.name)
    .filter((n) => ONLY.length === 0 || ONLY.includes(n));
  const repos = {};
  const pooled = emptyTally();
  let pooledLines = 0;
  for (const name of names) {
    const { repo, files } = collect(name);
    const tally = emptyTally();
    const sites = [];
    let lines = 0;
    const failures = [];
    for (const rel of files) {
      const text = readFileSync(join(repo.root, rel), "utf8");
      lines += text.split("\n").length;
      try {
        scanFile(text, rel, tally, sites);
      } catch (error) {
        failures.push({
          error: String(error.message).slice(0, 200),
          file: rel,
        });
      }
    }
    repos[name] = {
      dogfood: DOGFOOD.has(name),
      files: files.length,
      lines,
      parseFailures: failures,
      per10k: {
        any: per10k(tally.any.total, lines),
        assertions: per10k(tally.assertions.total, lines),
        nonNull: per10k(tally.nonNull.total, lines),
        unknown: per10k(tally.unknown.total, lines),
      },
      tally,
    };
    if (!DOGFOOD.has(name)) {
      merge(pooled, tally);
      pooledLines += lines;
    }
    writeFileSync(
      join(OUT_DIR, `${name}.sites.json`),
      JSON.stringify({ repo: name, sites }, null, 1)
    );
    console.log(
      `${name}: any ${tally.any.total}, unknown ${tally.unknown.total}, ! ${tally.nonNull.total}, assertions ${tally.assertions.total}, ts-comments ${JSON.stringify(tally.tsComments)}, parse failures ${failures.length}`
    );
  }
  const result = {
    generated: new Date().toISOString().slice(0, 10),
    note: "Syntax only: no type information. Pooled numbers exclude dogfood repos. In-file suppressions are ignored (every occurrence counts).",
    pooled: {
      lines: pooledLines,
      per10k: {
        any: per10k(pooled.any.total, pooledLines),
        assertions: per10k(pooled.assertions.total, pooledLines),
        nonNull: per10k(pooled.nonNull.total, pooledLines),
        unknown: per10k(pooled.unknown.total, pooledLines),
      },
      tally: pooled,
    },
    repos,
    tools: {
      node: process.version,
      "@typescript-eslint/typescript-estree": estreeVersion,
    },
  };
  writeFileSync(
    join(RESULTS_DIR, "escape-hatch-census.json"),
    `${JSON.stringify(result, null, 2)}\n`
  );
};

main();
