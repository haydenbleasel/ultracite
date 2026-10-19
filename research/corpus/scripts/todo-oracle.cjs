// Behaviour oracle for the TODO-comments subjects (examples/todo-comments/). It transpiles one
// file (a pristine subject, a hand-made variant or an agent's file) with TypeScript's
// transpileModule, runs it in a fresh Node process with the scenarios below, and returns a trace.
// Nothing from a clone runs: the subjects are copies with their imports stubbed, and the stubs
// route every external call through the subject's exported `harness`.
//
//   a  Vite's handleHMRUpdate (2021): 13 changed files (the config file and .env, with and without
//      middleware mode; the client directory; HTML with and without a module; a file outside the
//      graph; self-accepting, accepted-by-importer, dead-end and circular modules; a plugin that
//      filters the modules or returns nothing). Trace: every logger, ws.send, debug, close,
//      createServer and listen call in order, the return value, and the modules' timestamps.
//      Verdict: same, or changed (with the number of restarts per config change).
//   b  Vite's HMRClient and HMRContext (2024): pruning with dispose and prune callbacks (sync and
//      async, both, either, neither), queued self and dependency updates, a failing import, custom
//      events, invalidate, messages queued until the connection is ready, and clear(). Trace: the
//      ordered callback log, what each call returns (prunePaths: undefined or a promise), sent
//      messages and logs. Verdict: same, fixed like upstream (dispose awaited before prune), fixed
//      another way, or changed.
//   c  Excalidraw's data/json.ts (2026): loadFromJSON (what fileOpen is asked to accept, and what
//      reaches loadFromBlob), saveAsJSON with scene and image file handles, serializeAsJSON local
//      and database, the validators, and the library serializer and saver. Verdict: same,
//      restricted (fileOpen now gets extensions), or changed.
//
// Usage: node todo-oracle.cjs <a|b|c> <file.ts>   (prints the trace as JSON)
//        require("./todo-oracle.cjs").runOracle(id, file) -> { trace, error }
"use strict";

const { execFileSync } = require("node:child_process");
const { mkdirSync, readFileSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { basename, join } = require("node:path");

const ts = require(
  require.resolve("typescript", {
    paths: [
      require("node:path").dirname(
        require.resolve("@typescript-eslint/parser", {
          paths: [join(__dirname, "../../../packages/cli")],
        })
      ),
    ],
  })
);

const TMP = join(tmpdir(), "ultracite-research-todo-comments", "oracle");

const transpile = (file) => {
  mkdirSync(TMP, { recursive: true });
  const out = join(
    TMP,
    `${basename(file, ".ts")}.${process.pid}.${Date.now()}.cjs`
  );
  const { outputText } = ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: basename(file),
  });
  writeFileSync(out, outputText);
  return out;
};

const runOracle = (id, file) => {
  let compiled;
  try {
    compiled = transpile(file);
  } catch (error) {
    return {
      error: `transpile: ${String(error.message).split("\n")[0]}`,
      trace: null,
    };
  }
  try {
    const stdout = execFileSync(
      process.execPath,
      [__filename, id, compiled, "--compiled"],
      {
        encoding: "utf8",
        maxBuffer: 1 << 26,
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 30_000,
      }
    );
    return { error: null, trace: JSON.parse(stdout) };
  } catch (error) {
    return {
      error: String(error.stderr || error.message)
        .split("\n")
        .slice(0, 3)
        .join(" ")
        .slice(0, 400),
      trace: null,
    };
  }
};

// ── scenarios ──────────────────────────────────────────────────────────
const tick = () => new Promise((r) => setTimeout(r, 0));
const ser = (v, seen = new WeakSet()) => {
  if (v === undefined) {
    return { $undefined: true };
  }
  if (v === null || typeof v !== "object") {
    return typeof v === "function" ? { $function: true } : v;
  }
  if (v instanceof Promise) {
    return { $promise: true };
  }
  if (seen.has(v)) {
    return { $circular: true };
  }
  seen.add(v);
  if (Array.isArray(v)) {
    return v.map((x) => ser(x, seen));
  }
  if (v instanceof Set) {
    return { $set: [...v].map((x) => ser(x, seen)) };
  }
  if (v instanceof Error) {
    return { $error: v.message };
  }
  return Object.fromEntries(
    Object.keys(v)
      .sort()
      .map((k) => [k, ser(v[k], seen)])
  );
};

const scenariosA = async (mod) => {
  const { handleHMRUpdate, harness } = mod;
  const out = {};
  const realNow = Date.now;
  Date.now = () => 1_000;
  const node = (url, file, extra = {}) => ({
    acceptedHmrDeps: new Set(),
    file,
    importers: new Set(),
    isSelfAccepting: false,
    lastHMRTimestamp: 0,
    transformResult: { code: "x" },
    type: "js",
    url,
    ...extra,
  });
  const makeServer = (
    log,
    { middlewareMode = false, modules = {}, plugins = [], tag = "first" } = {}
  ) => {
    const server = {
      close: async () => {
        log.push(["close", tag]);
      },
      config: {
        configFile: "/root/vite.config.js",
        inlineConfig: { tag },
        logger: { info: (msg, opts) => log.push(["info", tag, msg, opts]) },
        plugins,
        root: "/root",
        server: { middlewareMode },
      },
      listen: async (port, isRestart) => {
        log.push(["listen", tag, port ?? null, isRestart ?? null]);
        return server;
      },
      moduleGraph: { getModulesByFile: (file) => modules[file] },
      ws: { send: (payload) => log.push(["ws", tag, payload]) },
    };
    return server;
  };
  const cases = {
    "circular dead end": () => {
      const a = node("/a.js", "/root/a.js");
      const b = node("/b.js", "/root/b.js");
      a.importers.add(b);
      b.importers.add(a);
      return {
        file: "/root/a.js",
        modules: { "/root/a.js": new Set([a]) },
        nodes: [a, b],
      };
    },
    "client dir": () => ({ file: "/vite/dist/client/client.js" }),
    "config file": () => ({ file: "/root/vite.config.js" }),
    "config file, middleware mode": () => ({
      file: "/root/vite.config.js",
      middlewareMode: true,
    }),
    "dead end": () => {
      const a = node("/a.js", "/root/a.js");
      return {
        file: "/root/a.js",
        modules: { "/root/a.js": new Set([a]) },
        nodes: [a],
      };
    },
    "dot env": () => ({ file: "/root/.env" }),
    "html, middleware mode": () => ({
      file: "/root/sub/page.html",
      middlewareMode: true,
    }),
    "html, no module": () => ({ file: "/root/index.html" }),
    "importer accepts it": () => {
      const a = node("/a.js", "/root/a.js");
      const main = node("/main.js", "/root/main.js");
      a.importers.add(main);
      main.acceptedHmrDeps.add(a);
      return {
        file: "/root/a.js",
        modules: { "/root/a.js": new Set([a]) },
        nodes: [a, main],
      };
    },
    "not in the graph": () => ({ file: "/root/styles/notes.txt" }),
    "plugin filters everything": () => {
      const a = node("/a.js", "/root/a.js", { isSelfAccepting: true });
      return {
        file: "/root/a.js",
        modules: { "/root/a.js": new Set([a]) },
        nodes: [a],
        plugins: [{ handleHotUpdate: () => [], name: "filter" }],
      };
    },
    "plugin returns nothing": () => {
      const a = node("/a.js", "/root/a.js", { isSelfAccepting: true });
      return {
        file: "/root/a.js",
        modules: { "/root/a.js": new Set([a]) },
        nodes: [a],
        plugins: [{ handleHotUpdate: (ctx) => void ctx, name: "noop" }],
      };
    },
    "self-accepting": () => {
      const a = node("/a.js", "/root/a.js", {
        isSelfAccepting: true,
        type: "css",
      });
      return {
        file: "/root/a.js",
        modules: { "/root/a.js": new Set([a]) },
        nodes: [a],
      };
    },
  };
  for (const [name, make] of Object.entries(cases)) {
    const log = [];
    harness.debug.length = 0;
    const c = make();
    const server = makeServer(log, {
      middlewareMode: c.middlewareMode,
      modules: c.modules,
      plugins: c.plugins,
    });
    harness.createServer = async (inline) => {
      log.push(["createServer", ser(inline)]);
      return makeServer(log, {
        middlewareMode: c.middlewareMode,
        tag: "restarted",
      });
    };
    let result;
    try {
      result = { value: ser(await handleHMRUpdate(c.file, server)) };
    } catch (error) {
      result = { threw: String(error.message) };
    }
    await tick();
    out[name] = {
      debug: [...harness.debug],
      log: ser(log),
      nodes: (c.nodes ?? []).map((n) => ({
        lastHMRTimestamp: n.lastHMRTimestamp,
        transformResult: ser(n.transformResult),
        url: n.url,
      })),
      restarts: log.filter((l) => l[0] === "createServer").length,
      result,
    };
  }
  Date.now = realNow;
  return out;
};

const scenariosB = async (mod) => {
  const { HMRClient, HMRContext } = mod;
  const out = {};
  const make = (log, ready = true) => {
    const state = { ready };
    const client = new HMRClient(
      {
        debug: (...m) => log.push(["debug", ...m]),
        error: (m) =>
          log.push(["error", m instanceof Error ? `Error: ${m.message}` : m]),
      },
      { isReady: () => state.ready, send: (m) => log.push(["send", m]) },
      async (update) => {
        log.push(["import", update.acceptedPath]);
        if (update.acceptedPath.includes("broken")) {
          throw new Error("failed to fetch dynamically imported module");
        }
        return { path: update.acceptedPath };
      }
    );
    return { client, state };
  };
  const prune = async (name, setup) => {
    const log = [];
    const { client } = make(log);
    setup(client, log);
    let returned;
    try {
      const r = client.prunePaths(["/a.js", "/b.js", "/c.js"]);
      returned =
        r instanceof Promise
          ? "promise"
          : r === undefined
            ? "undefined"
            : typeof r;
      log.push(["returned", returned]);
      if (r instanceof Promise) {
        await r;
        log.push(["settled"]);
      }
    } catch (error) {
      log.push(["threw", String(error.message)]);
    }
    await tick();
    await tick();
    out[name] = { log: ser(log), returned };
  };
  await prune("prune: dispose and prune", (client, log) => {
    const ctx = new HMRContext(client, "/a.js");
    ctx.data.count = 1;
    ctx.dispose((d) => log.push(["dispose /a.js", ser(d)]));
    ctx.prune((d) => log.push(["prune /a.js", ser(d)]));
  });
  await prune("prune: async dispose", (client, log) => {
    const ctx = new HMRContext(client, "/a.js");
    ctx.dispose(async (d) => {
      log.push(["dispose start", ser(d)]);
      await tick();
      log.push(["dispose end"]);
    });
    ctx.prune(() => log.push(["prune /a.js"]));
  });
  await prune("prune: prune only", (client, log) => {
    new HMRContext(client, "/b.js").prune((d) =>
      log.push(["prune /b.js", ser(d)])
    );
  });
  await prune("prune: dispose only", (client, log) => {
    new HMRContext(client, "/c.js").dispose((d) =>
      log.push(["dispose /c.js", ser(d)])
    );
  });
  await prune("prune: nothing registered", () => {});
  // updates
  {
    const log = [];
    const { client } = make(log);
    const self = new HMRContext(client, "/self.js");
    self.dispose((d) => log.push(["dispose /self.js", ser(d)]));
    self.accept((m) => log.push(["accept /self.js", ser(m)]));
    const parent = new HMRContext(client, "/parent.js");
    parent.accept("/dep.js", (m) =>
      log.push(["accept /dep.js via parent", ser(m)])
    );
    parent.accept(["/dep.js", "/other.js"], (ms) =>
      log.push(["accept array", ser(ms)])
    );
    parent.acceptExports(["x"], (m) => log.push(["acceptExports", ser(m)]));
    const broken = new HMRContext(client, "/broken.js");
    broken.accept(() => log.push(["accept /broken.js"]));
    await Promise.all([
      client.queueUpdate({
        acceptedPath: "/self.js",
        path: "/self.js",
        timestamp: 1,
        type: "js-update",
      }),
      client.queueUpdate({
        acceptedPath: "/dep.js",
        path: "/parent.js",
        timestamp: 1,
        type: "js-update",
      }),
      client.queueUpdate({
        acceptedPath: "/missing.js",
        path: "/missing.js",
        timestamp: 1,
        type: "js-update",
      }),
      client.queueUpdate({
        acceptedPath: "/broken.js",
        path: "/broken.js",
        timestamp: 1,
        type: "js-update",
      }),
    ]);
    await tick();
    let threw = null;
    try {
      parent.accept(42);
    } catch (error) {
      threw = String(error.message);
    }
    out.updates = { log: ser(log), threw };
  }
  // events, invalidate, messenger
  {
    const log = [];
    const { client, state } = make(log, false);
    const ctx = new HMRContext(client, "/ev.js");
    const a = (p) => log.push(["listener a", ser(p)]);
    const b = (p) => log.push(["listener b", ser(p)]);
    ctx.on("custom:x", a);
    ctx.on("custom:x", b);
    await client.notifyListeners("custom:x", { n: 1 });
    ctx.off("custom:x", a);
    await client.notifyListeners("custom:x", { n: 2 });
    ctx.send("custom:y", { z: 1 });
    ctx.invalidate("because");
    state.ready = true;
    client.messenger.flush();
    // a new context for the same module drops its stale listeners and callbacks
    new HMRContext(client, "/ev.js");
    await client.notifyListeners("custom:x", { n: 3 });
    log.push(["data", ser(ctx.data)]);
    ctx.decline();
    client.clear();
    log.push([
      "after clear",
      client.hotModulesMap.size,
      client.disposeMap.size,
      client.pruneMap.size,
      client.dataMap.size,
    ]);
    out.events = { log: ser(log) };
  }
  return out;
};

const scenariosC = async (mod) => {
  const { harness } = mod;
  const out = {};
  const log = [];
  harness.fileOpen = async (opts) => {
    log.push(["fileOpen", ser(opts)]);
    return { handle: { name: "scene.excalidraw" }, name: "scene.excalidraw" };
  };
  harness.loadFromBlob = async (...args) => {
    log.push(["loadFromBlob", ser(args)]);
    return { loaded: true };
  };
  harness.fileSave = async (blob, opts) => {
    log.push([
      "fileSave",
      await (await blob).text(),
      (await blob).type,
      ser(opts),
    ]);
    return { name: opts.name };
  };
  const elements = [
    { fileId: "f1", id: "a", isDeleted: false },
    { fileId: "f2", id: "b", isDeleted: true },
    { id: "c", isDeleted: false },
  ];
  const files = {
    f1: { dataURL: "data:1", id: "f1" },
    f2: { dataURL: "data:2", id: "f2" },
  };
  out.loadFromJSON = ser(await mod.loadFromJSON({ theme: "light" }, elements));
  out.loadFromJSONNull = ser(await mod.loadFromJSON({ theme: "dark" }, null));
  out.serializeLocal = mod.serializeAsJSON(
    elements,
    { theme: "light" },
    files,
    "local"
  );
  out.serializeDatabase = mod.serializeAsJSON(
    elements,
    { theme: "light" },
    files,
    "database"
  );
  out.saveScene = ser(
    await mod.saveAsJSON({
      data: { appState: { theme: "light" }, elements, files },
      fileHandle: { name: "old.excalidraw" },
      filename: "drawing",
    })
  );
  out.saveImageHandle = ser(
    await mod.saveAsJSON({
      data: Promise.resolve({ appState: {}, elements: [], files: {} }),
      fileHandle: { name: "pic.png" },
      filename: "pic",
    })
  );
  out.valid = [
    undefined,
    {},
    { type: "excalidraw" },
    { elements: [], type: "excalidraw" },
    { elements: {}, type: "excalidraw" },
    { appState: {}, elements: [], type: "excalidraw" },
    { appState: 1, elements: [], type: "excalidraw" },
    { type: "excalidrawlib" },
  ].map((d) => mod.isValidExcalidrawData(d));
  out.validLibrary = [
    null,
    {},
    { type: "excalidrawlib" },
    { type: "excalidrawlib", version: 1 },
    { type: "excalidrawlib", version: 2 },
    { type: "excalidrawlib", version: 3 },
    "x",
  ].map((d) => Boolean(mod.isValidLibrary(d)));
  out.library = mod.serializeLibraryAsJSON([{ id: "l1" }]);
  await mod.saveLibraryAsJSON([{ id: "l1" }]);
  out.log = log;
  return out;
};

if (require.main === module) {
  const [id, file] = process.argv.slice(2);
  const mod = require(file);
  const run = { a: scenariosA, b: scenariosB, c: scenariosC }[id];
  run(mod)
    .then((trace) => {
      process.stdout.write(JSON.stringify(trace));
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

// ── verdicts ───────────────────────────────────────────────────────────
const same = (x, y) => JSON.stringify(x) === JSON.stringify(y);
const verdict = (id, original, trace) => {
  if (!trace) {
    return { changed: ["(did not run)"], verdict: "broken" };
  }
  const changed = Object.keys(original).filter(
    (k) => !same(original[k], trace[k])
  );
  if (changed.length === 0) {
    return { changed, verdict: "same" };
  }
  if (id === "a") {
    const restarts = [
      "config file",
      "config file, middleware mode",
      "dot env",
    ].map((k) => trace[k]?.restarts ?? null);
    return { changed, restarts, verdict: "changed" };
  }
  if (id === "b") {
    const prunes = changed.every((k) => k.startsWith("prune:"));
    const p = trace["prune: dispose and prune"];
    const order = (p?.log ?? []).map((l) => l[0]);
    const disposeFirst =
      order.indexOf("dispose /a.js") !== -1 &&
      order.indexOf("dispose /a.js") < order.indexOf("prune /a.js");
    const asyncP = trace["prune: async dispose"];
    const awaited = (asyncP?.log ?? []).map((l) => l[0]);
    const waitsForDispose =
      awaited.indexOf("dispose end") !== -1 &&
      awaited.indexOf("dispose end") < awaited.indexOf("prune /a.js");
    if (prunes && disposeFirst) {
      return {
        changed,
        returned: p.returned,
        verdict:
          waitsForDispose && p.returned === "promise"
            ? "fixed like upstream"
            : "fixed another way",
        waitsForAsyncDispose: waitsForDispose,
      };
    }
    return { changed, verdict: "changed" };
  }
  if (id === "c") {
    const opts = (trace.log ?? []).find((l) => l[0] === "fileOpen")?.[1];
    const onlyLoad = changed.every((k) =>
      ["loadFromJSON", "loadFromJSONNull", "log"].includes(k)
    );
    if (onlyLoad && opts && opts.extensions) {
      return { changed, fileOpen: opts, verdict: "restricted" };
    }
    return { changed, fileOpen: opts ?? null, verdict: "changed" };
  }
  return { changed, verdict: "changed" };
};

module.exports = { runOracle, transpile, verdict };
