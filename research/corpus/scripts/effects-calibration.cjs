// The calibration: hand-written cases through every linter configuration, every fix pass, and, for
// the runnable cases, real React 19.
//
//   cases.tsx       50 shapes (C01–C50), each one component or hook, through:
//                     oxlint        the root config `ultracite init` writes (core + react)
//                     react-doctor  oxlint with the js-plugins preset's react-doctor effect rules
//                     eslint        Ultracite's core + react presets, inline config ignored (raw)
//                                   and honoured (reported, for C36's suppression)
//                     biome         Ultracite's core + react presets
//                   and with each linter told about the custom hook `useMyEffect` (ESLint and
//                   Oxlint `additionalHooks`, Biome's `hooks` option), which no Ultracite preset sets.
//                   Every diagnostic of a hook rule is attributed to its case with its message,
//                   help, labels and suggestions.
//   fix passes      on copies: ESLint's exhaustive-deps suggestion applied once (what an agent or an
//                   editor does; `eslint --fix` doesn't apply suggestions), `oxlint --fix`,
//                   `oxlint --fix-dangerously`, `biome check --write`, and `--write --unsafe`. For
//                   each case, what its dependency array became.
//   behaviour/      10 runnable cases (B01–B10), each with a hand-written right fix (*.right.tsx).
//                   Every version (as written, right, and each linter's fix) is rendered with React
//                   19 in a fresh process (effects-runtime.cjs) through the case's scenario: props
//                   changes, clicks and typing, timers, unmount. The trace records renders, effect
//                   setups and cleanups, what the component logged, the text after each step, and
//                   whether it looped. The runtime itself is checked first against behaviour
//                   react.dev documents (`validation`).
//
// Usage: node --max-old-space-size=8192 research/corpus/scripts/effects-calibration.cjs
//        node research/corpus/scripts/effects-calibration.cjs --run <B01|V01…> <file>   (one trace)
// Writes results/react-effects/calibration.json.
"use strict";

const {
  copyFileSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} = require("node:fs");
const { basename, join } = require("node:path");

const CAL = join(__dirname, "..", "calibration", "react-effects");

// ── scenarios (also used by --run in the child process) ────────────────
const SCENARIOS = {
  B01: (rt, S, log) => {
    rt.mount(rt.h(S, { log, roomId: "a" }));
    rt.advance(1000);
    rt.update(rt.h(S, { log, roomId: "b" }));
    rt.advance(1000);
    rt.unmount();
  },
  B02: (rt, S) => {
    rt.mount(rt.h(S, { roomId: "a" }));
    for (const v of ["h", "hi", "hi!"]) {
      const input = rt.query("input");
      rt.act(() => rt.propsOf(input).onChange({ target: { value: v } }));
    }
    rt.update(rt.h(S, { roomId: "b" }));
    rt.unmount();
  },
  B03: (rt, S) => {
    rt.mount(rt.h(S, { items: ["a", "", "b"] }));
    rt.unmount();
  },
  B04: (rt, S, log) => {
    const render = (value) =>
      rt.h(S, { onReady: (v) => log(`ready ${v}`), value });
    rt.mount(render(1));
    rt.update(render(1));
    rt.update(render(1));
    rt.update(render(2));
    rt.unmount();
  },
  B05: (rt, S, log) => {
    rt.mount(rt.h(S, { log, roomId: "general", theme: "light" }));
    rt.update(rt.h(S, { log, roomId: "general", theme: "dark" }));
    rt.update(rt.h(S, { log, roomId: "music", theme: "dark" }));
    rt.unmount();
  },
  B06: (rt, S) => {
    rt.mount(rt.h(S, { id: "a" }));
    rt.click(rt.query("button"));
    rt.click(rt.query("button"));
    rt.update(rt.h(S, { id: "b" }));
    rt.unmount();
  },
  B07: (rt, S, log) => {
    rt.mount(rt.h(S, { id: "a", log, refreshKey: 0 }));
    rt.update(rt.h(S, { id: "a", log, refreshKey: 1 }));
    rt.update(rt.h(S, { id: "a", log, refreshKey: 2 }));
    rt.unmount();
  },
  B08: (rt, S, log) => {
    rt.mount(rt.h(S, { log, roomId: "a" }));
    rt.click(rt.query("button"));
    rt.click(rt.query("button"));
    rt.update(rt.h(S, { log, roomId: "b" }));
    rt.unmount();
  },
  B09: (rt, S, log) => {
    rt.mount(rt.h(S, { log }));
    rt.unmount();
  },
  B10: (rt, S) => {
    rt.mount(rt.h(S, {}));
    rt.advance(5000);
    rt.unmount();
  },
};
// Behaviour react.dev states, to check the runtime against (validation cases V01–V10).
const VALIDATION_SOURCE = `
import { useEffect, useLayoutEffect, useState, useEffectEvent } from "react";
export const NoDeps = ({ n, log }) => { useEffect(() => { log("setup " + n); return () => { log("cleanup " + n); }; }); return <p>{n}</p>; };
export const Empty = ({ n, log }) => { useEffect(() => { log("setup " + n); return () => { log("cleanup " + n); }; }, []); return <p>{n}</p>; };
export const Deps = ({ n, m, log }) => { useEffect(() => { log("setup " + n); return () => { log("cleanup " + n); }; }, [n]); return <p>{n}{m}</p>; };
export const Counter = () => { const [count, setCount] = useState(0); useEffect(() => { const id = setInterval(() => setCount(count + 1), 1000); return () => clearInterval(id); }, []); return <h1>{count}</h1>; };
export const Loop = () => { const [c, setC] = useState(0); useEffect(() => { setC(c + 1); }); return <p>{c}</p>; };
export const Order = ({ log }) => { useEffect(() => { log("effect"); }); useLayoutEffect(() => { log("layout"); }); return null; };
export const Obj = ({ id, log }) => { const [x, setX] = useState(0); const opts = { id }; useEffect(() => { log("connect " + opts.id); return () => { log("disconnect " + opts.id); }; }, [opts]); return <button onClick={() => setX(x + 1)}>{x}</button>; };
export const Same = () => { const [v, setV] = useState(1); return <button onClick={() => setV(1)}>{v}</button>; };
export const Ev = ({ theme, room, log }) => { const onConnected = useEffectEvent(() => log("connected " + room + " " + theme)); useEffect(() => { log("setup " + room); onConnected(); return () => { log("cleanup " + room); }; }, [room]); return null; };
`;
const VALIDATION = {
  V01: {
    claim:
      "An Effect with no dependency array re-runs after every render, cleaning up first (react.dev useEffect: 'If you omit this argument, your Effect will re-run after every re-render of the component').",
    expect: {
      logs: [
        "setup 1",
        "cleanup 1",
        "setup 1",
        "cleanup 1",
        "setup 2",
        "cleanup 2",
      ],
    },
    run: (rt, m, log) => {
      rt.mount(rt.h(m.NoDeps, { log, n: 1 }));
      rt.update(rt.h(m.NoDeps, { log, n: 1 }));
      rt.update(rt.h(m.NoDeps, { log, n: 2 }));
      rt.unmount();
    },
  },
  V02: {
    claim:
      "An empty dependency array runs the Effect after the first render only, and its cleanup on unmount.",
    expect: { logs: ["setup 1", "cleanup 1"] },
    run: (rt, m, log) => {
      rt.mount(rt.h(m.Empty, { log, n: 1 }));
      rt.update(rt.h(m.Empty, { log, n: 2 }));
      rt.unmount();
    },
  },
  V03: {
    claim:
      "With dependencies, the Effect re-runs only when one changes, and the cleanup runs with the old values first ('React will first run the cleanup function (with the old values), and then run your setup function with the new values').",
    expect: { logs: ["setup 1", "cleanup 1", "setup 2", "cleanup 2"] },
    run: (rt, m, log) => {
      rt.mount(rt.h(m.Deps, { log, m: 0, n: 1 }));
      rt.update(rt.h(m.Deps, { log, m: 1, n: 1 }));
      rt.update(rt.h(m.Deps, { log, m: 1, n: 2 }));
      rt.unmount();
    },
  },
  V04: {
    claim:
      "In Strict Mode in development, React runs one extra setup and cleanup cycle on mount.",
    expect: { logs: ["setup 1", "cleanup 1", "setup 1", "cleanup 1"] },
    run: (rt, m, log) => {
      rt.mount(rt.h(m.Empty, { log, n: 1 }));
      rt.unmount();
    },
    strict: true,
  },
  V05: {
    claim:
      "react.dev's counter: setCount(count + 1) in an interval set up once leaves the count at 1.",
    expect: { text: "1" },
    run: (rt, m) => {
      rt.mount(rt.h(m.Counter, {}));
      rt.advance(5000);
    },
  },
  V06: {
    claim:
      "An Effect with no dependency array that sets state loops ('Maximum update depth exceeded').",
    expect: { loop: true, warningIncludes: "Maximum update depth exceeded" },
    run: (rt, m) => {
      rt.mount(rt.h(m.Loop, {}));
    },
  },
  V07: {
    claim:
      "An Effect Event reads the latest props without re-running the Effect (react.dev useEffectEvent).",
    expect: {
      logs: [
        "setup general",
        "connected general light",
        "cleanup general",
        "setup music",
        "connected music dark",
      ],
    },
    run: (rt, m, log) => {
      rt.mount(rt.h(m.Ev, { log, room: "general", theme: "light" }));
      rt.update(rt.h(m.Ev, { log, room: "general", theme: "dark" }));
      rt.update(rt.h(m.Ev, { log, room: "music", theme: "dark" }));
    },
  },
  V08: {
    claim: "Layout Effects run before Effects.",
    expect: { logs: ["layout", "effect"] },
    run: (rt, m, log) => {
      rt.mount(rt.h(m.Order, { log }));
    },
  },
  V09: {
    claim:
      "An object built during render and listed as a dependency re-runs the Effect after every render (react.dev 'Removing unnecessary object dependencies').",
    expect: {
      logs: [
        "connect a",
        "disconnect a",
        "connect a",
        "disconnect a",
        "connect a",
      ],
    },
    run: (rt, m, log) => {
      rt.mount(rt.h(m.Obj, { id: "a", log }));
      rt.click(rt.query("button"));
      rt.click(rt.query("button"));
    },
  },
  V10: {
    claim: "Setting state to the same value skips the re-render.",
    expect: { renders: { Same: 1 } },
    run: (rt, m) => {
      rt.mount(rt.h(m.Same, {}));
      rt.click(rt.query("button"));
      rt.click(rt.query("button"));
    },
  },
};

// One trace, in this process (the child side).
const runOne = (id, file) => {
  const rtlib = require("./effects-runtime.cjs");
  const v = VALIDATION[id];
  const rt = rtlib.createRuntime({ strict: Boolean(v?.strict) });
  const logs = [];
  const log = (s) => {
    logs.push(String(s));
  };
  const texts = [];
  const globals = {
    // B02's connect() and B06's log are module-level in the cases
    connect: (options) => {
      log(`connect ${options.roomId}`);
      return () => log(`disconnect ${options.roomId}`);
    },
    log,
    clearInterval: rt.timers.clearInterval,
    clearTimeout: rt.timers.clearTimeout,
    setInterval: rt.timers.setInterval,
    setTimeout: rt.timers.setTimeout,
  };
  let loadError = null;
  let m = null;
  try {
    const source = v ? VALIDATION_SOURCE : readFileSync(file, "utf8");
    m = rtlib.loadModule(rt, source, v ? "validation.tsx" : basename(file), {
      globals,
    });
  } catch (error) {
    loadError = String(error.message).slice(0, 300);
  }
  if (m) {
    // record the text after each step
    for (const k of ["mount", "update", "click", "unmount", "advance"]) {
      const orig = rt[k];
      rt[k] = (...a) => {
        const r = orig(...a);
        texts.push(`${k}: ${rt.text()}`);
        return r;
      };
    }
    try {
      if (v) {
        v.run(rt, m, log);
      } else {
        SCENARIOS[id](rt, m.Subject, log);
      }
    } catch (error) {
      rt.trace.errors.push(`scenario: ${String(error.message).slice(0, 300)}`);
    }
  }
  const count = (xs) =>
    xs.reduce((o, x) => ({ ...o, [x]: (o[x] ?? 0) + 1 }), {});
  const out = {
    cleanups: count(rt.trace.cleanups),
    errors: rt.trace.errors,
    loadError,
    logs,
    loop: rt.loop,
    renders: rt.trace.renders,
    setups: count(rt.trace.setups),
    texts,
    warnings: [
      ...new Set(rt.trace.warnings.map((w) => w.split("\n")[0].slice(0, 160))),
    ].slice(0, 5),
  };
  rt.restore();
  return out;
};

if (process.argv[2] === "--run") {
  process.stdout.write(
    `${JSON.stringify(runOne(process.argv[3], process.argv[4]))}\n`
  );
  process.exit(0);
}

// ── the parent side ─────────────────────────────────────────────────────
const lib = require("./effects-lib.cjs");
const TMP = join(lib.TMP, "calibration");
const CONFIGS = join(TMP, "configs");

const trace = (id, file) => {
  const r = lib.spawnSync(
    process.execPath,
    [__filename, "--run", id, file ?? "-"],
    {
      encoding: "utf8",
      maxBuffer: 1 << 26,
      timeout: 60_000,
    }
  );
  if (r.status !== 0 || !r.stdout.trim()) {
    return { crashed: true, signal: r.signal, stderr: r.stderr.slice(0, 500) };
  }
  return JSON.parse(r.stdout.trim().split("\n").at(-1));
};

// Case ranges from `// Cnn:` markers.
const caseRanges = (text) => {
  const lines = text.split("\n");
  const marks = [];
  lines.forEach((l, i) => {
    const m = /^\/\/ (C\d+|B\d+): (.*)$/.exec(l);
    if (m) {
      marks.push({ id: m[1], line: i + 1, title: m[2] });
    }
  });
  return marks.map((m, i) => ({
    ...m,
    end: (marks[i + 1]?.line ?? lines.length + 1) - 1,
  }));
};
const caseOf = (ranges, line) =>
  ranges.find((r) => line >= r.line && line <= r.end)?.id ?? null;

const keepHook = (r) => lib.isHookRule(r);

const lintAll = async (dir, files, { variant = "default" } = {}) => {
  const out = {};
  // Oxlint, init's config (or with additionalHooks for the custom-hook variant)
  let oxConfig = lib.writeOxlintInit(join(CONFIGS, "oxlint"), [
    "core",
    "react",
  ]);
  if (variant === "custom-hook") {
    const file = join(CONFIGS, "oxlint", "oxlint.custom-hook.config.mjs");
    writeFileSync(
      file,
      `import base from ${JSON.stringify(require("node:url").pathToFileURL(oxConfig).href)};\nexport default { ...base, rules: { "react/exhaustive-deps": ["error", { additionalHooks: "useMyEffect" }] } };\n`
    );
    oxConfig = file;
  }
  out.oxlint = lib.runOxlint({
    configFile: oxConfig,
    cwd: dir,
    files,
    keep: (r) => lib.OXLINT_HOOK_RULES.includes(r),
  });
  if (variant === "default") {
    const jsPreset = (
      await import(
        require("node:url").pathToFileURL(
          join(lib.CLI, "config/oxlint/js-plugins/index.mjs")
        ).href
      )
    ).default;
    const doctorRules = Object.fromEntries(
      Object.entries(jsPreset.rules).filter(
        ([r, v]) => lib.REACT_DOCTOR_EFFECT_RULES.includes(r) && v !== "off"
      )
    );
    const doctorConfig = lib.writeOxlintOnly(
      join(CONFIGS, "oxlint"),
      "react-doctor-effects",
      doctorRules,
      {
        jsPlugins: [
          {
            name: "react-doctor",
            specifier: require("node:url").pathToFileURL(
              lib.reactDoctorOxlintMain
            ).href,
          },
        ],
        settings: { "react-doctor": { portedRuleMode: "curated" } },
      }
    );
    out["react-doctor"] = lib.runOxlint({
      configFile: doctorConfig,
      cwd: dir,
      files,
      keep: (r) => r.startsWith("react-doctor/"),
    });
  }
  const eslintExtra =
    variant === "custom-hook"
      ? [
          {
            files: ["**/*.{tsx,jsx}"],
            rules: {
              "react-hooks/exhaustive-deps": [
                "error",
                { additionalHooks: "useMyEffect" },
              ],
            },
          },
        ]
      : [];
  out.eslint = await lib.runEslint({
    cwd: dir,
    extra: eslintExtra,
    files,
    keep: keepHook,
  });
  if (variant === "default") {
    out["eslint-reported"] = await lib.runEslint({
      cwd: dir,
      files,
      inline: true,
      keep: keepHook,
    });
  }
  // Biome: Ultracite's presets (or the hooks option)
  const biomeDir =
    variant === "custom-hook"
      ? lib.writeBiomeConfig(CONFIGS, "custom-hook", {
          extends: ["core", "react"].map((p) =>
            join(lib.CLI, "config/biome", p, "biome.jsonc")
          ),
          linter: {
            rules: {
              correctness: {
                useExhaustiveDependencies: {
                  level: "error",
                  options: {
                    hooks: [
                      {
                        closureIndex: 0,
                        dependenciesIndex: 1,
                        name: "useMyEffect",
                      },
                    ],
                  },
                },
              },
            },
          },
          root: true,
          vcs: { enabled: false },
        })
      : lib.biomeUltraciteConfig(CONFIGS, ["core", "react"]);
  out.biome = lib.runBiome({ configDir: biomeDir, cwd: dir, files });
  const notes = lib.biomeConsole({ configDir: biomeDir, cwd: dir, files });
  for (const d of out.biome) {
    const n = notes.find(
      (x) =>
        x.file === d.file &&
        x.line === d.line &&
        x.column === d.column &&
        x.rule === d.rule
    );
    d.notes = n?.notes ?? [];
    d.fixable = n?.fixable ?? null;
  }
  return out;
};

const summariseDiag = (linter, d) => ({
  column: d.column,
  help: d.help ?? null,
  kind:
    linter === "biome"
      ? lib.kindOf(lib.BIOME_KINDS, d.message)
      : linter.startsWith("eslint")
        ? lib.kindOf(lib.ESLINT_KINDS, d.message)
        : lib.kindOf(lib.OXLINT_KINDS, d.message),
  labels: (d.labels ?? []).map((l) => l.label).filter(Boolean),
  line: d.line,
  message: d.message.split("\n")[0].slice(0, 400),
  notes: d.notes,
  rule:
    d.handoffRule && d.handoffRule !== d.rule
      ? `${d.rule} (handoff: ${d.handoffRule})`
      : d.rule,
  suggestions: (d.suggestions ?? []).map((s) => ({
    desc: s.desc,
    text: s.fix?.text ?? null,
  })),
});

// Apply ESLint's first exhaustive-deps suggestion per diagnostic (non-overlapping).
const applySuggestions = (text, rows) => {
  const fixes = rows
    .filter((d) => d.rule === "react-hooks/exhaustive-deps")
    .map((d) => d.suggestions.find((s) => s.fix)?.fix)
    .filter(Boolean)
    .sort((a, b) => a.range[0] - b.range[0]);
  let out = "";
  let last = 0;
  for (const f of fixes) {
    if (f.range[0] < last) {
      continue;
    }
    out += text.slice(last, f.range[0]) + f.text;
    last = f.range[1];
  }
  return out + text.slice(last);
};

const depsByCase = (text, rel, ranges) => {
  const rows = lib.analyse(text, rel).rows;
  const out = {};
  for (const h of rows) {
    const id = caseOf(ranges, h.line);
    if (!id) {
      continue;
    }
    (out[id] ??= []).push(
      `${h.name}(${h.depsForm === "none" ? "no array" : h.depsForm === "non-literal" ? "non-literal" : `[${h.deps.map((d) => d.text).join(", ")}]`})`
    );
  }
  return out;
};

const FIXES = [
  "eslint-suggestions",
  "eslint-suggestions-repeat",
  "oxlint-fix",
  "oxlint-dangerous",
  "biome-write",
  "biome-unsafe",
];
const runFixes = async (srcFile, label) => {
  const out = {};
  const base = readFileSync(srcFile, "utf8");
  for (const mode of FIXES) {
    const dir = join(TMP, "fixes", label, mode);
    mkdirSync(dir, { recursive: true });
    const dest = join(dir, basename(srcFile));
    writeFileSync(dest, base);
    if (mode.startsWith("eslint-suggestions")) {
      // once, or until nothing changes (at most three passes)
      for (
        let pass = 0;
        pass < (mode === "eslint-suggestions" ? 1 : 3);
        pass++
      ) {
        const current = readFileSync(dest, "utf8");
        const rows = await lib.runEslint({
          cwd: dir,
          files: [basename(srcFile)],
          keep: (r) => r === "react-hooks/exhaustive-deps",
        });
        const next = applySuggestions(current, rows);
        if (next === current) {
          break;
        }
        writeFileSync(dest, next);
      }
    } else if (mode.startsWith("oxlint")) {
      const cfg = lib.writeOxlintInit(join(CONFIGS, "oxlint"), [
        "core",
        "react",
      ]);
      // only the dependency rule's fixes: a config with it alone
      const only = lib.writeOxlintOnly(
        join(CONFIGS, "oxlint"),
        "exhaustive-deps",
        { "react/exhaustive-deps": "error" }
      );
      void cfg;
      lib.oxlintFix({
        configFile: only,
        cwd: dir,
        files: [basename(srcFile)],
        mode: mode === "oxlint-fix" ? "--fix" : "--fix-dangerously",
      });
    } else {
      const cfg = lib.writeBiomeConfig(CONFIGS, "deps-only", {
        ...lib.BIOME_HOOK_RULES,
        linter: {
          enabled: true,
          rules: {
            correctness: { useExhaustiveDependencies: "error" },
            recommended: false,
          },
        },
      });
      lib.biomeWrite({
        configDir: cfg,
        cwd: dir,
        files: [basename(srcFile)],
        unsafe: mode === "biome-unsafe",
      });
    }
    out[mode] = dest;
  }
  return out;
};

const main = async () => {
  mkdirSync(TMP, { recursive: true });
  const result = {
    generated: new Date().toISOString().slice(0, 10),
    note: "Diagnostics are every hook-rule diagnostic per case (effects-lib.cjs isHookRule). `deps` is each case's hooks with their dependency arrays as written and after each fix pass. Behaviour traces come from effects-runtime.cjs, one fresh process per version.",
    tools: lib.toolVersions(),
  };
  // runtime validation
  result.validation = {};
  for (const [id, v] of Object.entries(VALIDATION)) {
    const t = trace(id, null);
    const e = v.expect;
    const pass =
      !t.crashed &&
      (!e.logs || JSON.stringify(t.logs) === JSON.stringify(e.logs)) &&
      (!e.text || t.texts.at(-1)?.endsWith(`: ${e.text}`)) &&
      (!e.loop || Boolean(t.loop)) &&
      (!e.warningIncludes ||
        t.warnings.some((w) => w.includes(e.warningIncludes))) &&
      (!e.renders ||
        Object.entries(e.renders).every(([k, n]) => t.renders[k] === n));
    result.validation[id] = { claim: v.claim, expect: e, pass, trace: t };
    console.log(`validation ${id}: ${pass ? "pass" : "FAIL"}`);
  }
  // shapes
  const dir = join(TMP, "cases");
  mkdirSync(dir, { recursive: true });
  copyFileSync(join(CAL, "cases.tsx"), join(dir, "cases.tsx"));
  const text = readFileSync(join(CAL, "cases.tsx"), "utf8");
  const ranges = caseRanges(text);
  const views = {
    custom: await lintAll(dir, ["cases.tsx"], { variant: "custom-hook" }),
    default: await lintAll(dir, ["cases.tsx"]),
  };
  const fixes = await runFixes(join(CAL, "cases.tsx"), "cases");
  const depsBefore = depsByCase(text, "cases.tsx", ranges);
  const depsAfter = Object.fromEntries(
    Object.entries(fixes).map(([mode, f]) => {
      // a fix can re-print an array over several lines, so each version's own case markers count
      const t = readFileSync(f, "utf8");
      return [mode, depsByCase(t, "cases.tsx", caseRanges(t))];
    })
  );
  result.cases = ranges.map((r) => {
    const diag = {};
    for (const [linter, rows] of Object.entries(views.default)) {
      diag[linter] = rows
        .filter((d) => caseOf(ranges, d.line) === r.id)
        .map((d) => summariseDiag(linter, d));
    }
    const custom = {};
    for (const [linter, rows] of Object.entries(views.custom)) {
      custom[linter] = rows
        .filter(
          (d) =>
            caseOf(ranges, d.line) === r.id &&
            /exhaustive|Exhaustive/.test(d.rule)
        )
        .map((d) => summariseDiag(linter, d));
    }
    const after = Object.fromEntries(
      FIXES.map((m) => [m, depsAfter[m][r.id] ?? []])
    );
    return {
      customHookConfig: r.id === "C12" ? custom : undefined,
      deps: { asWritten: depsBefore[r.id] ?? [], ...after },
      diagnostics: diag,
      id: r.id,
      lines: [r.line, r.end],
      title: r.title,
    };
  });
  result.customHookConfig = Object.fromEntries(
    Object.entries(views.custom).map(([l, rows]) => [
      l,
      rows
        .filter((d) => /exhaustive|Exhaustive/.test(d.rule))
        .map((d) => ({ case: caseOf(ranges, d.line), ...summariseDiag(l, d) })),
    ])
  );
  // behaviour
  const bdir = join(CAL, "behaviour");
  const files = readdirSync(bdir).filter(
    (f) => /^B\d+-[\w-]+\.tsx$/.test(f) && !f.includes(".right.")
  );
  result.behaviour = [];
  for (const f of files.sort()) {
    const id = f.slice(0, 3);
    const bTmp = join(TMP, "behaviour", id);
    mkdirSync(bTmp, { recursive: true });
    copyFileSync(join(bdir, f), join(bTmp, f));
    const lint = await lintAll(bTmp, [f]);
    const fixed = await runFixes(join(bdir, f), `behaviour-${id}`);
    const versions = {
      original: join(bdir, f),
      right: join(bdir, f.replace(/\.tsx$/, ".right.tsx")),
      ...fixed,
    };
    const traces = {};
    const sources = {};
    for (const [v, file] of Object.entries(versions)) {
      const src = readFileSync(file, "utf8");
      sources[v] = depsByCase(src, f, [{ end: 1e9, id, line: 1 }])[id] ?? [];
      if (v !== "original" && src === readFileSync(versions.original, "utf8")) {
        traces[v] = "unchanged";
        continue;
      }
      traces[v] = trace(id, file);
    }
    const headline = readFileSync(join(bdir, f), "utf8")
      .split("\n")[0]
      .replace(/^\/\/ /, "");
    const cmp = (a, b) =>
      a === "unchanged" || b === "unchanged"
        ? null
        : JSON.stringify(a.logs) === JSON.stringify(b.logs) &&
          JSON.stringify(a.texts) === JSON.stringify(b.texts) &&
          Boolean(a.loop) === Boolean(b.loop);
    result.behaviour.push({
      deps: sources,
      diagnostics: Object.fromEntries(
        Object.entries(lint).map(([l, rows]) => [
          l,
          rows.map((d) => summariseDiag(l, d)),
        ])
      ),
      file: f,
      id,
      sameAsOriginal: Object.fromEntries(
        Object.keys(traces)
          .filter((v) => v !== "original")
          .map((v) => [
            v,
            traces[v] === "unchanged"
              ? "unchanged"
              : cmp(traces[v], traces.original),
          ])
      ),
      sameAsRight: Object.fromEntries(
        Object.keys(traces)
          .filter((v) => v !== "right")
          .map((v) => [
            v,
            traces[v] === "unchanged"
              ? cmp(traces.original, traces.right)
              : cmp(traces[v], traces.right),
          ])
      ),
      title: headline,
      traces,
    });
    console.log(
      `${id}: ${Object.entries(traces)
        .map(
          ([v, t]) =>
            `${v} ${t === "unchanged" ? "=" : `${t.logs?.length ?? "?"} logs${t.loop ? " LOOP" : ""}`}`
        )
        .join(", ")}`
    );
  }
  lib.writeJson(join(lib.RESULTS_DIR, "calibration.json"), result);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
