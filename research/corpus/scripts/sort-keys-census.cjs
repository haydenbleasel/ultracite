// The object-literal inventory for the sort-keys topic: every object literal in every corpus file,
// how its keys are written and ordered, what each rule makes of it, and where the object goes.
//
// Parsed by ESLint's own Linter with the TypeScript parser (the AST and scope analysis ESLint's
// sort-keys sees), through a local rule that reports nothing and records:
//   keys        each property's name as ESLint, Oxlint and Biome read it, its key and value kind,
//               and whether its value can run code (calls, `new`, assignments, `++`, `await`...)
//   shape       spreads, computed keys (literal, identifier, expression), methods, getters and
//               setters, shorthand, numeric and quoted keys, comments between keys, blank-line groups
//   order       sorted under each rule's comparator and grouping, ESLint's report count, Oxlint's
//               fix blocker, the chance a random order would be sorted, and the share of pairs out
//               of order
//   flow        where the object goes: straight into a call, a variable (followed through its
//               references in the same scope), a return, an export, a JSX prop, another object
//               (nested objects inherit the outermost literal's flow), with every order-observing
//               sink seen on the way (JSON.stringify and other serialisers, Object.keys / values /
//               entries, for-in, Object.assign, spread into another object, URLSearchParams,
//               logging), and loops over the keys that can stop at the first match
//   APIs        known order-sensitive shapes: context-sensitive callbacks in a call argument (for
//               TypeScript inference), package `exports`-style condition keys, CSS shorthand and
//               longhand pairs, `.sort()` specs, JSON-schema `properties`, zod-style `object({})`
//
// Also counts, for context, what sort-keys doesn't police: object patterns, TypeScript type
// literals and interfaces, enums and JSX attribute lists.
//
// Usage: node --max-old-space-size=8192 research/corpus/scripts/sort-keys-census.cjs [--repos a,b]
// Writes out/sort-keys/census/<repo>.jsonl (one row per object literal with two or more members)
// and results/sort-keys/census.json (aggregates).
"use strict";

const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const lib = require("./sort-keys-lib.cjs");

const { Linter } = require(require.resolve("eslint", { paths: [lib.CLI] }));
const tsParser = require(
  require.resolve("@typescript-eslint/parser", { paths: [lib.CLI] })
);

const OUT = join(lib.OUT_DIR, "census");

// ── flow ───────────────────────────────────────────────────────────────
const TRANSPARENT = new Set([
  "TSAsExpression",
  "TSSatisfiesExpression",
  "TSNonNullExpression",
  "TSTypeAssertion",
  "TSInstantiationExpression",
  "ChainExpression",
  "AwaitExpression",
]);
// Calls that return their (first) argument, or a copy in the same order.
const PASS_THROUGH =
  /^(?:Object\.(?:freeze|seal|preventExtensions)|structuredClone|markRaw|reactive|readonly|shallowReactive|shallowReadonly|toRaw|Object\.assign)$/;
const KEYS_SINKS =
  /^(?:Object\.(?:keys|values|entries|getOwnPropertyNames|getOwnPropertyDescriptors|getOwnPropertySymbols)|Reflect\.ownKeys)$/;
// Serialisers by name: JSON.stringify, hono's c.json, Response.json, res.json, devalue, superjson,
// stringify/serialize helpers, YAML dumps, structured clone over postMessage, and inspection.
const SERIALISERS =
  /(?:^|\.)(?:stringify|serialize|serialise|toJSON|json|dump|safeDump|uneval|postMessage|inspect)$/i;
const LOGGERS =
  /^(?:console\.\w+|(?:\w+\.)*(?:log|logger|debug|warn|info|error|trace)(?:\.\w+)?)$/;
const HASHES =
  /(?:hash|digest|update|createHash|getHash|checksum|etag|cacheKey|hashObject|murmur|fnv|sha\d*|md5)/i;

const calleeText = (src, callee) =>
  src.getText(callee).replace(/\s+/g, "").slice(0, 80);

// Climb through wrappers that pass the value on unchanged.
const climb = (node) => {
  let cur = node;
  for (;;) {
    const p = cur.parent;
    if (!p) {
      return cur;
    }
    if (TRANSPARENT.has(p.type)) {
      cur = p;
      continue;
    }
    if (p.type === "ConditionalExpression" && p.test !== cur) {
      cur = p;
      continue;
    }
    if (p.type === "LogicalExpression") {
      cur = p;
      continue;
    }
    if (p.type === "SequenceExpression" && p.expressions.at(-1) === cur) {
      cur = p;
      continue;
    }
    return cur;
  }
};

const isFunction = (n) =>
  [
    "ArrowFunctionExpression",
    "FunctionExpression",
    "FunctionDeclaration",
  ].includes(n?.type);
// Does a loop body or callback stop at the first match (return / break, not inside a nested
// function)?
const stopsEarly = (body) => {
  let found = false;
  const stack = [body];
  while (stack.length > 0 && !found) {
    const n = stack.pop();
    if (!n || isFunction(n)) {
      continue;
    }
    if (n.type === "ReturnStatement" || n.type === "BreakStatement") {
      found = true;
    }
    for (const c of lib.children(n)) {
      stack.push(c.node);
    }
  }
  return found;
};
// Object.keys(x) / entries / for-in: is the iteration a first-match search?
const firstMatchUse = (callOrLoop) => {
  if (callOrLoop.type === "ForInStatement") {
    return stopsEarly(callOrLoop.body);
  }
  const outer = climb(callOrLoop);
  const p = outer.parent;
  if (p?.type === "ForOfStatement" && p.right === outer) {
    return stopsEarly(p.body);
  }
  if (p?.type === "MemberExpression" && p.object === outer && !p.computed) {
    const method = p.property.name;
    if (
      [
        "find",
        "findIndex",
        "findLast",
        "some",
        "every",
        "findLastIndex",
      ].includes(method)
    ) {
      return true;
    }
    if (
      method === "filter" &&
      p.parent?.parent?.type === "MemberExpression" &&
      p.parent.parent.property?.value === 0
    ) {
      return true;
    }
  }
  return false;
};

// Where a value goes, from `node` (already the object literal, or an identifier reference to it).
// Returns labels; `visit` follows variables. `fromReference` is true for an identifier use.
const classify = (node, src, labels, notes, visit, fromReference) => {
  const cur = climb(node);
  const p = cur.parent;
  if (!p) {
    labels.add("other:root");
    return;
  }
  switch (p.type) {
    case "Property":
      if (p.value === cur && p.parent?.type === "ObjectExpression") {
        labels.add("nested");
        visit.object(p.parent);
        return;
      }
      if (p.value === cur && p.parent?.type === "ObjectPattern") {
        labels.add("local:read");
        return;
      }
      labels.add("other:property");
      return;
    case "ArrayExpression":
      labels.add("in-array");
      visit.object(p);
      return;
    case "SpreadElement":
      if (p.parent?.type === "ObjectExpression") {
        labels.add("order:spread");
        notes.spreadInto = (notes.spreadInto ?? 0) + 1;
        visit.object(p.parent);
        return;
      }
      labels.add("other:spread");
      return;
    case "CallExpression":
    case "NewExpression": {
      if (p.callee === cur) {
        labels.add("local:read");
        return;
      }
      const callee = calleeText(src, p.callee);
      const index = p.arguments.indexOf(cur);
      if (callee === "JSON.stringify") {
        labels.add("order:json");
        const outer = climb(p).parent;
        if (
          outer &&
          (outer.type === "CallExpression" || outer.type === "NewExpression")
        ) {
          const c = calleeText(src, outer.callee);
          (notes.jsonInto ??= []).push(c);
          if (HASHES.test(c)) {
            labels.add("order:hash");
          }
        } else if (
          outer?.type === "BinaryExpression" &&
          ["===", "!==", "==", "!="].includes(outer.operator)
        ) {
          labels.add("order:compare");
        } else if (outer?.type === "VariableDeclarator") {
          (notes.jsonInto ??= []).push(`var ${outer.id.name ?? "?"}`);
        }
        return;
      }
      if (KEYS_SINKS.test(callee)) {
        labels.add("order:keys");
        if (firstMatchUse(p)) {
          labels.add("order:first-match");
        }
        return;
      }
      if (callee === "Object.assign") {
        if (index === 0) {
          labels.add("order:assign-target");
          visit.expression(p);
        } else {
          labels.add("order:assign");
          visit.expression(p);
        }
        return;
      }
      if (PASS_THROUGH.test(callee)) {
        visit.expression(p);
        return;
      }
      if (
        /^(?:URLSearchParams|Headers|FormData)$/.test(callee) ||
        /(?:^|\.)URLSearchParams$/.test(callee)
      ) {
        labels.add("order:serialised");
        (notes.callees ??= []).push(callee);
        return;
      }
      if (SERIALISERS.test(callee)) {
        labels.add("order:serialised");
        (notes.callees ??= []).push(callee);
        if (HASHES.test(callee)) {
          labels.add("order:hash");
        }
        return;
      }
      if (LOGGERS.test(callee)) {
        labels.add("order:logged");
        (notes.callees ??= []).push(callee);
        return;
      }
      if (/^(?:Map|Set|WeakMap)$/.test(callee)) {
        labels.add("other:map-arg");
        return;
      }
      labels.add("escape:argument");
      (notes.callees ??= []).push(callee);
      notes.argIndex ??= index;
      return;
    }
    case "VariableDeclarator":
      if (p.init !== cur) {
        labels.add("other:declarator");
        return;
      }
      if (p.id.type === "Identifier") {
        if (p.parent?.parent?.type === "ExportNamedDeclaration") {
          labels.add("escape:export");
        }
        visit.variable(p);
        return;
      }
      if (p.id.type === "ObjectPattern") {
        labels.add(
          p.id.properties.some((x) => x.type === "RestElement")
            ? "order:rest"
            : "local:read"
        );
        return;
      }
      labels.add("other:declarator");
      return;
    case "ReturnStatement":
      labels.add("escape:return");
      return;
    case "ArrowFunctionExpression":
      if (p.body === cur) {
        labels.add("escape:return");
        return;
      }
      labels.add("other:arrow");
      return;
    case "ExportDefaultDeclaration":
      labels.add("escape:export");
      return;
    case "AssignmentExpression": {
      if (p.right !== cur) {
        // x = … as a target: the variable is rebound, not read.
        labels.add("local:write");
        return;
      }
      const left = src.getText(p.left);
      if (/^(?:module\.exports|exports\.)/.test(left)) {
        labels.add("escape:export");
        return;
      }
      if (p.left.type === "Identifier") {
        labels.add("escape:alias");
        return;
      }
      labels.add("escape:assign-member");
      return;
    }
    case "JSXExpressionContainer":
      if (p.parent?.type === "JSXAttribute") {
        const attr = p.parent.name?.name;
        const name = typeof attr === "string" ? attr : (attr?.name ?? "?");
        labels.add(name === "style" ? "jsx:style" : "escape:jsx-prop");
        notes.jsxAttr ??= name;
        const el = p.parent.parent?.name;
        notes.jsxElement ??= el ? src.getText(el) : null;
        return;
      }
      labels.add("other:jsx-child");
      return;
    case "PropertyDefinition":
      labels.add("escape:class-field");
      return;
    case "AssignmentPattern":
      labels.add("escape:default-value");
      return;
    case "MemberExpression":
      if (p.object === cur) {
        // obj.key, obj[key]; a method call on it (obj.hasOwnProperty) is still a lookup.
        labels.add("local:read");
        return;
      }
      labels.add("local:read");
      return;
    case "ForInStatement":
      if (p.right === cur) {
        labels.add("order:for-in");
        if (firstMatchUse(p)) {
          labels.add("order:first-match");
        }
        return;
      }
      labels.add("other:for-in");
      return;
    case "BinaryExpression":
      labels.add(p.operator === "in" ? "local:read" : "other:binary");
      return;
    case "ThrowStatement":
      labels.add("escape:throw");
      return;
    case "YieldExpression":
      labels.add("escape:yield");
      return;
    case "ExpressionStatement":
      labels.add("unused");
      return;
    case "TemplateLiteral":
      labels.add("other:template");
      return;
    case "UnaryExpression":
      labels.add(p.operator === "delete" ? "local:write" : "other:unary");
      return;
    case "ExportSpecifier":
      labels.add("escape:export");
      return;
    case "TSExportAssignment":
      labels.add("escape:export");
      return;
    case "UpdateExpression":
      labels.add("local:write");
      return;
    case "ForOfStatement":
      labels.add("other:for-of");
      return;
    default:
      labels.add(`other:${p.type}`);
  }
};

// The flow of an object literal: from the outermost literal it's nested in, through variables
// (two levels of aliasing at most).
const flowOf = (object, src) => {
  const labels = new Set();
  const notes = {};
  const seen = new Set();
  let depth = 0;
  const visit = {
    expression(n) {
      if (seen.has(n) || depth > 6) {
        return;
      }
      seen.add(n);
      depth++;
      classify(n, src, labels, notes, visit, false);
      depth--;
    },
    object(n) {
      visit.expression(n);
    },
    variable(declarator) {
      if (seen.has(declarator) || depth > 6) {
        return;
      }
      seen.add(declarator);
      const vars = src.getDeclaredVariables(declarator);
      let reads = 0;
      for (const v of vars) {
        for (const ref of v.references) {
          if (ref.init || (ref.isWrite() && !ref.isRead())) {
            if (!ref.init) {
              labels.add("local:write");
            }
            continue;
          }
          reads++;
          depth++;
          (notes.referenceLines ??= []).push(ref.identifier.loc.start.line);
          classify(ref.identifier, src, labels, notes, visit, true);
          depth--;
        }
      }
      if (reads === 0 && !labels.has("escape:export")) {
        labels.add("unused");
      }
      notes.variable ??= declarator.id.name;
    },
  };
  visit.expression(object);
  if (notes.referenceLines) {
    notes.referenceLines = [...new Set(notes.referenceLines)].slice(0, 12);
  }
  if (notes.callees) {
    notes.callees = [...new Set(notes.callees)].slice(0, 8);
  }
  if (notes.jsonInto) {
    notes.jsonInto = [...new Set(notes.jsonInto)].slice(0, 8);
  }
  return { labels: [...labels].sort(), notes };
};

// ── order-sensitive shapes ─────────────────────────────────────────────
const CONDITIONS = new Set([
  "import",
  "require",
  "default",
  "types",
  "typings",
  "node",
  "node-addons",
  "browser",
  "module",
  "module-sync",
  "development",
  "production",
  "worker",
  "workerd",
  "deno",
  "bun",
  "react-server",
  "react-native",
  "edge-light",
  "edge-routine",
  "electron",
  "netlify",
  "worklet",
  "style",
  "sass",
  "svelte",
  "solid",
  "source",
]);
// CSS shorthands and the longhands each one resets (CSS specs; camelCase as in React style
// objects). Setting a shorthand after one of its longhands overrides it, so swapping the two
// changes the style. A prefix isn't enough: `border` doesn't reset `borderRadius`, `flex` doesn't
// reset `flexDirection`, `outline` doesn't reset `outlineOffset`.
const SIDES = ["Top", "Right", "Bottom", "Left"];
const LONGHANDS = {
  animation: [
    "animationName",
    "animationDuration",
    "animationTimingFunction",
    "animationDelay",
    "animationIterationCount",
    "animationDirection",
    "animationFillMode",
    "animationPlayState",
  ],
  background: [
    "backgroundColor",
    "backgroundImage",
    "backgroundPosition",
    "backgroundSize",
    "backgroundRepeat",
    "backgroundOrigin",
    "backgroundClip",
    "backgroundAttachment",
  ],
  border: [
    "borderWidth",
    "borderStyle",
    "borderColor",
    ...SIDES.flatMap((s) => [
      `border${s}`,
      `border${s}Width`,
      `border${s}Style`,
      `border${s}Color`,
    ]),
  ],
  borderColor: SIDES.map((s) => `border${s}Color`),
  borderRadius: [
    "borderTopLeftRadius",
    "borderTopRightRadius",
    "borderBottomRightRadius",
    "borderBottomLeftRadius",
  ],
  borderStyle: SIDES.map((s) => `border${s}Style`),
  borderWidth: SIDES.map((s) => `border${s}Width`),
  ...Object.fromEntries(
    SIDES.map((s) => [
      `border${s}`,
      [`border${s}Width`, `border${s}Style`, `border${s}Color`],
    ])
  ),
  columns: ["columnWidth", "columnCount"],
  flex: ["flexGrow", "flexShrink", "flexBasis"],
  flexFlow: ["flexDirection", "flexWrap"],
  font: [
    "fontStyle",
    "fontVariant",
    "fontWeight",
    "fontStretch",
    "fontSize",
    "lineHeight",
    "fontFamily",
  ],
  gap: ["rowGap", "columnGap"],
  grid: [
    "gridTemplateRows",
    "gridTemplateColumns",
    "gridTemplateAreas",
    "gridAutoRows",
    "gridAutoColumns",
    "gridAutoFlow",
  ],
  gridArea: ["gridRowStart", "gridColumnStart", "gridRowEnd", "gridColumnEnd"],
  gridColumn: ["gridColumnStart", "gridColumnEnd"],
  gridRow: ["gridRowStart", "gridRowEnd"],
  gridTemplate: [
    "gridTemplateRows",
    "gridTemplateColumns",
    "gridTemplateAreas",
  ],
  inset: ["top", "right", "bottom", "left"],
  listStyle: ["listStyleType", "listStylePosition", "listStyleImage"],
  margin: SIDES.map((s) => `margin${s}`),
  marginBlock: ["marginBlockStart", "marginBlockEnd"],
  marginInline: ["marginInlineStart", "marginInlineEnd"],
  outline: ["outlineColor", "outlineStyle", "outlineWidth"],
  overflow: ["overflowX", "overflowY"],
  padding: SIDES.map((s) => `padding${s}`),
  paddingBlock: ["paddingBlockStart", "paddingBlockEnd"],
  paddingInline: ["paddingInlineStart", "paddingInlineEnd"],
  placeContent: ["alignContent", "justifyContent"],
  placeItems: ["alignItems", "justifyItems"],
  placeSelf: ["alignSelf", "justifySelf"],
  textDecoration: [
    "textDecorationLine",
    "textDecorationStyle",
    "textDecorationColor",
    "textDecorationThickness",
  ],
  transition: [
    "transitionProperty",
    "transitionDuration",
    "transitionTimingFunction",
    "transitionDelay",
    "transitionBehavior",
  ],
};
const kebabToCamel = (s) => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
const cssPairs = (names) => {
  const camel = names.map((n) => (n ? kebabToCamel(n) : n));
  const out = [];
  camel.forEach((short, i) => {
    const longs =
      short && Object.hasOwn(LONGHANDS, short) ? LONGHANDS[short] : null;
    if (!longs) {
      return;
    }
    camel.forEach((long, j) => {
      if (i !== j && long && longs.includes(long)) {
        out.push([i, j]);
      }
    });
  });
  return out;
};

const untypedParams = (fn) =>
  fn.params.filter(
    (p) =>
      !p.typeAnnotation &&
      !(p.type === "AssignmentPattern" && p.left.typeAnnotation)
  ).length;

// ── the census rule ────────────────────────────────────────────────────
const makePlugin = (sink) => ({
  rules: {
    census: {
      create(context) {
        const src = context.sourceCode;
        const text = src.text;
        const comments = src.getAllComments();
        const counts = sink.counts;
        return {
          ObjectExpression(node) {
            const props = node.properties;
            counts.objects++;
            if (props.length < 2) {
              counts[`objects${props.length}`]++;
              return;
            }
            counts.objects2++;
            const names = {
              biome: props.map((p) => lib.biomeName(p, text)),
              eslint: props.map((p) => lib.eslintName(p)),
              oxlint: props.map((p) => lib.oxlintName(p)),
            };
            const keys = props.map((p, i) => {
              const fx =
                p.type === "SpreadElement"
                  ? lib.effectsOf(p.argument)
                  : lib.effectsOf(p.value);
              const keyFx =
                p.type === "Property" && p.computed
                  ? lib.effectsOf(p.key)
                  : { effect: false };
              const fn =
                p.type === "Property" && isFunction(p.value) ? p.value : null;
              return {
                b: names.biome[i],
                e: names.eslint[i],
                fx: fx.effect,
                kfx: keyFx.effect,
                col: p.loc.start.column + 1,
                ks: p.type === "Property" ? p.key.range[0] : p.range[0],
                line: p.loc.start.line,
                ps: p.range[0],
                pe: p.range[1],
                o: names.oxlint[i],
                rd: fx.read,
                sh: p.type === "Property" && p.shorthand,
                t: lib.keyTypeOf(p),
                u: fn ? untypedParams(fn) : null,
                v: lib.valueKindOf(p),
              };
            });
            const groups = {
              biome: lib.groupsFor(props, "biome", text),
              eslint: lib.groupsFor(props, "eslint", text),
              oxlint: lib.groupsFor(props, "oxlint", text),
            };
            // Comments and blank lines between members (not inside a member).
            let gapComments = 0;
            let leadingNonJsdoc = 0;
            let jsdoc = 0;
            let trailingLine = 0;
            let blankGaps = 0;
            for (let i = 0; i <= props.length; i++) {
              const from = i === 0 ? node.range[0] + 1 : props[i - 1].range[1];
              const to =
                i === props.length ? node.range[1] - 1 : props[i].range[0];
              const cs = lib.commentsIn(comments, from, to);
              gapComments += cs.length;
              for (const c of cs) {
                const sameLine =
                  i > 0 && !text.slice(from, c.range[0]).includes("\n");
                if (sameLine) {
                  trailingLine++;
                } else if (lib.isJsdoc(c)) {
                  jsdoc++;
                } else {
                  leadingNonJsdoc++;
                }
              }
              if (i > 0 && i < props.length) {
                const gap = text.slice(from, to);
                if (
                  /\n[ \t]*(?:\r?\n)/.test(
                    gap
                      .replace(/\/\*[\s\S]*?\*\//g, "")
                      .replace(/\/\/[^\n]*/g, "")
                  )
                ) {
                  blankGaps++;
                }
              }
            }
            const sorted = Object.fromEntries(
              Object.entries(groups).map(([k, g]) => [
                k,
                lib.descents(g, lib.COMPARE[k]) === 0,
              ])
            );
            const flow = flowOf(node, src);
            const fnProps = keys.filter((k) =>
              ["function", "method"].includes(k.v)
            ).length;
            const condition = names.eslint.filter(
              (n) => n && CONDITIONS.has(n)
            ).length;
            const parent = climb(node).parent;
            const row = {
              biomeReport: !sorted.biome,
              blankGaps,
              chance: lib.chanceSorted(groups.eslint),
              column: node.loc.start.column + 1,
              conditionKeys: condition,
              cssPairs: cssPairs(names.eslint),
              disorder: lib.disorder(groups.eslint, lib.eslintCompare),
              end: node.range[1],
              endLine: node.loc.end.line,
              eslintReports: lib.descents(groups.eslint, lib.eslintCompare),
              file: sink.file,
              flow: flow.labels,
              fnProps,
              gapComments,
              groupSizes: {
                biome: groups.biome.map((g) => g.length),
                eslint: groups.eslint.map((g) => g.length),
                oxlint: groups.oxlint.map((g) => g.length),
              },
              jsdoc,
              keys,
              leadingNonJsdoc,
              line: node.loc.start.line,
              n: props.length,
              notes: flow.notes,
              oxlintBlocker: sorted.oxlint
                ? null
                : lib.oxlintFixBlocker(node, text, comments),
              oxlintReport: !sorted.oxlint,
              parent: parent?.type ?? null,
              repo: sink.repo,
              sorted,
              start: node.range[0],
              trailingLine,
            };
            // Call context.
            if (
              parent &&
              (parent.type === "CallExpression" ||
                parent.type === "NewExpression") &&
              parent.callee !== climb(node)
            ) {
              row.callee = calleeText(src, parent.callee);
              row.argIndex = parent.arguments.indexOf(climb(node));
            }
            if (
              parent?.type === "Property" &&
              parent.parent?.type === "ObjectExpression"
            ) {
              row.nestedIn = parent.parent.range[0];
              row.nestedKey = lib.eslintName(parent);
            }
            if (
              parent?.type === "VariableDeclarator" &&
              parent.id.type === "Identifier"
            ) {
              row.varName = parent.id.name;
            }
            if (
              parent?.type === "Property" &&
              parent.parent?.type === "ObjectExpression"
            ) {
              // a `properties: {…}` under `type: "object"` (JSON schema)
              const siblings = parent.parent.properties.map((x) =>
                lib.eslintName(x)
              );
              if (
                lib.eslintName(parent) === "properties" &&
                siblings.includes("type")
              ) {
                row.jsonSchemaProperties = true;
              }
            }
            if (
              row.callee &&
              /(?:^|\.)(?:object|strictObject|looseObject|extend|shape)$/.test(
                row.callee
              )
            ) {
              row.schemaShape = true;
            }
            if (
              row.callee &&
              /(?:^|\.)sort$/.test(row.callee) &&
              keys.every((k) => ["number", "other"].includes(k.v))
            ) {
              row.sortSpec = true;
            }
            if (
              node.parent?.type === "TSAsExpression" &&
              node.parent.typeAnnotation?.typeName?.name === "const"
            ) {
              row.asConst = true;
            }
            if (node.parent?.type === "TSSatisfiesExpression") {
              row.satisfies = true;
            }
            sink.rows.push(row);
          },
          ObjectPattern(node) {
            if (node.properties.length >= 2) {
              counts.patterns2++;
            }
          },
          TSTypeLiteral(node) {
            if (node.members.length >= 2) {
              counts.typeLiterals2++;
            }
          },
          TSInterfaceBody(node) {
            if (node.body.length >= 2) {
              counts.interfaces2++;
            }
          },
          TSEnumDeclaration(node) {
            const members = node.body?.members ?? node.members ?? [];
            if (members.length >= 2) {
              counts.enums2++;
            }
          },
          JSXOpeningElement(node) {
            if (node.attributes.length >= 2) {
              counts.jsxAttributeLists2++;
            }
          },
        };
      },
    },
  },
});

const newCounts = () => ({
  enums2: 0,
  interfaces2: 0,
  jsxAttributeLists2: 0,
  objects: 0,
  objects0: 0,
  objects1: 0,
  objects2: 0,
  patterns2: 0,
  typeLiterals2: 0,
});

const censusFile = (linter, repo, rel, text, counts) => {
  const sink = { counts, file: rel, repo, rows: [] };
  const plugin = makePlugin(sink);
  const jsx = /\.(?:tsx|jsx)$/.test(rel) || /\.(?:js|mjs|cjs)$/.test(rel);
  const configFor = (withJsx) => [
    {
      files: ["**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}"],
      languageOptions: {
        parser: tsParser,
        parserOptions: { ecmaFeatures: { jsx: withJsx }, sourceType: "module" },
        sourceType: "module",
      },
      linterOptions: {
        noInlineConfig: true,
        reportUnusedDisableDirectives: "off",
      },
      plugins: { sk: plugin },
      rules: { "sk/census": "error" },
    },
  ];
  let messages = linter.verify(text, configFor(jsx), { filename: rel });
  let fatal = messages.find((m) => m.fatal);
  if (fatal && jsx && /\.(?:js|mjs|cjs)$/.test(rel)) {
    sink.rows = [];
    messages = linter.verify(text, configFor(false), { filename: rel });
    fatal = messages.find((m) => m.fatal);
  }
  return { error: fatal ? fatal.message : null, rows: sink.rows };
};

// ── aggregates ─────────────────────────────────────────────────────────
const bucket = (n) => (n >= 10 ? "10+" : n >= 6 ? "6-9" : String(n));
const BUCKETS = ["2", "3", "4", "5", "6-9", "10+"];
const aggregate = (rows, lines) => {
  const named = (r) => r.keys.filter((k) => k.e !== null).length;
  const eligible = rows;
  const out = {
    objects2: rows.length,
    per10k: lib.per10k(rows.length, lines),
    lines,
  };
  const share = (f) => ({
    n: rows.filter(f).length,
    pct: lib.pct(rows.filter(f).length, rows.length),
  });
  out.shape = {
    blankLineGroups: share((r) => r.blankGaps > 0),
    commentsBetweenKeys: share((r) => r.gapComments > 0),
    computedExpression: share((r) =>
      r.keys.some((k) => k.t === "computed-expression")
    ),
    computedIdentifier: share((r) =>
      r.keys.some((k) => k.t === "computed-identifier")
    ),
    computedLiteral: share((r) =>
      r.keys.some((k) => k.t === "computed-literal")
    ),
    computedKeyWithEffect: share((r) => r.keys.some((k) => k.kfx)),
    getterOrSetter: share((r) =>
      r.keys.some((k) => k.v === "get" || k.v === "set")
    ),
    methods: share((r) => r.keys.some((k) => k.v === "method")),
    multiline: share((r) => r.endLine > r.line),
    numberKeys: share((r) => r.keys.some((k) => k.t === "number")),
    quotedKeys: share((r) => r.keys.some((k) => k.t === "string")),
    shorthand: share((r) => r.keys.some((k) => k.sh)),
    spreads: share((r) => r.keys.some((k) => k.t === "spread")),
    valuesWithEffects2: share(
      (r) => r.keys.filter((k) => k.fx && k.t !== "spread").length >= 2
    ),
  };
  out.keysPerObject = Object.fromEntries(
    BUCKETS.map((b) => [b, rows.filter((r) => bucket(r.n) === b).length])
  );
  out.sorted = {};
  for (const linter of ["eslint", "oxlint", "biome"]) {
    out.sorted[linter] = share((r) => r.sorted[linter]);
  }
  out.reports = {
    biomeObjects: rows.filter((r) => r.biomeReport).length,
    eslintDiagnostics: rows.reduce((s, r) => s + r.eslintReports, 0),
    eslintObjects: rows.filter((r) => r.eslintReports > 0).length,
    oxlintFixable: rows.filter(
      (r) => r.oxlintReport && r.oxlintBlocker === null
    ).length,
    oxlintObjects: rows.filter((r) => r.oxlintReport).length,
  };
  out.oxlintBlockers = {};
  for (const r of rows.filter((x) => x.oxlintReport && x.oxlintBlocker)) {
    out.oxlintBlockers[r.oxlintBlocker] =
      (out.oxlintBlockers[r.oxlintBlocker] ?? 0) + 1;
  }
  // Sorted against chance, by number of named keys in one group (ESLint's grouping), for objects
  // whose keys form one group with distinct names.
  const single = rows.filter(
    (r) =>
      r.groupSizes.eslint.length === 1 &&
      new Set(r.keys.filter((k) => k.e !== null).map((k) => k.e)).size ===
        r.groupSizes.eslint[0]
  );
  out.chance = Object.fromEntries(
    BUCKETS.map((b) => {
      const rs = single.filter((r) => bucket(r.groupSizes.eslint[0]) === b);
      const expected = rs.reduce((s, r) => s + r.chance, 0);
      const observed = rs.filter((r) => r.sorted.eslint).length;
      return [
        b,
        {
          expectedPct: lib.pct(expected, rs.length),
          expectedSorted: Math.round(expected * 10) / 10,
          objects: rs.length,
          observedPct: lib.pct(observed, rs.length),
          observedSorted: observed,
          ratio:
            expected > 0 ? Math.round((observed / expected) * 10) / 10 : null,
          meanDisorder: rs.length
            ? Math.round(
                (rs.reduce((s, r) => s + (r.disorder ?? 0), 0) / rs.length) *
                  1000
              ) / 1000
            : null,
        },
      ];
    })
  );
  out.chanceAll = (() => {
    const expected = rows.reduce((s, r) => s + r.chance, 0);
    const observed = rows.filter((r) => r.sorted.eslint).length;
    return {
      expected: Math.round(expected),
      expectedPct: lib.pct(expected, rows.length),
      observed,
      observedPct: lib.pct(observed, rows.length),
    };
  })();
  // First keys: share of objects that contain a key and have it first, against 1/n by chance.
  const firstStats = {};
  for (const r of rows) {
    const ks = r.keys.filter((k) => k.e !== null && k.t !== "spread");
    if (ks.length < 2 || r.keys[0].t === "spread") {
      continue;
    }
    const seen = new Set();
    ks.forEach((k, i) => {
      if (seen.has(k.e)) {
        return;
      }
      seen.add(k.e);
      const s = (firstStats[k.e] ??= {
        expectedFirst: 0,
        first: 0,
        firstIfSorted: 0,
        objects: 0,
      });
      s.objects++;
      s.expectedFirst += 1 / ks.length;
      if (i === 0 && r.keys[0] === k) {
        s.first++;
      }
      // Would sorting (ESLint's comparator) put it first?
      if (ks.every((o) => o === k || lib.eslintCompare(k.e, o.e) <= 0)) {
        s.firstIfSorted++;
      }
    });
  }
  out.firstKeys = Object.entries(firstStats)
    .filter(([, s]) => s.objects >= 40)
    .map(([key, s]) => ({
      expectedPct: lib.pct(s.expectedFirst, s.objects),
      first: s.first,
      firstPct: lib.pct(s.first, s.objects),
      firstIfSortedPct: lib.pct(s.firstIfSorted, s.objects),
      key,
      lift:
        s.expectedFirst > 0
          ? Math.round((s.first / s.expectedFirst) * 10) / 10
          : null,
      objects: s.objects,
    }))
    .sort((a, b) => b.objects - a.objects)
    .slice(0, 60);
  out.firstKeyTop = Object.entries(
    rows.reduce((a, r) => {
      const k =
        r.keys[0].t === "spread" ? "(spread)" : (r.keys[0].e ?? "(computed)");
      a[k] = (a[k] ?? 0) + 1;
      return a;
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .map(([key, n]) => ({ key, n, pct: lib.pct(n, rows.length) }));
  void named;
  void eligible;
  return out;
};

const main = () => {
  const repos = lib.selectedRepos();
  lib.checkPinned(repos);
  const linter = new Linter({ configType: "flat" });
  const result = {
    generated: new Date().toISOString().slice(0, 10),
    repos: {},
    tools: lib.toolVersions(),
  };
  const pools = { core: [], react: [] };
  const poolLines = { core: 0, react: 0 };
  const poolCounts = { core: newCounts(), react: newCounts() };
  for (const name of repos) {
    const t0 = Date.now();
    const { files } = lib.collect(name);
    const root = lib.repoMeta(name).root;
    const counts = newCounts();
    const rows = [];
    const errors = [];
    let lines = 0;
    for (const rel of files) {
      const text = readFileSync(join(root, rel), "utf8");
      lines += text.split("\n").length;
      const r = censusFile(linter, name, rel, text, counts);
      if (r.error) {
        errors.push({ error: r.error, file: rel });
      }
      rows.push(...r.rows);
    }
    lib.writeJsonl(join(OUT, `${name}.jsonl`), rows);
    const set = lib.setOf(name);
    result.repos[name] = {
      ...aggregate(rows, lines),
      counts,
      files: files.length,
      parseErrors: errors,
      set,
      sha: lib.shaOf(name),
    };
    if (pools[set]) {
      pools[set].push(...rows);
      poolLines[set] += lines;
      for (const [k, v] of Object.entries(counts)) {
        poolCounts[set][k] += v;
      }
    }
    console.log(
      `${name}: ${files.length} files, ${lines} lines, ${rows.length} objects with 2+ members, ${errors.length} parse errors (${((Date.now() - t0) / 1000).toFixed(1)} s)`
    );
  }
  result.pooled = {};
  for (const set of ["core", "react"]) {
    if (pools[set].length) {
      result.pooled[set] = {
        ...aggregate(pools[set], poolLines[set]),
        counts: poolCounts[set],
      };
    }
  }
  if (repos.length === lib.ALL.length) {
    lib.writeJson(join(lib.RESULTS_DIR, "census.json"), result);
  } else {
    lib.writeJson(join(lib.OUT_DIR, "census-partial.json"), result);
  }
};

main();
