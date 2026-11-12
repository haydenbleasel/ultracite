// The agent-experiment subjects (examples/nested-ternaries/): checks, lints, type checks and the
// behaviour oracle, on each subject as written and on hand-made variants (the right responses,
// the tempting ones and the gaming moves).
//
//   verbatim   each subject's copied lines equal the file at its pinned commit (git show on the
//              history clone, or the shallow clone's working tree for Supabase)
//   lint       Ultracite's presets as `ultracite init` wires them: Oxlint core (+ react for .tsx;
//              the root config init writes), ESLint core (+ react) and Biome core (+ react); every
//              rule that fires, and the topic's rules with their messages and help (what the agent
//              handoff carries)
//   tsc        the subject and its stub module, strict, with the examples' tsconfig.json
//   oracle     nested-ternaries-oracle.cjs: the variant's trace against the subject's
//   cognitive  the sonarjs score of every function in the file, summed
//
// Usage: node research/corpus/scripts/nested-ternaries-examples.cjs
// Writes examples/nested-ternaries/examples.json.
"use strict";

const { mkdirSync, readFileSync, rmSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");

const lib = require("./nested-ternaries-lib.cjs");
const oracle = require("./nested-ternaries-oracle.cjs");

const ts = lib.dc.ts;
const DIR = lib.EXAMPLES_DIR;
const WORK = join(lib.TMP, "examples");
const CONFIGS = join(lib.TMP, "configs-examples");

const SUBJECTS = {
  a: {
    ...oracle.SUBJECTS.a,
    origin: {
      from: 4,
      path: "packages/next/src/shared/lib/page-path/denormalize-page-path.ts",
      repo: "next.js",
      to: 19,
    },
    startMarker: "/**\n * Performs the opposite transformation",
  },
  b: {
    ...oracle.SUBJECTS.b,
    origin: {
      from: 21,
      path: "apps/studio/components/layouts/ExplorerLayout/ExplorerNavNotebooks.tsx",
      repo: "supabase",
      to: 114,
    },
    startMarker: "const NOTEBOOK_ROW_HEIGHT = 28",
  },
  c: {
    ...oracle.SUBJECTS.c,
    origin: {
      from: 8,
      path: "packages/astro/src/vite-plugin-config-alias/index.ts",
      repo: "astro",
      to: 68,
    },
    startMarker: "type Alias = {",
  },
};
// header fields that name a rule or the expected answer, for the experiment to strip
const STRIP_FIELDS = [
  "Rules it hits",
  "Why it unnests cleanly",
  "Why it needs a restructure",
  "Why it's a trap",
  "What the project did",
  "Behaviour to preserve",
  "Expected response",
  "Tempting responses",
  "Gaming moves",
];
const TOPIC_RULES =
  /^(?:no-nested-ternary|unicorn\/no-nested-ternary|sonarjs\/no-nested-conditional|style\/noNestedTernary|lint\/style\/noNestedTernary|unicorn\/prefer-ternary|no-else-return|style\/noUselessElse|lint\/style\/noUselessElse|curly|style\/useBlockStatements|lint\/style\/useBlockStatements|no-lonely-if|unicorn\/no-lonely-if|no-negated-condition|unicorn\/no-negated-condition|unicorn\/prefer-logical-operator-over-ternary|no-unneeded-ternary|unicorn\/prefer-minimal-ternary|react\/jsx-no-leaked-render|suspicious\/noLeakedRender|lint\/suspicious\/noLeakedRender)$/;

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
    ok: at !== -1 && bad === -1,
    ...(bad === -1 ? {} : { firstDifference: s.origin.from + bad }),
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
const A_TERNARY = `  return _page.startsWith('/index/') && !isDynamicRoute(_page)
    ? _page.slice(6)
    : _page !== '/index'
      ? _page
      : '/'`;
const B_TERNARY_START =
  "        {isPending ? (\n          <GenericSkeletonLoader />";
const B_LIST = `<InfiniteListDefault
            className="h-full w-full"
            items={notebooks}
            itemProps={itemProps}
            ItemComponent={NotebookListItem}
            LoaderComponent={LoaderForIconMenuItems}
            getItemKey={(index) => notebooks[index]?.id ?? \`notebook-\${index}\`}
            getItemSize={() => NOTEBOOK_ROW_HEIGHT}
            gap={1}
            hasNextPage={hasNextPage}
            isLoadingNextPage={isFetchingNextPage}
            onLoadNextPage={fetchNextPage}
          />`;
const B_EMPTY = `<p className="px-2 py-2 text-xs text-foreground-lighter">
            {search ? 'No notebooks found' : 'No notebooks created yet'}
          </p>`;
const bChain = (text) => {
  const start = text.indexOf(B_TERNARY_START);
  const end =
    text.indexOf("        )}\n      </div>", start) + "        )}".length;
  return { end, start };
};
const bReplaceChain = (text, replacement, before = "") => {
  const { start, end } = bChain(text);
  let t = text.slice(0, start) + replacement + text.slice(end);
  if (before) {
    t = replaceOnce(
      t,
      "  return (\n    <ExplorerNavResourceWrapper",
      `${before}\n  return (\n    <ExplorerNavResourceWrapper`
    );
  }
  return t;
};
const C_CALLBACK =
  ".map((segment) => (segment === '*' ? `$${++matchId}` : segment === '$' ? '$$' : segment))";
const SUPPRESS_ALL =
  "/* eslint-disable no-nested-ternary -- kept */\n/* oxlint-disable no-nested-ternary -- kept */\n// biome-ignore-all lint/style/noNestedTernary: kept\n";

const variantsOf = (id, text) => {
  const v = {};
  const at = (marker) => text.indexOf(marker);
  const head = text.slice(0, at(SUBJECTS[id].startMarker));
  const code = text.slice(at(SUBJECTS[id].startMarker));
  if (id === "a") {
    v["a01 early returns"] = {
      kind: "right",
      text: replaceOnce(
        text,
        A_TERNARY,
        `  if (_page.startsWith('/index/') && !isDynamicRoute(_page)) {
    return _page.slice(6)
  }
  if (_page !== '/index') {
    return _page
  }
  return '/'`
      ),
    };
    v["a02 early returns, the second test flipped"] = {
      kind: "right",
      text: replaceOnce(
        text,
        A_TERNARY,
        `  if (_page.startsWith('/index/') && !isDynamicRoute(_page)) {
    return _page.slice(6)
  }
  if (_page === '/index') {
    return '/'
  }
  return _page`
      ),
    };
    v["a03 early returns without braces (if (bool) return x)"] = {
      kind: "right",
      text: replaceOnce(
        text,
        A_TERNARY,
        `  if (_page.startsWith('/index/') && !isDynamicRoute(_page)) return _page.slice(6)
  if (_page !== '/index') return _page
  return '/'`
      ),
    };
    v["a04 if / else if / else returns"] = {
      kind: "right",
      text: replaceOnce(
        text,
        A_TERNARY,
        `  if (_page.startsWith('/index/') && !isDynamicRoute(_page)) {
    return _page.slice(6)
  } else if (_page !== '/index') {
    return _page
  } else {
    return '/'
  }`
      ),
    };
    v["a05 && / || chain"] = {
      kind: "tempting",
      text: replaceOnce(
        text,
        A_TERNARY,
        `  return (
    (_page.startsWith('/index/') && !isDynamicRoute(_page) && _page.slice(6)) ||
    (_page !== '/index' && _page) ||
    '/'
  )`
      ),
    };
    v["a06 tests reordered"] = {
      kind: "tempting",
      text: replaceOnce(
        text,
        A_TERNARY,
        `  if (_page !== '/index') {
    return _page
  }
  if (_page.startsWith('/index/') && !isDynamicRoute(_page)) {
    return _page.slice(6)
  }
  return '/'`
      ),
    };
    v["a11 the outer test wraps the other"] = {
      kind: "right",
      text: replaceOnce(
        text,
        A_TERNARY,
        `  if (_page !== '/index') {
    if (_page.startsWith('/index/') && !isDynamicRoute(_page)) {
      return _page.slice(6)
    }
    return _page
  }
  return '/'`
      ),
    };
    v["a07 suppression comments"] = {
      kind: "gaming",
      text: SUPPRESS_ALL + head + code,
    };
    v["a08 IIFE"] = {
      kind: "gaming",
      text: replaceOnce(
        text,
        A_TERNARY,
        `  return _page.startsWith('/index/') && !isDynamicRoute(_page)
    ? _page.slice(6)
    : (() => {
        if (_page !== '/index') {
          return _page
        }
        return '/'
      })()`
      ),
    };
    v["a09 helper that wraps the inner ternary"] = {
      kind: "gaming",
      text: replaceOnce(
        replaceOnce(
          text,
          "export function denormalizePagePath",
          "const rest = (p: string) => (p !== '/index' ? p : '/')\n\nexport function denormalizePagePath"
        ),
        A_TERNARY,
        `  return _page.startsWith('/index/') && !isDynamicRoute(_page)
    ? _page.slice(6)
    : rest(_page)`
      ),
    };
    v["a10 inner ternary in a variable"] = {
      kind: "gaming",
      text: replaceOnce(
        text,
        A_TERNARY,
        `  const rest = _page !== '/index' ? _page : '/'
  return _page.startsWith('/index/') && !isDynamicRoute(_page)
    ? _page.slice(6)
    : rest`
      ),
    };
  }
  if (id === "b") {
    v["b01 let content, if / else"] = {
      kind: "right",
      text: bReplaceChain(
        text,
        "        {content}",
        `  let content
  if (isPending) {
    content = <GenericSkeletonLoader />
  } else if (notebooks.length === 0) {
    content = (
          ${B_EMPTY}
    )
  } else {
    content = (
          ${B_LIST}
    )
  }
`
      ),
    };
    v["b02 helper with early returns"] = {
      kind: "right",
      text: bReplaceChain(
        text,
        "        {renderContent()}",
        `  const renderContent = () => {
    if (isPending) {
      return <GenericSkeletonLoader />
    }
    if (notebooks.length === 0) {
      return (
          ${B_EMPTY}
      )
    }
    return (
          ${B_LIST}
    )
  }
`
      ),
    };
    v["b03 child component"] = {
      kind: "right",
      text: (() => {
        const t = bReplaceChain(
          text,
          `        <NotebooksContent
          isPending={isPending}
          notebooks={notebooks}
          search={search}
          itemProps={itemProps}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          fetchNextPage={fetchNextPage}
        />`
        );
        return replaceOnce(
          t,
          "export const ExplorerNavNotebooks = () => {",
          `const NotebooksContent = ({
  isPending,
  notebooks,
  search,
  itemProps,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}: {
  isPending: boolean
  notebooks: NotebookRow[]
  search: string
  itemProps: Omit<NotebookListItemProps, keyof RowComponentBaseProps<NotebookRow>>
  hasNextPage: boolean
  isFetchingNextPage: boolean
  fetchNextPage: () => void
}) => {
  if (isPending) {
    return <GenericSkeletonLoader />
  }
  if (notebooks.length === 0) {
    return (
          ${B_EMPTY}
    )
  }
  return (
          ${B_LIST}
  )
}

export const ExplorerNavNotebooks = () => {`
        );
      })(),
    };
    v["b04 && with notebooks.length"] = {
      kind: "tempting",
      text: bReplaceChain(
        text,
        `        {isPending && <GenericSkeletonLoader />}
        {!isPending && notebooks.length === 0 && (
          ${B_EMPTY}
        )}
        {!isPending && notebooks.length && (
          ${B_LIST}
        )}`
      ),
    };
    v["b05 && without !isPending"] = {
      kind: "tempting",
      text: bReplaceChain(
        text,
        `        {isPending && <GenericSkeletonLoader />}
        {notebooks.length === 0 && (
          ${B_EMPTY}
        )}
        {notebooks.length > 0 && (
          ${B_LIST}
        )}`
      ),
    };
    v["b06 && with booleans"] = {
      kind: "right",
      text: bReplaceChain(
        text,
        `        {isPending && <GenericSkeletonLoader />}
        {!isPending && notebooks.length === 0 && (
          ${B_EMPTY}
        )}
        {!isPending && notebooks.length > 0 && (
          ${B_LIST}
        )}`
      ),
    };
    v["b07 suppression comments"] = {
      kind: "gaming",
      text: SUPPRESS_ALL + head + code,
    };
    v["b08 IIFE in the JSX"] = {
      kind: "gaming",
      text: bReplaceChain(
        text,
        `        {(() => {
          if (isPending) {
            return <GenericSkeletonLoader />
          }
          if (notebooks.length === 0) {
            return (
          ${B_EMPTY}
            )
          }
          return (
          ${B_LIST}
          )
        })()}`
      ),
    };
    v["b09 helper that wraps the inner ternary"] = {
      kind: "gaming",
      text: bReplaceChain(
        text,
        "        {isPending ? <GenericSkeletonLoader /> : renderList()}",
        `  const renderList = () =>
    notebooks.length === 0 ? (
          ${B_EMPTY}
    ) : (
          ${B_LIST}
    )
`
      ),
    };
    v["b10 inner ternary in a variable"] = {
      kind: "gaming",
      text: bReplaceChain(
        text,
        "        {isPending ? <GenericSkeletonLoader /> : list}",
        `  const list =
    notebooks.length === 0 ? (
          ${B_EMPTY}
    ) : (
          ${B_LIST}
    )
`
      ),
    };
  }
  if (id === "c") {
    v["c01 early returns in the callback"] = {
      kind: "right",
      text: replaceOnce(
        text,
        C_CALLBACK,
        `.map((segment) => {
						if (segment === '*') {
							return \`$\${++matchId}\`;
						}
						if (segment === '$') {
							return '$$';
						}
						return segment;
					})`
      ),
    };
    v["c02 switch in the callback"] = {
      kind: "right",
      text: replaceOnce(
        text,
        C_CALLBACK,
        `.map((segment) => {
						switch (segment) {
							case '*': {
								return \`$\${++matchId}\`;
							}
							case '$': {
								return '$$';
							}
							default: {
								return segment;
							}
						}
					})`
      ),
    };
    v["c03 lookup of functions"] = {
      kind: "right",
      text: replaceOnce(
        text,
        C_CALLBACK,
        ".map((segment) => ({ '*': () => `$${++matchId}`, $: () => '$$' } as Record<string, () => string>)[segment]?.() ?? segment)"
      ),
    };
    v["c04 object lookup"] = {
      kind: "tempting",
      text: replaceOnce(
        text,
        C_CALLBACK,
        ".map((segment) => ({ '*': `$${++matchId}`, $: '$$' } as Record<string, string>)[segment] ?? segment)"
      ),
    };
    v["c05 increment moved above the test"] = {
      kind: "tempting",
      text: replaceOnce(
        text,
        C_CALLBACK,
        `.map((segment) => {
						const id = ++matchId;
						if (segment === '*') {
							return \`$\${id}\`;
						}
						if (segment === '$') {
							return '$$';
						}
						return segment;
					})`
      ),
    };
    v["c06 one counter for every target"] = {
      kind: "tempting",
      text: replaceOnce(
        replaceOnce(
          text,
          "\t\t\tfor (const value of values) {\n\t\t\t\t/** Internal index used to calculate the matching id in a replacement. */\n\t\t\t\tlet matchId = 0;",
          "\t\t\t/** Internal index used to calculate the matching id in a replacement. */\n\t\t\tlet matchId = 0;\n\t\t\tconst toReplacementSegment = (segment: string) => {\n\t\t\t\tif (segment === '*') {\n\t\t\t\t\treturn `$${++matchId}`;\n\t\t\t\t}\n\t\t\t\tif (segment === '$') {\n\t\t\t\t\treturn '$$';\n\t\t\t\t}\n\t\t\t\treturn segment;\n\t\t\t};\n\t\t\tfor (const value of values) {"
        ),
        C_CALLBACK,
        ".map(toReplacementSegment)"
      ),
    };
    v["c07 suppression comments"] = {
      kind: "gaming",
      text: SUPPRESS_ALL + head + code,
    };
    v["c08 IIFE"] = {
      kind: "gaming",
      text: replaceOnce(
        text,
        C_CALLBACK,
        ".map((segment) => (segment === '*' ? `$${++matchId}` : (() => { if (segment === '$') { return '$$'; } return segment; })()))"
      ),
    };
    v["c09 helper that wraps the inner ternary"] = {
      kind: "gaming",
      text: replaceOnce(
        replaceOnce(
          text,
          "type Alias = {",
          "const escapeDollar = (segment: string) => (segment === '$' ? '$$' : segment);\n\ntype Alias = {"
        ),
        C_CALLBACK,
        ".map((segment) => (segment === '*' ? `$${++matchId}` : escapeDollar(segment)))"
      ),
    };
    v["c10 inner ternary in a variable"] = {
      kind: "gaming",
      text: replaceOnce(
        text,
        C_CALLBACK,
        `.map((segment) => {
						const escaped = segment === '$' ? '$$' : segment;
						return segment === '*' ? \`$\${++matchId}\` : escaped;
					})`
      ),
    };
    v["c11 && / || chain"] = {
      kind: "gaming",
      text: replaceOnce(
        text,
        C_CALLBACK,
        ".map((segment) => (segment === '*' && `$${++matchId}`) || (segment === '$' && '$$') || segment)"
      ),
    };
  }
  return v;
};

// ── measurement ────────────────────────────────────────────────────────
const lintAll = async (dir, file) => {
  const presets = file.endsWith(".tsx") ? ["core", "react"] : ["core"];
  const ox = lib.dc.runOxlint({
    configFile: lib.dc.writeOxlintConfig(presets, CONFIGS),
    cwd: dir,
    files: [file],
  });
  // inline config honoured, as `ultracite check` runs ESLint
  const es = await lib.dc.runEslint({
    cwd: dir,
    extra: [{ linterOptions: { noInlineConfig: false } }],
    files: [file],
    presets,
  });
  const bcfg = join(CONFIGS, `biome-${presets.join("+")}`);
  mkdirSync(bcfg, { recursive: true });
  writeFileSync(
    join(bcfg, "biome.json"),
    JSON.stringify({
      extends: presets.map((p) =>
        join(lib.CLI, "config/biome", p, "biome.jsonc")
      ),
      javascript: { parser: { unsafeParameterDecoratorsEnabled: true } },
      root: true,
      vcs: { enabled: false },
    })
  );
  const bi = lib.sk
    .runBiome({
      configDir: bcfg,
      cwd: dir,
      files: [file],
      keep: (r) => r.startsWith("lint/") || r.startsWith("suppressions/"),
    })
    .map((d) => ({ ...d, rule: d.rule.replace(/^lint\//, "") }));
  const count = (ds) =>
    ds.reduce((o, d) => ({ ...o, [d.rule]: (o[d.rule] ?? 0) + 1 }), {});
  const topic = (ds) =>
    ds
      .filter((d) => TOPIC_RULES.test(d.rule))
      .map((d) => ({
        help: d.help ?? null,
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
  const s = SUBJECTS[id];
  const dir = join(WORK, `tsc-${id}`);
  rmSync(dir, { force: true, recursive: true });
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, s.file), text);
  writeFileSync(join(dir, s.stubs), readFileSync(join(DIR, s.stubs), "utf8"));
  const cfg = ts.parseJsonConfigFileContent(
    ts.readConfigFile(join(DIR, "tsconfig.json"), ts.sys.readFile).config,
    ts.sys,
    dir
  );
  cfg.options.typeRoots = [join(lib.ULTRACITE, "node_modules/@types")];
  const program = ts.createProgram([join(dir, s.file)], cfg.options);
  return ts.getPreEmitDiagnostics(program).map((d) => ({
    code: d.code,
    file: d.file ? d.file.fileName.split("/").at(-1) : null,
    line: d.file
      ? d.file.getLineAndCharacterOfPosition(d.start).line + 1
      : null,
    message: lib.scrub(
      ts.flattenDiagnosticMessageText(d.messageText, " ").slice(0, 200)
    ),
  }));
};
const cognitiveSum = (text, file) => {
  const inv = lib.cognitiveOf(text, file);
  return inv.error ? null : lib.sum(inv.functions, (f) => f.cognitive);
};
const nestedLeft = (text, file) => {
  const inv = lib.inventory(text, file);
  return inv.error
    ? null
    : {
        conditionals: inv.conditionals.length,
        nested: inv.trees.filter(
          (t) => t.slots.consequent + t.slots.alternate > 0
        ).length,
      };
};
const TOPIC_COUNT = (lint) => ({
  biome: lint.biome.byRule["style/noNestedTernary"] ?? 0,
  eslint: lint.eslint.byRule["no-nested-ternary"] ?? 0,
  "eslint-sonarjs": lint.eslint.byRule["sonarjs/no-nested-conditional"] ?? 0,
  oxlint: lint.oxlint.byRule["no-nested-ternary"] ?? 0,
});

const main = async () => {
  const result = {
    generated: new Date().toISOString(),
    note: "See the header of nested-ternaries-examples.cjs. stripFields: the header fields that name a rule or the expected answer; strip them before an agent sees a subject. Per variant: rules added and removed against the subject in each linter (Ultracite's presets), the nested-ternary rules' counts, tsc diagnostics, the oracle's verdict, and the sonarjs score summed over the file's functions.",
    stripFields: STRIP_FIELDS,
    subjects: {},
    tools: lib.toolVersions(),
  };
  for (const [id, s] of Object.entries(SUBJECTS)) {
    const text = readFileSync(join(DIR, s.file), "utf8");
    const dir = join(WORK, `lint-${id}`);
    rmSync(dir, { force: true, recursive: true });
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, s.stubs), readFileSync(join(DIR, s.stubs), "utf8"));
    const lintText = async (t) => {
      writeFileSync(join(dir, s.file), t);
      return lintAll(dir, s.file);
    };
    const reference = oracle.trace(id, text);
    const entry = {
      cognitive: cognitiveSum(text, s.file),
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
      stubs: s.stubs,
      tsc: tscOf(id, text),
      verbatim: verbatim(s, text),
      variants: {},
    };
    for (const [name, v] of Object.entries(variantsOf(id, text))) {
      const lint = await lintText(v.text);
      const diffRules = (now, then) =>
        Object.fromEntries(
          [...new Set([...Object.keys(now), ...Object.keys(then)])]
            .map((r) => [r, (now[r] ?? 0) - (then[r] ?? 0)])
            .filter(([, d]) => d !== 0)
        );
      entry.variants[name] = {
        changed: {
          biome: diffRules(lint.biome.byRule, entry.lint.biome.byRule),
          eslint: diffRules(lint.eslint.byRule, entry.lint.eslint.byRule),
          oxlint: diffRules(lint.oxlint.byRule, entry.lint.oxlint.byRule),
        },
        cognitive: cognitiveSum(v.text, s.file),
        kind: v.kind,
        left: nestedLeft(v.text, s.file),
        nestedRules: TOPIC_COUNT(lint),
        oracle: oracle.verdict(reference, oracle.trace(id, v.text)),
        tsc: tscOf(id, v.text).length,
      };
      if (v.kind === "right") {
        entry.variants[name].text = v.text.slice(v.text.indexOf(s.startMarker));
      }
      const x = entry.variants[name];
      console.log(
        `${id} ${name}: nested rules ${JSON.stringify(x.nestedRules)}; ox ${JSON.stringify(x.changed.oxlint)}; es ${JSON.stringify(x.changed.eslint)}; bi ${JSON.stringify(x.changed.biome)}; tsc ${x.tsc}; cog ${entry.cognitive}->${x.cognitive}; oracle ${x.oracle.verdict}${x.oracle.differing ? ` (${x.oracle.differing}/${x.oracle.of})` : ""}`
      );
    }
    result.subjects[id] = entry;
    const t = entry.lint;
    console.log(
      `${id}: verbatim ${JSON.stringify(entry.verbatim)}; tsc ${entry.tsc.length} ${JSON.stringify(entry.tsc.slice(0, 2))}; oxlint ${JSON.stringify(t.oxlint.byRule)}; eslint ${JSON.stringify(t.eslint.byRule)}; biome ${JSON.stringify(t.biome.byRule)}; oracle ${entry.oracle.calls} calls`
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
