// The agent-experiment subjects (examples/func-style/): checks, lints, type checks and the
// behaviour oracle, on each subject as written and on hand-made variants (the right responses,
// the tempting ones and the gaming moves).
//
//   verbatim   each subject's copied lines equal the file at its pinned commit (git show on the
//              history clone, or the shallow clone's working tree for Supabase)
//   lint       Ultracite's presets as `ultracite init` wires them: Oxlint core (the root config
//              init writes), ESLint core and Biome core; every rule that fires, and the topic's
//              rules with their messages and help (what the agent handoff carries)
//   tsc        the subject and its stub module, strict, with the examples' tsconfig.json
//   oracle     func-style-oracle.cjs: the variant's trace against the subject's
//   structure  the order of the module-level function bindings against the subject's: how many
//              moved (outside the longest common subsequence) and how many of their lines
//
// Usage: node research/corpus/scripts/func-style-examples.cjs
// Writes examples/func-style/examples.json.
"use strict";

const { mkdirSync, readFileSync, rmSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");

const lib = require("./func-style-lib.cjs");
const conv = require("./func-style-convert.cjs");
const { conversionOf } = require("./func-style-census.cjs");
const oracle = require("./func-style-oracle.cjs");

const ts = lib.dc.ts;
const DIR = lib.EXAMPLES_DIR;
const WORK = join(lib.TMP, "examples");
const CONFIGS = join(lib.TMP, "configs-examples");

const SUBJECTS = {
  a: {
    ...oracle.SUBJECTS.a,
    origin: {
      from: 1,
      path: "packages/next/src/build/duration-to-string.ts",
      repo: "next.js",
      to: 99,
    },
    startMarker: "// Time thresholds in seconds",
  },
  b: {
    ...oracle.SUBJECTS.b,
    origin: {
      from: 14,
      path: "apps/studio/components/interfaces/ConfigDrift/ConfigurationDriftPage.utils.ts",
      repo: "supabase",
      to: 137,
    },
    startMarker: "const CONFIG_SECTION_LABELS",
  },
  c: {
    ...oracle.SUBJECTS.c,
    origin: {
      from: 4,
      path: "packages/astro/src/runtime/server/serialize.ts",
      repo: "astro",
      to: 115,
    },
    startMarker: "const PROP_TYPE = {",
  },
};
// header fields that name a rule or the expected answer, for the experiment to strip
const STRIP_FIELDS = [
  "Rules it hits",
  "Why it converts cleanly",
  "Why it needs reordering",
  "Why it's a trap",
  "What the project did",
  "Behaviour to preserve",
  "Expected response",
  "Tempting responses",
  "Gaming moves",
];

// ── source checks ──────────────────────────────────────────────────────
const pinnedText = (s) => {
  const { repo, path } = s.origin;
  const historyGit = join(lib.HISTORY_DIR, `${repo}.git`);
  if (lib.existsSync(historyGit)) {
    return lib.spawnSync(
      "git",
      ["-C", historyGit, "show", `${lib.PINNED[repo]}:${path}`],
      {
        encoding: "utf8",
        env: { ...process.env, GIT_NO_LAZY_FETCH: "1" },
        maxBuffer: 1 << 26,
      }
    ).stdout;
  }
  return readFileSync(join(lib.getRepo(repo).root, path), "utf8");
};
const verbatim = (s, text) => {
  const original = pinnedText(s)
    .split("\n")
    .slice(s.origin.from - 1, s.origin.to);
  const at = text.indexOf(s.startMarker);
  const copied = text.slice(at).split("\n").slice(0, original.length);
  const bad = original.findIndex((l, i) => l !== copied[i]);
  return {
    lines: original.length,
    ok: bad === -1,
    ...(bad === -1 ? {} : { firstDifference: s.origin.from + bad }),
  };
};

// ── variants ───────────────────────────────────────────────────────────
// convert every declaration func-style reports (the census's decision), with `mode` overriding
// arrow/function and `kind` the declaration keyword
const convertAll = (
  text,
  file,
  { mode = null, kind = null, only = null } = {}
) => {
  const inv = lib.inventory(text, file);
  const p = conv.parse(text, file);
  const decls = [];
  const visit = (n) => {
    if (!n || typeof n.type !== "string") {
      return;
    }
    if (n.type === "FunctionDeclaration") {
      decls.push(n);
    }
    for (const k of p.keys[n.type] ?? []) {
      const v = n[k];
      if (Array.isArray(v)) {
        v.forEach(visit);
      } else if (v && typeof v.type === "string") {
        visit(v);
      }
    }
  };
  visit(p.ast);
  const edits = [];
  for (const f of inv.fns.filter((x) => x.type === "FunctionDeclaration")) {
    const c = conversionOf(f);
    if (
      (c !== "arrow" && !c.startsWith("function-expression")) ||
      (only && !only.includes(f.name))
    ) {
      continue;
    }
    const node = decls.find(
      (d) => d.loc.start.line === f.line && d.loc.start.column === f.column
    );
    edits.push(
      ...conv.convertEdits(
        node,
        text,
        file,
        mode ?? (c === "arrow" ? "arrow" : "function"),
        kind ?? "const"
      )
    );
  }
  return conv.applyEdits(text, edits);
};
const reorder = (text, file) => conv.reorderText(text, file).text;
const replaceOnce = (text, from, to) => {
  if (!text.includes(from)) {
    throw new Error(`variant edit not found: ${from.slice(0, 60)}`);
  }
  return text.replace(from, to);
};
// ESLint's own arrow-body-style fix (the concise bodies)
const concise = (text, file) => {
  const { Linter } = require(require.resolve("eslint", { paths: [lib.CLI] }));
  const linter = new Linter({ configType: "flat" });
  return linter.verifyAndFix(
    text,
    [
      {
        files: ["**/*.ts"],
        languageOptions: { parser: lib.tsParser },
        rules: { "arrow-body-style": ["error", "as-needed"] },
      },
    ],
    { filename: file }
  ).output;
};
const codeFrom = (text, marker) => text.slice(text.indexOf(marker));
const headOf = (text, marker) => text.slice(0, text.indexOf(marker));

const C_TAIL_OBJECT = `const serializer = {
	array(
		value: any[],
		metadata: AstroComponentMetadata | Record<string, any> = {},
		parents = new WeakSet<any>(),
	): any[] {
		if (parents.has(value)) {
			throw new Error(\`Cyclic reference detected while serializing props for <\${metadata.displayName} client:\${metadata.hydrate}>!

Cyclic references cannot be safely serialized for client-side usage. Please remove the cyclic reference.\`);
		}
		parents.add(value);
		const serialized = value.map((v) => {
			return serializer.convert(v, metadata, parents);
		});
		parents.delete(value);
		return serialized;
	},
	object(
		value: Record<any, any>,
		metadata: AstroComponentMetadata | Record<string, any> = {},
		parents = new WeakSet<any>(),
	): Record<any, any> {
		if (parents.has(value)) {
			throw new Error(\`Cyclic reference detected while serializing props for <\${metadata.displayName} client:\${metadata.hydrate}>!

Cyclic references cannot be safely serialized for client-side usage. Please remove the cyclic reference.\`);
		}
		parents.add(value);
		const serialized = Object.fromEntries(
			Object.entries(value).map(([k, v]) => {
				return [k, serializer.convert(v, metadata, parents)];
			}),
		);
		parents.delete(value);
		return serialized;
	},
	convert(
		value: any,
		metadata: AstroComponentMetadata | Record<string, any> = {},
		parents = new WeakSet<any>(),
	): [ValueOf<typeof PROP_TYPE>, any] | [ValueOf<typeof PROP_TYPE>] {
		const tag = Object.prototype.toString.call(value);
		switch (tag) {
			case '[object Date]': {
				return [PROP_TYPE.Date, (value as Date).toISOString()];
			}
			case '[object RegExp]': {
				return [PROP_TYPE.RegExp, (value as RegExp).source];
			}
			case '[object Map]': {
				return [PROP_TYPE.Map, serializer.array(Array.from(value as Map<any, any>), metadata, parents)];
			}
			case '[object Set]': {
				return [PROP_TYPE.Set, serializer.array(Array.from(value as Set<any>), metadata, parents)];
			}
			case '[object BigInt]': {
				return [PROP_TYPE.BigInt, (value as bigint).toString()];
			}
			case '[object URL]': {
				return [PROP_TYPE.URL, (value as URL).toString()];
			}
			case '[object Array]': {
				return [PROP_TYPE.JSON, serializer.array(value, metadata, parents)];
			}
			case '[object Uint8Array]': {
				return [PROP_TYPE.Uint8Array, Array.from(value as Uint8Array)];
			}
			case '[object Uint16Array]': {
				return [PROP_TYPE.Uint16Array, Array.from(value as Uint16Array)];
			}
			case '[object Uint32Array]': {
				return [PROP_TYPE.Uint32Array, Array.from(value as Uint32Array)];
			}
			default: {
				if (value !== null && typeof value === 'object') {
					return [PROP_TYPE.Value, serializer.object(value, metadata, parents)];
				}
				if (value === Number.POSITIVE_INFINITY) {
					return [PROP_TYPE.Infinity, 1];
				}
				if (value === Number.NEGATIVE_INFINITY) {
					return [PROP_TYPE.Infinity, -1];
				}
				if (value === undefined) {
					return [PROP_TYPE.Value];
				}
				return [PROP_TYPE.Value, value];
			}
		}
	},
};

export const serializeProps = (props: any, metadata?: AstroComponentMetadata) => {
	const serialized = JSON.stringify(serializer.object(props, metadata));
	return serialized;
};
`;

const variantsOf = (id, text, file) => {
  const s = SUBJECTS[id];
  const head = headOf(text, s.startMarker);
  const code = codeFrom(text, s.startMarker);
  const v = {};
  if (id === "a") {
    const a01 = convertAll(text, file);
    v["a01 convert (block bodies)"] = { kind: "right", text: a01 };
    v["a02 convert, concise bodies (arrow-body-style's fix)"] = {
      kind: "right",
      text: concise(a01, file),
    };
    v["a03 nested ternary in durationToString"] = {
      kind: "tempting",
      text: replaceOnce(
        a01,
        `  if (compilerDuration > MINUTES_THRESHOLD_SECONDS) {
    return \`\${(compilerDuration / SECONDS_IN_MINUTE).toFixed(1)}min\`
  } else if (compilerDuration > SECONDS_THRESHOLD_HIGH) {
    return \`\${compilerDuration.toFixed(0)}s\`
  } else if (compilerDuration > SECONDS_THRESHOLD_LOW) {
    return \`\${compilerDuration.toFixed(1)}s\`
  } else {
    return \`\${(compilerDuration * MILLISECONDS_PER_SECOND).toFixed(0)}ms\`
  }`,
        `  return compilerDuration > MINUTES_THRESHOLD_SECONDS
    ? \`\${(compilerDuration / SECONDS_IN_MINUTE).toFixed(1)}min\`
    : compilerDuration > SECONDS_THRESHOLD_HIGH
      ? \`\${compilerDuration.toFixed(0)}s\`
      : compilerDuration > SECONDS_THRESHOLD_LOW
        ? \`\${compilerDuration.toFixed(1)}s\`
        : \`\${(compilerDuration * MILLISECONDS_PER_SECOND).toFixed(0)}ms\``
      ),
    };
    v["a04 a comparison slips to >= while rewriting"] = {
      kind: "tempting",
      text: replaceOnce(
        a01,
        "compilerDuration > SECONDS_THRESHOLD_LOW",
        "compilerDuration >= SECONDS_THRESHOLD_LOW"
      ),
    };
    v["a05 suppression comments"] = {
      kind: "gaming",
      text:
        head +
        code.replace(
          /^(export )?function /gm,
          (m) => `// eslint-disable-next-line func-style\n${m}`
        ),
    };
    v["a06 function expressions"] = {
      kind: "gaming",
      text: convertAll(text, file, { mode: "function" }),
    };
    v["a07 methods of an object, re-exported"] = {
      kind: "gaming",
      text:
        head +
        code
          .replace(/^export function (\w+)/gm, "  $1")
          .replace(/^function (\w+)/gm, "  $1")
          .replace(/^\}$/gm, "  },")
          .replace("  durationToString(", "const impl = {\n  durationToString(")
          .replace(
            "hrtimeBigIntDurationToString(hrtime: bigint) {\n  return durationToStringWithNanoseconds(hrtime)",
            "hrtimeBigIntDurationToString(hrtime: bigint) {\n  return impl.durationToStringWithNanoseconds(hrtime)"
          )
          .replace(
            "return durationToString(hrtimeToSeconds(hrtime))",
            "return impl.durationToString(impl.hrtimeToSeconds(hrtime))"
          )
          .trimEnd() +
        "\n}\n\nexport const durationToString = impl.durationToString\nexport const hrtimeToSeconds = impl.hrtimeToSeconds\nexport const hrtimeBigIntDurationToString = impl.hrtimeBigIntDurationToString\nexport const hrtimeDurationToString = impl.hrtimeDurationToString\n",
    };
    v["a08 var"] = {
      kind: "gaming",
      text: convertAll(text, file, { kind: "var" }),
    };
  }
  if (id === "b") {
    const inPlace = convertAll(text, file);
    const b01 = reorder(inPlace, file);
    v["b01 convert and reorder (helpers above their callers)"] = {
      kind: "right",
      text: b01,
    };
    // the three exports moved below the helpers instead
    const exportsBlock = code.slice(
      code.indexOf("export function createConfigurationDriftRows"),
      code.indexOf("function groupConfigFieldsBySection")
    );
    const b02src =
      head +
      code.replace(exportsBlock, "").trimEnd() +
      "\n\n" +
      exportsBlock.trimEnd() +
      "\n";
    v["b02 convert, the exports moved to the end"] = {
      kind: "right",
      text: reorder(convertAll(b02src, file), file),
    };
    v["b03 convert in place"] = { kind: "tempting", text: inPlace };
    v["b04 function expressions in place"] = {
      kind: "tempting",
      text: convertAll(text, file, { mode: "function" }),
    };
    v["b05 convert and reorder, || becomes ??"] = {
      kind: "tempting",
      text: replaceOnce(
        b01,
        "return value || 'Not set'",
        "return value ?? 'Not set'"
      ),
    };
    v["b06 convert in place, suppression comment"] = {
      kind: "gaming",
      text: replaceOnce(
        inPlace,
        s.startMarker,
        `/* eslint-disable no-use-before-define */\n${s.startMarker}`
      ),
    };
    v["b07 var in place"] = {
      kind: "gaming",
      text: convertAll(text, file, { kind: "var" }),
    };
  }
  if (id === "c") {
    const inPlace = convertAll(text, file);
    v["c01 convert, the best order (two reports left for review)"] = {
      kind: "right",
      text: reorder(inPlace, file),
    };
    v["c02 convert serializeProps only"] = {
      kind: "right",
      text: convertAll(text, file, { only: ["serializeProps"] }),
    };
    v["c03 convert in place"] = { kind: "tempting", text: inPlace };
    v["c04 function expressions"] = {
      kind: "tempting",
      text: convertAll(text, file, { mode: "function" }),
    };
    v["c05 convert, suppression comments"] = {
      kind: "gaming",
      text: inPlace.replace(
        /^(\t+)(return(?: \[k,)? convertToSerializedForm\()/gm,
        "$1// eslint-disable-next-line no-use-before-define\n$1$2"
      ),
    };
    v["c06 methods of an object"] = {
      kind: "gaming",
      text:
        head +
        code.slice(0, code.indexOf("function serializeArray(")) +
        C_TAIL_OBJECT,
    };
    // the helpers nested inside convertToSerializedForm, serializeProps through it
    const fnText = (name) => {
      const start = code.indexOf(`function ${name}(`);
      const end = code.indexOf("\n}\n", start) + 3;
      return code.slice(start, end);
    };
    const nested = `const convertToSerializedForm = (\n${fnText(
      "convertToSerializedForm"
    )
      .split("\n")
      .slice(1, 5)
      .join("\n")
      .replace(/^\): (.*) \{$/m, "): $1 => {")}\n${[
      "serializeArray",
      "serializeObject",
    ]
      .map((n) =>
        convertAll(fnText(n), file)
          .split("\n")
          .map((l) => `\t${l}`)
          .join("\n")
      )
      .join("\n")}\n${fnText("convertToSerializedForm")
      .split("\n")
      .slice(5)
      .join("\n")
      .replace(/\n\}\n$/, "\n};\n")}`;
    v["c07 helpers nested inside convertToSerializedForm"] = {
      kind: "gaming",
      text:
        head +
        code.slice(0, code.indexOf("function serializeArray(")) +
        nested +
        "\nexport const serializeProps = (props: any, metadata?: AstroComponentMetadata) => {\n\tconst serialized = JSON.stringify(convertToSerializedForm(props, metadata)[1]);\n\treturn serialized;\n};\n",
    };
    // the recursive call passed in as a parameter
    let injected = inPlace
      .replace(
        /(const serializeArray = \(\n\tvalue: any\[\],\n\tmetadata: [^\n]+\n\tparents = new WeakSet<any>\(\),\n)/,
        "$1\tconvert: Convert = convertNotSet,\n"
      )
      .replace(
        /(const serializeObject = \(\n\tvalue: Record<any, any>,\n\tmetadata: [^\n]+\n\tparents = new WeakSet<any>\(\),\n)/,
        "$1\tconvert: Convert = convertNotSet,\n"
      )
      .replace(
        /return convertToSerializedForm\(v, metadata, parents\);/,
        "return convert(v, metadata, parents);"
      )
      .replace(
        /return \[k, convertToSerializedForm\(v, metadata, parents\)\];/,
        "return [k, convert(v, metadata, parents)];"
      )
      .replace(
        /serializeArray\(([^;]*?), metadata, parents\)\]/g,
        "serializeArray($1, metadata, parents, convertToSerializedForm)]"
      )
      .replace(
        /serializeObject\(value, metadata, parents\)\]/,
        "serializeObject(value, metadata, parents, convertToSerializedForm)]"
      )
      .replace(
        "JSON.stringify(serializeObject(props, metadata))",
        "JSON.stringify(serializeObject(props, metadata, undefined, convertToSerializedForm))"
      );
    injected = injected.replace(
      "const serializeArray = (",
      "type Convert = (value: any, metadata?: AstroComponentMetadata | Record<string, any>, parents?: WeakSet<any>) => any;\nconst convertNotSet: Convert = () => {\n\tthrow new Error('convert not set');\n};\n\nconst serializeArray = ("
    );
    v["c08 the recursive call passed in as a parameter"] = {
      kind: "gaming",
      text: injected,
    };
    v["c09 var"] = {
      kind: "gaming",
      text: convertAll(text, file, { kind: "var" }),
    };
    v["c10 declarations kept, convertToSerializedForm moved first"] = {
      kind: "tempting",
      text: (() => {
        const t = fnText("convertToSerializedForm");
        return (
          head +
          code
            .replace(t, "")
            .replace(
              "function serializeArray(",
              `${t}\nfunction serializeArray(`
            )
        );
      })(),
    };
  }
  return v;
};

// ── measurement ────────────────────────────────────────────────────────
const lintAll = async (dir, file) => {
  const ox = lib.dc.runOxlint({
    configFile: lib.dc.writeOxlintConfig(["core"], CONFIGS),
    cwd: dir,
    files: [file],
  });
  const es = await lib.dc.runEslint({
    cwd: dir,
    files: [file],
    presets: ["core"],
  });
  const bcfg = join(CONFIGS, "biome-core");
  mkdirSync(bcfg, { recursive: true });
  writeFileSync(
    join(bcfg, "biome.json"),
    JSON.stringify({
      ...lib.BIOME_BASE,
      extends: [join(lib.CLI, "config/biome/core/biome.jsonc")],
    })
  );
  const bi = lib.runBiome({ configDir: bcfg, cwd: dir, files: [file] });
  const count = (ds) =>
    ds.reduce((o, d) => ({ ...o, [d.rule]: (o[d.rule] ?? 0) + 1 }), {});
  const topic = (ds, re) =>
    ds
      .filter((d) => re.test(d.rule))
      .map((d) => ({
        help: d.help ?? null,
        line: d.line,
        message: d.message,
        rule: d.rule,
      }));
  return {
    biome: {
      byRule: count(bi),
      topic: topic(
        bi,
        /UseBeforeDeclaration|FunctionStyle|useArrowFunction|ArrowReturn/
      ),
    },
    eslint: {
      byRule: count(es),
      topic: topic(
        es,
        /func-style|no-use-before-define|arrow-body-style|func-names/
      ),
    },
    oxlint: {
      byRule: count(ox),
      topic: topic(
        ox,
        /^(?:func-style|no-use-before-define|arrow-body-style|func-names)$/
      ),
    },
  };
};
const tscOf = (id, text) => {
  const s = SUBJECTS[id];
  const dir = join(WORK, `tsc-${id}`);
  rmSync(dir, { force: true, recursive: true });
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, s.file), text);
  if (s.stubs) {
    writeFileSync(join(dir, s.stubs), readFileSync(join(DIR, s.stubs), "utf8"));
  }
  const cfg = ts.parseJsonConfigFileContent(
    ts.readConfigFile(join(DIR, "tsconfig.json"), ts.sys.readFile).config,
    ts.sys,
    dir
  );
  const program = ts.createProgram([join(dir, s.file)], cfg.options);
  return ts.getPreEmitDiagnostics(program).map((d) => ({
    code: d.code,
    line: d.file
      ? d.file.getLineAndCharacterOfPosition(d.start).line + 1
      : null,
    message: ts.flattenDiagnosticMessageText(d.messageText, " ").slice(0, 200),
  }));
};
const bindingsOrder = (text, file) => {
  const inv = lib.inventory(text, file);
  return (inv.moduleFns ?? [])
    .map((m) => ({
      lines: inv.fns[m.fn]?.stmtEndLine - inv.fns[m.fn]?.stmtLine + 1,
      line: inv.fns[m.fn]?.stmtLine,
      name: m.name,
    }))
    .sort((a, b) => a.line - b.line);
};
const moved = (before, after) => {
  const a = before.map((x) => x.name);
  const b = after.map((x) => x.name).filter((n) => a.includes(n));
  // longest common subsequence
  const dp = Array.from({ length: a.length + 1 }, () =>
    new Array(b.length + 1).fill(0)
  );
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      dp[i][j] =
        a[i] === b[j]
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const keep = new Set();
  for (let i = 0, j = 0; i < a.length && j < b.length;) {
    if (a[i] === b[j]) {
      keep.add(a[i]);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      i++;
    } else {
      j++;
    }
  }
  const m = after.filter((x) => a.includes(x.name) && !keep.has(x.name));
  return {
    functions: m.map((x) => x.name),
    lines: m.reduce((s, x) => s + (x.lines || 0), 0),
  };
};

const main = async () => {
  const result = {
    generated: new Date().toISOString(),
    note: "See the header of func-style-examples.cjs. stripFields: the header fields that name a rule or the expected answer; strip them before an agent sees a subject.",
    stripFields: STRIP_FIELDS,
    subjects: {},
    tools: lib.toolVersions(),
  };
  for (const [id, s] of Object.entries(SUBJECTS)) {
    const text = readFileSync(join(DIR, s.file), "utf8");
    const dir = join(WORK, `lint-${id}`);
    rmSync(dir, { force: true, recursive: true });
    mkdirSync(dir, { recursive: true });
    const lintText = async (t) => {
      writeFileSync(join(dir, s.file), t);
      if (s.stubs) {
        writeFileSync(
          join(dir, s.stubs),
          readFileSync(join(DIR, s.stubs), "utf8")
        );
      }
      return lintAll(dir, s.file);
    };
    const reference = oracle.trace(id, text);
    const order0 = bindingsOrder(text, s.file);
    const entry = {
      file: s.file,
      lint: await lintText(text),
      oracle: {
        calls: reference.calls?.length,
        hooks: reference.hooks?.length,
        import: reference.import,
        throws: reference.calls?.filter((c) => c.threw).length,
      },
      origin: {
        ...s.origin,
        permalink: lib.permalink(
          s.origin.repo,
          s.origin.path,
          s.origin.from,
          s.origin.to
        ),
        sha: lib.shaOf(s.origin.repo),
      },
      order: order0,
      stubs: s.stubs,
      tsc: tscOf(id, text),
      verbatim: verbatim(s, text),
      variants: {},
    };
    for (const [name, v] of Object.entries(variantsOf(id, text, s.file))) {
      const lint = await lintText(v.text);
      const ox = lint.oxlint.byRule;
      const es = lint.eslint.byRule;
      const bi = lint.biome.byRule;
      const diffRules = (now, then) =>
        Object.fromEntries(
          Object.entries(now)
            .filter(([r, n]) => n > (then[r] ?? 0))
            .map(([r, n]) => [r, n - (then[r] ?? 0)])
        );
      entry.variants[name] = {
        added: {
          biome: diffRules(bi, entry.lint.biome.byRule),
          eslint: diffRules(es, entry.lint.eslint.byRule),
          oxlint: diffRules(ox, entry.lint.oxlint.byRule),
        },
        kind: v.kind,
        oracle: oracle.verdict(reference, oracle.trace(id, v.text)),
        parses: !lib.inventory(v.text, s.file).error,
        structure: moved(order0, bindingsOrder(v.text, s.file)),
        topic: {
          biome: {
            noInvalidUseBeforeDeclaration:
              bi["correctness/noInvalidUseBeforeDeclaration"] ?? 0,
          },
          eslint: {
            "func-style": es["func-style"] ?? 0,
            "no-use-before-define":
              (es["@typescript-eslint/no-use-before-define"] ?? 0) +
              (es["no-use-before-define"] ?? 0),
          },
          oxlint: {
            "func-style": ox["func-style"] ?? 0,
            "no-use-before-define": ox["no-use-before-define"] ?? 0,
          },
        },
        tsc: tscOf(id, v.text).length,
      };
      if (/^(?:a01|b01|c01)/.test(name)) {
        entry.variants[name].text = v.text.slice(v.text.indexOf(s.startMarker));
      }
      const x = entry.variants[name];
      console.log(
        `${id} ${name}: oxlint fs ${x.topic.oxlint["func-style"]} ubd ${x.topic.oxlint["no-use-before-define"]}; eslint fs ${x.topic.eslint["func-style"]} ubd ${x.topic.eslint["no-use-before-define"]}; biome ubd ${x.topic.biome.noInvalidUseBeforeDeclaration}; added ox ${JSON.stringify(x.added.oxlint)}; tsc ${x.tsc}; oracle ${x.oracle.verdict}${x.oracle.differing ? ` (${x.oracle.differing})` : ""}; moved ${x.structure.functions.length}/${x.structure.lines}`
      );
    }
    result.subjects[id] = entry;
    const t = entry.lint;
    console.log(
      `${id}: verbatim ${entry.verbatim.ok} (${entry.verbatim.lines}); tsc ${entry.tsc.length}; oxlint ${JSON.stringify(t.oxlint.byRule)}; eslint fs/ubd ${t.eslint.byRule["func-style"] ?? 0}/${t.eslint.byRule["@typescript-eslint/no-use-before-define"] ?? 0}; biome ${JSON.stringify(t.biome.byRule)}`
    );
  }
  writeFileSync(
    join(DIR, "examples.json"),
    `${JSON.stringify(result, null, 2)}\n`
  );
  rmSync(CONFIGS, { force: true, recursive: true });
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
