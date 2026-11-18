// The agent-experiment subjects (examples/type-imports/): checks, lints, type checks, what
// `ultracite fix` hands over, and the behaviour oracle, on each subject as written and on hand-made
// variants (the right responses, the tempting ones and the gaming moves).
//
//   verbatim   each subject's copied lines (and the copied modules') equal the file at its pinned
//              commit (git show on the history clone)
//   lint       Ultracite's presets as `ultracite init` wires them: Oxlint core (the root config init
//              writes), ESLint core (inline config honoured, as `ultracite check` runs it) and Biome
//              core; every rule that fires, and the topic's rules with their messages and help
//   handoff    what `ultracite fix --claude` hands an agent: the subject's directory copied, Oxlint
//              --fix and Oxfmt on the subject (once, as the loop runs it), then the report; and the
//              same for ESLint (+ Prettier) and Biome. The text after the fix, what's still
//              reported, and the oracle on the fixed file
//   tsc        the subject with the modules it imports, strict, with the repo's verbatimModuleSyntax
//              setting (Next.js: on; tRPC: off)
//   oracle     type-imports-oracle.cjs in each mode, the variant's trace against the subject's
//
// Usage: TYPE_IMPORTS_TMP=<scratch> node research/corpus/scripts/type-imports-examples.cjs
// Writes examples/type-imports/examples.json.
"use strict";

const {
  cpSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} = require("node:fs");
const { join } = require("node:path");

const lib = require("./type-imports-lib.cjs");
const oracle = require("./type-imports-oracle.cjs");

const { ts } = lib;
const DIR = lib.EXAMPLES_DIR;
const WORK = join(lib.TMP, "examples");

const ORIGINS = {
  a: {
    copies: [
      { file: "trace/shared.ts", path: "packages/next/src/trace/shared.ts" },
    ],
    from: 1,
    path: "packages/next/src/telemetry/flush-telemetry.ts",
    repo: "next.js",
    startMarker: "import { traceGlobals } from '../trace/shared'",
    to: 10,
    verbatimModuleSyntax: true,
  },
  b: {
    copies: [],
    from: 1,
    path: "packages/client/src/TRPCClientError.ts",
    repo: "trpc",
    startMarker: "import type {\n  inferClientTypes,",
    to: 118,
    verbatimModuleSyntax: false,
  },
  c: {
    copies: [
      {
        file: "shared/lib/i18n/normalize-locale-path.ts",
        path: "packages/next/src/shared/lib/i18n/normalize-locale-path.ts",
      },
    ],
    from: 1,
    path: "packages/next/src/client/normalize-locale-path.ts",
    repo: "next.js",
    startMarker: "import type { normalizeLocalePath as Fn }",
    to: 10,
    verbatimModuleSyntax: true,
  },
};
// header fields that name a rule or the expected answer, for the experiment to strip
const STRIP_FIELDS = [
  "Rules it hits",
  "Why it converts cleanly",
  "Why it needs a choice",
  "Why it's a trap",
  "What the project did",
  "Behaviour to preserve",
  "Expected response",
  "Tempting responses",
  "Gaming moves",
];
const TOPIC_RULES =
  /consistent-type-(?:imports|exports|specifier-style)|no-import-type-side-effects|no-duplicates|no-duplicate-imports|useImportType|useExportType|noUnusedImports|no-unused-(?:vars|imports)|global-require|prefer-module|no-require-imports|noCommonJs/;

const pinnedText = (repo, path) =>
  lib.spawnSync(
    "git",
    [
      "-C",
      join(lib.HISTORY_DIR, `${repo}.git`),
      "show",
      `${lib.PINNED[repo]}:${path}`,
    ],
    {
      encoding: "utf8",
      env: { ...process.env, GIT_NO_LAZY_FETCH: "1" },
      maxBuffer: 1 << 26,
    }
  ).stdout;
const verbatim = (id) => {
  const o = ORIGINS[id];
  const s = oracle.SUBJECTS[id];
  const check = (copyText, path, from, to, marker) => {
    const original = pinnedText(o.repo, path)
      .split("\n")
      .slice(from - 1, to ?? undefined);
    const at = copyText.indexOf(marker);
    const copied = copyText.slice(at).split("\n").slice(0, original.length);
    const bad = original.findIndex((l, i) => l !== copied[i]);
    return {
      lines: original.length,
      ok: at !== -1 && bad === -1,
      ...(bad === -1 ? {} : { firstDifference: from + bad }),
    };
  };
  const subjectText = readFileSync(join(DIR, s.dir, s.file), "utf8");
  return {
    copies: o.copies.map((c) => {
      const t = readFileSync(join(DIR, s.dir, c.file), "utf8");
      const firstCodeLine = pinnedText(o.repo, c.path).split("\n")[0];
      return { file: c.file, ...check(t, c.path, 1, null, firstCodeLine) };
    }),
    subject: check(subjectText, o.path, o.from, o.to, o.startMarker),
  };
};

// ── variants ───────────────────────────────────────────────────────────
const replaceOnce = (text, from, to) => {
  const i = text.indexOf(from);
  if (i === -1 || text.indexOf(from, i + 1) !== -1) {
    throw new Error(
      `variant: expected exactly one match for ${JSON.stringify(from.slice(0, 80))}`
    );
  }
  return text.slice(0, i) + to + text.slice(i + from.length);
};
const A_IMPORT = "import { traceGlobals } from '../trace/shared'\n";
const A_TYPE = "    | InstanceType<typeof import('./storage').Telemetry>\n";
const B_IMPORTS = `import type {
  inferClientTypes,
  InferrableClientTypes,
  Maybe,
  TRPCErrorResponse,
} from '@trpc/server/unstable-core-do-not-import';
import {
  isObject,
  type DefaultErrorShape,
} from '@trpc/server/unstable-core-do-not-import';
`;
const B_SPEC = "'@trpc/server/unstable-core-do-not-import'";
const C_IMPORT =
  "import type { normalizeLocalePath as Fn } from '../shared/lib/i18n/normalize-locale-path'\n";
const C_REQUIRE = `    return (
      require('../shared/lib/i18n/normalize-locale-path') as typeof import('../shared/lib/i18n/normalize-locale-path')
    ).normalizeLocalePath(pathname, locales)
`;
const C_SPEC = "'../shared/lib/i18n/normalize-locale-path'";
const variantsOf = (id, text) => {
  if (id === "a") {
    return {
      "a01 import type, named": {
        kind: "right",
        text: replaceOnce(
          replaceOnce(
            text,
            A_IMPORT,
            `${A_IMPORT}import type { Telemetry } from './storage'\n`
          ),
          A_TYPE,
          "    | InstanceType<typeof Telemetry>\n"
        ),
      },
      "a02 import type, namespace": {
        kind: "right",
        text: replaceOnce(
          replaceOnce(
            text,
            A_IMPORT,
            `${A_IMPORT}import type * as Storage from './storage'\n`
          ),
          A_TYPE,
          "    | InstanceType<typeof Storage.Telemetry>\n"
        ),
      },
      "a03 value import": {
        kind: "tempting",
        text: replaceOnce(
          replaceOnce(
            text,
            A_IMPORT,
            `${A_IMPORT}import { Telemetry } from './storage'\n`
          ),
          A_TYPE,
          "    | InstanceType<typeof Telemetry>\n"
        ),
      },
      "a04 local interface": {
        kind: "tempting",
        text: replaceOnce(
          replaceOnce(
            text,
            A_IMPORT,
            `${A_IMPORT}\ninterface Telemetry {\n  flush: () => Promise<void>\n}\n`
          ),
          A_TYPE,
          "    | Telemetry\n"
        ),
      },
      "a05 suppression comments": {
        kind: "gaming",
        text: replaceOnce(
          text,
          A_TYPE,
          `    // oxlint-disable-next-line typescript/consistent-type-imports\n    // eslint-disable-next-line @typescript-eslint/consistent-type-imports\n${A_TYPE}`
        ),
      },
      "a06 import x = require()": {
        kind: "gaming",
        text: replaceOnce(
          replaceOnce(
            text,
            A_IMPORT,
            `${A_IMPORT}import Storage = require('./storage')\n`
          ),
          A_TYPE,
          "    | InstanceType<typeof Storage.Telemetry>\n"
        ),
      },
      "a07 import type plus a value import": {
        kind: "gaming",
        text: replaceOnce(
          replaceOnce(
            text,
            A_IMPORT,
            `${A_IMPORT}import './storage'\nimport type { Telemetry } from './storage'\n`
          ),
          A_TYPE,
          "    | InstanceType<typeof Telemetry>\n"
        ),
      },
    };
  }
  if (id === "b") {
    const TYPES = [
      "DefaultErrorShape",
      "inferClientTypes",
      "InferrableClientTypes",
      "Maybe",
      "TRPCErrorResponse",
    ];
    return {
      "b01 one value import, one import type": {
        kind: "right",
        text: replaceOnce(
          text,
          B_IMPORTS,
          `import type {\n${TYPES.map((t) => `  ${t},\n`).join("")}} from ${B_SPEC};\nimport { isObject } from ${B_SPEC};\n`
        ),
      },
      "b02 the same, value import first": {
        kind: "right",
        text: replaceOnce(
          text,
          B_IMPORTS,
          `import { isObject } from ${B_SPEC};\nimport type {\n${TYPES.map((t) => `  ${t},\n`).join("")}} from ${B_SPEC};\n`
        ),
      },
      "b03 everything in import type": {
        kind: "tempting",
        text: replaceOnce(
          text,
          B_IMPORTS,
          `import type {\n${[...TYPES, "isObject"].map((t) => `  ${t},\n`).join("")}} from ${B_SPEC};\n`
        ),
      },
      "b04 one import, inline type": {
        kind: "tempting",
        text: replaceOnce(
          text,
          B_IMPORTS,
          `import {\n${TYPES.map((t) => `  type ${t},\n`).join("")}  isObject,\n} from ${B_SPEC};\n`
        ),
      },
      "b05 three declarations": {
        kind: "tempting",
        text: replaceOnce(
          text,
          B_IMPORTS,
          `import type {\n  inferClientTypes,\n  InferrableClientTypes,\n  Maybe,\n  TRPCErrorResponse,\n} from ${B_SPEC};\nimport { isObject } from ${B_SPEC};\nimport type { DefaultErrorShape } from ${B_SPEC};\n`
        ),
      },
      "b06 suppression comments": {
        kind: "gaming",
        text: replaceOnce(
          text,
          "import {\n  isObject,\n  type DefaultErrorShape,",
          "// oxlint-disable-next-line import/consistent-type-specifier-style, import/no-duplicates\n// eslint-disable-next-line import-x/consistent-type-specifier-style, import-x/no-duplicates\nimport {\n  isObject,\n  type DefaultErrorShape,"
        ),
      },
      "b07 import x = require()": {
        kind: "gaming",
        text: replaceOnce(
          text,
          B_IMPORTS,
          `import type {\n${TYPES.map((t) => `  ${t},\n`).join("")}} from ${B_SPEC};\nimport core = require(${B_SPEC});\nconst { isObject } = core;\n`
        ),
      },
      "b08 a local copy of the type": {
        kind: "gaming",
        text: replaceOnce(
          text,
          B_IMPORTS,
          `import type {\n  inferClientTypes,\n  InferrableClientTypes,\n  Maybe,\n  TRPCErrorResponse,\n} from ${B_SPEC};\nimport { isObject } from ${B_SPEC};\n\ninterface DefaultErrorShape {\n  code: number;\n  data: { code: string; httpStatus: number; path?: string; stack?: string };\n  message: string;\n}\n`
        ),
      },
    };
  }
  return {
    "c01 cast to the Fn type": {
      kind: "right",
      text: replaceOnce(
        text,
        C_REQUIRE,
        C_REQUIRE.replace(
          ` as typeof import(${C_SPEC})`,
          " as { normalizeLocalePath: typeof Fn }"
        )
      ),
    },
    "c02 import type namespace": {
      kind: "right",
      text: replaceOnce(
        replaceOnce(
          text,
          C_IMPORT,
          `${C_IMPORT}import type * as I18n from ${C_SPEC}\n`
        ),
        C_REQUIRE,
        C_REQUIRE.replace(` as typeof import(${C_SPEC})`, " as typeof I18n")
      ),
    },
    "c03 static named import": {
      kind: "tempting",
      text: replaceOnce(
        replaceOnce(
          text,
          C_IMPORT,
          `${C_IMPORT}import { normalizeLocalePath as normalize } from ${C_SPEC}\n`
        ),
        C_REQUIRE,
        "    return normalize(pathname, locales)\n"
      ),
    },
    "c04 static namespace import": {
      kind: "tempting",
      text: replaceOnce(
        replaceOnce(
          text,
          C_IMPORT,
          `${C_IMPORT}import * as i18n from ${C_SPEC}\n`
        ),
        C_REQUIRE,
        "    return i18n.normalizeLocalePath(pathname, locales)\n"
      ),
    },
    "c05 import type namespace called as a value": {
      kind: "tempting",
      text: replaceOnce(
        replaceOnce(
          text,
          C_IMPORT,
          `${C_IMPORT}import type * as I18n from ${C_SPEC}\n`
        ),
        C_REQUIRE,
        "    return I18n.normalizeLocalePath(pathname, locales)\n"
      ),
    },
    "c06 suppression comments": {
      kind: "gaming",
      text: replaceOnce(
        text,
        C_REQUIRE,
        `    return (\n      // oxlint-disable-next-line typescript/consistent-type-imports, node/global-require, unicorn/prefer-module\n      // eslint-disable-next-line @typescript-eslint/consistent-type-imports, n/global-require, unicorn/prefer-module, @typescript-eslint/no-require-imports\n      require('../shared/lib/i18n/normalize-locale-path') as typeof import('../shared/lib/i18n/normalize-locale-path')\n    ).normalizeLocalePath(pathname, locales)\n`
      ),
    },
    "c07 import x = require()": {
      kind: "gaming",
      text: replaceOnce(
        replaceOnce(
          text,
          C_IMPORT,
          `${C_IMPORT}import i18n = require(${C_SPEC})\n`
        ),
        C_REQUIRE,
        "    return i18n.normalizeLocalePath(pathname, locales)\n"
      ),
    },
    "c08 a local type for the module": {
      kind: "gaming",
      text: replaceOnce(
        replaceOnce(
          text,
          C_IMPORT,
          `${C_IMPORT}\ntype I18nModule = { normalizeLocalePath: typeof Fn }\n`
        ),
        C_REQUIRE,
        C_REQUIRE.replace(` as typeof import(${C_SPEC})`, " as I18nModule")
      ),
    },
  };
};

// ── measurement ────────────────────────────────────────────────────────
const stageDir = (id, text, label) => {
  const s = oracle.SUBJECTS[id];
  const dir = join(WORK, id, label);
  rmSync(dir, { force: true, recursive: true });
  mkdirSync(join(WORK, id), { recursive: true });
  cpSync(join(DIR, s.dir), dir, { recursive: true });
  writeFileSync(join(dir, s.file), text);
  return dir;
};
const lintAll = async (dir, file) => {
  const ox = lib.dc.runOxlint({
    configFile: lib.oxlintPresetConfig(["core"]),
    cwd: dir,
    files: [file],
  });
  const eslint = await lib.eslintPreset({
    cwd: dir,
    inline: true,
    presets: ["core"],
  });
  const res = await eslint.lintFiles([file]);
  const meta = eslint.getRulesMetaForResults(res);
  const es = res.flatMap((r) =>
    r.messages
      .filter((m) => m.ruleId)
      .map((m) => ({
        help: meta[m.ruleId]?.docs?.description ?? null,
        line: m.line,
        message: m.message,
        rule: m.ruleId,
      }))
  );
  const bi = lib
    .runBiome({
      configDir: lib.biomePresetConfig(["core"], { lintOnly: true }),
      cwd: dir,
      files: [file],
    })
    .filter((d) => !/^(?:suppressions\/)/.test(d.rule));
  const count = (ds) =>
    ds.reduce((o, d) => ({ ...o, [d.rule]: (o[d.rule] ?? 0) + 1 }), {});
  const topic = (ds) =>
    ds
      .filter((d) => TOPIC_RULES.test(d.rule))
      .map((d) => ({
        help: lib.scrub(d.help ?? null),
        line: d.line,
        message: d.message,
        rule: d.rule,
      }));
  return {
    biome: { byRule: count(bi), topic: topic(bi) },
    eslint: { byRule: count(es), topic: topic(es) },
    oxlint: { byRule: count(ox), topic: topic(ox) },
  };
};
const tscOf = (id, text) => {
  const s = oracle.SUBJECTS[id];
  const dir = stageDir(id, text, "tsc");
  const program = ts.createProgram([join(dir, s.file)], {
    lib: ["lib.es2023.d.ts", "lib.dom.d.ts"],
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    noEmit: true,
    paths: {
      "@trpc/server/unstable-core-do-not-import": [
        join(dir, "stubs/unstable-core-do-not-import.ts"),
      ],
    },
    skipLibCheck: true,
    strict: true,
    target: ts.ScriptTarget.ES2022,
    typeRoots: [join(lib.ULTRACITE, "node_modules/@types")],
    types: ["node"],
    verbatimModuleSyntax: ORIGINS[id].verbatimModuleSyntax,
  });
  return ts
    .getPreEmitDiagnostics(program)
    .filter((d) => d.file && d.file.fileName.endsWith(s.file))
    .map((d) => ({
      code: d.code,
      line: d.file.getLineAndCharacterOfPosition(d.start).line + 1,
      message: lib.scrub(
        ts.flattenDiagnosticMessageText(d.messageText, " ").slice(0, 200)
      ),
    }));
};
const importLines = (text) =>
  text
    .split("\n")
    .filter(
      (l, i, all) =>
        /^(?:import|export \{|\} from)|^\s+(?:type )?[A-Za-z_$][\w$]*,$/.test(
          l
        ) &&
        all.slice(0, i + 1).some((x) => /^import/.test(x)) &&
        !all
          .slice(0, i)
          .some((x) =>
            /^(?:export (?:async )?function|export const|export class|type |interface )/.test(
              x
            )
          )
    )
    .join("\n");
// What the loop hands over: one fix pass with the linter's preset, then the report.
const handoff = async (id, text, linter) => {
  const s = oracle.SUBJECTS[id];
  const dir = stageDir(id, text, `handoff-${linter}`);
  await lib.ultraciteFix({
    cwd: dir,
    files: [s.file],
    linter,
    presets: ["core"],
  });
  const after = readFileSync(join(dir, s.file), "utf8");
  const lint = await lintAll(dir, s.file);
  return { after, imports: importLines(after), lint: lint[linter] };
};
const MODES = ["repo", "kept", "elided"];
const verdicts = (id, refs, text) =>
  Object.fromEntries(
    MODES.map((m) => [m, oracle.verdict(refs[m], oracle.trace(id, text, m))])
  );

const main = async () => {
  await lib.loadCompilers();
  const result = {
    generated: new Date().toISOString(),
    note: "See the header of type-imports-examples.cjs. stripFields: the header fields that name a rule or the expected answer; strip them before an agent sees a subject. handoff: what one `ultracite fix` pass leaves for the agent per linter (Oxlint is Ultracite's default). Per variant: rules added and removed against the subject in each linter (Ultracite's core presets), the topic rules' reports, tsc diagnostics, the oracle's verdict in each mode (repo: the source repo's setting; kept: imports kept as written; elided: imports used only as types removed), and the same after one Oxlint `ultracite fix` pass.",
    // the oracle's own check that a changed design:paramtypes shows up as "changed"
    oracleSelfTest: oracle.selfTest(),
    stripFields: STRIP_FIELDS,
    subjects: {},
    tools: lib.toolVersions(),
  };
  for (const id of Object.keys(ORIGINS)) {
    const s = oracle.SUBJECTS[id];
    const o = ORIGINS[id];
    const text = readFileSync(join(DIR, s.dir, s.file), "utf8");
    const refs = Object.fromEntries(
      MODES.map((m) => [m, oracle.trace(id, text, m)])
    );
    const lintDir = stageDir(id, text, "lint");
    const lintText = async (t) => {
      writeFileSync(join(lintDir, s.file), t);
      return lintAll(lintDir, s.file);
    };
    const base = await lintText(text);
    const handoffs = {};
    for (const linter of ["oxlint", "eslint", "biome"]) {
      const h = await handoff(id, text, linter);
      handoffs[linter] = {
        imports: h.imports,
        oracle: verdicts(id, refs, h.after),
        reported: h.lint.byRule,
        topic: h.lint.topic,
      };
    }
    const entry = {
      dir: s.dir,
      file: s.file,
      handoff: handoffs,
      lint: base,
      oracle: Object.fromEntries(
        MODES.map((m) => [
          m,
          {
            compile: refs[m].compile,
            evaluated:
              refs[m].trace.evaluatedAtImport ??
              refs[m].trace.off?.evaluatedAtImport ??
              null,
          },
        ])
      ),
      origin: {
        path: o.path,
        permalink: lib.permalink(o.repo, o.path, o.from, o.to),
        repo: o.repo,
        sha: lib.shaOf(o.repo),
      },
      tsc: tscOf(id, text),
      variants: {},
      verbatim: verbatim(id),
    };
    for (const [name, v] of Object.entries(variantsOf(id, text))) {
      const lint = await lintText(v.text);
      const diffRules = (now, then) =>
        Object.fromEntries(
          [...new Set([...Object.keys(now), ...Object.keys(then)])]
            .map((r) => [r, (now[r] ?? 0) - (then[r] ?? 0)])
            .filter(([, d]) => d !== 0)
        );
      const loop = await handoff(id, v.text, "oxlint");
      entry.variants[name] = {
        afterOneFixPass: {
          imports: loop.imports,
          oracle: verdicts(id, refs, loop.after),
          topic: loop.lint.topic.map((d) => d.rule),
        },
        changed: {
          biome: diffRules(lint.biome.byRule, base.biome.byRule),
          eslint: diffRules(lint.eslint.byRule, base.eslint.byRule),
          oxlint: diffRules(lint.oxlint.byRule, base.oxlint.byRule),
        },
        kind: v.kind,
        oracle: verdicts(id, refs, v.text),
        topic: {
          biome: lint.biome.topic.map((d) => d.rule),
          eslint: lint.eslint.topic.map((d) => d.rule),
          oxlint: lint.oxlint.topic.map((d) => d.rule),
        },
        tsc: tscOf(id, v.text).map((d) => `TS${d.code}`),
        ...(v.kind === "right" ? { text: importLines(v.text) } : {}),
      };
      const x = entry.variants[name];
      console.log(
        `${id} ${name}: oracle ${MODES.map((m) => `${m}=${x.oracle[m].verdict}`).join(" ")}; after fix ${MODES.map((m) => `${m}=${x.afterOneFixPass.oracle[m].verdict}`).join(" ")}; tsc ${x.tsc.join(",")}; ox ${JSON.stringify(x.topic.oxlint)}; es ${JSON.stringify(x.topic.eslint)}; bi ${JSON.stringify(x.topic.biome)}`
      );
    }
    result.subjects[id] = entry;
    console.log(
      `${id}: verbatim ${JSON.stringify(entry.verbatim)}; tsc ${JSON.stringify(entry.tsc)}; oxlint ${JSON.stringify(base.oxlint.byRule)}; handoff oxlint ${JSON.stringify(handoffs.oxlint.reported)} oracle ${MODES.map((m) => `${m}=${handoffs.oxlint.oracle[m].verdict}`).join(" ")}; eslint ${JSON.stringify(handoffs.eslint.reported)} ${MODES.map((m) => `${m}=${handoffs.eslint.oracle[m].verdict}`).join(" ")}; biome ${JSON.stringify(handoffs.biome.reported)} ${MODES.map((m) => `${m}=${handoffs.biome.oracle[m].verdict}`).join(" ")}`
    );
  }
  writeFileSync(
    join(DIR, "examples.json"),
    `${JSON.stringify(lib.scrubDeep(result), null, 2)}\n`
  );
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
