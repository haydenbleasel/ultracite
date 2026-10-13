// Behavior oracle for the dead-code topic. It imports one module (a pristine subject, a hand-made
// mutant or an agent's file) and prints a trace for every scenario as JSON. The topic module runs
// it once per file, each in its own process, and compares the traces.
//
// Usage: bun scripts/topics/dead-code-behavior.ts <dc1|dc2|dc3> <file>
//
// dc1 (VS Code's McpRegistry.resolveConnection): stub services record every call. Scenarios cross
//   the collection (present, lazy, missing, definition missing), the delegates, eight trust
//   states, the extension's launch resolver (none, a distinct launch, the definition's own launch,
//   undefined, throwing), substitution (ok, throwing) and whether the collection has an origin.
//   The trace is what resolveConnection returns or throws (the connection's launch, collection,
//   definition, delegate and logger), the ordered service calls with their arguments, the trust
//   memento afterwards, and each notification with its actions (whose run() is invoked).
// dc2 (Vite's serveStaticMiddleware): seven alias configurations × 64 request URLs (encoded,
//   malformed, traversal-like, aliased, trailing-slash, internal, html, //, query and hash). The
//   stub sirv throws ERR_DENIED_FILE for URLs containing "secret" and a plain error for "boom".
//   The trace is next()'s arguments, req.url afterwards, what reached serve, the 403s, the
//   response status and end() calls, and any throw.
// dc3 (tRPC's filterIgnored and assertCleanGitTree): execa results (stdout and stderr, or a
//   rejection), VERBOSE unset, "1" or "", and three file lists, run from a fixed cwd (/usr). The
//   trace is the execa commands, the log and cancel calls with their arguments, process.exit
//   calls and the return value.
import { pathToFileURL } from "node:url";

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

const LOGGER = { name: "oracle-logger" };

/** Deterministic, JSON-safe rendering: sorted keys, undefined/functions/errors made explicit. */
function ser(v: unknown, seen = new WeakSet<object>()): Json {
  if (v === undefined) return { $undefined: true };
  if (v === null || typeof v === "boolean" || typeof v === "string") return v;
  if (typeof v === "number")
    return Number.isFinite(v) ? v : { $number: String(v) };
  if (typeof v === "bigint") return { $bigint: String(v) };
  if (typeof v === "function") return { $function: true };
  if (typeof v === "symbol") return { $symbol: String(v) };
  if (v === LOGGER) return { $logger: true };
  if (v instanceof Error) {
    const e = v as Error & Record<string, unknown>;
    const out: Record<string, Json> = { $error: e.message };
    for (const k of ["code", "path", "stdout", "stderr"])
      if (k in e) out[k] = ser(e[k], seen);
    return out;
  }
  const o = v as object;
  if (seen.has(o)) return { $circular: true };
  seen.add(o);
  if (Array.isArray(o)) {
    const out = o.map((x) => ser(x, seen));
    seen.delete(o);
    return out;
  }
  const out: Record<string, Json> = {};
  for (const k of Object.keys(o).sort())
    out[k] = ser((o as Record<string, unknown>)[k], seen);
  seen.delete(o);
  return out;
}

// ---------------------------------------------------------------- dc1

const DC1 = {
  collection: ["present", "lazy", "missing", "definition-missing"],
  delegate: ["none", "can", "second"],
  trust: [
    "by-default",
    "memento-true",
    "memento-false",
    "memento-false-force-yes",
    "memento-false-force-no",
    "ask-yes",
    "ask-no",
    "ask-undefined",
  ],
  resolver: ["none", "distinct", "same", "undefined", "throws"],
  substitution: ["ok", "throws"],
  origin: ["yes", "no"],
} as const;

const TRUST: Record<
  string,
  {
    byDefault: boolean;
    memento?: boolean;
    force?: boolean;
    prompt?: boolean | undefined;
  }
> = {
  "by-default": { byDefault: true },
  "memento-true": { byDefault: false, memento: true, prompt: false },
  "memento-false": { byDefault: false, memento: false, prompt: true },
  "memento-false-force-yes": {
    byDefault: false,
    memento: false,
    force: true,
    prompt: true,
  },
  "memento-false-force-no": {
    byDefault: false,
    memento: false,
    force: true,
    prompt: false,
  },
  "ask-yes": { byDefault: false, prompt: true },
  "ask-no": { byDefault: false, prompt: false },
  "ask-undefined": { byDefault: false, prompt: undefined },
};

function* product<T extends Record<string, readonly string[]>>(
  dims: T
): Generator<{ [K in keyof T]: T[K][number] }> {
  const keys = Object.keys(dims);
  const idx = keys.map(() => 0);
  while (true) {
    yield Object.fromEntries(keys.map((k, i) => [k, dims[k][idx[i]]])) as {
      [K in keyof T]: T[K][number];
    };
    let i = keys.length - 1;
    while (i >= 0) {
      idx[i]++;
      if (idx[i] < dims[keys[i]].length) break;
      idx[i] = 0;
      i--;
    }
    if (i < 0) return;
  }
}

async function dc1(mod: Record<string, any>) {
  const { McpRegistry, McpServerConnection } = mod;
  const traces: Record<string, Json> = {};
  for (const s of product(DC1)) {
    const id = Object.values(s).join("|");
    const events: unknown[] = [];
    const t = TRUST[s.trust];
    const definitionLaunch = {
      type: "stdio",
      command: "node",
      args: ["server.js", "${workspaceFolder}"],
    };
    const resolvedLaunch = {
      type: "stdio",
      command: "resolved-node",
      args: ["--resolved", "${env:TOKEN}"],
    };
    const definition = {
      id: "def1",
      label: "Server One",
      launch: definitionLaunch,
      presentation:
        s.origin === "yes" ? { origin: { range: { line: 3 } } } : undefined,
    };
    const otherDefinition = {
      id: "def0",
      label: "Server Zero",
      launch: { type: "http", uri: "https://example.test/mcp" },
    };
    const collections: any[] = [];
    const makeCollection = (lazy: boolean): any => ({
      id: "col1",
      isTrustedByDefault: t.byDefault,
      lazy: lazy
        ? {
            load: async () => {
              events.push(["lazy.load"]);
              collections.splice(1, 1, makeCollection(false));
            },
          }
        : undefined,
      presentation:
        s.origin === "yes" ? { origin: "file:///settings.json" } : undefined,
      serverDefinitions: {
        get: () =>
          s.collection === "definition-missing"
            ? [otherDefinition]
            : [otherDefinition, definition],
      },
      ...(s.resolver === "none"
        ? {}
        : {
            resolveServerLanch: async (d: { id: string; launch: unknown }) => {
              events.push(["resolveServerLanch", d.id]);
              if (s.resolver === "throws") throw new Error("resolver failed");
              if (s.resolver === "distinct") return resolvedLaunch;
              if (s.resolver === "same") return d.launch;
              return undefined;
            },
          }),
    });
    collections.push({
      id: "col0",
      isTrustedByDefault: true,
      serverDefinitions: { get: () => [otherDefinition] },
    });
    if (s.collection !== "missing")
      collections.push(makeCollection(s.collection === "lazy"));
    const delegate = (i: number, can: boolean) => ({
      index: i,
      canStart: (c: { id: string }, d: { id: string }) => {
        events.push(["canStart", i, c.id, d.id]);
        return can;
      },
    });
    const delegates =
      s.delegate === "none"
        ? []
        : s.delegate === "can"
          ? [delegate(0, true)]
          : [delegate(0, false), delegate(1, true)];
    const trust: Record<string, boolean> =
      t.memento === undefined ? {} : { col1: t.memento };
    const notifications: any[] = [];
    const services = {
      collections,
      delegates,
      trust,
      promptForTrust: async (c: { id: string }) => {
        events.push(["promptForTrust", c.id]);
        return t.prompt;
      },
      replaceVariablesInLaunch: async (
        d: { id: string },
        l: Record<string, unknown>
      ) => {
        events.push(["replaceVariablesInLaunch", d.id, l]);
        if (s.substitution === "throws")
          throw new Error("Undefined variable ${input:token}");
        return { ...l, substituted: true };
      },
      notify: (n: any) => {
        events.push(["notify", n]);
        notifications.push(n);
      },
      openEditor: async (input: unknown) => {
        events.push(["openEditor", input]);
        return undefined;
      },
    };
    let outcome: unknown;
    try {
      const registry = new McpRegistry(services);
      const connection = await registry.resolveConnection({
        collectionRef: { id: "col1" },
        definitionRef: { id: "def1" },
        forceTrust: t.force,
        logger: LOGGER,
      });
      outcome =
        connection === undefined
          ? { returned: "undefined" }
          : {
              returned: {
                isMcpServerConnection:
                  connection instanceof McpServerConnection,
                collection: connection.collection?.id ?? null,
                definition: connection.definition?.id ?? null,
                delegate: delegates.indexOf(connection.delegate),
                launch: connection.launch,
                logger: connection.logger === LOGGER,
              },
            };
    } catch (error) {
      outcome = { threw: (error as Error)?.message ?? String(error) };
    }
    // Run every notification action, as a user clicking it would.
    for (const n of notifications) {
      for (const a of Array.isArray(n?.actions?.primary)
        ? n.actions.primary
        : []) {
        try {
          await a.run?.();
        } catch (error) {
          events.push(["action threw", (error as Error).message]);
        }
      }
    }
    traces[id] = ser({ outcome, events, trustAfter: trust });
  }
  return traces;
}

// ---------------------------------------------------------------- dc2

const ROOT = "/home/u/app";
const DC2_ALIASES: Record<
  string,
  { find: string | RegExp; replacement: string }[]
> = {
  none: [],
  "string-inside-root": [{ find: "/@alias", replacement: `${ROOT}/src` }],
  "string-outside-root": [{ find: "/ext", replacement: "/srv/shared" }],
  regex: [{ find: /^\/re\//, replacement: `${ROOT}/public/` }],
  "regex-groups": [
    { find: /^\/x\/([^/]+)\/(.*)$/, replacement: `${ROOT}/$2/$1` },
  ],
  "trailing-slash-replacement": [{ find: "/a", replacement: `${ROOT}/b/` }],
  "several, first wins": [
    { find: "/@alias/deep", replacement: "/srv/deep" },
    { find: "/@alias", replacement: `${ROOT}/src` },
    { find: "/ext", replacement: `${ROOT}/vendor` },
  ],
};
const DC2_URLS: (string | undefined)[] = [
  "/",
  "/index.html",
  "/a.js",
  "/a.js?import",
  "/a.js#hash",
  "/a.js?t=123#x",
  "/dir/",
  "/dir/?x=1",
  "/foo/bar.png",
  "/foo%20bar.png",
  "/a b.js",
  "/%E2%82%AC.txt",
  "/%C3%BC.txt",
  "/ü.txt",
  "/%E0%A4%A.txt",
  "/%",
  "/%2e%2e/x.js",
  "/..%2f..%2fetc/passwd",
  "/../../etc/passwd",
  "/a/../b.js",
  "/./a.js",
  "//evil.example/x.js",
  "///x.js",
  "/@fs/home/u/app/a.js",
  "/@fs",
  "/@id/x",
  "/@vite/client",
  "/@vite/env",
  "/@vite/other.js",
  "/@alias/x.js",
  "/@alias/",
  "/@alias",
  "/@aliasx/y.js",
  "/@alias/deep/z.js",
  "/@alias/a%20b.js",
  "/@alias/%2e%2e/secret.js",
  "/@alias/..%2f..%2fsecret.js",
  "/@alias/secret.js",
  "/@alias/boom.js",
  "/ext/lib.js",
  "/ext/",
  "/ext",
  "/ext/secret.js",
  "/re/img.png",
  "/re/",
  "/re/../x.js",
  "/x/y/z.js",
  "/x/y/",
  "/a",
  "/a/",
  "/a/b.js",
  "/home/u/app/src/a.js",
  "/secret.txt",
  "/boom.js",
  "/A.JS",
  "/file.HTML",
  "/page.htm",
  "/dir.html/x.js",
  "/a.js/",
  "/.hidden",
  "/a.js;jsessionid=1",
  "/foo/bar.js?url=/x",
  "/x.js?#",
  undefined,
];

function dc2(mod: Record<string, any>) {
  const { serveStaticMiddleware, harness } = mod;
  const traces: Record<string, Json> = {};
  for (const [aliasName, alias] of Object.entries(DC2_ALIASES)) {
    harness.roots.length = 0;
    const server = {
      config: {
        root: ROOT,
        resolve: { alias },
        server: { headers: { "x-test": "1" } },
      },
    };
    let middleware: any;
    let createError: string | null = null;
    try {
      middleware = serveStaticMiddleware(server);
    } catch (error) {
      createError = (error as Error).message;
    }
    const roots = [...harness.roots];
    for (const url of DC2_URLS) {
      const id = `${aliasName}|${url === undefined ? "<undefined>" : url}`;
      harness.served.length = 0;
      harness.denied.length = 0;
      harness.serve = (req: any, res: any, next: (e?: unknown) => void) => {
        const u = String(req.url ?? "");
        if (u.includes("secret")) {
          const error = Object.assign(new Error("denied"), {
            code: "ERR_DENIED_FILE",
            path: `${ROOT}${u}`,
          });
          throw error;
        }
        if (u.includes("boom")) throw new Error("boom");
        harness.served.push({ status: res.statusCode, url: req.url });
        next();
      };
      const req: { url?: string } = { url };
      const res = {
        statusCode: 200,
        ended: 0,
        end() {
          this.ended++;
        },
        setHeader() {},
      };
      const nexts: unknown[] = [];
      let threw: string | null = null;
      let returned: unknown;
      if (createError === null) {
        try {
          returned = middleware(req, res, (...args: unknown[]) => {
            nexts.push(args);
          });
        } catch (error) {
          threw = (error as Error)?.message ?? String(error);
        }
      }
      traces[id] = ser({
        createError,
        roots,
        nexts,
        reqUrl: req.url,
        served: [...harness.served],
        denied: [...harness.denied],
        status: res.statusCode,
        ended: res.ended,
        threw,
        returned,
      });
    }
  }
  return traces;
}

// ---------------------------------------------------------------- dc3

const DC3_RESULTS: Record<
  string,
  { stdout: string; stderr: string; reject?: number }
> = {
  empty: { stdout: "", stderr: "" },
  "one ignored": { stdout: "/usr/src/ignored.ts", stderr: "" },
  "two ignored, trailing newline": {
    stdout: "/usr/src/ignored.ts\n/usr/src/gen.ts\n",
    stderr: "",
  },
  "ignored + stderr warning": {
    stdout: "/usr/src/ignored.ts",
    stderr: "warning: could not open directory 'tmp/': Permission denied\n",
  },
  "stderr only": { stdout: "", stderr: "fatal: pathspec did not match\n" },
  "rejects, not a repo": {
    stdout: "",
    stderr:
      "fatal: not a git repository (or any of the parent directories): .git\n",
    reject: 128,
  },
  "rejects, nothing ignored": { stdout: "", stderr: "", reject: 1 },
};
const DC3_VERBOSE: (string | undefined)[] = [undefined, "1", ""];
const DC3_FILES: Record<string, string[]> = {
  none: [],
  "two in cwd": ["/usr/src/a.ts", "/usr/src/b.ts"],
  mixed: [
    "/usr/src/a.ts",
    "/usr/src/ignored.ts",
    "/usr/src/gen.ts",
    "/usr/node_modules/pkg/index.ts",
    "/usr/trpc/packages/server/src/x.ts",
    "/other/outside.ts",
    "/usrx/prefix-collision.ts",
    "/usr/src/a.ts",
    "relative/path.ts",
  ],
};
const DC3_STATUS: Record<string, { stdout: string; reject?: boolean }> = {
  clean: { stdout: "On branch main\nnothing to commit, working tree clean\n" },
  dirty: { stdout: "On branch main\nChanges not staged for commit:\n" },
  rejects: { stdout: "", reject: true },
};

async function dc3(mod: Record<string, any>) {
  const { filterIgnored, assertCleanGitTree, harness } = mod;
  // A fixed working directory, so path.resolve() is the same for every module and machine.
  process.chdir("/usr");
  const realExit = process.exit;
  const traces: Record<string, Json> = {};
  const events: unknown[] = [];
  harness.log = (level: string, args: unknown[]) =>
    events.push(["log", level, args]);
  harness.cancel = (message: string) => events.push(["cancel", message]);
  (process as any).exit = (code?: number) => {
    events.push(["process.exit", code]);
  };
  try {
    for (const [resultName, r] of Object.entries(DC3_RESULTS)) {
      for (const verbose of DC3_VERBOSE) {
        for (const [filesName, names] of Object.entries(DC3_FILES)) {
          const id = `filterIgnored|${resultName}|VERBOSE=${verbose === undefined ? "<unset>" : JSON.stringify(verbose)}|${filesName}`;
          events.length = 0;
          harness.execa = async (command: string) => {
            events.push(["execa", command]);
            if (r.reject !== undefined) {
              throw Object.assign(new Error(`Command failed: ${command}`), {
                code: r.reject,
                stdout: r.stdout,
                stderr: r.stderr,
              });
            }
            return { stdout: r.stdout, stderr: r.stderr };
          };
          if (verbose === undefined) delete process.env.VERBOSE;
          else process.env.VERBOSE = verbose;
          let outcome: unknown;
          try {
            outcome = {
              returned: await filterIgnored(
                names.map((fileName) => ({ fileName }))
              ),
            };
          } catch (error) {
            outcome = { threw: (error as Error)?.message ?? String(error) };
          }
          traces[id] = ser({ outcome, events: [...events] });
        }
      }
    }
    delete process.env.VERBOSE;
    for (const [statusName, st] of Object.entries(DC3_STATUS)) {
      const id = `assertCleanGitTree|${statusName}`;
      events.length = 0;
      harness.execa = async (command: string) => {
        events.push(["execa", command]);
        if (st.reject) throw new Error(`Command failed: ${command}`);
        return { stdout: st.stdout, stderr: "" };
      };
      let outcome: unknown;
      try {
        outcome = { returned: await assertCleanGitTree() };
      } catch (error) {
        outcome = { threw: (error as Error)?.message ?? String(error) };
      }
      traces[id] = ser({ outcome, events: [...events] });
    }
  } finally {
    process.exit = realExit;
  }
  return traces;
}

// ---------------------------------------------------------------- main

const [subject, file] = process.argv.slice(2);
const run = { dc1, dc2, dc3 }[subject as "dc1" | "dc2" | "dc3"];
if (!run || !file) {
  console.error("usage: bun dead-code-behavior.ts <dc1|dc2|dc3> <file>");
  process.exit(2);
}
let mod: Record<string, any>;
try {
  mod = await import(pathToFileURL(file).href);
} catch (error) {
  console.log(
    JSON.stringify({
      subject,
      importError: String((error as Error)?.message ?? error),
    })
  );
  process.exit(0);
}
const traces = await run(mod);
console.log(
  JSON.stringify({ subject, cases: Object.keys(traces).length, traces })
);
// The modules under test can leave timers or handles behind; the traces are complete.
process.exit(0);
