// The behaviour oracle for the type-imports subjects (examples/type-imports/): which modules
// evaluate, in what order, and what the subject's exports do.
//
// trace(id, text, mode) copies the subject's directory (the subject, the modules it imports and the
// stubs) under TMP, puts `text` in place of the subject, compiles every file with ts.transpileModule
// in the given mode, and runs a driver in a fresh Node process. Every file of the copy records that
// it evaluated: an ESM loader hook (or, for CommonJS, a wrapper around Module.prototype._compile)
// prepends `globalThis.__evaluated.push("<file>")` to its compiled source, so the log is the real
// evaluation order and nothing in the copied modules is edited. The hook also maps the stubbed
// package specifier and extensionless relative specifiers to the compiled files.
//
// Modes:
//   repo      the source repo's own setting: Next.js compiles with verbatimModuleSyntax (A), tRPC's
//             tsdown elides type-only imports (B); C runs as CommonJS, as Next.js's bundler runs its
//             require(), with TypeScript's default elision
//   kept      imports kept as written (verbatimModuleSyntax: what Node's type stripping and
//             onlyRemoveTypeImports do)
//   elided    imports used only as types removed (TypeScript's default, esbuild, Oxc, Bun)
//
// verdict(reference, candidate) compares two traces field by field: "same", "changed" (with the
// fields that differ) or "broken" (the candidate didn't compile or didn't load).
//
// Runs only this repo's copies of the subjects; nothing from a clone runs.
"use strict";

const {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} = require("node:fs");
const { dirname, join, relative } = require("node:path");
const { pathToFileURL } = require("node:url");

const lib = require("./type-imports-lib.cjs");

const { ts } = lib;
const WORK = join(lib.TMP, "oracle");

const SUBJECTS = {
  a: {
    dir: "a-next-flush-telemetry",
    file: "telemetry/flush-telemetry.ts",
    format: "esm",
    modes: {
      elided: { verbatimModuleSyntax: false },
      kept: { verbatimModuleSyntax: true },
      repo: { verbatimModuleSyntax: true },
    },
  },
  b: {
    dir: "b-trpc-client-error",
    file: "TRPCClientError.ts",
    format: "esm",
    map: {
      "@trpc/server/unstable-core-do-not-import":
        "stubs/unstable-core-do-not-import.js",
    },
    modes: {
      elided: { verbatimModuleSyntax: false },
      kept: { verbatimModuleSyntax: true },
      repo: { isolatedModules: true, verbatimModuleSyntax: false },
    },
  },
  // the oracle's own check that it sees decorator metadata (calibration case c06 and its lib
  // modules): not an agent subject
  m: {
    abs: true,
    dir: "calibration",
    file: "cases/c06-decorator-injection.ts",
    format: "esm",
    modes: {
      repo: { emitDecoratorMetadata: true, experimentalDecorators: true },
    },
  },
  c: {
    dir: "c-next-normalize-locale-path",
    file: "client/normalize-locale-path.ts",
    format: "cjs",
    modes: {
      elided: { verbatimModuleSyntax: false },
      kept: { verbatimModuleSyntax: false },
      repo: { verbatimModuleSyntax: false },
    },
  },
};

// Every scenario a driver runs, per subject (the driver source is below).
const DRIVERS = {
  a: `
const evaluatedAtImport = [...(globalThis.__evaluated ?? [])];
const out = { evaluatedAtImport, exports: Object.keys(subject).sort().map((k) => [k, typeof subject[k]]), metadata: globalThis.__metadataLog ?? null, scenarios: [] };
const g = globalThis._traceGlobals;
const run = async (name, setup) => {
  g?.delete("telemetry");
  const state = setup();
  let result, threw = null;
  try { result = await subject.flushTelemetry(); } catch (e) { threw = String(e && e.message || e); }
  out.scenarios.push({ name, result: result === undefined ? "undefined" : JSON.stringify(result), threw, flushes: state?.calls ?? null, evaluated: [...globalThis.__evaluated] });
};
await run("nothing stored", () => null);
await run("telemetry stored", () => { const s = { calls: 0 }; g?.set("telemetry", { flush: async () => { s.calls += 1; } }); return s; });
await run("stored then removed", () => { g?.set("telemetry", undefined); return null; });
await run("a falsy value stored", () => { g?.set("telemetry", 0); return null; });
console.log(JSON.stringify(out));
`,
  b: `
const evaluatedAtImport = [...(globalThis.__evaluated ?? [])];
const out = { evaluatedAtImport, exports: Object.keys(subject).sort().map((k) => [k, typeof subject[k]]), metadata: globalThis.__metadataLog ?? null, scenarios: [] };
const show = (e) => e && typeof e === "object" ? {
  isClientError: subject.isTRPCClientError?.(e) ?? null,
  instanceofError: e instanceof Error,
  name: e.name, message: e.message,
  shape: JSON.stringify(e.shape ?? null), data: JSON.stringify(e.data ?? null),
  meta: JSON.stringify(e.meta ?? null), cause: e.cause === undefined ? "undefined" : (e.cause?.message ?? String(e.cause)),
} : String(e);
const cases = [
  ["error envelope", () => ({ error: { code: -32600, message: "Bad request", data: { code: "BAD_REQUEST", httpStatus: 400, path: "x" } } })],
  ["error envelope with meta", () => ({ error: { code: -32603, message: "Boom", data: { code: "INTERNAL_SERVER_ERROR", httpStatus: 500 } } }), { meta: { response: "r" } }],
  ["Error", () => new Error("network down")],
  ["Error with cause option", () => new Error("outer"), { cause: new Error("inner") }],
  ["string", () => "plain string"],
  ["object with message", () => ({ message: "object message" })],
  ["object without message", () => ({ foo: 1 })],
  ["array", () => ["x"]],
  ["envelope with a string code", () => ({ error: { code: "x", message: "m" } })],
  ["null error field", () => ({ error: null })],
];
for (const [name, make, opts] of cases) {
  let result, threw = null;
  try { result = show(subject.TRPCClientError.from(make(), opts)); } catch (e) { threw = String(e && e.message || e); }
  out.scenarios.push({ name, result, threw });
}
// from() on an existing TRPCClientError keeps it and merges meta
try {
  const first = subject.TRPCClientError.from(new Error("first"), { meta: { a: 1 } });
  const again = subject.TRPCClientError.from(first, { meta: { b: 2 } });
  out.scenarios.push({ name: "existing client error", result: { same: again === first, meta: JSON.stringify(again.meta) }, threw: null });
} catch (e) { out.scenarios.push({ name: "existing client error", result: null, threw: String(e && e.message || e) }); }
for (const v of [new Error("x"), null, "s", {}]) {
  let r, threw = null;
  try { r = subject.isTRPCClientError(v); } catch (e) { threw = String(e && e.message || e); }
  out.scenarios.push({ name: "isTRPCClientError " + (v === null ? "null" : typeof v), result: r, threw });
}
out.evaluated = [...globalThis.__evaluated];
console.log(JSON.stringify(out));
`,
  m: `
console.log(JSON.stringify({ evaluatedAtImport: [...(globalThis.__evaluated ?? [])], metadata: globalThis.__metadataLog ?? null }));
`,
  c: `
const evaluatedAtImport = [...(globalThis.__evaluated ?? [])];
const out = { env: process.env.__NEXT_I18N_SUPPORT ?? null, evaluatedAtImport, exports: Object.keys(subject).sort().map((k) => [k, typeof subject[k]]), metadata: globalThis.__metadataLog ?? null, scenarios: [] };
const cases = [
  ["/en/about", ["en", "fr"]], ["/FR/x", ["en", "fr"]], ["/", ["en"]], ["/de/x", ["en", "fr"]], ["/en", ["en"]], ["/en/about", undefined], ["/en-US/a", ["en-US"]],
];
for (const [p, locales] of cases) {
  let result, threw = null;
  try { result = subject.normalizeLocalePath(p, locales); } catch (e) { threw = String(e && e.message || e); }
  out.scenarios.push({ name: p + " " + JSON.stringify(locales), result: JSON.stringify(result), threw, evaluated: [...(globalThis.__evaluated ?? [])] });
}
console.log(JSON.stringify(out));
`,
};

const filesUnder = (dir) =>
  readdirSync(dir).flatMap((e) => {
    const p = join(dir, e);
    return statSync(p).isDirectory() ? filesUnder(p) : [p];
  });

// Prepended to every compiled module of the copy: records that the module evaluated, and installs
// (once) a Reflect.metadata that records every design:* metadata TypeScript's __metadata helper
// emits, so a changed paramtypes or design:type shows up in the trace even for a subject whose own
// code never reads it.
// (No template literals or backslash escapes in here: its source is pasted into the hook files.)
const PRELUDE = (rel) =>
  [
    "if (!globalThis.__oracleMeta) {",
    "  globalThis.__oracleMeta = true;",
    "  const name = (v) => (typeof v === 'function' ? v.name || '(anonymous)' : String(v));",
    "  if (typeof Reflect.metadata !== 'function') {",
    "    Reflect.metadata = (k, v) => (target, prop) => {",
    "      (globalThis.__metadataLog ??= []).push([name(typeof target === 'function' ? target : target?.constructor), prop ?? null, k, Array.isArray(v) ? v.map(name) : name(v)]);",
    "    };",
    "  }",
    "}",
    "(globalThis.__evaluated ??= []).push(" + JSON.stringify(rel) + ");",
    "",
  ].join(String.fromCharCode(10));

const HOOKS = `
const files = new Set(JSON.parse(process.env.ORACLE_FILES));
const map = JSON.parse(process.env.ORACLE_MAP);
const root = process.env.ORACLE_ROOT;
const prelude = ${PRELUDE.toString()};
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, relative } from "node:path";
export async function resolve(specifier, context, next) {
  if (map[specifier]) {
    return { shortCircuit: true, url: pathToFileURL(join(root, map[specifier])).href };
  }
  if ((specifier.startsWith("./") || specifier.startsWith("../")) && context.parentURL?.startsWith("file:")) {
    const base = join(dirname(fileURLToPath(context.parentURL)), specifier);
    for (const c of [base, base + ".js", join(base, "index.js"), base.replace(/\\.js$/, "") + ".js"]) {
      if (existsSync(c) && !c.endsWith("/")) {
        try { if ((await import("node:fs")).statSync(c).isFile()) return { shortCircuit: true, url: pathToFileURL(c).href }; } catch {}
      }
    }
  }
  return next(specifier, context);
}
export async function load(url, context, next) {
  const r = await next(url, context);
  if (url.startsWith("file:")) {
    const p = fileURLToPath(url);
    if (files.has(p)) {
      const rel = relative(root, p);
      return { ...r, source: prelude(rel) + String(r.source) };
    }
  }
  return r;
}
`;
const CJS_HOOK = `
const Module = require("node:module");
const { relative } = require("node:path");
const files = new Set(JSON.parse(process.env.ORACLE_FILES));
const root = process.env.ORACLE_ROOT;
const compile = Module.prototype._compile;
const prelude = ${PRELUDE.toString()};
Module.prototype._compile = function (content, filename) {
  if (files.has(filename)) {
    content = prelude(relative(root, filename)) + content;
  }
  return compile.call(this, content, filename);
};
`;

let counter = 0;
// Compile the copy; returns { errors } (compile diagnostics are recorded, not fatal).
const compileDir = (dir, subject, mode) => {
  const flags = subject.modes[mode];
  const diagnostics = [];
  for (const f of filesUnder(dir).filter(
    (x) => /\.tsx?$/.test(x) && !x.endsWith(".d.ts")
  )) {
    const text = readFileSync(f, "utf8");
    const r = ts.transpileModule(text, {
      compilerOptions: {
        esModuleInterop: true,
        module:
          subject.format === "cjs"
            ? ts.ModuleKind.CommonJS
            : ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
        useDefineForClassFields: true,
        verbatimModuleSyntax:
          Boolean(flags.verbatimModuleSyntax) && subject.format !== "cjs",
        isolatedModules: Boolean(flags.isolatedModules),
        experimentalDecorators: Boolean(flags.experimentalDecorators),
        emitDecoratorMetadata: Boolean(flags.emitDecoratorMetadata),
      },
      fileName: relative(dir, f),
      reportDiagnostics: true,
    });
    for (const d of r.diagnostics ?? []) {
      diagnostics.push({
        code: d.code,
        file: relative(dir, f),
        message: ts
          .flattenDiagnosticMessageText(d.messageText, " ")
          .slice(0, 200),
      });
    }
    writeFileSync(f.replace(/\.tsx?$/, ".js"), r.outputText);
  }
  return diagnostics;
};

const runDriver = (id, dir, env = {}) => {
  const subject = SUBJECTS[id];
  const files = filesUnder(dir).filter(
    (x) =>
      x.endsWith(".js") &&
      !/(?:driver|hooks|register|instrument)\.[cm]?js$/.test(x)
  );
  const common = {
    ORACLE_FILES: JSON.stringify(files),
    ORACLE_MAP: JSON.stringify(subject.map ?? {}),
    ORACLE_ROOT: dir,
  };
  const subjectJs = subject.file.replace(/\.tsx?$/, ".js");
  if (subject.format === "esm") {
    writeFileSync(join(dir, "package.json"), '{ "type": "module" }\n');
    writeFileSync(join(dir, "hooks.mjs"), HOOKS);
    writeFileSync(
      join(dir, "register.mjs"),
      `import { register } from "node:module";\nregister("./hooks.mjs", import.meta.url);\n`
    );
    writeFileSync(
      join(dir, "driver.mjs"),
      `let subject;\ntry { subject = await import(${JSON.stringify(`./${subjectJs}`)}); } catch (e) { console.log(JSON.stringify({ importError: String(e && e.message || e).split("\\n")[0], evaluatedAtImport: [...(globalThis.__evaluated ?? [])] })); process.exit(0); }\n${DRIVERS[id]}`
    );
    return lib.spawnSync(
      process.execPath,
      ["--import", "./register.mjs", "driver.mjs"],
      {
        cwd: dir,
        encoding: "utf8",
        env: { ...process.env, ...common, ...env },
        timeout: 30_000,
      }
    );
  }
  writeFileSync(join(dir, "package.json"), '{ "type": "commonjs" }\n');
  writeFileSync(join(dir, "instrument.cjs"), CJS_HOOK);
  writeFileSync(
    join(dir, "driver.cjs"),
    `let subject;\ntry { subject = require(${JSON.stringify(`./${subjectJs}`)}); } catch (e) { console.log(JSON.stringify({ importError: String(e && e.message || e).split("\\n")[0], evaluatedAtImport: [...(globalThis.__evaluated ?? [])] })); process.exit(0); }\n(async () => {\n${DRIVERS[id]}\n})();`
  );
  return lib.spawnSync(
    process.execPath,
    ["-r", "./instrument.cjs", "driver.cjs"],
    {
      cwd: dir,
      encoding: "utf8",
      env: { ...process.env, ...common, ...env },
      timeout: 30_000,
    }
  );
};

const trace = (id, text, mode = "repo") => {
  const subject = SUBJECTS[id];
  const dir = join(WORK, id, `${mode}-${process.pid}-${counter++}`);
  rmSync(dir, { force: true, recursive: true });
  mkdirSync(dirname(dir), { recursive: true });
  cpSync(
    subject.abs
      ? join(lib.HERE, subject.dir, lib.TOPIC)
      : join(lib.EXAMPLES_DIR, subject.dir),
    dir,
    { recursive: true }
  );
  writeFileSync(join(dir, subject.file), text);
  const diagnostics = compileDir(dir, subject, mode);
  const parse = (r) => {
    const line = (r.stdout ?? "").trim().split("\n").filter(Boolean).at(-1);
    try {
      return JSON.parse(line);
    } catch {
      return {
        runError: lib
          .scrub(
            (r.stderr ?? "").split("\n").find((l) => /Error/.test(l)) ??
              `exit ${r.status}`
          )
          .slice(0, 240),
      };
    }
  };
  let out;
  if (id === "c") {
    // two processes: i18n off (the variable unset) and on
    out = {
      off: parse(runDriver(id, dir, { __NEXT_I18N_SUPPORT: "" })),
      on: parse(runDriver(id, dir, { __NEXT_I18N_SUPPORT: "1" })),
    };
  } else {
    out = parse(runDriver(id, dir));
  }
  rmSync(dir, { force: true, recursive: true });
  return { compile: diagnostics.map((d) => d.code), mode, trace: out };
};

// Field-by-field comparison of two traces.
const flatten = (o, prefix = "", acc = {}) => {
  if (o && typeof o === "object" && !Array.isArray(o)) {
    for (const [k, v] of Object.entries(o)) {
      flatten(v, prefix ? `${prefix}.${k}` : k, acc);
    }
  } else if (
    Array.isArray(o) &&
    o.every((x) => x && typeof x === "object" && "name" in x)
  ) {
    for (const x of o) {
      flatten(x, `${prefix}[${x.name}]`, acc);
    }
  } else {
    acc[prefix] = JSON.stringify(o);
  }
  return acc;
};
const verdict = (reference, candidate) => {
  const a = flatten(reference.trace);
  const b = flatten(candidate.trace);
  if (
    JSON.stringify(candidate.trace).includes("importError") ||
    JSON.stringify(candidate.trace).includes("runError")
  ) {
    const differing = [
      ...new Set([...Object.keys(a), ...Object.keys(b)]),
    ].filter((k) => a[k] !== b[k]);
    return {
      differing: differing.slice(0, 12),
      of: Object.keys(a).length,
      verdict: "broken",
    };
  }
  const differing = [...new Set([...Object.keys(a), ...Object.keys(b)])].filter(
    (k) => a[k] !== b[k]
  );
  return differing.length === 0
    ? { of: Object.keys(a).length, verdict: "same" }
    : {
        differing: differing.slice(0, 12),
        differingCount: differing.length,
        of: Object.keys(a).length,
        verdict: "changed",
      };
};

// The oracle sees a changed design:paramtypes: a decorated class with an injected class imported as
// a value, against the same class imported with `import type` (what every linter's fix writes).
const selfTest = () => {
  // a no-op class decorator, so only TypeScript's own __metadata call (and the prelude's
  // Reflect.metadata) is involved
  const text = [
    'import { Service } from "../lib/service.js";',
    "",
    "const Injectable = () => (_target: unknown): void => {};",
    "",
    "@Injectable()",
    "export class Consumer {",
    "  constructor(readonly service: Service) {}",
    "}",
    "",
  ].join("\n");
  const ref = trace("m", text, "repo");
  const fixed = trace(
    "m",
    text.replace(
      'import { Service } from "../lib/service.js";',
      'import type { Service } from "../lib/service.js";'
    ),
    "repo"
  );
  return {
    after: fixed.trace.metadata,
    before: ref.trace.metadata,
    verdict: verdict(ref, fixed),
  };
};

module.exports = { SUBJECTS, selfTest, trace, verdict };

if (require.main === module) {
  console.log("self-test", JSON.stringify(selfTest()));
  for (const id of ["a", "b", "c"]) {
    const text = readFileSync(
      join(lib.EXAMPLES_DIR, SUBJECTS[id].dir, SUBJECTS[id].file),
      "utf8"
    );
    for (const mode of ["repo", "kept", "elided"]) {
      const t = trace(id, text, mode);
      console.log(id, mode, JSON.stringify(t).slice(0, 700));
    }
  }
}
