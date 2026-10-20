// Behaviour oracle for the sort-keys subjects (examples/sort-keys/). It transpiles one file (a
// pristine subject, a hand-made variant, a fixed copy or an agent's file) with TypeScript's
// transpileModule, runs it in a fresh Node process with the scenarios below, and returns a trace.
// Nothing from a clone runs: the subjects are copies with their imports stubbed, and the stubs
// report external calls to the subject's exported `harness` (A) or to the fakes passed in.
// Unlike the TODO oracle, traces keep key order and exact strings, because key order is the
// question.
//
//   a  Vite's send() (2026): 96 requests (GET and HEAD; If-None-Match matching or not; types js,
//      css, html, json and a literal MIME type; string and Buffer content, with and without an
//      inline source map comment; default and given etag and Cache-Control; extra headers; no
//      map, an empty map and a real one). Trace: every setHeader call in order, the status code,
//      what end() got, and the stubs' calls. Verdict: same, or changed.
//   b  Astro's JSON logger (2026): every configured level against every event level, labels and
//      none, ANSI colours, pretty and compact, and createJsonLoggerFromFlags. Trace: every
//      console.info and console.error call with its exact string. Verdict: same, same JSON with
//      another key order (every line parses to the same values), or changed.
//   c  Hono's serveStatic() (2026): precompressed on and off, 12 Accept-Encoding headers, 7 sets
//      of precompressed files, compressible, incompressible and extensionless paths, a missing
//      file, a traversal attempt and a path option. Trace: every getContent call, header call and
//      body in order, and onFound / onNotFound / next. Verdict: same, another encoding chosen (the
//      encoding the client accepts wins), the same response with other files probed, or changed.
//
// Usage: node sort-keys-oracle.cjs <a|b|c> <file.ts>   (prints the trace as JSON)
//        require("./sort-keys-oracle.cjs").runOracle(id, file) -> { trace, error }
//        require("./sort-keys-oracle.cjs").verdict(id, base, trace) -> { verdict, differences }
"use strict";

const { execFileSync } = require("node:child_process");
const { mkdirSync, readFileSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { basename, dirname, join } = require("node:path");

const ts = require(
  require.resolve("typescript", {
    paths: [
      dirname(
        require.resolve("@typescript-eslint/parser", {
          paths: [join(__dirname, "../../../packages/cli")],
        })
      ),
    ],
  })
);

const TMP = join(
  process.env.SORT_KEYS_TMP ?? join(tmpdir(), "ultracite-research-sort-keys"),
  "oracle"
);

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
        timeout: 60_000,
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
const scenariosA = async (mod) => {
  const { send, harness } = mod;
  const out = {};
  const contents = {
    buffer: Buffer.from("export const b = 2\n"),
    plain: "export const a = 1\n",
    withMap:
      "export const a = 1\n//# sourceMappingURL=data:application/json;base64,e30=",
  };
  const maps = {
    empty: { mappings: "" },
    none: undefined,
    nullMap: null,
    real: { mappings: "AAAA;AACA", sources: ["a.ts"], version: 3 },
  };
  const types = ["js", "css", "html", "json", "image/svg+xml"];
  let n = 0;
  for (const type of types) {
    for (const [contentName, content] of Object.entries(contents)) {
      for (const [mapName, map] of Object.entries(maps)) {
        if (
          type !== "js" &&
          type !== "css" &&
          mapName !== "none" &&
          mapName !== "real"
        ) {
          continue;
        }
        n++;
        const method = n % 3 === 0 ? "HEAD" : "GET";
        const etagMatches = n % 7 === 0;
        const options = {
          map,
          ...(n % 2 === 0
            ? { cacheControl: "max-age=31536000,immutable" }
            : {}),
          ...(n % 4 === 0
            ? { headers: { "X-First": "1", "X-Second": "2" } }
            : {}),
          ...(n % 5 === 0 ? { etag: '"given"' } : {}),
        };
        const calls = [];
        harness.calls.length = 0;
        const res = {
          end: (body) =>
            calls.push([
              "end",
              body === undefined
                ? null
                : Buffer.isBuffer(body)
                  ? `<buffer>${body.toString()}`
                  : String(body),
            ]),
          setHeader: (name, value) => calls.push(["setHeader", name, value]),
          statusCode: 0,
          writableEnded: n % 11 === 0,
        };
        const etag = options.etag ?? `W/"${content.length.toString(16)}"`;
        const req = {
          headers: etagMatches ? { "if-none-match": etag } : {},
          method,
          url: `/src/${contentName}.${type === "image/svg+xml" ? "svg" : type}?t=1700000000000`,
        };
        send(req, res, content, type, options);
        out[`${type}|${contentName}|${mapName}|${n}`] = {
          calls,
          harness: [...harness.calls],
          statusCode: res.statusCode,
        };
      }
    }
  }
  return out;
};

const scenariosB = async (mod) => {
  const jsonLoggerDestination = mod.default;
  const { AstroLogger, createJsonLoggerFromFlags } = mod;
  const out = {};
  const realInfo = console.info;
  const realError = console.error;
  const calls = [];
  console.info = (...a) => calls.push(["info", ...a]);
  console.error = (...a) => calls.push(["error", ...a]);
  try {
    const levels = ["debug", "info", "warn", "error", "silent"];
    const events = [
      ["info", "build", "compiled successfully"],
      ["info", null, "no label message"],
      ["warn", "build", "a warning"],
      ["error", "router", 'a "quoted" failure\nwith a newline'],
      ["info", "build", "\u001B[32mgreen text\u001B[39m"],
    ];
    for (const pretty of [false, true]) {
      for (const level of levels) {
        calls.length = 0;
        const destination = jsonLoggerDestination({ level, pretty });
        for (const [eventLevel, label, message] of events) {
          destination.write({
            label,
            level: eventLevel,
            message,
            newLine: true,
          });
        }
        out[`destination|pretty=${pretty}|level=${level}`] = [...calls];
      }
      calls.length = 0;
      const logger = new AstroLogger({
        destination: jsonLoggerDestination({ pretty }),
        level: "info",
      });
      logger.info("build", "via the logger");
      logger.warn(null, "warned");
      logger.error("build", "failed");
      out[`logger|pretty=${pretty}`] = [...calls];
    }
    for (const logLevel of [undefined, "warn", "error"]) {
      calls.length = 0;
      const logger = createJsonLoggerFromFlags(logLevel ? { logLevel } : {});
      logger.info("build", "from flags");
      logger.warn("build", "from flags");
      logger.error("build", "from flags");
      out[`flags|logLevel=${logLevel}`] = [...calls];
    }
    calls.length = 0;
    const destination = jsonLoggerDestination();
    destination.write({
      label: "build",
      level: "info",
      message: "defaults",
      newLine: false,
    });
    out.defaults = [...calls];
  } finally {
    console.info = realInfo;
    console.error = realError;
  }
  return out;
};

const scenariosC = async (mod) => {
  const { serveStatic } = mod;
  const out = {};
  const accepts = [
    undefined,
    "gzip",
    "zstd",
    "br",
    "gzip, zstd",
    "zstd, gzip",
    "gzip, br, zstd",
    "deflate",
    "wompwomp, gzip, br, deflate, zstd",
    "gzip, deflate, zstd",
    "br;q=1.0, gzip;q=0.8",
    "identity",
  ];
  const fileSets = {
    all: ["br", "zst", "gz"],
    br: ["br"],
    brGz: ["br", "gz"],
    gz: ["gz"],
    gzZst: ["gz", "zst"],
    none: [],
    zst: ["zst"],
  };
  const paths = [
    "/static/hello.html",
    "/static/photo.jpg",
    "/static/data",
    "/static/missing.html",
    "/static/../secret.txt",
  ];
  for (const precompressed of [true, false]) {
    for (const accept of accepts) {
      for (const [setName, exts] of Object.entries(fileSets)) {
        for (const path of paths) {
          if (!precompressed && setName !== "all") {
            continue;
          }
          const calls = [];
          const files = new Set([
            "static/hello.html",
            "static/photo.jpg",
            "static/data",
          ]);
          for (const f of ["static/hello.html", "static/data"]) {
            for (const ext of exts) {
              files.add(`${f}.${ext}`);
            }
          }
          const handler = serveStatic({
            getContent: async (p) => {
              calls.push(["getContent", p]);
              return files.has(p) ? `content of ${p}` : null;
            },
            onFound: (p) => {
              calls.push(["onFound", p]);
            },
            onNotFound: (p) => {
              calls.push(["onNotFound", p]);
            },
            precompressed,
            root: "./",
          });
          const c = {
            body: (data) => {
              calls.push(["body", String(data)]);
              return { body: String(data) };
            },
            finalized: false,
            header: (name, value, options) => {
              calls.push(["header", name, value, options?.append ?? false]);
            },
            newResponse: () => {
              calls.push(["newResponse"]);
              return {};
            },
            req: {
              header: (name) =>
                name === "Accept-Encoding" ? accept : undefined,
              path,
            },
          };
          await handler(c, async () => {
            calls.push(["next"]);
          });
          out[`${precompressed}|${accept}|${setName}|${path}`] = calls;
        }
      }
    }
  }
  return out;
};

// ── verdicts ───────────────────────────────────────────────────────────
const sortDeep = (v) => {
  if (Array.isArray(v)) {
    return v.map(sortDeep);
  }
  if (v && typeof v === "object") {
    return Object.fromEntries(
      Object.keys(v)
        .sort()
        .map((k) => [k, sortDeep(v[k])])
    );
  }
  return v;
};
const canonicalLine = (s) => {
  try {
    return JSON.stringify(sortDeep(JSON.parse(s)));
  } catch {
    return s;
  }
};
const verdict = (id, base, trace) => {
  if (!trace) {
    return { differences: null, verdict: "error" };
  }
  const keys = Object.keys(base);
  const differences = keys.filter(
    (k) => JSON.stringify(base[k]) !== JSON.stringify(trace[k])
  );
  if (differences.length === 0 && Object.keys(trace).length === keys.length) {
    return { differences: 0, verdict: "same" };
  }
  if (id === "b") {
    const canonical = (calls) => calls.map(([m, s]) => [m, canonicalLine(s)]);
    const sameJson = keys.every(
      (k) =>
        JSON.stringify(canonical(base[k])) ===
        JSON.stringify(canonical(trace[k] ?? []))
    );
    return {
      differences: differences.length,
      example: differences[0],
      verdict: sameJson ? "same JSON, another key order" : "changed",
    };
  }
  if (id === "c") {
    // Each differing scenario: another Content-Encoding (and so another file and body), only other
    // files probed on the way to the same response, or something else.
    const response = (calls) => calls.filter((c) => c[0] !== "getContent");
    const encoding = (calls) =>
      calls.find(
        (c) => c[0] === "header" && c[1] === "Content-Encoding"
      )?.[2] ?? null;
    const kinds = { encoding: [], other: [], probes: [] };
    for (const k of differences) {
      const a = base[k];
      const b = trace[k] ?? [];
      if (encoding(a) !== encoding(b)) {
        kinds.encoding.push(k);
      } else if (JSON.stringify(response(a)) === JSON.stringify(response(b))) {
        kinds.probes.push(k);
      } else {
        kinds.other.push(k);
      }
    }
    const pick = (k) =>
      k ? { after: trace[k], before: base[k], scenario: k } : null;
    return {
      differences: differences.length,
      encodingChanged: kinds.encoding.length,
      example: pick(kinds.encoding[0] ?? kinds.other[0] ?? kinds.probes[0]),
      otherChanged: kinds.other.length,
      probesOnly: kinds.probes.length,
      verdict: kinds.other.length
        ? "changed"
        : kinds.encoding.length
          ? "another encoding chosen"
          : "same response, other files probed",
    };
  }
  return {
    differences: differences.length,
    example: differences[0],
    verdict: "changed",
  };
};

module.exports = { runOracle, verdict };

if (require.main === module) {
  const [id, file, compiled] = process.argv.slice(2);
  const path = compiled === "--compiled" ? file : transpile(file);
  const mod = require(path);
  const run = { a: scenariosA, b: scenariosB, c: scenariosC }[id];
  run(mod)
    .then((trace) => {
      process.stdout.write(JSON.stringify(trace));
    })
    .catch((error) => {
      process.stderr.write(String(error.stack || error));
      process.exit(1);
    });
}
