// The behaviour oracle for the three nested-ternaries subjects (examples/nested-ternaries/).
//
// trace(id, text) transpiles the subject and its stub module with ts.transpileModule (JSX through a
// stub createElement), writes the JavaScript to a fresh directory under TMP, imports it in a fresh
// Node process and runs the subject's scenarios through its exports. The trace records, in order:
//   import   whether importing the module throws, and its export names and their types
//   calls    every scenario's result, or the error it throws (name and message)
//   hooks    subject B: the hooks each render called, in order
// verdict(reference, trace) compares two traces: "same", "import-crash", "exports-changed" or
// "changed" (with the first scenario that differs and how many differ).
//
// Scenarios (seeded, so every run is the same):
//   A  denormalizePagePath on the documented examples, the edge cases (`/index/`, dynamic segments,
//      backslashes, the empty string, `/indexer`) and 300 random paths built from route segments
//   B  ExplorerNavNotebooks rendered for every combination of pending, five notebook lists (none,
//      no pages, an empty page, one notebook, two pages), two searches, two routes and two
//      next-page states (80 renders). The tree is rendered the way React would show it:
//      components defined in the subject are expanded, the stubs stay leaves with their props,
//      fragments are flattened, and null, undefined, booleans and empty strings are dropped while
//      numbers render as text (so `0 && …` shows). Function props are recorded as "[fn]".
//   C  getConfigAlias for 15 hand-written tsconfigs (several wildcards per key and per target,
//      `$` in paths, several targets per key, baseUrl present or absent, missing tsconfig) and 225
//      random ones; each result is the aliases' regular expressions and replacements, plus what
//      each alias does to sample import ids
//
// The subjects are this repo's own copies; nothing from a clone runs.
//
// Usage (self-check): node research/corpus/scripts/nested-ternaries-oracle.cjs
"use strict";

const { mkdirSync, readFileSync, rmSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");
const { pathToFileURL } = require("node:url");

const lib = require("./nested-ternaries-lib.cjs");

const ts = lib.dc.ts;
const SUBJECTS = {
  a: {
    file: "nested-ternaries-a-next-denormalize-page-path.ts",
    stubs: "nested-ternaries-a-stubs.ts",
  },
  b: {
    file: "nested-ternaries-b-supabase-explorer-nav-notebooks.tsx",
    stubs: "nested-ternaries-b-stubs.tsx",
  },
  c: {
    file: "nested-ternaries-c-astro-config-alias.ts",
    stubs: "nested-ternaries-c-stubs.ts",
  },
};
const WORK = join(lib.TMP, "oracle");

const transpile = (text, fileName) => {
  const js = ts.transpileModule(text, {
    compilerOptions: {
      jsx: ts.JsxEmit.React,
      jsxFactory: "__h",
      jsxFragmentFactory: "__Fragment",
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
    fileName,
  }).outputText;
  const fixed = js.replace(
    /from "\.\/(nested-ternaries-[abc]-stubs)"/g,
    'from "./$1.mjs"'
  );
  return /\.tsx$/.test(fileName)
    ? `const __h = globalThis.__h; const __Fragment = globalThis.__Fragment;\n${fixed}`
    : fixed;
};

const RNG = `const rng = (seed) => () => { seed = (seed + 0x6d2b79f5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };`;
const DRIVERS = {
  a: `
${RNG}
const r = rng(13);
const pick = (xs) => xs[Math.floor(r() * xs.length)];
const pages = ["/index", "/index/", "/index/foo", "/index/index", "/index/index/foo", "/index/[slug]", "/index/[slug]/x", "/index/[...all]", "/", "", "/foo", "/foo/index", "/indexer", "/index-page", "\\\\index\\\\foo", "\\\\index", "/index/(..)foo", "/index/foo/[id]", "index/foo", "//index"];
const SEG = ["index", "foo", "[slug]", "[...rest]", "[[...opt]]", "(group)", "", "bar", "\\\\", "api"];
for (let i = 0; i < 300; i++) {
  const n = 1 + Math.floor(r() * 4);
  pages.push(Array.from({ length: n }, () => pick(SEG)).map((s) => (r() < 0.1 ? s : "/" + s)).join(""));
}
for (const p of pages) call("denormalizePagePath", [p]);
`,
  b: `
const SCEN = [];
const LISTS = [undefined, [], [{ content: [] }], [{ content: [{ id: "n1", name: "First" }] }], [{ content: [{ id: "n1", name: "First" }] }, { content: [{ id: "n2", name: "Second" }, { id: "n3", name: "Third" }] }]];
for (const isPending of [true, false])
  for (const pages of LISTS)
    for (const search of ["", "abc"])
      for (const route of [["/project/[ref]/explorer", undefined], ["/project/[ref]/explorer/notebook/[id]", "n2"]])
        for (const hasNextPage of [false, true])
          SCEN.push({ hasNextPage, id: route[1], isFetchingNextPage: hasNextPage, isPending, pages, pathname: route[0], ref: "proj", search });
const Fragment = globalThis.__Fragment;
const renderNode = (n, depth = 0) => {
  if (depth > 50) return { tooDeep: true };
  if (n === null || n === undefined || typeof n === "boolean" || n === "") return [];
  if (typeof n === "string" || typeof n === "number") return [String(n)];
  if (Array.isArray(n)) return n.flatMap((c) => renderNode(c, depth));
  if (!n.$el) return [{ unknown: String(n) }];
  const { type, props, children } = n;
  const kids = children.length ? children : props.children !== undefined ? [props.children] : [];
  if (type === Fragment) return kids.flatMap((c) => renderNode(c, depth));
  if (typeof type === "function" && !type.__stub) {
    return renderNode(type({ ...props, children: kids.length > 1 ? kids : kids[0] }), depth + 1);
  }
  const shown = {};
  for (const [k, v] of Object.entries(props)) {
    if (k === "children" || k === "key") continue;
    shown[k] = typeof v === "function" ? (v.__stub ? "<" + v.name + ">" : "[fn]") : v;
  }
  return [{ children: kids.flatMap((c) => renderNode(c, depth)), props: shown, type: typeof type === "function" ? "<" + type.name + ">" : type }];
};
for (const s of SCEN) {
  globalThis.__scenario = s;
  globalThis.__calls = [];
  if (!mod || typeof mod.ExplorerNavNotebooks !== "function") { out.calls.push({ name: "ExplorerNavNotebooks", missing: true }); continue; }
  try { out.calls.push({ name: "render", result: enc(renderNode(mod.ExplorerNavNotebooks({}))) }); }
  catch (e) { out.calls.push({ name: "render", threw: String(e && e.name) + ": " + String(e && e.message) }); }
  out.hooks.push([...globalThis.__calls]);
}
`,
  c: `
${RNG}
const r = rng(29);
const pick = (xs) => xs[Math.floor(r() * xs.length)];
const base = (compilerOptions, tsConfigPath = "/proj/tsconfig.json") => ({ tsConfig: compilerOptions === null ? undefined : { compilerOptions }, tsConfigPath });
const cases = [
  base({ paths: { "@/*": ["src/*"] } }),
  base({ baseUrl: ".", paths: { "@/*": ["src/*"] } }),
  base({ baseUrl: "src", paths: { "~/*": ["./*"], "@lib/*": ["lib/*", "vendor/*"] } }),
  base({ paths: { "a/*/b/*": ["x/*/y/*"] } }),
  base({ paths: { "a/*/b/*": ["x/*/y/*", "z/*/*"] } }),
  base({ paths: { "$lib/*": ["src/$lib/*"] } }),
  base({ paths: { "@x": ["src/x/index.ts"] } }),
  base({ paths: { "*": ["types/*", "*"] } }),
  base({ baseUrl: "a$b" }),
  base({ baseUrl: "." }),
  base({ baseUrl: "src" }, "/w$/proj/tsconfig.json"),
  base({}),
  base(null),
  base({ paths: { "@/*": ["src/*"] } }, undefined),
  base({ paths: { "@c/*": ["src/c/*"], "@d/*": ["src/d/*/index"], "@e/*/*": ["e/*/*/*"] } }),
];
for (let i = 0; i < 225; i++) {
  const seg = () => pick(["src", "lib", "*", "$", "a$b", "x", "components", "*.ts", "@", "~"]);
  const p = () => Array.from({ length: 1 + Math.floor(r() * 3) }, seg).join("/");
  const paths = {};
  for (let k = 0; k < 1 + Math.floor(r() * 3); k++) paths[(r() < 0.5 ? "@" : "~") + p()] = Array.from({ length: 1 + Math.floor(r() * 3) }, p);
  cases.push(base(r() < 0.3 ? { baseUrl: pick([".", "src", "a$b"]), paths } : { paths }, pick(["/proj/tsconfig.json", "/p$/tsconfig.json", "/a/b/jsconfig.json"])));
}
const ids = ["@/components/Button", "@lib/util", "~/x", "a/1/b/2", "$lib/store", "@x", "foo", "@c/one", "@d/two", "@e/p/q", "lib/a", "@src/x/y"];
for (const s of cases) {
  if (!mod || typeof mod.getConfigAlias !== "function") { out.calls.push({ name: "getConfigAlias", missing: true }); continue; }
  try {
    const aliases = mod.getConfigAlias(s);
    out.calls.push({ name: "getConfigAlias", result: enc(aliases === null ? null : aliases.map((a) => ({ find: String(a.find), replacement: a.replacement, resolves: ids.filter((id) => a.find.test(id)).map((id) => [id, id.replace(a.find, a.replacement)]) }))) });
  } catch (e) { out.calls.push({ name: "getConfigAlias", threw: String(e && e.name) + ": " + String(e && e.message) }); }
}
`,
};

const PRELUDE = (subjectUrl) => `
const out = { calls: [], hooks: [], import: null };
globalThis.__Fragment = { fragment: true };
globalThis.__h = (type, props, ...children) => ({ $el: true, children, props: props ?? {}, type });
const enc = (v, seen = new WeakSet()) => {
  if (typeof v === "bigint") return { bigint: String(v) };
  if (typeof v === "number" && !Number.isFinite(v)) return { number: String(v) };
  if (typeof v === "function") return { function: v.name };
  if (typeof v === "symbol") return { symbol: String(v) };
  if (v === undefined) return { undefined: true };
  if (v && typeof v === "object") {
    if (seen.has(v)) return { cycle: true };
    seen.add(v);
    if (Array.isArray(v)) return v.map((x) => enc(x, seen));
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, enc(x, seen)]));
  }
  return v;
};
let mod;
try {
  mod = await import(${JSON.stringify(subjectUrl)});
  out.import = { ok: true, exports: Object.keys(mod).sort().map((k) => [k, typeof mod[k]]) };
} catch (e) {
  out.import = { ok: false, error: String(e && e.name) + ": " + String(e && e.message) };
}
const call = (name, args) => {
  if (!mod || typeof mod[name] !== "function") { out.calls.push({ name, missing: true }); return; }
  try { out.calls.push({ name, result: enc(mod[name](...args)) }); }
  catch (e) { out.calls.push({ name, threw: String(e && e.name) + ": " + String(e && e.message) }); }
};
`;
const POSTLUDE = `
process.stdout.write(JSON.stringify(out));
`;

let counter = 0;
const trace = (id, text) => {
  const s = SUBJECTS[id];
  const dir = join(WORK, `${id}-${process.pid}-${counter++}`);
  rmSync(dir, { force: true, recursive: true });
  mkdirSync(dir, { recursive: true });
  const subjectJs = join(dir, "subject.mjs");
  writeFileSync(subjectJs, transpile(text, s.file));
  writeFileSync(
    join(dir, s.stubs.replace(/\.tsx?$/, ".mjs")),
    transpile(readFileSync(join(lib.EXAMPLES_DIR, s.stubs), "utf8"), s.stubs)
  );
  const driver = join(dir, "driver.mjs");
  writeFileSync(
    driver,
    `${PRELUDE(pathToFileURL(subjectJs).href)}${DRIVERS[id]}${POSTLUDE}`
  );
  const r = lib.spawnSync(process.execPath, [driver], {
    cwd: dir,
    encoding: "utf8",
    maxBuffer: 1 << 28,
    timeout: 60_000,
  });
  rmSync(dir, { force: true, recursive: true });
  try {
    return JSON.parse(r.stdout);
  } catch {
    return {
      error: lib.scrub((r.stderr || r.stdout || "no output").slice(0, 500)),
    };
  }
};
const verdict = (reference, t) => {
  if (t.error) {
    return { detail: t.error, verdict: "oracle-error" };
  }
  if (!t.import.ok) {
    return { detail: lib.scrub(t.import.error), verdict: "import-crash" };
  }
  const exp = (x) =>
    x.import.exports.filter(([k]) => k !== "getConfigAlias" || true);
  if (JSON.stringify(exp(t)) !== JSON.stringify(exp(reference))) {
    return {
      detail: { after: t.import.exports, before: reference.import.exports },
      verdict: "exports-changed",
    };
  }
  const differing = reference.calls.filter(
    (c, k) => JSON.stringify(c) !== JSON.stringify(t.calls[k])
  ).length;
  if (differing > 0) {
    const i = reference.calls.findIndex(
      (c, k) => JSON.stringify(c) !== JSON.stringify(t.calls[k])
    );
    return {
      detail: {
        after: JSON.stringify(t.calls[i]).slice(0, 600),
        before: JSON.stringify(reference.calls[i]).slice(0, 600),
        index: i,
      },
      differing,
      of: reference.calls.length,
      verdict: "changed",
    };
  }
  if (JSON.stringify(reference.hooks) !== JSON.stringify(t.hooks)) {
    return { detail: "the hooks called differ", verdict: "hooks-changed" };
  }
  return { calls: t.calls.length, verdict: "same" };
};

module.exports = { SUBJECTS, trace, verdict };

if (require.main === module) {
  for (const id of Object.keys(SUBJECTS)) {
    const text = readFileSync(
      join(lib.EXAMPLES_DIR, SUBJECTS[id].file),
      "utf8"
    );
    const t = trace(id, text);
    if (t.error) {
      console.log(`${id}: ERROR ${t.error}`);
      continue;
    }
    const v = verdict(t, trace(id, text));
    console.log(
      `${id}: import ${t.import?.ok} ${JSON.stringify(t.import?.exports ?? t.import?.error)}, ${t.calls?.length} calls, ${t.calls?.filter((c) => c.threw).length} throw, hooks ${t.hooks?.length}; deterministic: ${v.verdict}`
    );
    console.log(JSON.stringify(t.calls.slice(0, 3)).slice(0, 700));
  }
}
