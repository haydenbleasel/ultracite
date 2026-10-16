// Lints the agent-experiment subjects in examples/accessibility/ with Ultracite's three linters,
// type-checks them, and checks the behaviour their headers claim with a static oracle. It does the
// same for hand-made variants of each subject (the tempting fixes and the right ones), which is the
// evasion matrix on real code.
//
// The oracle (research/agent-experiment/scripts/topics/accessibility-behavior.cjs, shared with the
// agent experiment, which runs it on every agent edit) never runs a cloned repo's code. It
// transpiles the subject (TypeScript's transpileModule, react-jsx), runs it with React 19 and
// react-dom/server from the repo's Bun store, and wraps React's JSX runtime and createElement so
// every host element's props are recorded (and tagged with a data attribute, so the rendered markup
// can be tied back to them). Then:
//   A (Collapsible)  finds the element whose onClick calls openTrigger and records whether it is a
//                    native control or has role + tabIndex >= 0 + a key handler that calls
//                    openTrigger for Enter and for Space (called with synthetic events); whether it,
//                    or an ancestor, is hidden from assistive technology; its accessible name;
//                    aria-expanded; and that clicking, the label, the icon and the children behave
//                    as before.
//   B (TopPicks)     for each swatch button of each picker type: hidden or not, the accessible name
//                    (aria-labelledby, aria-label, text content outside aria-hidden, then title),
//                    whether that name is a colour code, whether it contains the colour's palette
//                    name, whether the five names are distinct, and that clicking calls onChange with
//                    the swatch's colour.
// No DOM or axe-core is needed for these checks: they read props and the rendered markup. What they
// can't judge (focus order across the page, how a particular screen reader voices the name, CSS)
// is listed in examples.json.
//
// Usage (from the repo root):
//   node --max-old-space-size=8192 research/corpus/scripts/a11y-examples.cjs
// Writes examples/accessibility/examples.json.
"use strict";

const { mkdirSync, readFileSync, rmSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");

const lib = require("./a11y-lib.cjs");

const { ts } = lib;
const DIR = lib.EXAMPLES_DIR;
// The behaviour oracle lives with the agent experiment, which runs it on every agent edit; this script
// uses the same implementation for the subjects and the variants below.
const {
  ORACLES,
  TYPES_REACT,
} = require("../../agent-experiment/scripts/topics/accessibility-behavior.cjs");

const SUBJECTS = [
  {
    file: "a11y-a-excalidraw-collapsible.tsx",
    id: "a11y-a",
    oracle: "collapsible",
  },
  { file: "a11y-b-excalidraw-top-picks.tsx", id: "a11y-b", oracle: "topPicks" },
];
const STRIP_FIELDS = [
  "Accessibility subject A",
  "Accessibility subject B",
  "Rules it hits",
  "The barrier",
  "Behaviour to preserve",
  "Expected fix",
  "Tempting fixes",
  "History",
];

// Hand-made variants: [id, description, fixesBarrier (by construction), edits on the subject].
const DIV_OPEN = `        className={className}
        onClick={openTrigger}
      >`;
const VARIANTS = {
  "a11y-a": [
    [
      "a01",
      "onKeyDown={() => {}}",
      "no",
      [
        [
          DIV_OPEN,
          `        className={className}
        onClick={openTrigger}
        onKeyDown={() => {}}
      >`,
        ],
      ],
    ],
    [
      "a02",
      'role="button" tabIndex={0}',
      "partly",
      [
        [
          DIV_OPEN,
          `        className={className}
        onClick={openTrigger}
        role="button"
        tabIndex={0}
      >`,
        ],
      ],
    ],
    [
      "a03",
      'role="button" tabIndex={0} onKeyDown={() => {}}',
      "no",
      [
        [
          DIV_OPEN,
          `        className={className}
        onClick={openTrigger}
        onKeyDown={() => {}}
        role="button"
        tabIndex={0}
      >`,
        ],
      ],
    ],
    [
      "a04",
      "role, tabIndex and an onKeyDown for Enter only",
      "partly",
      [
        [
          DIV_OPEN,
          `        className={className}
        onClick={openTrigger}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            openTrigger();
          }
        }}
        role="button"
        tabIndex={0}
      >`,
        ],
      ],
    ],
    [
      "a05",
      'role="presentation"',
      "no",
      [
        [
          DIV_OPEN,
          `        className={className}
        onClick={openTrigger}
        role="presentation"
      >`,
        ],
      ],
    ],
    [
      "a06",
      'aria-hidden="true"',
      "no",
      [
        [
          DIV_OPEN,
          `        aria-hidden="true"
        className={className}
        onClick={openTrigger}
      >`,
        ],
      ],
    ],
    [
      "a07",
      "onClick moved into a spread",
      "no",
      [
        [
          DIV_OPEN,
          `        className={className}
        {...{ onClick: openTrigger }}
      >`,
        ],
      ],
    ],
    [
      "a08",
      "onKeyUp={openTrigger} only (not focusable)",
      "no",
      [
        [
          DIV_OPEN,
          `        className={className}
        onClick={openTrigger}
        onKeyUp={openTrigger}
      >`,
        ],
      ],
    ],
    [
      "a09",
      'native <button type="button" aria-expanded={open}>',
      "yes",
      [
        [
          "      <div\n        style={{\n          cursor",
          '      <button\n        aria-expanded={open}\n        type="button"\n        style={{\n          cursor',
        ],
        [
          `        {showCollapsedIcon && (
          <InlineIcon icon={open ? collapseUpIcon : collapseDownIcon} />
        )}
      </div>`,
          `        {showCollapsedIcon && (
          <InlineIcon icon={open ? collapseUpIcon : collapseDownIcon} />
        )}
      </button>`,
        ],
      ],
    ],
    [
      "a10",
      "native <button> without type",
      "yes",
      [
        [
          "      <div\n        style={{\n          cursor",
          "      <button\n        style={{\n          cursor",
        ],
        [
          `        {showCollapsedIcon && (
          <InlineIcon icon={open ? collapseUpIcon : collapseDownIcon} />
        )}
      </div>`,
          `        {showCollapsedIcon && (
          <InlineIcon icon={open ? collapseUpIcon : collapseDownIcon} />
        )}
      </button>`,
        ],
      ],
    ],
    [
      "a11",
      "role, tabIndex, aria-expanded and an onKeyDown for Enter and Space",
      "yes",
      [
        [
          DIV_OPEN,
          `        aria-expanded={open}
        className={className}
        onClick={openTrigger}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openTrigger();
          }
        }}
        role="button"
        tabIndex={0}
      >`,
        ],
      ],
    ],
  ],
  "a11y-b": [
    [
      "b01",
      "aria-label={color}",
      "no",
      [
        [
          "              title={color}\n",
          "              title={color}\n              aria-label={color}\n",
        ],
      ],
    ],
    [
      "b02",
      'aria-hidden="true" on the button',
      "no",
      [
        [
          "              title={color}\n",
          '              title={color}\n              aria-hidden="true"\n',
        ],
      ],
    ],
    [
      "b03",
      '<span className="sr-only">{color}</span>',
      "no",
      [
        [
          `              <div className="color-picker__button-outline" />
            </button>`,
          `              <div className="color-picker__button-outline" />
              <span className="sr-only">{color}</span>
            </button>`,
        ],
      ],
    ],
    [
      "b04",
      'aria-label="color" (the same for every swatch)',
      "no",
      [
        [
          "              title={color}\n",
          '              title={color}\n              aria-label="color"\n',
        ],
      ],
    ],
    ["b05", "title removed", "no", [["              title={color}\n", ""]]],
    [
      "b06",
      "aria-label={color} and title removed",
      "no",
      [["              title={color}\n", "              aria-label={color}\n"]],
    ],
    [
      "b07",
      "aria-label from the palette name, t(`colors.${colorName}`)",
      "yes",
      [
        [
          "          const displayColor = applyDarkModeFilter(color, theme === THEME.DARK);",
          "          const displayColor = applyDarkModeFilter(color, theme === THEME.DARK);\n          const colorName = getColorNameAndShadeFromColor({\n            palette: COLOR_PALETTE,\n            color,\n          })?.colorName;\n          const label = colorName ? t(`colors.${colorName}`) : color;",
        ],
        [
          "              title={color}\n",
          "              title={color}\n              aria-label={label}\n",
        ],
      ],
    ],
    [
      "b08",
      "palette name plus shade in a visually hidden span",
      "yes",
      [
        [
          "          const displayColor = applyDarkModeFilter(color, theme === THEME.DARK);",
          '          const displayColor = applyDarkModeFilter(color, theme === THEME.DARK);\n          const named = getColorNameAndShadeFromColor({\n            palette: COLOR_PALETTE,\n            color,\n          });\n          const label = named\n            ? `${t(`colors.${named.colorName}`)}${named.shade === null ? "" : ` ${named.shade + 1}`}`\n            : color;',
        ],
        [
          `              <div className="color-picker__button-outline" />
            </button>`,
          `              <div className="color-picker__button-outline" />
              <span className="sr-only">{label}</span>
            </button>`,
        ],
      ],
    ],
    [
      "b09",
      'aria-label={t("colorPicker.color")} ("Color" on every swatch)',
      "no",
      [
        [
          "              title={color}\n",
          '              title={color}\n              aria-label={t("colorPicker.color")}\n',
        ],
      ],
    ],
  ],
};

// ── linting ────────────────────────────────────────────────────────────
const lintFile = async (cwd, file) => {
  const ox = lib.writeOxlintRoot("examples-core+react", ["core", "react"]);
  const oxJs = lib.writeOxlintRoot("examples-core+react+js-plugins", [
    "core",
    "react",
    "js-plugins",
  ]);
  const biomeDir = lib.biomeUltracite(["core"]);
  const pick = (d) => ({
    help: d.help ?? null,
    line: d.line,
    message: d.message,
    rule: d.rule,
  });
  const out = {
    oxlint: lib.runOxlint({ configFile: ox, cwd, files: [file] }).map(pick),
    "oxlint +js-plugins": lib
      .runOxlint({ configFile: oxJs, cwd, files: [file] })
      .map(pick),
    eslint: (
      await lib.runEslint({ crashes: [], cwd, files: [file], keep: null })
    ).map(pick),
    biome: lib.runBiome({ configDir: biomeDir, cwd, files: [file] }).map(pick),
  };
  const split = {};
  for (const [tool, rows] of Object.entries(out)) {
    const isA11y = tool === "biome" ? lib.isBiomeA11y : lib.isA11yRule;
    split[tool] = {
      a11y: rows
        .filter((d) => isA11y(d.rule))
        .sort((a, b) => a.line - b.line || a.rule.localeCompare(b.rule)),
      otherRules: [
        ...new Set(rows.filter((d) => !isA11y(d.rule)).map((d) => d.rule)),
      ].sort(),
    };
  }
  return split;
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

// ── main ───────────────────────────────────────────────────────────────
const applyEdits = (source, edits) => {
  let s = source;
  for (const [a, b] of edits) {
    if (!s.includes(a)) {
      throw new Error(`variant edit not found: ${a.slice(0, 60)}`);
    }
    s = s.replace(a, b);
  }
  return s;
};

const main = async () => {
  const out = {
    generated: new Date().toISOString().slice(0, 10),
    note: "Measured by scripts/a11y-examples.cjs. `lint` lists the accessibility rule hits (message and Oxlint help) and the other rules that fire, per configuration: Oxlint core + react as `ultracite init` writes it, then with js-plugins; ESLint core + react; Biome core. `oracle` is the behaviour check described in the script header. `variants` are hand-made edits of each subject (tempting fixes and right fixes), linted and checked the same way; `fixesBarrier` is the design intent, `oracle.verdict.barrierFixed` the measurement. Header fields named in stripFields hold analysis and must be removed before an agent sees a subject.",
    oracleLimits: [
      "Focus order and focus visibility on the page: the oracle checks tabIndex and native focusability, not where the control sits in the Tab sequence or whether a focus ring shows (that is CSS).",
      "How a screen reader voices a name: the accessible name is a reduced accname computation (aria-labelledby, aria-label, content outside aria-hidden, title). A hex code is judged unhelpful by rule, following excalidraw/excalidraw#3871.",
      "Real key events: handlers are called with synthetic event objects for Enter and Space. A native <button> is credited with Enter and Space activation by the HTML spec, not by dispatching events.",
      "No DOM, axe-core or browser is used; none is installed in the repo. An axe pass would need jsdom (or happy-dom) and axe-core, which the experiment runner could add outside the repo.",
    ],
    stripFields: STRIP_FIELDS,
    subjects: [],
    tools: lib.toolVersions(),
  };
  for (const s of SUBJECTS) {
    const abs = join(DIR, s.file);
    const source = readFileSync(abs, "utf8");
    const entry = {
      file: s.file,
      id: s.id,
      lines: source.split("\n").length,
      lint: await lintFile(DIR, s.file),
      oracle: ORACLES[s.oracle](source),
      typecheck: typecheck(abs),
      variants: [],
    };
    const tmp = join(lib.TMP_DIR, "examples", s.id);
    rmSync(tmp, { force: true, recursive: true });
    mkdirSync(tmp, { recursive: true });
    for (const [id, description, fixesBarrier, edits] of VARIANTS[s.id]) {
      const variantSource = applyEdits(source, edits);
      const name = `${id}.tsx`;
      writeFileSync(join(tmp, name), variantSource);
      const lint = await lintFile(tmp, name);
      let oracle;
      try {
        oracle = ORACLES[s.oracle](variantSource).verdict;
      } catch (error) {
        oracle = { error: String(error.message).slice(0, 200) };
      }
      entry.variants.push({
        description,
        edits,
        fixesBarrier,
        id,
        lint: Object.fromEntries(
          Object.entries(lint).map(([tool, v]) => [
            tool,
            {
              a11y: [...new Set(v.a11y.map((d) => d.rule))],
              otherRules: v.otherRules,
            },
          ])
        ),
        oracle,
        typecheck: typecheck(join(tmp, name)).length,
      });
    }
    out.subjects.push(entry);
    console.log(
      `${s.id}: oracle ${JSON.stringify(entry.oracle.verdict)}; typecheck ${entry.typecheck.length} errors; a11y ${Object.entries(
        entry.lint
      )
        .map(
          ([k, v]) =>
            `${k} ${[...new Set(v.a11y.map((d) => d.rule))].join("+") || "-"}`
        )
        .join("; ")}`
    );
    for (const v of entry.variants) {
      console.log(
        `  ${v.id} (${v.fixesBarrier}) ${v.description}: fixed=${v.oracle.barrierFixed} kept=${v.oracle.behaviourPreserved}${v.oracle.worst ? ` (${v.oracle.worst})` : ""} | ${Object.entries(
          v.lint
        )
          .map(([k, x]) => `${k}: ${x.a11y.join("+") || "-"}`)
          .join("; ")}`
      );
    }
  }
  lib.writeJson(join(DIR, "examples.json"), out);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
