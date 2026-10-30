// The behaviour oracle for the three func-style subjects (examples/func-style/).
//
// trace(id, text) transpiles the subject (and its stub module) with ts.transpileModule, writes the
// JavaScript to a fresh directory under TMP, imports it in a fresh Node process and runs the
// subject's scenarios through its exports. The trace records, in order:
//   import      whether importing the module throws (a temporal dead zone crash at load time
//               shows up here) and the module's export names and their types
//   calls       every scenario's result, or the error it throws (name and message)
//   hooks       subject B: every call of a field's settingHref, with its argument
// verdict(reference, trace) compares two traces: "same", "import-crash", "exports-changed" or
// "changed" (with the first scenario that differs).
//
// Scenarios (seeded, so every run is the same):
//   A  durationToString on each threshold, just above and below it, fractions, zero, negatives,
//      NaN and the infinities, plus 300 random values; durationToStringWithNanoseconds is not
//      exported and is reached through hrtimeBigIntDurationToString on bigints of every
//      magnitude; hrtimeToSeconds and hrtimeDurationToString on tuples
//   B  300 random field lists (sections, registry and unknown config paths, nested paths, every
//      kind of value the formatter distinguishes) through the three exports, each with its own
//      project ref
//   C  300 random props objects (dates, regular expressions, maps, sets, bigints, URLs, typed
//      arrays, infinities, undefined, nested objects and arrays, shared references) through
//      serializeProps with and without metadata, plus cycles (which throw), null, an array and
//      primitive props
//
// The subjects are this repo's own copies; nothing from a clone runs.
//
// Usage (self-check): node research/corpus/scripts/func-style-oracle.cjs
"use strict";

const { mkdirSync, readFileSync, rmSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");
const { pathToFileURL } = require("node:url");

const lib = require("./func-style-lib.cjs");

const ts = lib.dc.ts;
const SUBJECTS = {
  a: { file: "func-style-a-next-duration-to-string.ts", stubs: null },
  b: {
    file: "func-style-b-supabase-config-drift-utils.ts",
    stubs: "func-style-b-stubs.ts",
  },
  c: {
    file: "func-style-c-astro-serialize.ts",
    stubs: "func-style-c-stubs.ts",
  },
};
const WORK = join(lib.TMP, "oracle");

const transpile = (text, fileName) =>
  ts
    .transpileModule(text, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
      fileName,
    })
    .outputText.replace(
      /from "\.\/(func-style-[bc]-stubs)"/g,
      'from "./$1.mjs"'
    );

// The scenario drivers run inside the child process; they're plain JavaScript strings.
const DRIVERS = {
  a: `
const rng = (seed) => () => { seed = (seed + 0x6d2b79f5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const r = rng(11);
const seconds = [0, 0.0004, 0.001, 0.5, 1, 1.999, 2, 2.0001, 2.05, 2.95, 10, 39.99, 40, 40.01, 59.5, 119.9, 120, 120.01, 150, 3600, 86400, -1, -150, NaN, Infinity, -Infinity, 1e-9, Number.MAX_VALUE];
for (let i = 0; i < 300; i++) seconds.push(Math.round(r() * 300000) / 1000);
for (const s of seconds) call("durationToString", [s]);
const big = [0n, 1n, 999n, 999_999n, 1_000_000n, 1_499_999n, 1_999_999n, 2_000_000n, 2_000_001n, 250_000_000n, 1_999_999_999n, 2_000_000_000n, 2_050_000_000n, 39_999_999_999n, 40_000_000_000n, 119_999_999_999n, 120_000_000_000n, 150_000_000_000n, 3_600_000_000_000n, -5n, 10n ** 20n];
for (let i = 0; i < 300; i++) big.push(BigInt(Math.floor(r() * 2 ** 40)) * BigInt(1 + Math.floor(r() * 300)));
for (const b of big) call("hrtimeBigIntDurationToString", [b]);
const tuples = [[0, 0], [0, 1], [1, 999_999_999], [2, 0], [40, 5], [119, 999_999_999], [120, 0], [3600, 1]];
for (let i = 0; i < 100; i++) tuples.push([Math.floor(r() * 400), Math.floor(r() * 1e9)]);
for (const t of tuples) { call("hrtimeToSeconds", [t]); call("hrtimeDurationToString", [t]); }
`,
  b: `
const rng = (seed) => () => { seed = (seed + 0x6d2b79f5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const r = rng(23);
const pick = (xs) => xs[Math.floor(r() * xs.length)];
const SECTIONS = ["api", "auth", "db", "storage", "compute", "experimental"];
const PATHS = ["api.max_rows", "auth.jwt_expiry", "db.pooler.default_pool_size", "storage.file_size_limit", "auth.external.github.enabled", "db.major_version", "experimental.orioledb_version", "compute", "api.extraSearchPath", "storage.analytics.maxNamespaces"];
const VALUES = () => pick([undefined, null, "", "x", "Not set", "  ", true, false, 0, -1, 12.5, NaN, [], ["a", "b"], [1, { a: 1 }], [""], [null], { a: 1 }, { nested: { deep: [1, 2] } }, () => 1, Symbol("s"), 10n ** 3n]);
const field = (kind) => {
  const f = { section: pick(SECTIONS), configPath: pick(PATHS) };
  if (kind === "drift") { f.dashboardValue = VALUES(); f.githubValue = VALUES(); const id = Math.floor(r() * 1000); f.settingHref = (ref) => { hook("settingHref", [id, ref]); return "/project/" + ref + "/f/" + id; }; }
  if (kind === "unmanaged") f.dashboardValue = VALUES();
  if (kind === "matched") f.value = VALUES();
  return f;
};
for (let i = 0; i < 300; i++) {
  const n = Math.floor(r() * 6);
  const ref = "ref" + i;
  const kind = pick(["drift", "unmanaged", "matched"]);
  const fields = Array.from({ length: n }, () => field(kind));
  if (kind === "drift") call("createConfigurationDriftRows", [fields, ref]);
  else if (kind === "unmanaged") call("groupUnmanagedConfigFields", [fields]);
  else call("groupMatchedConfigFields", [fields]);
}
`,
  c: `
const rng = (seed) => () => { seed = (seed + 0x6d2b79f5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const r = rng(37);
const pick = (xs) => xs[Math.floor(r() * xs.length)];
const leaf = () => pick([
  () => new Date(Math.floor(r() * 2e12)), () => /a+b/gi, () => 12n ** BigInt(Math.floor(r() * 20)), () => new URL("https://example.com/p?q=" + Math.floor(r() * 99)),
  () => new Uint8Array([1, 2, 255]), () => new Uint16Array([65535]), () => new Uint32Array([1, 2]), () => Infinity, () => -Infinity, () => undefined, () => null,
  () => "s" + Math.floor(r() * 9), () => Math.floor(r() * 100) - 50, () => r() > 0.5, () => NaN, () => 0, () => "",
])();
const value = (depth) => {
  if (depth > 3 || r() < 0.45) return leaf();
  const k = pick(["array", "object", "map", "set"]);
  const n = Math.floor(r() * 4);
  if (k === "array") return Array.from({ length: n }, () => value(depth + 1));
  if (k === "map") return new Map(Array.from({ length: n }, (_, i) => [pick(["k" + i, i, { o: i }]), value(depth + 1)]));
  if (k === "set") return new Set(Array.from({ length: n }, () => value(depth + 1)));
  return Object.fromEntries(Array.from({ length: n }, (_, i) => ["p" + i, value(depth + 1)]));
};
const metas = [undefined, { displayName: "Counter", hydrate: "load" }, { displayName: "Chart", hydrate: "visible", astroStaticSlot: true }];
for (let i = 0; i < 300; i++) {
  const props = Object.fromEntries(Array.from({ length: Math.floor(r() * 5) }, (_, j) => ["prop" + j, value(0)]));
  if (r() < 0.2) { const shared = { s: 1 }; props.a = shared; props.b = [shared, shared]; }
  call("serializeProps", [props, pick(metas)]);
}
const cyc = { name: "c" }; cyc.self = cyc;
const cycArr = [1]; cycArr.push(cycArr);
const cycMap = new Map(); cycMap.set("m", cycMap);
for (const m of metas) {
  call("serializeProps", [{ cyc }, m]);
  call("serializeProps", [{ list: cycArr }, m]);
  call("serializeProps", [{ map: cycMap }, m]);
}
for (const p of [null, undefined, [1, 2], "str", 5, {}, { a: undefined }, { d: new Date(0) }, { n: [Infinity, -Infinity, NaN] }]) call("serializeProps", [p]);
`,
};

const PRELUDE = (subjectUrl, exportsToCall) => `
const out = { calls: [], hooks: [], import: null };
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
const hook = (name, args) => out.hooks.push({ name, args: enc(args) });
globalThis.__hook = hook;
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
if (mod) {
`;
const POSTLUDE = `
}
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
  if (s.stubs) {
    writeFileSync(
      join(dir, s.stubs.replace(/\.ts$/, ".mjs")),
      transpile(readFileSync(join(lib.EXAMPLES_DIR, s.stubs), "utf8"), s.stubs)
    );
  }
  const driver = join(dir, "driver.mjs");
  writeFileSync(
    driver,
    `${PRELUDE(pathToFileURL(subjectJs).href)}${DRIVERS[id].replaceAll("hook(", "__hook(")}${POSTLUDE}`
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
    return { error: (r.stderr || r.stdout || "no output").slice(0, 500) };
  }
};
const verdict = (reference, t) => {
  if (t.error) {
    return { detail: t.error, verdict: "oracle-error" };
  }
  if (!t.import.ok) {
    return { detail: t.import.error, verdict: "import-crash" };
  }
  if (
    JSON.stringify(t.import.exports) !==
    JSON.stringify(reference.import.exports)
  ) {
    return {
      detail: { after: t.import.exports, before: reference.import.exports },
      verdict: "exports-changed",
    };
  }
  for (let i = 0; i < reference.calls.length; i++) {
    if (JSON.stringify(reference.calls[i]) !== JSON.stringify(t.calls[i])) {
      return {
        detail: { after: t.calls[i], before: reference.calls[i], index: i },
        differing: reference.calls.filter(
          (c, k) => JSON.stringify(c) !== JSON.stringify(t.calls[k])
        ).length,
        verdict: "changed",
      };
    }
  }
  if (JSON.stringify(reference.hooks) !== JSON.stringify(t.hooks)) {
    return { detail: "settingHref calls differ", verdict: "changed" };
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
    const v = verdict(t, trace(id, text));
    console.log(
      `${id}: import ${t.import?.ok}, ${t.calls?.length} calls, ${t.calls?.filter((c) => c.threw).length} throw, hooks ${t.hooks?.length}; deterministic: ${v.verdict}`
    );
  }
}
