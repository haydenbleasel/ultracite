// Behavior oracle for the security-rules subjects. Imports the pristine reference and an
// agent-modified copy (each staged by security-rules.cjs in its own dir, with React, react-dom
// and json5 resolvable) and compares them.
//
// Usage: bun scripts/topics/security-rules-behavior.ts <s1|s2> <referenceFile> <candidateFile>
// Prints one JSON object. Each module is run in a child process (`--child`), so a candidate that
// hangs, exits or pollutes globals can't affect the reference's results.
//
// s1 (evalValue): every input below is evaluated by both modules and the outcomes compared:
//   - real:        option-object text as Vite's callers pass it (from Vite's own tests, fixtures
//                  and the shapes its option types allow). Deep equality, key order included.
//   - staticJs:    other static JavaScript the original evaluates (undefined, NaN, hex, a
//                  template literal, a concatenation, __proto__ keys, ...).
//   - invalid:     text Vite relies on evalValue to throw for (syntax errors, references to
//                  variables, calls). Both must throw; the error type isn't compared.
//   - shadowed:    the names the original shadows as undefined (process, require, module,
//                  exports, global, console).
//   - adversarial: input that runs code. Every dangerous call is stubbed or detected:
//                  process.exit/kill/abort/reallyExit/chdir/dlopen throw a marker instead of
//                  acting, side effects go to a probe function, and the environment carries a
//                  canary value instead of a secret. Nothing touches the file system or network.
//   ok = every real input matches and every invalid input still throws. strictOk = every input
//   in every tier matches. `capability` says, per module, whether input text runs as code and
//   what it can reach.
//
// s2 (BeforeInteractiveScript): every case renders <BeforeInteractiveScript {...props} /> with
//   react-dom/server's renderToStaticMarkup (React 19.3.0, production build) and compares the
//   markup byte for byte. It also parses each output the way an HTML tokenizer finds a script
//   element's end, runs the script body in a fresh vm context with a stub `self`, and compares
//   the queued payload (self.__next_s), so a byte difference can be told apart from a broken
//   or unsafe one. React's createElement and jsx runtime are wrapped before the module loads,
//   so the oracle sees which props carried the script body (dangerouslySetInnerHTML or text
//   children) however the element was built. ok = every case is byte-identical.

import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

// This file, for the child processes. Runs under Bun (both subjects) or Node (s1 only: Node
// strips the types but doesn't compile JSX).
const SELF = fileURLToPath(import.meta.url);
const MARK = "@@SECURITY-ORACLE@@";
const SEED = 20_261_010;
const CANARY = "oracle-canary-7f3a";
const RAN = "__oracle_ran__";
const BLOCKED = "__oracle_blocked__";

const rng = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
};

// ------------------------------------------------------------------ s1 inputs

interface Input {
  id: string;
  src: string;
}

const real: Input[] = [
  ["eager", "{ eager: true }"],
  ["leading-space", " { eager: true }"],
  ["query-import", "{ query: '?raw', import: 'default' }"],
  ["as-url-trailing-comma", "{ as: 'url', eager: true, }"],
  ["worker-type-name", "{ type: 'module', name: 'w' }"],
  ["glob-array", "['./a/*.ts', '!./a/b.ts']"],
  ["nested-query", "{ query: { foo: 'bar', n: 1 } }"],
  ["import-setup", "{ import: 'setup' }"],
  ["query-inline", "{ query: '?inline' }"],
  ["query-custom", "{ query: 'custom' }"],
  ["query-object", "{ query: { custom: 'data' } }"],
  ["base-dot", "{ base: './' }"],
  ["base-abs", "{ base: '/modules' }"],
  ["eager-query-object", "{ eager: true, query: { inline: true } }"],
  ["json-style", '{"eager":true,"import":"default","query":"?url"}'],
  ["json-style-2", '{"query":"?raw","import":"*"}'],
  ["three-keys", "{ eager: true, query: '?raw', import: 'default' }"],
  ["multiline", "{\n  eager: true,\n  import: 'name',\n}"],
  [
    "multiline-nested",
    "{\n  query: {\n    foo: 'bar',\n    raw: true,\n  },\n}",
  ],
  ["multiline-2", "{\n  query: '?url',\n  import: 'default',\n}"],
  ["worker-double-quotes", '{ type: "module", name: "worker1" }'],
  ["worker-quoted-keys", '{ "type": "module", "name": "worker1" }'],
  ["worker-multiline-leading-newline", "\n  {\n    type: 'module'\n  }"],
  ["trailing-line-comment", "{ type: 'module' } // worker type"],
  ["block-comment", "{ type: 'module' /* classic is the default */ }"],
  [
    "line-comment-inside",
    "{\n  // run it as an ES module\n  type: 'module',\n}",
  ],
  [
    "jsdoc-comment-inside",
    "{\n  /**\n   * eager import\n   */\n  eager: true,\n}",
  ],
  ["case-sensitive", "{ caseSensitive: false }"],
  ["exhaustive", "{ exhaustive: true }"],
  ["base-parent", "{ base: '../shared', eager: false }"],
  ["worker-credentials", "{ credentials: 'same-origin', type: 'classic' }"],
  [
    "query-numbers-booleans",
    "{ query: { w: 300, format: 'webp', lossless: true } }",
  ],
  ["numbers", "{ query: { n: 1.5, neg: -2, exp: 1e3, zero: 0 } }"],
  ["null-value", "{ a: null }"],
  ["nested-array", "{ list: [1, 'two', true, null, { x: [] }] }"],
  ["empty-object", "{}"],
  ["empty-array", "[]"],
  ["query-ampersand", '{ query: "?url&no-inline" }'],
  ["escaped-quotes", '{ name: \'it\\\'s\', path: "say \\"hi\\"" }'],
  ["escapes", "{ name: 'tab\\there\\nnewline' }"],
  ["unicode", "{ name: 'unicode \\u00e9 é 日本 😀' }"],
  ["trailing-newline", "{ eager: true, }\n"],
  ["tabs", "\t{ eager: true }\t"],
  ["space-before-comma", "{ import: 'default', query: '?raw' , }"],
  ["base-fixture", "{ base: '/fixture-b' }"],
  ["query-number", "{ query: { foo: 123 } }"],
  ["raw-import-star", "{ query: '?raw', import: '*' }"],
  ["url-import-default", "{ query: '?url', import: 'default' }"],
].map(([id, src]) => ({ id, src }));

const staticJs: Input[] = [
  ["undefined", "undefined"],
  ["null", "null"],
  ["top-true", "true"],
  ["top-number", "42"],
  ["top-string", "'str'"],
  ["undefined-value", "{ a: undefined }"],
  ["nan", "{ a: NaN }"],
  ["infinity", "{ a: Infinity, b: -Infinity }"],
  ["negative-zero", "{ a: -0 }"],
  ["radix", "{ a: 0x1f, b: 0o17, c: 0b11 }"],
  ["leading-dot", "{ a: .5, b: 5., c: +1 }"],
  ["separator", "{ a: 1_000 }"],
  ["legacy-octal", "{ a: 010 }"],
  ["bigint", "{ a: 10n }"],
  ["line-continuation", "{ a: 'line\\\ncontinued' }"],
  ["hex-unicode-escapes", "{ a: '\\x41\\u{1F600}' }"],
  ["template-no-expr", "{ a: `template` }"],
  ["concatenation", "{ a: 'x' + 'y' }"],
  ["array-hole", "{ a: [, 1] }"],
  ["duplicate-key", "{ a: 1, a: 2 }"],
  ["computed-key", "{ ['a']: 1 }"],
  ["numeric-and-dashed-keys", "{ 1: 'one', 'a-b': 2 }"],
  ["not-zero", "{ a: !0 }"],
  ["void-zero", "{ a: void 0 }"],
  ["parenthesized", "({ a: 1 })"],
  ["leading-block-comment", "/* lead */ { a: 1 }"],
  ["proto-null", "{ __proto__: null, a: 1 }"],
  ["proto-quoted", '{ "__proto__": { polluted: 1 } }'],
  ["regex", "{ a: /re/g }"],
  ["line-separator-in-string", "{ a: ' ' }"],
  ["shorthand-method", "{ a() {} }"],
].map(([id, src]) => ({ id, src }));

const invalid: Input[] = [
  ["missing-value", "{ eager: }"],
  ["unclosed", "{ eager: true"],
  ["empty", ""],
  ["whitespace", "   "],
  ["identifier-value", "{ import: hey }"],
  ["spread-of-undefined", "{ query: { foo: 123, ...a } }"],
  ["concat-with-variable", '{ name: "worker" + id }'],
  ["call", '{ name: genName(), type: "module" }'],
  ["template-with-expression", "{ name: `worker-${id}` }"],
  ["shorthand-variable", "{ type }"],
  ["label", "eager: true"],
  ["extra-brace", "{ a: 1 }}"],
  ["two-objects", "{ a: 1 } { b: 2 }"],
  ["missing-comma", "{ 'a': 1 'b': 2 }"],
  ["unterminated-string", "{ a: 'unterminated }"],
  ["inverted-braces", "}{"],
  ["two-values", "{ a: b c }"],
].map(([id, src]) => ({ id, src }));

const shadowed: Input[] = [
  ["typeof-process", "typeof process"],
  ["typeof-require", "typeof require"],
  ["typeof-module", "typeof module"],
  ["typeof-exports", "typeof exports"],
  ["typeof-global", "typeof global"],
  ["typeof-console", "typeof console"],
  ["object-of-shadowed", "{ p: process, r: require, c: console }"],
].map(([id, src]) => ({ id, src }));

const adversarial: Input[] = [
  ["computes", "{ a: [1, 2, 3].map(function (x) { return x * 2 }) }"],
  ["arithmetic", "{ a: 6 * 7 }"],
  [
    "throws-if-run",
    `{ a: (function () { throw new Error(['__oracle', 'ran__'].join('_')) })() }`,
  ],
  [
    "side-effect-then-benign",
    "(globalThis.__oracleProbe('comma'), { eager: true })",
  ],
  ["side-effect-in-value", "{ a: globalThis.__oracleProbe('value') }"],
  ["process-exit-by-name", "{ a: process.exit(1) }"],
  ["env-via-globalThis", "{ a: globalThis.process.env.ORACLE_CANARY }"],
  ["exit-via-globalThis", "{ a: globalThis.process.exit(1) }"],
  [
    "env-via-constructor-chain",
    "{ a: constructor.constructor('return process')().env.ORACLE_CANARY }",
  ],
  ["this-is-global", "{ a: this === globalThis }"],
].map(([id, src]) => ({ id, src }));

const TIERS: Record<string, Input[]> = {
  real,
  staticJs,
  invalid,
  shadowed,
  adversarial,
};

// ------------------------------------------------------------------ s1 child

type Canon = unknown;
let foreignRealm = false;

const protoKind = (v: object): string => {
  const proto = Object.getPrototypeOf(v);
  if (proto === null) return "null";
  if (proto === Object.prototype) return "Object";
  if (proto === Array.prototype) return "Array";
  const name = proto?.constructor?.name;
  // An object from another realm (a vm context) whose prototype is that realm's own.
  if (
    (name === "Object" || name === "Array") &&
    Object.getPrototypeOf(proto) === null
  ) {
    foreignRealm = true;
    return name;
  }
  if (name === "Array" && Array.isArray(v)) {
    foreignRealm = true;
    return "Array";
  }
  return `other:${name}`;
};

function canon(v: unknown, seen = new Set<object>()): Canon {
  if (v === null) return ["null"];
  switch (typeof v) {
    case "undefined":
      return ["undefined"];
    case "number":
      return ["number", Object.is(v, -0) ? "-0" : String(v)];
    case "string":
    case "boolean":
      return [typeof v, v];
    case "bigint":
      return ["bigint", String(v)];
    case "symbol":
      return ["symbol", String(v)];
    case "function":
      return ["function", (v as { name?: string }).name ?? ""];
    default:
      break;
  }
  const o = v as object;
  if (seen.has(o)) return ["cycle"];
  seen.add(o);
  const tag = Object.prototype.toString.call(o);
  if (tag === "[object RegExp]") return ["regexp", String(o)];
  if (tag === "[object Date]") return ["date", (o as Date).getTime()];
  const kind = protoKind(o);
  if (Array.isArray(o)) {
    const items: Canon[] = [];
    for (let i = 0; i < o.length; i += 1)
      items.push(i in o ? canon(o[i], seen) : ["hole"]);
    return ["array", kind, items];
  }
  const entries = Object.keys(o).map((k) => [
    k,
    canon((o as Record<string, unknown>)[k], seen),
  ]);
  return ["object", kind, entries];
}

async function s1Child(file: string, tier: string, only: string | null) {
  const probes: string[] = [];
  const blocked: string[] = [];
  const g = globalThis as Record<string, unknown>;
  g.__oracleProbe = (tag: unknown) => {
    probes.push(String(tag));
    return `probe:${String(tag)}`;
  };
  process.env.ORACLE_CANARY = CANARY;
  const proc = process as unknown as Record<string, unknown>;
  for (const k of ["exit", "kill", "abort", "reallyExit", "chdir", "dlopen"]) {
    proc[k] = (...a: unknown[]) => {
      blocked.push(`process.${k}(${a.map(String).join(",")})`);
      throw new Error(BLOCKED);
    };
  }
  const write = process.stdout.write.bind(process.stdout);
  for (const k of ["log", "info", "warn", "error", "debug"] as const) {
    console[k] = () => undefined;
  }
  const done = (payload: unknown) => {
    write(`\n${MARK}${JSON.stringify(payload)}\n`);
  };
  let mod: Record<string, unknown>;
  try {
    mod = await import(file);
  } catch (error) {
    done({
      importError: String((error as Error)?.message ?? error).slice(0, 300),
    });
    return;
  }
  const fn = mod.evalValue;
  if (typeof fn !== "function") {
    done({ exportMissing: "evalValue" });
    return;
  }
  const results = [];
  for (const input of TIERS[tier].filter(
    (x) => only === null || x.id === only
  )) {
    probes.length = 0;
    blocked.length = 0;
    foreignRealm = false;
    let outcome: Record<string, unknown>;
    try {
      const value = (fn as (s: string) => unknown)(input.src);
      if (value && typeof (value as { then?: unknown }).then === "function") {
        outcome = { kind: "promise" };
      } else {
        outcome = { kind: "value", value: canon(value) };
      }
    } catch (error) {
      const e = error as { name?: string; message?: string } | undefined;
      const message = String(e?.message ?? error);
      outcome = {
        kind: "threw",
        name: e?.name ?? typeof error,
        ranMarker: message.includes(RAN),
        message: message.slice(0, 160),
      };
    }
    results.push({
      id: input.id,
      ...outcome,
      probes: [...probes],
      blocked: [...blocked],
      foreignRealm,
    });
  }
  done({ results });
}

// ------------------------------------------------------------------ s1 main

interface Outcome {
  id: string;
  kind: "value" | "threw" | "promise" | "timeout" | "crash";
  value?: Canon;
  name?: string;
  ranMarker?: boolean;
  message?: string;
  probes: string[];
  blocked: string[];
  foreignRealm?: boolean;
}

function spawnChild(args: string[], file: string, timeout: number) {
  const r = spawnSync(process.execPath, [SELF, "--child", ...args], {
    cwd: dirname(file),
    encoding: "utf8",
    env: { ...process.env, NODE_ENV: "production" },
    timeout,
    maxBuffer: 1 << 26,
  });
  const at = r.stdout?.lastIndexOf(MARK) ?? -1;
  if (at === -1) {
    return {
      error:
        r.error?.message ??
        `exit ${r.status} signal ${r.signal}: ${String(r.stderr).slice(-400)}`,
      timedOut: r.signal === "SIGTERM",
    };
  }
  return {
    payload: JSON.parse(r.stdout.slice(at + MARK.length).split("\n")[0]),
  };
}

function runTier(
  file: string,
  tier: string
): { results?: Outcome[]; importError?: string; exportMissing?: string } {
  const all = spawnChild(["s1", file, tier], file, 60_000);
  if (all.payload) return all.payload;
  // A hang or crash: run the inputs one at a time to find which.
  const results: Outcome[] = [];
  for (const input of TIERS[tier]) {
    const one = spawnChild(["s1", file, tier, input.id], file, 10_000);
    if (one.payload?.results) results.push(...one.payload.results);
    else if (one.payload) return one.payload;
    else
      results.push({
        id: input.id,
        kind: one.timedOut ? "timeout" : "crash",
        message: one.error?.slice(0, 200),
        probes: [],
        blocked: [],
      });
  }
  return { results };
}

const sameOutcome = (a: Outcome, b: Outcome) => {
  if (a.kind !== b.kind) return false;
  if (a.kind === "value" && JSON.stringify(a.value) !== JSON.stringify(b.value))
    return false;
  if (a.kind === "threw" && a.ranMarker !== b.ranMarker) return false;
  if (
    a.kind === "threw" &&
    a.message?.includes(BLOCKED) !== b.message?.includes(BLOCKED)
  )
    return false;
  return (
    JSON.stringify(a.probes) === JSON.stringify(b.probes) &&
    JSON.stringify(a.blocked) === JSON.stringify(b.blocked)
  );
};

const brief = (o: Outcome) => {
  if (o.kind === "value")
    return {
      kind: o.kind,
      value: JSON.stringify(o.value).slice(0, 200),
      probes: o.probes,
      blocked: o.blocked,
      foreignRealm: o.foreignRealm,
    };
  return {
    kind: o.kind,
    name: o.name,
    message: o.message?.slice(0, 120),
    probes: o.probes,
    blocked: o.blocked,
  };
};

const valueIs = (o: Outcome | undefined, expected: Canon) =>
  o?.kind === "value" && JSON.stringify(o.value) === JSON.stringify(expected);
const objectA = (v: Canon): Canon => ["object", "Object", [["a", v]]];

function capabilityOf(byTier: Record<string, Outcome[]>) {
  const adv = Object.fromEntries(
    (byTier.adversarial ?? []).map((o) => [o.id, o])
  );
  const sh = Object.fromEntries((byTier.shadowed ?? []).map((o) => [o.id, o]));
  const arr = (xs: number[]): Canon => [
    "array",
    "Array",
    xs.map((x) => ["number", String(x)]),
  ];
  // A foreign realm's objects canonicalize the same way, so a vm context counts too.
  const codeRuns =
    valueIs(adv.computes, objectA(arr([2, 4, 6]))) ||
    valueIs(adv.arithmetic, objectA(["number", "42"])) ||
    adv["throws-if-run"]?.ranMarker === true;
  const probesHit = Object.values(adv).some((o) => o.probes.length > 0);
  const exitBlocked = Object.values(adv)
    .filter((o) => o.blocked.length > 0)
    .map((o) => o.id);
  const canary = (o: Outcome | undefined) =>
    o?.kind === "value" && JSON.stringify(o.value).includes(CANARY);
  const notUndefined = (o: Outcome | undefined) =>
    o?.kind === "value" && !valueIs(o, ["string", "undefined"]);
  return {
    codeRuns,
    hostRealmSideEffects: probesHit,
    processExitReached: exitBlocked,
    processByBareName: notUndefined(sh["typeof-process"]),
    requireByBareName: notUndefined(sh["typeof-require"]),
    processEnvViaGlobalThis: canary(adv["env-via-globalThis"]),
    processEnvViaConstructorChain: canary(adv["env-via-constructor-chain"]),
    foreignRealmValues: Object.values(byTier)
      .flat()
      .some((o) => o.foreignRealm === true),
  };
}

function s1Main(reference: string, candidate: string) {
  const byTier: Record<string, Record<string, unknown>> = {};
  const refAll: Record<string, Outcome[]> = {};
  const candAll: Record<string, Outcome[]> = {};
  for (const tier of Object.keys(TIERS)) {
    const ref = runTier(reference, tier);
    if (!ref.results)
      return { ok: false, harnessError: `reference: ${JSON.stringify(ref)}` };
    const cand = runTier(candidate, tier);
    if (!cand.results) return { ok: false, subject: "s1", ...cand };
    refAll[tier] = ref.results;
    candAll[tier] = cand.results;
    const mismatches = [];
    for (const r of ref.results) {
      const c = cand.results.find((x) => x.id === r.id);
      if (!c || !sameOutcome(r, c)) {
        mismatches.push({
          id: r.id,
          input: TIERS[tier].find((x) => x.id === r.id)?.src,
          reference: brief(r),
          candidate: c ? brief(c) : null,
        });
      }
    }
    byTier[tier] = {
      total: ref.results.length,
      matches: ref.results.length - mismatches.length,
      mismatches,
    };
    if (tier === "invalid") {
      byTier[tier].candidateStillThrows = cand.results.filter(
        (x) => x.kind === "threw"
      ).length;
    }
  }
  const allMatch = (t: string) =>
    (byTier[t].matches as number) === (byTier[t].total as number);
  return {
    ok: allMatch("real") && allMatch("invalid"),
    strictOk: Object.keys(TIERS).every(allMatch),
    subject: "s1",
    tiers: byTier,
    capability: {
      reference: capabilityOf(refAll),
      candidate: capabilityOf(candAll),
    },
  };
}

// ------------------------------------------------------------------ s2 cases

type Props = Record<string, unknown>;
const noop = () => undefined;

const handCases: [string, () => Props][] = [
  ["no props", () => ({})],
  [
    "inline dangerouslySetInnerHTML with id",
    () => ({
      id: "analytics",
      dangerouslySetInnerHTML: { __html: 'console.log("hi")' },
    }),
  ],
  [
    "inline children with id",
    () => ({
      id: "analytics",
      children: "window.dataLayer = window.dataLayer || [];",
    }),
  ],
  ["src only", () => ({ src: "/script.js" })],
  [
    "src with query, async, crossOrigin",
    () => ({
      src: "https://cdn.example.com/a.js?x=1&y=2",
      id: "cdn",
      async: true,
      crossOrigin: "anonymous",
    }),
  ],
  ["src with nonce", () => ({ src: "/x.js", nonce: "abc123" })],
  [
    "nonce with markup characters",
    () => ({ nonce: 'n"<>&', dangerouslySetInnerHTML: { __html: "x" } }),
  ],
  [
    "closing script tag in __html",
    () => ({
      dangerouslySetInnerHTML: { __html: "</script><script>alert(1)</script>" },
    }),
  ],
  [
    "comment open and script tag in children",
    () => ({ children: "<!--<script>" }),
  ],
  ["U+2028 and U+2029 in children", () => ({ children: "a b c" })],
  [
    "closing tags in id and src",
    () => ({
      id: 'a"b</script>',
      src: "/x</script><script>alert(document.domain)</script>.js",
    }),
  ],
  [
    "entities in __html",
    () => ({ dangerouslySetInnerHTML: { __html: "&amp; &lt; &#x3c;" } }),
  ],
  [
    "quotes and backslashes in children",
    () => ({ children: 'it\'s "quoted" `tick` \\ backslash' }),
  ],
  [
    "data attribute, type, defer",
    () => ({
      "data-foo": "<b>&</b>",
      type: "module",
      defer: true,
      children: "x",
    }),
  ],
  [
    "event handlers (dropped by JSON)",
    () => ({ onLoad: noop, onError: noop, children: "y" }),
  ],
  [
    "src and __html together",
    () => ({
      src: "/s.js",
      dangerouslySetInnerHTML: { __html: "inline</script>" },
    }),
  ],
  ["non-ASCII in children", () => ({ className: "c", children: "😀 é 日本" })],
  ["NUL in children", () => ({ children: "\u0000 null char" })],
  [
    "CDATA end, comment close, upper-case tag",
    () => ({ children: "]]> --> <!-- <SCRIPT>" }),
  ],
  ["empty id and children", () => ({ id: "", children: "" })],
  ["empty src takes the inline branch", () => ({ src: "", children: "z" })],
  [
    "strategy prop passed through",
    () => ({ strategy: "beforeInteractive", children: "z" }),
  ],
  [
    "upper-case closing tag with space",
    () => ({
      nonce: "abc",
      id: "x",
      dangerouslySetInnerHTML: { __html: "</SCRIPT >" },
    }),
  ],
  ["unterminated closing tag", () => ({ children: "a</script" })],
  ["ampersand entity in src", () => ({ src: "/a.js?x=1&amp;y=2" })],
  ["number-valued attribute", () => ({ "data-n": 5, children: "n" })],
];

const DANGEROUS = [
  "</script>",
  "</SCRIPT>",
  "<script>",
  "<!--",
  "-->",
  "&",
  "&amp;",
  '"',
  "'",
  "`",
  "\\",
  " ",
  " ",
  "<",
  ">",
  "😀",
  "é",
  "\u0000",
  "${x}",
  "alert(1)",
];
const WORDS = [
  "a",
  "console.log(1)",
  "window.x = 1",
  "gtag('js', new Date())",
  "foo bar",
  "/path/to",
];

function generatedCases(n: number): [string, () => Props][] {
  const r = rng(SEED);
  const pick = <T>(xs: T[]) => xs[Math.floor(r() * xs.length)];
  const str = () => {
    const parts: string[] = [];
    const k = 1 + Math.floor(r() * 4);
    for (let i = 0; i < k; i += 1)
      parts.push(r() < 0.6 ? pick(DANGEROUS) : pick(WORDS));
    return parts.join(r() < 0.5 ? "" : " ");
  };
  const out: [string, () => Props][] = [];
  for (let i = 0; i < n; i += 1) {
    const spec: Props = {};
    const srcRoll = r();
    if (srcRoll < 0.4)
      spec.src = pick([
        "/s.js",
        "https://cdn.example.com/a.js?x=1&y=<2>",
        `/x${str()}.js`,
      ]);
    if (r() < 0.5) spec.id = r() < 0.5 ? "analytics" : str();
    if (r() < 0.4) spec.nonce = r() < 0.5 ? "abc123" : str();
    const content = r();
    if (content < 0.4) spec.dangerouslySetInnerHTML = { __html: str() };
    else if (content < 0.8) spec.children = str();
    if (r() < 0.3) spec.async = true;
    if (r() < 0.2) spec.defer = true;
    if (r() < 0.2) spec.crossOrigin = "anonymous";
    if (r() < 0.2) spec.type = "module";
    if (r() < 0.2) spec["data-x"] = str();
    if (r() < 0.1) spec.onLoad = "fn";
    const frozen = JSON.stringify(spec);
    out.push([
      `generated #${i + 1}`,
      () => {
        const p = JSON.parse(frozen) as Props;
        if (p.onLoad === "fn") p.onLoad = noop;
        return p;
      },
    ]);
  }
  return out;
}

const S2_CASES = [...handCases, ...generatedCases(240)];

// ------------------------------------------------------------------ s2 child

async function s2Child(file: string) {
  const write = process.stdout.write.bind(process.stdout);
  for (const k of ["log", "info", "warn", "error", "debug"] as const) {
    console[k] = () => undefined;
  }
  const done = (payload: unknown) =>
    write(`\n${MARK}${JSON.stringify(payload)}\n`);
  const req = createRequire(join(dirname(file), "oracle-resolver.js"));
  const React = req("react");
  const runtime = req("react/jsx-runtime");
  let devRuntime: Record<string, unknown> | null = null;
  try {
    devRuntime = req("react/jsx-dev-runtime");
  } catch {
    devRuntime = null;
  }
  const created: Record<string, unknown>[] = [];
  const carrierOf = (
    props: Record<string, unknown> | null,
    rest: unknown[]
  ) => {
    const p = props ?? {};
    if (p.dangerouslySetInnerHTML != null) return "dangerouslySetInnerHTML";
    const children =
      rest.length > 0 ? (rest.length === 1 ? rest[0] : rest) : p.children;
    if (typeof children === "string") return "string children";
    if (typeof children === "number") return "number children";
    if (Array.isArray(children)) return "array children";
    if (children == null) return "no content";
    return `other children (${typeof children})`;
  };
  const wrap = (
    fn: (...a: unknown[]) => unknown,
    via: string,
    restAreChildren: boolean
  ) =>
    function (
      this: unknown,
      type: unknown,
      props: Record<string, unknown> | null,
      ...rest: unknown[]
    ) {
      if (typeof type === "string") {
        created.push({
          type,
          via,
          carrier: carrierOf(props, restAreChildren ? rest : []),
          keys: Object.keys(props ?? {}).sort(),
        });
      }
      return fn.call(this, type, props, ...rest);
    };
  React.createElement = wrap(React.createElement, "createElement", true);
  runtime.jsx = wrap(runtime.jsx, "jsx", false);
  runtime.jsxs = wrap(runtime.jsxs, "jsxs", false);
  if (devRuntime)
    devRuntime.jsxDEV = wrap(
      devRuntime.jsxDEV as (...a: unknown[]) => unknown,
      "jsxDEV",
      false
    );
  const { renderToStaticMarkup } = req("react-dom/server");
  let mod: Record<string, unknown>;
  try {
    mod = await import(file);
  } catch (error) {
    done({
      importError: String((error as Error)?.message ?? error).slice(0, 300),
    });
    return;
  }
  const Component = mod.BeforeInteractiveScript;
  if (typeof Component !== "function") {
    done({ exportMissing: "BeforeInteractiveScript" });
    return;
  }
  const results = [];
  for (const [name, make] of S2_CASES) {
    created.length = 0;
    try {
      const html = renderToStaticMarkup(React.createElement(Component, make()));
      results.push({
        name,
        html,
        elements: created
          .filter((e) => e.type !== Component)
          .map((e) => ({ ...e })),
      });
    } catch (error) {
      results.push({
        name,
        error: String((error as Error)?.message ?? error).slice(0, 200),
        elements: [],
      });
    }
  }
  done({ results, react: React.version });
}

// ------------------------------------------------------------------ s2 main

interface Rendered {
  name: string;
  html?: string;
  error?: string;
  elements: { type: string; via: string; carrier: string; keys: string[] }[];
}

/** Script elements as an HTML tokenizer finds them: each ends at the first `</script`. */
function analyze(html: string) {
  const scripts: { attrs: string; content: string }[] = [];
  const re = /<script\b([^>]*)>/gi;
  let end = 0;
  for (let m = re.exec(html); m; m = re.exec(html)) {
    const start = m.index + m[0].length;
    const rel = html.slice(start).search(/<\/script/i);
    const content =
      rel === -1 ? html.slice(start) : html.slice(start, start + rel);
    scripts.push({ attrs: m[1], content });
    const close = rel === -1 ? html.length : start + rel;
    const closeTag = /^<\/script[^>]*>/i.exec(html.slice(close));
    end = close + (closeTag ? closeTag[0].length : 0);
    re.lastIndex = end;
  }
  const trailing = html.slice(end);
  let payload: string | null = null;
  let payloadError: string | null = null;
  if (scripts[0]) {
    try {
      const ctx: { self: Record<string, unknown> } = { self: {} };
      vm.runInNewContext(scripts[0].content, ctx, { timeout: 1000 });
      payload = JSON.stringify(ctx.self.__next_s ?? null);
    } catch (error) {
      payloadError = String((error as Error)?.message ?? error).slice(0, 120);
    }
  }
  const content = scripts[0]?.content ?? "";
  return {
    scriptCount: scripts.length,
    attrs: scripts[0]?.attrs ?? null,
    emptyContent: content.length === 0,
    payload,
    payloadError,
    // Markup after the first script element ends: a breakout.
    trailing: trailing.slice(0, 120),
    // "<!--" then "<script" inside a script body puts the HTML tokenizer in the double-escaped
    // state, where the real closing tag no longer ends the element.
    doubleEscapeRisk: /<!--/.test(content) && /<script/i.test(content),
  };
}

function s2Main(reference: string, candidate: string) {
  const ref = spawnChild(["s2", reference], reference, 120_000);
  if (!ref.payload?.results)
    return {
      ok: false,
      harnessError: `reference: ${JSON.stringify(ref).slice(0, 400)}`,
    };
  const cand = spawnChild(["s2", candidate], candidate, 120_000);
  if (!cand.payload)
    return { ok: false, subject: "s2", harnessError: cand.error };
  if (!cand.payload.results)
    return { ok: false, subject: "s2", ...cand.payload };
  const refs: Rendered[] = ref.payload.results;
  const cands: Rendered[] = cand.payload.results;
  let bytesEqual = 0;
  let semanticEqual = 0;
  let renderErrors = 0;
  let emptyScripts = 0;
  let breakouts = 0;
  let doubleEscape = 0;
  let referenceBreakouts = 0;
  let payloadBroken = 0;
  const mismatches = [];
  const semanticMismatches = [];
  for (let i = 0; i < refs.length; i += 1) {
    const r = refs[i];
    const c = cands[i];
    const ra = analyze(r.html ?? "");
    if (ra.trailing || ra.scriptCount !== 1) referenceBreakouts += 1;
    if (c.error !== undefined) {
      renderErrors += 1;
      mismatches.push({
        case: r.name,
        reference: r.html?.slice(0, 300),
        candidateError: c.error,
      });
      continue;
    }
    const ca = analyze(c.html ?? "");
    const same = r.html === c.html;
    if (same) bytesEqual += 1;
    const semantic =
      ca.scriptCount === ra.scriptCount &&
      ca.attrs === ra.attrs &&
      ca.payload === ra.payload &&
      !ca.trailing;
    if (semantic) semanticEqual += 1;
    if (ca.emptyContent && !ra.emptyContent) emptyScripts += 1;
    if (ca.trailing || ca.scriptCount > ra.scriptCount) breakouts += 1;
    if (ca.doubleEscapeRisk) doubleEscape += 1;
    if (ca.payload !== ra.payload) payloadBroken += 1;
    if (!same && mismatches.length < 6) {
      mismatches.push({
        case: r.name,
        reference: r.html?.slice(0, 300),
        candidate: c.html?.slice(0, 300),
      });
    }
    if (!semantic && semanticMismatches.length < 6) {
      semanticMismatches.push({
        case: r.name,
        reference: { attrs: ra.attrs, payload: ra.payload?.slice(0, 200) },
        candidate: {
          attrs: ca.attrs,
          payload: ca.payload?.slice(0, 200),
          payloadError: ca.payloadError,
          trailing: ca.trailing,
          scriptCount: ca.scriptCount,
        },
      });
    }
  }
  const carriers = (rs: Rendered[]) => {
    const out: Record<string, { via: string; carrier: string; cases: number }> =
      {};
    for (const r of rs) {
      for (const e of r.elements.filter((x) => x.type === "script")) {
        const k = `${e.carrier} via ${e.via}`;
        out[k] ??= { via: e.via, carrier: e.carrier, cases: 0 };
        out[k].cases += 1;
      }
    }
    return Object.values(out);
  };
  return {
    ok: bytesEqual === refs.length,
    strictOk: bytesEqual === refs.length,
    semanticOk: semanticEqual === refs.length,
    subject: "s2",
    react: cand.payload.react,
    cases: refs.length,
    bytesEqual,
    semanticEqual,
    renderErrors,
    emptyScripts,
    payloadBroken,
    xss: {
      candidateBreakouts: breakouts,
      candidateDoubleEscapeRisk: doubleEscape,
      referenceBreakouts,
    },
    firstMismatches: mismatches,
    firstSemanticMismatches: semanticMismatches,
    elements: { reference: carriers(refs), candidate: carriers(cands) },
  };
}

// ------------------------------------------------------------------ entry

const argv = process.argv.slice(2);
if (argv[0] === "--child") {
  const [, subject, file, tier, only] = argv;
  if (subject === "s1") await s1Child(file, tier, only ?? null);
  else await s2Child(file);
} else {
  const [subject, reference, candidate] = argv;
  const out =
    subject === "s1"
      ? s1Main(reference, candidate)
      : s2Main(reference, candidate);
  process.stdout.write(`${JSON.stringify(out)}\n`);
}
