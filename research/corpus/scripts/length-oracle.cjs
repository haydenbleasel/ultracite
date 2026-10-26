// The behaviour oracle for the length-limits subjects (examples/length-limits/): transpiles a file
// (the subject or an edit of it) with TypeScript, runs it in a fresh Node process against
// generated scenarios, and returns a trace; `compare` turns two traces into a verdict. It also
// measures what an edit costs a reader (`structure`): the functions and lines afterwards, the
// helpers it added, their parameters, how many places call each, and whether the helpers appear
// in the order the entry function calls them.
//
//   a  Vite's clientInjectionsPlugin, through its public API: buildStart(), then transform() on the
//      client entry (with a query), the env entry, an ordinary module and a server module, for 400
//      configs drawn from every option the replacer reads, with `$` patterns in the values and
//      repeated placeholders in the code
//   b  Next.js's executeRevalidates() and withExecuteRevalidates(), for 300 lists of tags and
//      profiles (strings, equal and unequal objects, undefined, '', an unknown name, a profile
//      without expire), 0-2 handlers (one without updateTags), with and without an incremental
//      cache; the trace is every updateTags and revalidateTag call in order, with its arguments
//      (an omitted argument and an explicit undefined are told apart), and the outcome
//   c  VS Code's guessIndentation() on 120 generated texts (spaces, tabs, mixed, alignment lines,
//      lists, whitespace-only lines, a line over 65,536 characters, 10,050 lines) and 200 real files
//      from the corpus clones (read as text, never run), each with tab size 2, 4 and 8 and
//      insertSpaces true and false
//
// Nothing from a clone runs: the subjects are this repo's copies, and the corpus files are inputs.
"use strict";

const { createHash } = require("node:crypto");
const { mkdirSync, readFileSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");
const { pathToFileURL } = require("node:url");

const lib = require("./length-lib.cjs");
const tools = require("./tools.cjs");

const ts = require(join(tools.dirs.typescript, "lib/typescript.js"));
const WORK = join(lib.TMP, "oracle");
const SEED = 20261027;

// ── scenarios ──────────────────────────────────────────────────────────
const pickOne = (random, xs) => xs[Math.floor(random() * xs.length)];
const scenariosA = () => {
  const random = lib.rng(SEED);
  const hosts = [undefined, true, false, "0.0.0.0", "example.test", "::"];
  const ports = [5173, 3000];
  const bases = ["/", "/app/", "/$&/"];
  const wss = [
    undefined,
    false,
    {},
    {
      clientPort: 443,
      host: "ws.test",
      path: "hmr",
      protocol: "wss",
      timeout: 5000,
    },
    { port: 24679 },
    { server: {} },
    { clientPort: 0, port: 0 },
    { path: "/nested/path/" },
    { host: "h$'x" },
  ];
  const hmrs = [undefined, false, true, { overlay: false }, { overlay: true }];
  const configFiles = [undefined, "/x/vite.config.ts", "/x/my$'config.mjs", ""];
  const modes = ["development", "a$&b", "production"];
  const tokens = ["tok", "t$'k", "$$"];
  const forward = [undefined, false, { unhandledErrors: true }, "$&"];
  const defines = [{}, { __X__: "1", "import.meta.env.FOO": '"x"', N: 2 }];
  const out = [];
  for (let i = 0; i < 400; i++) {
    out.push({
      config: {
        base: pickOne(random, bases),
        configFile: pickOne(random, configFiles),
        experimental: { hmrPartialAccept: random() < 0.5 },
        mode: pickOne(random, modes),
        server: {
          forwardConsole: pickOne(random, forward),
          hmr: pickOne(random, hmrs),
          host: pickOne(random, hosts),
          middlewareMode: random() < 0.4,
          port: pickOne(random, ports),
          ws: pickOne(random, wss),
        },
        webSocketToken: pickOne(random, tokens),
      },
      define: pickOne(random, defines),
      id: `a${i}`,
    });
  }
  const placeholders = [
    "__MODE__",
    "__BASE__",
    "__SERVER_HOST__",
    "__HMR_PROTOCOL__",
    "__HMR_HOSTNAME__",
    "__HMR_PORT__",
    "__HMR_DIRECT_TARGET__",
    "__HMR_BASE__",
    "__HMR_TIMEOUT__",
    "__HMR_ENABLE_OVERLAY__",
    "__HMR_CONFIG_NAME__",
    "__HMR_PARTIAL_ACCEPT__",
    "__WS_TOKEN__",
    "__SERVER_FORWARD_CONSOLE__",
  ];
  // every placeholder twice (only __BASE__ is replaced everywhere), and the defines
  const template = [
    ...placeholders.map((p, i) => `const first${i} = ${p};`),
    ...placeholders.map((p, i) => `const second${i} = ${p};`),
    "const defines = __DEFINES__;",
    "const defines2 = __DEFINES__;",
  ].join("\n");
  // and the way Vite's client has them: each placeholder once
  const templateOnce = [
    ...placeholders.map((p, i) => `const once${i} = ${p};`),
    "const defines = __DEFINES__;",
  ].join("\n");
  return { scenarios: out, template, templateOnce };
};

const scenariosB = () => {
  const random = lib.rng(SEED + 1);
  const profiles = {
    max: { expire: 4294967294, revalidate: 900, stale: 300 },
    nos: { stale: 1 },
    short: { expire: 60, revalidate: 30, stale: 10 },
  };
  const profileChoices = [
    () => undefined,
    () => "max",
    () => "short",
    () => "nos",
    () => ({ expire: 10 }),
    () => ({ expire: 10 }),
    () => ({ expire: 10, stale: 5 }),
    () => ({ stale: 5, expire: 10 }),
    () => "",
    () => "unknown",
  ];
  const out = [];
  for (let i = 0; i < 300; i++) {
    const n = Math.floor(random() * 6);
    const tags = [];
    for (let k = 0; k < n; k++) {
      const choice = Math.floor(random() * profileChoices.length);
      // the unknown name is rare, so most lists resolve
      if (choice === 9 && random() < 0.6) {
        continue;
      }
      tags.push({
        profile: profileChoices[choice](),
        revalidatedAt: k,
        tag: `t${Math.floor(random() * 4)}`,
      });
    }
    out.push({
      handlers: pickOne(random, [
        null,
        [],
        [{}],
        [{}, {}],
        [{}, { noUpdate: true }],
      ]),
      id: `b${i}`,
      incrementalCache: random() < 0.6,
      pendingRevalidates: random() < 0.3,
      pendingWrites: random() < 0.3,
      profiles,
      rejectHandler: random() < 0.05,
      tags,
      viaWith: random() < 0.25,
    });
  }
  return { scenarios: out };
};

const scenariosC = () => {
  const random = lib.rng(SEED + 2);
  const texts = [];
  const indentUnits = ["  ", "    ", "        ", "\t", "   "];
  const shapes = [
    // nested blocks
    (u) =>
      [
        "function f() {",
        `${u}if (a) {`,
        `${u}${u}b();`,
        `${u}}`,
        `${u}return 1;`,
        "}",
      ].join("\n"),
    // alignment
    (u) =>
      [
        "const a = b + c,",
        "      d = b - c;",
        "function g() {",
        `${u}const x = 1,`,
        `${u}      y = 2;`,
        `${u}return x;`,
        "}",
      ].join("\n"),
    // markdown-ish list
    (u) => ["- item1", `${u}- item2`, `${u}${u}- item3`, "- item4"].join("\n"),
    // whitespace-only and blank lines
    (u) => ["a", `${u}b`, `${u}`, "", `${u}${u}c`, "   ", "d"].join("\n"),
    // mixed tabs and spaces
    (u) => ["x", `\t${u}y`, `${u}\tz`, "\t\tw", `${u}${u}v`].join("\n"),
    // whitespace-only lines of the other kind than the indentation
    (u) => ["x", `${u}y`, `${u}z`, "\t", "\t", "\t", " \t"].join("\n"),
    (u) => ["x", `\t${u}y`, "\tz", "    ", "    ", "    "].join("\n"),
    // yaml-like with deeper 4-space diffs
    (u) =>
      [
        "a:",
        `${u}b:`,
        `${u}${u}c: 1`,
        `${u}${u}${u}${u}d: 2`,
        `${u}e: 3`,
        "f: 4",
      ].join("\n"),
  ];
  for (const u of indentUnits) {
    for (const shape of shapes) {
      for (let rep = 1; rep <= 3; rep++) {
        texts.push(Array.from({ length: rep }, () => shape(u)).join("\n"));
      }
    }
  }
  // a line over 65,536 characters, read through getLineCharCode
  texts.push(["a", `  ${"x".repeat(70_000)}`, "    b", "  c"].join("\n"));
  texts.push(["a", `\t${" ".repeat(66_000)}y`, "\tb"].join("\n"));
  // over 10,000 lines: only the first 10,000 count
  texts.push(
    [
      ...Array.from({ length: 10_000 }, (_, i) => (i % 2 ? "    x" : "y")),
      ...Array.from({ length: 50 }, () => "\tz"),
    ].join("\n")
  );
  // real files from the corpus (data only)
  const files = [];
  for (const name of lib.ALL) {
    const root = lib.getRepo(name).root;
    for (const { rel } of lib.filesOf(name)) {
      files.push(join(root, rel));
    }
  }
  const picked = lib.shuffle(files, random).slice(0, 200);
  for (const f of picked) {
    texts.push(readFileSync(f, "utf8"));
  }
  return { picked: picked.map((f) => f.replace(`${lib.HERE}/`, "")), texts };
};

// ── drivers ────────────────────────────────────────────────────────────
const DRIVERS = {
  a: `
import { readFileSync } from "node:fs";
const [moduleUrl, inputPath] = process.argv.slice(2);
const input = JSON.parse(readFileSync(inputPath, "utf8"));
const out = [];
let mod;
try { mod = await import(moduleUrl); } catch (e) { console.log(JSON.stringify({ loadError: String(e && e.message) })); process.exit(0); }
for (const sc of input.scenarios) {
  try {
    const plugin = mod.clientInjectionsPlugin(sc.config);
    const r = {};
    r.apply = [plugin.applyToEnvironment?.({ config: { isBundled: false } }), plugin.applyToEnvironment?.({ config: { isBundled: true } })];
    await plugin.buildStart();
    const ctx = { environment: { config: { consumer: "client", define: sc.define } } };
    r.client = plugin.transform.call(ctx, input.template, "/vite/dist/client/client.mjs?v=1");
    r.clientOnce = plugin.transform.call(ctx, input.templateOnce, "/vite/dist/client/client.mjs");
    r.env = plugin.transform.call(ctx, input.template, "/vite/dist/client/env.mjs");
    r.other = plugin.transform.call(ctx, "if (process.env.NODE_ENV) {}", "/src/main.ts");
    r.ssr = plugin.transform.call({ environment: { config: { consumer: "server", define: {} } } }, "process.env.NODE_ENV", "/src/a.ts") ?? null;
    out.push({ id: sc.id, ok: r });
  } catch (e) {
    out.push({ id: sc.id, error: String(e && e.message) });
  }
}
console.log(JSON.stringify({ out }));
`,
  b: `
import { readFileSync } from "node:fs";
const [moduleUrl, inputPath] = process.argv.slice(2);
const input = JSON.parse(readFileSync(inputPath, "utf8"));
const out = [];
let mod;
try { mod = await import(moduleUrl); } catch (e) { console.log(JSON.stringify({ loadError: String(e && e.message) })); process.exit(0); }
const show = (args) => args.length < 2 ? "absent" : args[1] === undefined ? "undefined" : JSON.stringify(args[1]);
for (const sc of input.scenarios) {
  const log = [];
  globalThis.__cacheHandlers = sc.handlers === null ? undefined : sc.handlers.map((h, i) =>
    h.noUpdate ? {} : {
      updateTags(...args) {
        log.push(["handler" + i, [...args[0]], show(args)]);
        return sc.rejectHandler && i === 0 ? Promise.reject(new Error("handler failed")) : Promise.resolve();
      },
    });
  const incrementalCache = sc.incrementalCache ? {
    revalidateTag(...args) { log.push(["incrementalCache", Array.isArray(args[0]) ? [...args[0]] : args[0], show(args)]); return Promise.resolve(); },
  } : undefined;
  const store = {
    cacheLifeProfiles: sc.profiles,
    incrementalCache,
    pendingRevalidatedTags: sc.viaWith ? [] : sc.tags.map((t) => ({ ...t })),
    pendingRevalidateWrites: sc.pendingWrites ? [Promise.resolve()] : undefined,
    pendingRevalidates: sc.pendingRevalidates ? { a: Promise.resolve(1) } : undefined,
  };
  let outcome;
  try {
    if (sc.viaWith) {
      const value = await mod.withExecuteRevalidates(store, async () => {
        store.pendingRevalidatedTags.push(...sc.tags.map((t) => ({ ...t })));
        return "done";
      });
      outcome = "resolved " + value;
    } else {
      const r = mod.executeRevalidates(store);
      outcome = r === false ? "false" : await r.then(() => "resolved", (e) => "rejected: " + e.message);
    }
  } catch (e) {
    outcome = "threw: " + (e && e.message);
  }
  out.push({ id: sc.id, log, outcome });
}
console.log(JSON.stringify({ out }));
`,
  c: `
import { readFileSync } from "node:fs";
const [moduleUrl, inputPath] = process.argv.slice(2);
const input = JSON.parse(readFileSync(inputPath, "utf8"));
const out = [];
let mod;
try { mod = await import(moduleUrl); } catch (e) { console.log(JSON.stringify({ loadError: String(e && e.message) })); process.exit(0); }
input.texts.forEach((text, t) => {
  const lines = text.split(/\\r\\n|\\r|\\n/);
  const buffer = {
    getLineCount: () => lines.length,
    getLineLength: (n) => lines[n - 1].length,
    getLineContent: (n) => lines[n - 1],
    getLineCharCode: (n, i) => lines[n - 1].charCodeAt(i),
  };
  for (const tabSize of [2, 4, 8]) {
    for (const insertSpaces of [true, false]) {
      try {
        const r = mod.guessIndentation(buffer, tabSize, insertSpaces);
        out.push({ id: "t" + t + ":" + tabSize + ":" + insertSpaces, ok: { insertSpaces: r.insertSpaces, tabSize: r.tabSize } });
      } catch (e) {
        out.push({ id: "t" + t + ":" + tabSize + ":" + insertSpaces, error: String(e && e.message) });
      }
    }
  }
});
console.log(JSON.stringify({ out }));
`,
};

let inputs = null;
const inputFile = (subject) => {
  inputs ??= {};
  if (!inputs[subject]) {
    mkdirSync(WORK, { recursive: true });
    const data =
      subject === "a"
        ? scenariosA()
        : subject === "b"
          ? scenariosB()
          : scenariosC();
    const file = join(WORK, `input-${subject}.json`);
    writeFileSync(file, JSON.stringify(data));
    inputs[subject] = { data, file };
  }
  return inputs[subject];
};

const transpile = (text) =>
  ts.transpileModule(text, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      verbatimModuleSyntax: false,
    },
    reportDiagnostics: false,
  }).outputText;

// Runs one file for one subject. Returns { trace: [...], loadError?, stderr }.
const run = (subject, text) => {
  mkdirSync(WORK, { recursive: true });
  const js = transpile(text);
  const hash = createHash("sha1")
    .update(subject + js)
    .digest("hex")
    .slice(0, 12);
  const moduleFile = join(WORK, `${subject}-${hash}.mjs`);
  writeFileSync(moduleFile, js);
  const driver = join(WORK, `driver-${subject}.mjs`);
  writeFileSync(driver, DRIVERS[subject]);
  const env = { ...process.env };
  delete env.NODE_ENV;
  const r = lib.spawnSync(
    process.execPath,
    [driver, pathToFileURL(moduleFile).href, inputFile(subject).file],
    { encoding: "utf8", env, maxBuffer: 1 << 30, timeout: 300_000 }
  );
  const start = r.stdout.indexOf("{");
  if (start === -1) {
    return { loadError: `no output: ${r.stderr.slice(0, 500)}`, trace: [] };
  }
  const parsed = JSON.parse(r.stdout.slice(start));
  return {
    loadError: parsed.loadError ?? null,
    stderr: r.stderr.slice(0, 500),
    trace: parsed.out ?? [],
  };
};

// A verdict for `edited` against `original`: same, same except argument arity (b), or changed.
const compare = (original, edited) => {
  if (edited.loadError) {
    return { differences: [], verdict: "does not load", why: edited.loadError };
  }
  const byId = new Map(edited.trace.map((x) => [x.id, x]));
  const differences = [];
  let arityOnly = 0;
  for (const o of original.trace) {
    const e = byId.get(o.id);
    const a = JSON.stringify(o);
    const b = JSON.stringify(e ?? null);
    if (a === b) {
      continue;
    }
    // an explicit undefined where the original omitted the argument (or the reverse)
    const norm = (x) =>
      JSON.stringify(x ?? null).replaceAll('"absent"', '"undefined"');
    if (norm(o) === norm(e)) {
      arityOnly++;
      continue;
    }
    differences.push({ edited: e ?? null, id: o.id, original: o });
  }
  const crashed = edited.trace.filter((x) => x.error).length;
  // subject a: scenarios whose output differs on code with each placeholder once
  const onceDiffering = original.trace.filter((o) => {
    const e = byId.get(o.id);
    return (
      o.ok?.clientOnce !== undefined && o.ok.clientOnce !== e?.ok?.clientOnce
    );
  }).length;
  return {
    arityOnly,
    crashed,
    differences: differences.slice(0, 5),
    differing: differences.length,
    onceDiffering,
    scenarios: original.trace.length,
    verdict:
      differences.length === 0
        ? arityOnly
          ? "same except argument arity"
          : "same"
        : crashed > original.trace.filter((x) => x.error).length
          ? "crashes"
          : "changed",
  };
};

// ── what an edit costs a reader ────────────────────────────────────────
const tsEstree = lib.sk.tsEstree;
const structure = (text, rel, entry, originalText) => {
  const m = lib.measure(text, rel);
  if (m.error) {
    return { error: m.error };
  }
  const orig = lib.measure(originalText, rel);
  const origNames = new Set(orig.functions.map((f) => f.name));
  // named functions declared in the file (declarations and const arrows/functions)
  const ast = tsEstree.parse(text, { jsx: false, loc: true, range: true });
  const declared = new Map();
  const calls = [];
  lib.sk.walk(ast, (n) => {
    if (n.type === "FunctionDeclaration" && n.id) {
      declared.set(n.id.name, n);
    }
    if (
      n.type === "VariableDeclarator" &&
      n.id.type === "Identifier" &&
      (n.init?.type === "ArrowFunctionExpression" ||
        n.init?.type === "FunctionExpression")
    ) {
      declared.set(n.id.name, n.init);
    }
    if (n.type === "CallExpression" && n.callee.type === "Identifier") {
      calls.push({ name: n.callee.name, offset: n.range[0] });
    }
  });
  calls.sort((x, y) => x.offset - y.offset);
  const fns = m.functions.filter((f) => f.depth === 0 || declared.has(f.name));
  const helpers = [...declared.keys()].filter((n) => !origNames.has(n));
  const entryFn = m.functions.find((f) => f.name === entry);
  const helperRows = helpers.map((name) => {
    const f = m.functions.find((x) => x.name === name);
    const sites = calls.filter((c) => c.name === name);
    return {
      callSites: sites.length,
      lines: f?.lines ?? null,
      name,
      params: f?.paramsEslint ?? null,
      statements: f?.statements ?? null,
    };
  });
  // the order the entry calls the helpers in, against the order they appear in the file
  const callOrder = entryFn
    ? [
        ...new Set(
          calls
            .filter(
              (c) =>
                helpers.includes(c.name) &&
                c.offset >= entryFn.range[0] &&
                c.offset < entryFn.range[1]
            )
            .map((c) => c.name)
        ),
      ]
    : [];
  const defOrder = [...declared.entries()]
    .filter(([n]) => callOrder.includes(n))
    .sort((a, b) => a[1].range[0] - b[1].range[0])
    .map(([n]) => n);
  return {
    entry: entryFn
      ? {
          cognitive: entryFn.cognitive,
          lines: entryFn.lines,
          params: entryFn.paramsEslint,
          statements: entryFn.statements,
        }
      : null,
    fileLines: text.split("\n").length,
    functions: m.functions.length,
    functionsBefore: orig.functions.length,
    helperCallsFromEntry: callOrder.length,
    helpers: helperRows,
    helpersCalledOnce: helperRows.filter((h) => h.callSites === 1).length,
    // helpers defined in the order the entry calls them, all above or all below it
    helpersInCallOrder: callOrder.join(",") === defOrder.join(","),
    paramsPassedToHelpers: helperRows.reduce((s, h) => s + (h.params ?? 0), 0),
    topLevelFunctions: fns.filter((f) => f.depth === 0).length,
  };
};

module.exports = {
  compare,
  inputFile,
  run,
  scenariosA,
  scenariosB,
  scenariosC,
  structure,
  transpile,
};
