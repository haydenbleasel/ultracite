// The behavior oracle for the import-cycles topic. It runs one subject directory: every .ts file
// in it, whatever the agent left there (new files included).
//
// Usage: node import-cycles-behavior.mjs <ica|icb> <srcDir> <workDir>
//   Prints { files, transpileErrors, traces: { <scenario id>: trace } } as JSON.
//
// Each .ts file is transpiled on its own (ts.transpileModule with the subjects' tsconfig options,
// verbatimModuleSyntax on, as in Astro) into workDir as .js, under a package.json with
// "type": "module". Relative specifiers are pointed at the emitted files ('./x.js' stays, './x' and
// './x.ts' become './x.js' or './x/index.js' when that source exists). A marker prepended to each
// module records the order in which modules evaluate. Every scenario runs in a fresh Node process,
// because which module evaluates first is what the scenarios vary.
//
// ica (Astro's dev toolbar: settings.ts <-> ui-library/window.ts), 12 scenarios:
//   import order (settings.ts first, or ui-library/window.ts first) x the configured toolbar
//   placement (none, 'bottom-left', 'nowhere') x saved localStorage settings (none, or a saved
//   placement and verbose flag). After both imports the trace records: what threw and where, the
//   evaluation order, both modules' export names and kinds, whether `settings` is a promise,
//   settings.config, defaultSettings, isValidPlacement's answers on 8 strings, a DevToolbarWindow's
//   default placement, an invalid and a valid placement set on it (what's logged, the style it
//   writes), observedAttributes, updateSetting (what's persisted), and the logger methods.
//
// icb (Astro's cookies barrel), 5 scenarios, each importing one module first and recording which
//   subject modules evaluate: prepare-response.ts, merge-responses.ts, the barrel, cookies.ts and
//   response.ts. The barrel scenario also records its export names, and whether AstroCookies,
//   attachCookiesToResponse and getSetCookiesFromResponse are the very objects cookies.ts and
//   response.ts export. A functional probe then runs prepareResponse and mergeResponses on real
//   Response objects, with AstroCookies instances made through the barrel and straight from
//   cookies.ts (merge() reads a private field, so a re-declared class fails it).
//
// Nothing here imports the agent's code into this process: the scenarios run in children.
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SELF = fileURLToPath(import.meta.url);
const REPO = resolve(dirname(SELF), "../../../..");

// ---------------------------------------------------------------- scenario child

function captureConsole() {
  const calls = [];
  for (const level of ["log", "info", "warn", "error", "debug"]) {
    console[level] = (...args) => {
      calls.push([level, ...args.map((a) => safe(a))]);
    };
  }
  return calls;
}

function safe(value) {
  if (value === undefined) return "<undefined>";
  if (typeof value === "function") return `<function ${value.name}>`;
  if (typeof value === "symbol") return `<${String(value)}>`;
  if (value instanceof Error) return `<${value.name}: ${value.message}>`;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return `<${typeof value}>`;
  }
}

const errorText = (e) =>
  e instanceof Error ? `${e.name}: ${e.message}` : `thrown ${safe(e)}`;

function kinds(mod) {
  return Object.fromEntries(
    Object.keys(mod)
      .sort()
      .map((k) => [
        k,
        typeof mod[k] === "function"
          ? /^class\b/.test(Function.prototype.toString.call(mod[k]))
            ? "class"
            : "function"
          : mod[k] && typeof mod[k].then === "function"
            ? "promise"
            : typeof mod[k],
      ])
  );
}

async function scenarioIca(workDir, { order, placement, saved }) {
  const calls = captureConsole();
  const storage = new Map();
  if (saved)
    storage.set(
      "astro:dev-toolbar:settings",
      JSON.stringify({ placement: "bottom-right", verbose: true })
    );
  const writes = [];
  globalThis.localStorage = {
    getItem: (k) => (storage.has(k) ? storage.get(k) : null),
    setItem: (k, v) => {
      writes.push([k, String(v)]);
      storage.set(k, String(v));
    },
  };
  const style = { innerHTML: "" };
  const shadow = {
    innerHTML: "",
    querySelector: (sel) => (sel === "#selected-style" ? style : null),
  };
  globalThis.HTMLElement = class {
    attachShadow() {
      return shadow;
    }
    hasAttribute() {
      return false;
    }
    getAttribute() {
      return null;
    }
  };
  if (placement) globalThis.__astro_dev_toolbar__ = { placement };

  const trace = { threw: null, loaded: null };
  const url = (rel) => pathToFileURL(join(workDir, rel)).href;
  const first =
    order === "settings-first" ? "settings.js" : "ui-library/window.js";
  const second =
    order === "settings-first" ? "ui-library/window.js" : "settings.js";
  const mods = {};
  for (const [step, rel] of [
    ["first", first],
    ["second", second],
  ]) {
    try {
      mods[rel] = await import(url(rel));
    } catch (e) {
      trace.threw = `${step} import (${rel}): ${errorText(e)}`;
      trace.loaded = globalThis.__loaded ?? [];
      trace.consoleDuringImport = calls.splice(0);
      return trace;
    }
  }
  trace.loaded = [...(globalThis.__loaded ?? [])];
  trace.consoleDuringImport = calls.splice(0);
  const s = mods["settings.js"];
  const w = mods["ui-library/window.js"];
  trace.settingsExports = kinds(s);
  trace.windowExports = kinds(w);
  const probe = (label, f) => {
    try {
      trace[label] = safe(f());
    } catch (e) {
      trace[label] = `<threw ${errorText(e)}>`;
    }
  };
  probe("settingsIsPromise", () => typeof s.settings?.then === "function");
  probe("defaultSettings", () => s.defaultSettings);
  probe("config", () => s.settings?.config);
  probe("isValidPlacement", () =>
    [
      "bottom-left",
      "bottom-center",
      "bottom-right",
      "nowhere",
      "",
      "BOTTOM-LEFT",
      "toString",
      "bottom-left ",
    ].map((v) => w.isValidPlacement(v))
  );
  probe("placements", () => w.placements);
  probe("observedAttributes", () => w.DevToolbarWindow?.observedAttributes);
  probe("window", () => {
    const el = new w.DevToolbarWindow();
    const out = { initial: el.placement, initialField: el._placement };
    el.placement = "nowhere";
    out.afterInvalid = el.placement;
    out.loggedOnInvalid = calls.splice(0);
    el.placement = "bottom-right";
    out.afterValid = el.placement;
    out.styleAfterValid = style.innerHTML.replace(/\s+/g, " ").trim();
    out.loggedOnValid = calls.splice(0);
    return out;
  });
  probe("logger", () => {
    const out = {};
    s.settings.logger.warn("w-message");
    out.warn = calls.splice(0);
    s.settings.logger.verboseLog("v-message");
    out.verboseLog = calls.splice(0);
    return out;
  });
  probe("updateSetting", () => {
    s.settings.updateSetting("placement", "bottom-left");
    s.settings.updateSetting("verbose", true);
    const out = {
      writes: writes.splice(0),
      configAfter: safe(s.settings.config),
    };
    s.settings.logger.verboseLog("v2");
    out.verboseLogAfter = calls.splice(0);
    return out;
  });
  trace.consoleAfter = calls.splice(0);
  return trace;
}

async function scenarioIcb(workDir, { entry }) {
  captureConsole();
  const url = (rel) => pathToFileURL(join(workDir, rel)).href;
  const imp = async (rel) => {
    try {
      return await import(url(rel));
    } catch (e) {
      return { __error: errorText(e) };
    }
  };
  const trace = { entry, threw: null };
  if (entry !== "functional") {
    let mod;
    try {
      mod = await import(url(entry));
    } catch (e) {
      trace.threw = errorText(e);
      trace.loaded = [...(globalThis.__loaded ?? [])];
      return trace;
    }
    trace.loaded = [...(globalThis.__loaded ?? [])];
    trace.exports = kinds(mod);
    if (entry !== "core/cookies/index.js") return trace;
    const cookiesMod = await imp("core/cookies/cookies.js");
    const responseMod = await imp("core/cookies/response.js");
    const same = (name, other) =>
      name in mod ? mod[name] === other[name] : "missing";
    trace.identity = {
      AstroCookies: same("AstroCookies", cookiesMod),
      attachCookiesToResponse: same("attachCookiesToResponse", responseMod),
      getSetCookiesFromResponse: same("getSetCookiesFromResponse", responseMod),
    };
    return trace;
  }

  // The functional probe: the importers' functions with AstroCookies instances made through the
  // barrel (when it still exports the class) and straight from cookies.ts.
  const mod = await imp("core/cookies/index.js");
  const cookiesMod = await imp("core/cookies/cookies.js");
  const responseMod = await imp("core/cookies/response.js");
  const prep = await imp("core/app/prepare-response.js");
  const merge = await imp("core/errors/merge-responses.js");
  trace.importErrors = Object.fromEntries(
    Object.entries({
      barrel: mod,
      cookies: cookiesMod,
      response: responseMod,
      prepareResponse: prep,
      mergeResponses: merge,
    })
      .filter(([, m]) => m.__error)
      .map(([k, m]) => [k, m.__error])
  );
  const logger = { warn: (...a) => trace.functional?.warnings.push(a) };
  trace.functional = { warnings: [] };
  const probe = (label, f) => {
    try {
      trace.functional[label] = safe(f());
    } catch (e) {
      trace.functional[label] = `<threw ${errorText(e)}>`;
    }
  };
  const Barrel = mod.AstroCookies;
  const Direct = cookiesMod.AstroCookies;
  const req = (cookie) =>
    new Request("https://example.com/", { headers: cookie ? { cookie } : {} });
  probe("barrelCookies", () => {
    const c = new Barrel(req("a=1; b=%7B%22x%22%3A2%7D"), logger);
    c.set("s", "v", { path: "/", httpOnly: true });
    c.delete("a");
    return {
      instanceOfDirect: c instanceof Direct,
      a: c.get("a")?.value ?? null,
      b: c.get("b")?.json() ?? null,
      s: c.get("s")?.value ?? null,
      has: [c.has("a"), c.has("b"), c.has("s")],
      headers: [...c.headers()],
    };
  });
  probe("mergeAcrossModules", () => {
    const a = new Barrel(req(""), logger);
    a.set("x", "1");
    const b = new Direct(req(""), logger);
    b.set("y", "2");
    b.merge(a);
    a.merge(b);
    return { a: [...a.headers()], b: [...b.headers()] };
  });
  probe("prepareResponse", () => {
    const c = new Barrel(req(""), logger);
    c.set("p", "q", { path: "/" });
    const r = new Response("body");
    responseMod.attachCookiesToResponse(r, c);
    prep.prepareResponse(r, { addCookieHeader: true });
    const r2 = new Response("body");
    mod.attachCookiesToResponse?.(r2, new Direct(req(""), logger));
    prep.prepareResponse(r2, { addCookieHeader: false });
    return {
      setCookie: r.headers.getSetCookie(),
      sent: Reflect.get(r, Symbol.for("astro.responseSent")) === true,
      setCookieNoHeader: r2.headers.getSetCookie(),
    };
  });
  probe("setCookiesThroughBarrel", () => {
    const c = new Direct(req(""), logger);
    c.set("k", "v");
    const r = new Response("x");
    responseMod.attachCookiesToResponse(r, c);
    return [...mod.getSetCookiesFromResponse(r)];
  });
  probe("mergeResponses", () => {
    const original = new Response("orig", {
      status: 404,
      headers: { "x-a": "1", "set-cookie": "o=1" },
    });
    const oc = new Direct(req(""), logger);
    oc.set("orig", "1");
    responseMod.attachCookiesToResponse(original, oc);
    const fresh = new Response("<html>", {
      status: 200,
      headers: { "content-type": "text/html", "set-cookie": "n=2" },
    });
    const nc = new Barrel(req(""), logger);
    nc.set("new", "2");
    responseMod.attachCookiesToResponse(fresh, nc);
    const merged = merge.mergeResponses(fresh, original, {
      status: 404,
      removeContentEncodingHeaders: false,
    });
    const attached = responseMod.getCookiesFromResponse(merged);
    return {
      status: merged.status,
      headers: [...merged.headers],
      attachedIsOriginal: attached === oc,
      attachedHeaders: attached ? [...attached.headers()] : null,
    };
  });
  return trace;
}

// ---------------------------------------------------------------- driver

function walk(dir, out = [], base = dir) {
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name !== "node_modules") walk(p, out, base);
    } else out.push(relative(base, p).split(sep).join("/"));
  }
  return out;
}

const SPEC =
  /(\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(["'])(\.{1,2}\/[^"']*)\2/g;

function pointAtEmitted(code, fileRel, sources) {
  return code.replace(SPEC, (all, lead, quote, spec) => {
    const base = dirname(fileRel);
    const target = join(base, spec).split(sep).join("/");
    const has = (p) => sources.has(p);
    let out = null;
    if (/\.js$/.test(spec) && has(target.replace(/\.js$/, ".ts"))) out = spec;
    else if (/\.ts$/.test(spec) && has(target))
      out = spec.replace(/\.ts$/, ".js");
    else if (!/\.[cm]?[jt]s$/.test(spec)) {
      if (has(`${target}.ts`)) out = `${spec}.js`;
      else if (has(`${target}/index.ts`)) out = `${spec}/index.js`;
    }
    return out === null ? all : `${lead}${quote}${out}${quote}`;
  });
}

function transpileTree(srcDir, workDir) {
  const require = createRequire(join(REPO, "packages/cli/package.json"));
  const ts = require("typescript");
  rmSync(workDir, { recursive: true, force: true });
  mkdirSync(workDir, { recursive: true });
  writeFileSync(join(workDir, "package.json"), '{ "type": "module" }\n');
  const files = walk(srcDir).filter(
    (f) => f.endsWith(".ts") && !f.endsWith(".d.ts")
  );
  const sources = new Set(files);
  const errors = [];
  for (const f of files) {
    const text = readFileSync(join(srcDir, f), "utf8");
    const out = ts.transpileModule(text, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
        verbatimModuleSyntax: true,
        useDefineForClassFields: true,
      },
      fileName: f,
      reportDiagnostics: true,
    });
    for (const d of out.diagnostics ?? [])
      errors.push(
        `${f}: TS${d.code} ${ts.flattenDiagnosticMessageText(d.messageText, " ")}`
      );
    const js = pointAtEmitted(out.outputText, f, sources);
    const target = join(workDir, f.replace(/\.ts$/, ".js"));
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(
      target,
      `(globalThis.__loaded ??= []).push(${JSON.stringify(f)});\n${js}`
    );
  }
  return { files, errors };
}

const SCENARIOS = {
  ica: () => {
    const out = [];
    for (const order of ["settings-first", "window-first"])
      for (const placement of [null, "bottom-left", "nowhere"])
        for (const saved of [false, true])
          out.push({
            id: `${order}|${placement ?? "none"}|${saved ? "saved" : "none"}`,
            order,
            placement,
            saved,
          });
    return out;
  },
  icb: () => [
    ...[
      "core/app/prepare-response.js",
      "core/errors/merge-responses.js",
      "core/cookies/index.js",
      "core/cookies/cookies.js",
      "core/cookies/response.js",
    ].map((entry) => ({ id: entry.replace(/\.js$/, ".ts"), entry })),
    { id: "functional", entry: "functional" },
  ],
};

function runScenario(subject, workDir, scenario) {
  let stdout = "";
  let status = 0;
  try {
    stdout = execFileSync(
      process.execPath,
      [SELF, "--scenario", subject, workDir, JSON.stringify(scenario)],
      {
        cwd: workDir,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 30_000,
      }
    );
  } catch (error) {
    stdout = error.stdout ?? "";
    status = error.status ?? null;
    if (error.signal) return { harness: `killed (${error.signal})` };
  }
  const m = /@@TRACE@@(.*)\n/.exec(stdout);
  if (m) return JSON.parse(m[1]);
  // A module whose evaluation never settles (an import() waiting on a top-level await in a cycle)
  // leaves the child with nothing to do: Node exits 13 ("unsettled top-level await") without a
  // trace. Any other exit without a trace is a crash outside the scenario's own try/catch.
  return status === 13
    ? { hang: "no trace (exit 13): an import never settled" }
    : { harness: `no trace (exit ${status})` };
}

if (process.argv[2] === "--scenario") {
  const [, , , subject, workDir, json] = process.argv;
  const scenario = JSON.parse(json);
  const trace =
    subject === "ica"
      ? await scenarioIca(workDir, scenario)
      : await scenarioIcb(workDir, scenario);
  process.stdout.write(`\n@@TRACE@@${JSON.stringify(trace)}\n`);
  process.exit(0);
} else {
  const [subject, srcDir, workDir] = process.argv.slice(2);
  if (!SCENARIOS[subject] || !srcDir || !workDir) {
    console.error(
      "usage: node import-cycles-behavior.mjs <ica|icb> <srcDir> <workDir>"
    );
    process.exit(2);
  }
  if (!existsSync(srcDir)) {
    console.error(`${srcDir} does not exist`);
    process.exit(2);
  }
  const { files, errors } = transpileTree(resolve(srcDir), resolve(workDir));
  const traces = {};
  for (const sc of SCENARIOS[subject]())
    traces[sc.id] = runScenario(subject, resolve(workDir), sc);
  process.stdout.write(
    `${JSON.stringify({ files, transpileErrors: errors, traces })}\n`
  );
}
