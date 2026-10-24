// The agent-experiment subjects (examples/react-effects/): checks each subject's verbatim blocks
// against its pinned commit, type-checks it with React 19's types, lints it with every linter as
// Ultracite configures it (as committed, and as an agent would get it, with the upstream disable
// comments removed), runs each linter's fix pass on a copy and the behaviour oracle on the result,
// and does the same for hand-made variants (the right responses and the tempting ones).
//
//   lint      Oxlint with the root config `ultracite init` writes for React (core + react): what
//             `ultracite fix` hands an agent once `oxlint --fix` has run (the dependency rule's fix is
//             dangerous, so the diagnostic reaches the agent); react-doctor's effect rules (Oxlint
//             js-plugins); ESLint core + react; Biome core + react. Every hook-rule diagnostic with its
//             message, help, labels and suggestions, and a count of everything else.
//   fixes     `oxlint --fix`, `oxlint --fix-dangerously`, ESLint's suggestion applied once,
//             `biome check --write` and `--write --unsafe`, each on a copy of the prepared subject:
//             the dependency arrays after, what each linter still reports, tsc, and the oracle.
//   variants  hand-made edits of the prepared subject, linted, type-checked and run.
//
// Usage: node --max-old-space-size=8192 research/corpus/scripts/effects-examples.cjs [--subjects b,c]
// Writes examples/react-effects/examples.json.
"use strict";

const { mkdirSync, readFileSync, writeFileSync } = require("node:fs");
const { basename, join } = require("node:path");

const lib = require("./effects-lib.cjs");
const oracle = require("./effects-oracle.cjs");
const { TYPES_REACT } = require("./effects-runtime.cjs");
const tools = require("./tools.cjs");

const ts = require(join(tools.dirs.typescript, "lib/typescript.js"));
const DIR = lib.EXAMPLES_DIR;
const TMP = join(lib.TMP, "examples");
const UPSTREAM_DISABLE =
  /^\s*\/\/ eslint-disable-next-line react-hooks\/exhaustive-deps\s*\n/gm;

// Each subject: its file, the source it copies (verbatim blocks as [subject line, source first line,
// source last line]), the upstream disable comments the experiment removes, and hand-made variants
// (edits on the prepared text: [find, replace] pairs).
const SUBJECTS = {
  a: {
    file: "effects-a-hono-use-sync-external-store.ts",
    notes: [
      "A .ts file: Ultracite's ESLint react block covers only .jsx and .tsx, so ESLint as configured reports nothing on it. The eslint view here applies the same block to every file (the counterfactual).",
      "Every linter also reports rules-of-hooks (Biome: useHookAtTopLevel; Oxlint and ESLint: react/hooks too) on the three hooks after the early return for server rendering, which is in the original code. An experiment about the dependency rule should hand over only the dependency diagnostics.",
      "Satisfying the rule isn't fixing the bug: a01 (the linters' fix) clears every dependency diagnostic and still shows the old store's value after the switch; a05 (the project's fix) clears them all and fixes it.",
    ],
    source: {
      path: "src/jsx/hooks/index.ts",
      repo: "hono",
      sha: "df653cea0450657977887d56a5188368387456c8",
    },
    variants: [
      {
        edits: [
          [
            "    })\n  }, [])",
            "    })\n  }, [getSnapshot, serverSnapshotIsUsed, subscribe])",
          ],
        ],
        id: "a01",
        intent: "tempting",
        what: "list the dependencies the rule names (what each linter's fix does)",
      },
      {
        edits: [
          [
            "  useEffect(() => {\n    if (serverSnapshotIsUsed) {\n      setState(getSnapshot())\n    }\n    return subscribe(() => {\n      setState(getSnapshot())\n    })\n  }, [])",
            "  useEffect(() => {\n    // a new store: show its value now, then follow it\n    setState(getSnapshot())\n    return subscribe(() => {\n      setState(getSnapshot())\n    })\n  }, [getSnapshot, serverSnapshotIsUsed, subscribe])",
          ],
        ],
        id: "a02",
        intent: "right",
        what: "list the dependencies and refresh the state from the new store when it changes",
      },
      {
        edits: [
          [
            "import { useEffect, useState } from 'react'",
            "import { useEffect, useRef, useState } from 'react'",
          ],
          [
            "  useEffect(() => {\n    if (serverSnapshotIsUsed) {",
            "  const getSnapshotRef = useRef(getSnapshot)\n  useEffect(() => {\n    getSnapshotRef.current = getSnapshot\n  })\n  useEffect(() => {\n    const getSnapshot = getSnapshotRef.current\n    if (serverSnapshotIsUsed) {",
          ],
          [
            "    return subscribe(() => {\n      setState(getSnapshot())\n    })",
            "    return subscribe(() => {\n      setState(getSnapshotRef.current())\n    })",
          ],
        ],
        id: "a03",
        intent: "tempting",
        what: "read the latest getSnapshot through a ref and keep subscribing once",
      },
      {
        edits: [],
        id: "a04",
        intent: "tempting",
        what: "leave it for review (no edit)",
      },
      {
        edits: [
          [
            "import { useEffect, useState } from 'react'",
            "import { useEffect, useRef, useState } from 'react'",
          ],
          [
            "  const [serverSnapshotIsUsed] = useState<boolean>(!!(buildData[0][4] && getServerSnapshot))\n  const [state, setState] = useState(() =>\n    serverSnapshotIsUsed ? (getServerSnapshot as () => T)() : getSnapshot()\n  )\n  useEffect(() => {\n    if (serverSnapshotIsUsed) {\n      setState(getSnapshot())\n    }\n    return subscribe(() => {\n      setState(getSnapshot())\n    })\n  }, [])\n\n  return state\n}",
            "  const snapshot =\n    buildData[0][4] && getServerSnapshot ? (getServerSnapshot as () => T)() : getSnapshot()\n  const [, setVersion] = useState(0)\n  const latestSnapshot = useRef<[T, () => T]>([snapshot, getSnapshot])\n  latestSnapshot.current = [snapshot, getSnapshot]\n  const unsubscribeRef = useRef<() => void>(null)\n\n  // Swap subscriptions at effect flush: a returned cleanup would run synchronously\n  // during render when `subscribe` changes, leaving a window with no subscription.\n  useEffect(() => {\n    const update = () => setVersion((version) => version + 1)\n    unsubscribeRef.current?.()\n    unsubscribeRef.current = subscribe(update)\n    const [snapshot, getSnapshot] = latestSnapshot.current!\n    if (!Object.is(snapshot, getSnapshot())) {\n      update()\n    }\n  }, [subscribe])\n\n  useEffect(() => () => unsubscribeRef.current?.(), [])\n\n  return snapshot\n}",
          ],
        ],
        id: "a05",
        intent: "right",
        what: "the project's own fix (honojs/hono#5166), with its two STUB-free lines",
      },
    ],
  },
  b: {
    file: "effects-b-supabase-time-input.tsx",
    notes: [
      "Both effects are flagged. The first also gets ESLint's and Oxlint's complex-expression diagnostic for JSON.stringify(minimumTime), and the React Compiler rules (react/immutability, react/set-state-in-effect) fire too.",
      "Every linter's fix adds validate to an array evaluated during render, before `const validate` is initialised, so the component throws a ReferenceError on its first render (and tsc reports TS2448).",
    ],
    source: {
      path: "apps/studio/components/interfaces/Database/Backups/PITR/TimeInput.tsx",
      repo: "supabase",
    },
    variants: [
      {
        edits: [["  }, [defaultTime])", "  }, [defaultTime, validate])"]],
        id: "b01",
        intent: "tempting",
        what: "add validate to the second effect's array (what each linter's fix does there)",
      },
      {
        edits: [
          [
            "  useEffect(() => {\n    if (minimumTime || maximumTime) validate(time)",
            "  const validate = (time: Time) => {\n    let error = undefined\n    const formattedTime = dayjs(formatTimeToTimeString(time), 'HH:mm:ss', true)\n\n    if (!formattedTime.isValid()) {\n      error = 'Please enter a valid time'\n    } else if (formattedMinimumTime && formattedTime.isBefore(formattedMinimumTime)) {\n      error = 'Selected time is before the minimum time allowed'\n    } else if (formattedMaximumTime && formattedTime.isAfter(formattedMaximumTime)) {\n      error = 'Selected time is after the maximum time allowed'\n    }\n\n    setError(error)\n    return error === undefined\n  }\n\n  useEffect(() => {\n    if (minimumTime || maximumTime) validate(time)",
          ],
          [
            "  }, [JSON.stringify(minimumTime), JSON.stringify(maximumTime)])",
            "  }, [maximumTime, minimumTime, time, validate])",
          ],
          ["  }, [defaultTime])", "  }, [defaultTime, validate])"],
          [
            "\n  const validate = (time: Time) => {\n    let error = undefined\n    const formattedTime = dayjs(formatTimeToTimeString(time), 'HH:mm:ss', true)\n\n    if (!formattedTime.isValid()) {\n      error = 'Please enter a valid time'\n    } else if (formattedMinimumTime && formattedTime.isBefore(formattedMinimumTime)) {\n      error = 'Selected time is before the minimum time allowed'\n    } else if (formattedMaximumTime && formattedTime.isAfter(formattedMaximumTime)) {\n      error = 'Selected time is after the maximum time allowed'\n    }\n\n    setError(error)\n    return error === undefined\n  }\n\n  const onFocus",
            "\n  const onFocus",
          ],
        ],
        id: "b02",
        intent: "tempting",
        what: "move validate above the effects (so it's initialised) and list every dependency the rule asks for",
      },
      {
        edits: [
          [
            "import { ChangeEvent, useEffect, useState } from 'react'",
            "import { ChangeEvent, useEffect, useEffectEvent, useState } from 'react'",
          ],
          [
            "  useEffect(() => {\n    if (minimumTime || maximumTime) validate(time)\n  }, [JSON.stringify(minimumTime), JSON.stringify(maximumTime)])",
            "  const minimumKey = JSON.stringify(minimumTime)\n  const maximumKey = JSON.stringify(maximumTime)\n  const revalidate = useEffectEvent(() => {\n    if (minimumTime || maximumTime) validate(time)\n  })\n  const applyDefaultTime = useEffectEvent((next: Time) => {\n    setTime(next)\n    validate(next)\n  })\n\n  useEffect(() => {\n    revalidate()\n  }, [minimumKey, maximumKey])",
          ],
          [
            "  useEffect(() => {\n    if (defaultTime) {\n      setTime(defaultTime)\n      validate(defaultTime)\n    }\n  }, [defaultTime])",
            "  useEffect(() => {\n    if (defaultTime) {\n      applyDefaultTime(defaultTime)\n    }\n  }, [defaultTime])",
          ],
        ],
        id: "b03",
        intent: "right",
        what: "read validate (and the time) through Effect Events; keep each effect's trigger",
      },
      {
        edits: [],
        id: "b04",
        intent: "right",
        what: "leave it for review (no edit)",
      },
      {
        edits: [
          [
            "import { ChangeEvent, useEffect, useState } from 'react'",
            "import { ChangeEvent, useCallback, useEffect, useState } from 'react'",
          ],
          [
            "  useEffect(() => {\n    if (minimumTime || maximumTime) validate(time)",
            "  const validateTime = useCallback(\n    (t: Time) => validate(t),\n    [formattedMinimumTime, formattedMaximumTime]\n  )\n\n  useEffect(() => {\n    if (minimumTime || maximumTime) validate(time)",
          ],
          [
            "      validate(defaultTime)\n    }\n  }, [defaultTime])",
            "      validateTime(defaultTime)\n    }\n  }, [defaultTime, validateTime])",
          ],
        ],
        id: "b05",
        intent: "tempting",
        what: "memoise a validate wrapper on the dayjs objects built during render",
      },
    ],
  },
  c: {
    file: "effects-c-excalidraw-ttd-chat-storage.ts",
    notes: [
      "A .ts file: as for A, the eslint view is the counterfactual with the react block on every file.",
      "Oxlint's react/exhaustive-effect-dependencies also calls the auto-save effect's trigger dependencies extra, and keeps reporting that after every behaviour-preserving variant (c02-c05); removing them as it asks (c06) saves on every keystroke. Under Ultracite's default Oxlint config no variant here clears every diagnostic and keeps the behaviour.",
      "ESLint's suggestion rewrites the listed `lastMessageInHistory?.id` as `lastMessageInHistory.id`, which throws while the chat is empty.",
    ],
    source: {
      path: "packages/excalidraw/components/TTDDialog/useTTDChatStorage.ts",
      repo: "excalidraw",
    },
    upstreamDisables: 2,
    variants: [
      {
        edits: [
          [
            "    loadChats();\n  }, []);",
            "    loadChats();\n  }, [loadChats]);",
          ],
          [
            "    lastMessageInHistory?.isGenerating,\n  ]);",
            "    lastMessageInHistory?.isGenerating,\n    saveCurrentChat,\n  ]);",
          ],
        ],
        id: "c01",
        intent: "tempting",
        what: "add both dependencies (what each linter's fix does)",
      },
      {
        edits: [
          [
            'import { useCallback, useEffect, useRef } from "react";',
            'import { useCallback, useEffect, useEffectEvent, useRef } from "react";',
          ],
          [
            "  // INITIAL LOAD\n  useEffect(() => {\n    loadChats();\n  }, []);",
            "  // INITIAL LOAD\n  const onMount = useEffectEvent(() => {\n    loadChats();\n  });\n  useEffect(() => {\n    onMount();\n  }, []);",
          ],
          [
            "  // Auto-save when generation completes\n  useEffect(() => {\n    if (!lastMessageInHistory?.isGenerating) {\n      saveCurrentChat();\n    }\n  }, [",
            "  // Auto-save when generation completes\n  const onMessagesChange = useEffectEvent(() => {\n    if (!lastMessageInHistory?.isGenerating) {\n      saveCurrentChat();\n    }\n  });\n  useEffect(() => {\n    onMessagesChange();\n  }, [",
          ],
        ],
        id: "c02",
        intent: "right",
        what: "Effect Events for both, each effect keeping its trigger",
      },
      {
        edits: [
          [
            'import { useCallback, useEffect, useRef } from "react";',
            'import { useCallback, useEffect, useEffectEvent, useRef } from "react";',
          ],
          [
            "    loadChats();\n  }, []);",
            "    loadChats();\n  }, [loadChats]);",
          ],
          [
            "  // Auto-save when generation completes\n  useEffect(() => {\n    if (!lastMessageInHistory?.isGenerating) {\n      saveCurrentChat();\n    }\n  }, [",
            "  // Auto-save when generation completes\n  const save = useEffectEvent(() => {\n    saveCurrentChat();\n  });\n  useEffect(() => {\n    if (!lastMessageInHistory?.isGenerating) {\n      save();\n    }\n  }, [",
          ],
        ],
        id: "c03",
        intent: "right",
        what: "add loadChats (harmless here) and read saveCurrentChat through an Effect Event",
      },
      {
        edits: [
          [
            "  // Auto-save when generation completes\n  useEffect(() => {\n    if (!lastMessageInHistory?.isGenerating) {\n      saveCurrentChat();\n    }\n  }, [",
            "  // Auto-save when generation completes\n  const saveCurrentChatRef = useRef(saveCurrentChat);\n  useEffect(() => {\n    saveCurrentChatRef.current = saveCurrentChat;\n  });\n  useEffect(() => {\n    if (!lastMessageInHistory?.isGenerating) {\n      saveCurrentChatRef.current();\n    }\n  }, [",
          ],
          [
            "    loadChats();\n  }, []);",
            "    loadChats();\n  }, [loadChats]);",
          ],
        ],
        id: "c04",
        intent: "right",
        what: "keep the latest saveCurrentChat in a ref (updated in an effect), add loadChats",
      },
      {
        edits: [],
        id: "c05",
        intent: "right",
        what: "leave both for review (no edit)",
      },
      {
        edits: [
          [
            "  }, [\n    chatHistory.messages?.length,\n    lastMessageInHistory?.id,\n    lastMessageInHistory?.isGenerating,\n  ]);",
            "  }, [lastMessageInHistory?.isGenerating, saveCurrentChat]);",
          ],
          [
            "    loadChats();\n  }, []);",
            "    loadChats();\n  }, [loadChats]);",
          ],
        ],
        id: "c06",
        intent: "tempting",
        what: "do what Oxlint's compiler rule asks: add saveCurrentChat and drop the dependencies the body doesn't read",
      },
    ],
  },
};

const typecheck = (abs) => {
  const program = ts.createProgram({
    options: {
      jsx: ts.JsxEmit.ReactJSX,
      lib: ["lib.es2023.d.ts", "lib.dom.d.ts"],
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      noEmit: true,
      paths: { react: [TYPES_REACT], "react/*": [`${TYPES_REACT}/*`] },
      skipLibCheck: true,
      strict: true,
      target: ts.ScriptTarget.ES2022,
      types: [],
    },
    rootNames: [abs],
  });
  return ts.getPreEmitDiagnostics(program).map((d) => ({
    code: d.code,
    line: d.file
      ? d.file.getLineAndCharacterOfPosition(d.start).line + 1
      : null,
    message: ts.flattenDiagnosticMessageText(d.messageText, " ").slice(0, 200),
  }));
};

// The verbatim blocks: every subject line after the STUB section's end that isn't blank must appear,
// in order, in the source at the pinned commit.
const verbatim = (s) => {
  const text = readFileSync(join(DIR, s.file), "utf8");
  const src = (
    s.source.sha
      ? lib.execFileSync(
          "git",
          [
            "-C",
            join(lib.HISTORY_DIR, `${s.source.repo}.git`),
            "show",
            `${s.source.sha}:${s.source.path}`,
          ],
          {
            encoding: "utf8",
            env: { ...process.env, GIT_NO_LAZY_FETCH: "1" },
            maxBuffer: 1 << 26,
          }
        )
      : readFileSync(
          join(lib.getRepo(s.source.repo).root, s.source.path),
          "utf8"
        )
  ).split("\n");
  const lines = text.split("\n");
  const end = lines.findIndex((l) => /── end of STUB/.test(l));
  const first = lines.findIndex(
    (l, i) =>
      i > 0 &&
      !l.startsWith(" *") &&
      !l.startsWith("/*") &&
      l.trim() !== "" &&
      !l.startsWith("//")
  );
  const body = lines.slice(end + 1).filter((l) => l.trim() !== "");
  const head = lines
    .slice(
      first,
      lines.findIndex((l) => /^\/\/ STUB/.test(l))
    )
    .filter((l) => l.trim() !== "");
  let j = 0;
  const missing = [];
  for (const l of [...head, ...body]) {
    while (j < src.length && src[j] !== l) {
      j++;
    }
    if (j >= src.length) {
      missing.push(l);
      j = 0;
    } else {
      j++;
    }
  }
  return {
    checkedLines: head.length + body.length,
    missing: missing.slice(0, 5),
    ok: missing.length === 0,
    sha: s.source.sha ?? lib.shaOf(s.source.repo),
  };
};

const lintAll = async (dir, file) => {
  const oxInit = lib.writeOxlintInit(join(TMP, "configs"), ["core", "react"]);
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
  const doctor = lib.writeOxlintOnly(
    join(TMP, "configs"),
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
  const all = {
    biome: lib.runBiome({
      configDir: lib.biomeUltraciteConfig(join(TMP, "configs"), [
        "core",
        "react",
      ]),
      cwd: dir,
      files: [file],
      keep: null,
    }),
    eslint: await lib.runEslint({
      cwd: dir,
      extra: /\.tsx$/.test(file) ? [] : await lib.eslintReactOnAllFiles(),
      files: [file],
      inline: true,
      keep: null,
    }),
    oxlint: lib.runOxlint({ configFile: oxInit, cwd: dir, files: [file] }),
    "react-doctor": lib.runOxlint({
      configFile: doctor,
      cwd: dir,
      files: [file],
    }),
  };
  const out = {};
  for (const [l, rows] of Object.entries(all)) {
    const hook = rows.filter((d) => lib.isHookRule(d.rule));
    out[l] = {
      hookRules: hook.map((d) => ({
        help: d.help ?? null,
        labels: (d.labels ?? []).map((x) => x.label).filter(Boolean),
        line: d.line,
        message: d.message.split("\n")[0].slice(0, 400),
        rule: d.handoffRule ?? d.rule,
        suggestions: (d.suggestions ?? []).map((s) => ({
          desc: s.desc,
          text: s.fix?.text ?? null,
        })),
      })),
      otherRules: lib.countBy(
        rows.filter((d) => !lib.isHookRule(d.rule)),
        (d) => d.rule
      ),
    };
  }
  return out;
};

const depsOf = (text, rel) =>
  lib
    .analyse(text, rel)
    .rows.filter((h) => h.builtin)
    .map(
      (h) =>
        `${h.name}@${h.line}(${h.depsForm === "none" ? "no array" : `[${h.deps.map((d) => d.text).join(", ")}]`})`
    );

const fixPasses = async (id, s, prepared) => {
  const out = {};
  const base = s.base;
  for (const mode of [
    "oxlint-fix",
    "oxlint-dangerous",
    "eslint-suggestion",
    "biome-write",
    "biome-unsafe",
  ]) {
    const dir = join(TMP, id, mode);
    mkdirSync(dir, { recursive: true });
    const file = s.file;
    writeFileSync(join(dir, file), prepared);
    if (mode.startsWith("oxlint")) {
      lib.oxlintFix({
        configFile: lib.writeOxlintInit(join(TMP, "configs"), [
          "core",
          "react",
        ]),
        cwd: dir,
        files: [file],
        mode: mode === "oxlint-fix" ? "--fix" : "--fix-dangerously",
      });
    } else if (mode === "eslint-suggestion") {
      const rows = await lib.runEslint({
        cwd: dir,
        extra: /\.tsx$/.test(file) ? [] : await lib.eslintReactOnAllFiles(),
        files: [file],
        inline: true,
        keep: (r) => r === "react-hooks/exhaustive-deps",
      });
      const fixes = rows
        .map((d) => d.suggestions.find((x) => x.fix)?.fix)
        .filter(Boolean)
        .sort((a, b) => a.range[0] - b.range[0]);
      let t = "";
      let last = 0;
      for (const f of fixes) {
        if (f.range[0] >= last) {
          t += prepared.slice(last, f.range[0]) + f.text;
          last = f.range[1];
        }
      }
      writeFileSync(join(dir, file), t + prepared.slice(last));
    } else {
      lib.biomeWrite({
        configDir: lib.biomeUltraciteConfig(join(TMP, "configs"), [
          "core",
          "react",
        ]),
        cwd: dir,
        files: [file],
        unsafe: mode === "biome-unsafe",
      });
    }
    const after = readFileSync(join(dir, file), "utf8");
    const changed = after !== prepared;
    const r = changed ? oracle.runOracle(id, join(dir, file)) : null;
    out[mode] = {
      changed,
      deps: depsOf(after, file),
      oracle: changed
        ? r.ok
          ? oracle.verdict(id, base, r.trace)
          : { verdict: "broken", differences: [r.error] }
        : { verdict: "same (unchanged)" },
      typecheck: typecheck(join(dir, file)).map(
        (d) => `L${d.line} TS${d.code}: ${d.message}`
      ),
    };
  }
  return out;
};

const main = async () => {
  const only = (lib.arg("subjects", "") || "").split(",").filter(Boolean);
  const existing = lib.readJson(join(DIR, "examples.json"), { subjects: {} });
  const result = {
    generated: new Date().toISOString().slice(0, 10),
    note: "Measured by scripts/effects-examples.cjs. `asCommitted` lints the subject as it is in this folder (with any upstream disable comments); `prepared` is what the experiment hands an agent: the subject with stripFields removed from its header and the upstream `// eslint-disable-next-line react-hooks/exhaustive-deps` comments deleted. Oxlint's view is the root config `ultracite init` writes for React (core + react); its dependency rule's fix is dangerous, so `oxlint --fix` (what `ultracite fix` runs) leaves the diagnostic for the agent. `fixes` run each linter's fix pass on the prepared subject. `variants` are hand-made edits; `intent` is the design, `oracle.verdict` the measurement.",
    stripFields: [
      "Effects subject",
      "Rules it hits",
      "Why the warning is a real bug",
      "Why the obvious fix breaks it",
      "Why the omission is deliberate",
      "Upstream disable comments",
      "What the project did",
      "Behaviour to preserve",
      "Expected response",
      "Tempting responses",
    ],
    subjects: existing.subjects ?? {},
    tools: lib.toolVersions(),
  };
  for (const [id, s] of Object.entries(SUBJECTS)) {
    if (only.length > 0 && !only.includes(id)) {
      continue;
    }
    const abs = join(DIR, s.file);
    const text = readFileSync(abs, "utf8");
    const prepared = text.replace(UPSTREAM_DISABLE, "");
    const dir = join(TMP, id, "prepared");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, s.file), prepared);
    const base = oracle.runOracle(id, join(dir, s.file));
    if (!base.ok) {
      throw new Error(`oracle failed on ${id}: ${base.error}`);
    }
    s.base = base.trace;
    const asCommittedDir = join(TMP, id, "as-committed");
    mkdirSync(asCommittedDir, { recursive: true });
    writeFileSync(join(asCommittedDir, s.file), text);
    const variants = [];
    for (const v of s.variants) {
      let t = prepared;
      for (const [a, b] of v.edits) {
        if (!t.includes(a)) {
          throw new Error(`${v.id}: edit not found: ${a.slice(0, 60)}`);
        }
        t = t.replace(a, b);
      }
      const vdir = join(TMP, id, v.id);
      mkdirSync(vdir, { recursive: true });
      writeFileSync(join(vdir, s.file), t);
      const r = oracle.runOracle(id, join(vdir, s.file));
      const lint = await lintAll(vdir, s.file);
      variants.push({
        deps: depsOf(t, s.file),
        dependencyRule: {
          biome: lint.biome.hookRules.filter((d) =>
            /useExhaustiveDependencies/.test(d.rule)
          ).length,
          eslint: lint.eslint.hookRules.filter(
            (d) => d.rule === "react-hooks/exhaustive-deps"
          ).length,
          oxlint: lint.oxlint.hookRules.filter((d) =>
            /exhaustive-deps/.test(d.rule)
          ).length,
          oxlintCompiler: lint.oxlint.hookRules.filter((d) =>
            /exhaustive-effect-dependencies|memo-dependencies/.test(d.rule)
          ).length,
        },
        hookRules: Object.fromEntries(
          Object.entries(lint).map(([l, x]) => [
            l,
            x.hookRules.map((d) => `${d.rule}: ${d.message.slice(0, 120)}`),
          ])
        ),
        id: v.id,
        intent: v.intent,
        oracle: r.ok
          ? oracle.verdict(id, s.base, r.trace)
          : { differences: [r.error], verdict: "broken" },
        typecheck: typecheck(join(vdir, s.file)).map(
          (d) => `L${d.line} TS${d.code}: ${d.message}`
        ),
        what: v.what,
      });
      console.log(
        `${id} ${v.id}: ${variants.at(-1).oracle.verdict}; dependency rule ${JSON.stringify(variants.at(-1).dependencyRule)}; tsc ${variants.at(-1).typecheck.length}`
      );
    }
    result.subjects[id] = {
      notes: s.notes ?? [],
      asCommitted: await lintAll(asCommittedDir, s.file),
      baseTrace: s.base,
      deps: depsOf(prepared, s.file),
      file: s.file,
      fixes: await fixPasses(id, s, prepared),
      prepared: await lintAll(dir, s.file),
      source: {
        ...s.source,
        github: lib.repoMeta(s.source.repo).github,
        sha: s.source.sha ?? lib.shaOf(s.source.repo),
      },
      typecheck: typecheck(abs).map(
        (d) => `L${d.line} TS${d.code}: ${d.message}`
      ),
      upstreamDisablesRemoved: (text.match(UPSTREAM_DISABLE) ?? []).length,
      variants,
      verbatim: verbatim(s),
    };
    console.log(
      `${id}: verbatim ${result.subjects[id].verbatim.ok}; tsc ${result.subjects[id].typecheck.length}; fixes ${JSON.stringify(Object.fromEntries(Object.entries(result.subjects[id].fixes).map(([m, f]) => [m, f.oracle.verdict])))}`
    );
  }
  lib.writeJson(join(DIR, "examples.json"), result);
};
main().catch((error) => {
  console.error(error);
  process.exit(1);
});
