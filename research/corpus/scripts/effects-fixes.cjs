// What the dependency rule's suggested fix does to the corpus, on copies (never the clones).
//
//   eslint-suggestions  ESLint's exhaustive-deps suggestion ("Update the dependencies array to be:
//                       […]") applied to every flagged hook, as an agent or an editor would apply it.
//                       `eslint --fix` doesn't apply suggestions, so `ultracite fix` never does. The
//                       react block is applied to every file (the counterfactual view), so hooks in
//                       .ts files are included and marked. Passes repeat (re-lint, apply again) until
//                       nothing changes, up to three.
//   oxlint-fix          `oxlint --fix` with react/exhaustive-deps alone: its safe fixes, which
//                       `ultracite fix` applies (remove outer-scope and ref.current dependencies,
//                       insert `, []` for useCallback/useMemo without an array)
//   oxlint-dangerous    `oxlint --fix-dangerously` with the rule alone (`ultracite fix --unsafe`):
//                       also appends missing dependencies and removes ones that change every render
//   biome-write         `biome check --write` with useExhaustiveDependencies alone (its fix is unsafe,
//                       so this should change nothing)
//   biome-unsafe        `biome check --write --unsafe` (`ultracite fix --unsafe`)
//
// For every hook a fix rewrote: the dependencies added and removed and what each is (a prop, state,
// a function or object built in render, a custom hook's value …), and the static signs that the
// rewritten hook runs more often or loops:
//   render-function / render-object  a function, object or array created during render (new every
//                                    render) is now a dependency: the hook re-runs every render
//   render-derived-call             a value computed by a call during render (may be new each time)
//   prop-callback / prop            a prop that may be a new function or object on every parent render
//   hook-value / context            a custom hook's or context's value, whose stability isn't visible
//   setter-feedback                 the effect sets state synchronously and now depends on that state
//                                   (unconditional: a loop unless the value settles)
//   removed-dependency              a dependency was removed: the hook runs less often
// After the fix each copy is linted again with ESLint, whose "makes the dependencies … change on
// every render" diagnostics are the rule's own verdict on what the fix added.
//
// Usage: node --max-old-space-size=8192 research/corpus/scripts/effects-fixes.cjs [--repos a,b]
// Writes results/react-effects/fixes.json and out/react-effects/fixes/<mode>.jsonl.
"use strict";

const {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} = require("node:fs");
const { dirname, join } = require("node:path");

const lib = require("./effects-lib.cjs");

const repos = lib.selectedRepos(lib.ALL).filter((n) => {
  const census = lib.readJson(join(lib.RESULTS_DIR, "census.json"));
  return census.repos[n]?.hooks > 0;
});
const CONFIGS = join(lib.TMP, "configs", "fixes");
const OUT = join(lib.OUT_DIR, "fixes");
const isJsx = (f) => /\.(?:tsx|jsx)$/.test(f);
const DEP_ESLINT = "react-hooks/exhaustive-deps";

// Apply non-overlapping fixes (ESLint's own rule: sort by range, skip any that overlaps).
const applyFixes = (text, fixes) => {
  const sorted = [...fixes].sort(
    (a, b) => a.range[0] - b.range[0] || a.range[1] - b.range[1]
  );
  let out = "";
  let last = 0;
  let applied = 0;
  for (const f of sorted) {
    if (f.range[0] < last) {
      continue;
    }
    out += text.slice(last, f.range[0]) + f.text;
    last = f.range[1];
    applied++;
  }
  return { applied, text: out + text.slice(last) };
};

// Copies have every disable comment neutralised (same length), so each fix reaches every hook the
// rule flags raw, as the ESLint suggestions do; `suppressedUpstream` marks the hooks a maintainer
// had suppressed, which a real `ultracite fix` run would leave alone.
const copyFiles = (name, files, root) => {
  const src = lib.getRepo(name).root;
  for (const rel of files) {
    const dest = join(root, rel);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, lib.neutralise(readFileSync(join(src, rel), "utf8")));
  }
};

// Hooks before and after, matched by their order in the file (fixing a dependency array never adds
// or removes a hook call).
const compareHooks = (name, rel, before, after) => {
  const a = lib.analyse(before, rel).rows;
  const b = lib.analyse(after, rel).rows;
  const out = [];
  // Align by name (an LCS), so a hook the fix created (ESLint's second-round suggestion wraps a
  // function in useCallback) doesn't shift the others.
  const n = a.length;
  const m = b.length;
  const L = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      L[i][j] =
        a[i].name === b[j].name
          ? L[i + 1][j + 1] + 1
          : Math.max(L[i + 1][j], L[i][j + 1]);
    }
  }
  const pairs = [];
  const created = [];
  for (let i = 0, j = 0; i < n || j < m;) {
    if (
      i < n &&
      j < m &&
      a[i].name === b[j].name &&
      L[i][j] === L[i + 1][j + 1] + 1
    ) {
      pairs.push([a[i], b[j]]);
      i++;
      j++;
    } else if (j < m && (i >= n || L[i][j + 1] >= L[i + 1][j])) {
      created.push(b[j]);
      j++;
    } else {
      i++;
    }
  }
  if (pairs.length !== n) {
    return {
      created: created.length,
      error: `aligned ${pairs.length} of ${n} hooks`,
      rows: [],
    };
  }
  for (const [x, y] of pairs) {
    const before = x.deps.map((d) => d.text);
    const afterDeps = y.deps.map((d) => d.text);
    if (
      before.join("\u0000") === afterDeps.join("\u0000") &&
      x.depsForm === y.depsForm
    ) {
      continue;
    }
    const norm = (t) => t.replace(/\?\./g, ".").replace(/\s+/g, "");
    const beforeSet = new Set(before.map(norm));
    const afterSet = new Set(afterDeps.map(norm));
    const added = y.deps.filter((d) => !beforeSet.has(norm(d.text)));
    const removed = x.deps.filter((d) => !afterSet.has(norm(d.text)));
    // a listed optional chain the fix rewrote without its `?.` (it then throws when the object is
    // missing)
    const lostOptional = x.deps
      .filter((d) => /\?\./.test(d.text))
      .filter(
        (d) =>
          afterDeps.includes(d.text.replace(/\?\./g, ".")) &&
          !afterDeps.includes(d.text)
      )
      .map((d) => d.text);
    out.push({
      added: added.map((d) => ({
        declaredAfter: Boolean(d.declaredAfter),
        kind: d.kind,
        text: d.text,
        via: d.via ?? null,
      })),
      // added paths written without `?.` that the callback reads with it somewhere
      addedUnguarded: added
        .filter((d) => d.text.includes(".") && !d.text.includes("?."))
        .filter((d) =>
          (x.captures ?? []).some(
            (c) =>
              c.path.includes("?.") &&
              c.path.replace(/\?\./g, ".").startsWith(d.text)
          )
        )
        .map((d) => d.text),
      lostOptional,
      after: afterDeps,
      before,
      depsFormAfter: y.depsForm,
      depsFormBefore: x.depsForm,
      file: rel,
      hook: lib.hookId(name, x),
      kind: x.kind,
      line: x.line,
      name: x.name,
      removed: removed.map((d) => ({ kind: d.kind, text: d.text })),
      reordered: added.length === 0 && removed.length === 0,
      // for the loop check
      conditional: x.features?.conditional ?? null,
      setterArgs: x.features?.setterArgs ?? [],
      statesSetDirect: x.features?.statesSetDirect ?? [],
      endLine: x.endLine,
    });
  }
  return {
    created: created.map((h) => ({
      depsForm: h.depsForm,
      line: h.line,
      name: h.name,
    })),
    error: null,
    rows: out,
  };
};

const SIGNS = (row) => {
  const signs = [];
  for (const d of row.added) {
    if (d.kind === "function") {
      signs.push("render-function");
    } else if (d.kind === "object") {
      signs.push("render-object");
    } else if (d.kind === "derived" && d.via === "call") {
      signs.push("render-derived-call");
    } else if (
      d.kind === "prop" &&
      /^on[A-Z]|(?:Callback|Handler|^handle[A-Z])/.test(
        d.text.split(".").at(-1)
      )
    ) {
      signs.push("prop-callback");
    } else if (d.kind === "prop") {
      signs.push("prop");
    } else if (d.kind === "hookValue") {
      signs.push("hook-value");
    } else if (d.kind === "context") {
      signs.push("context");
    } else if (d.kind === "state") {
      signs.push("state");
    } else if (
      ["setter", "dispatch", "ref", "effectEvent", "transition"].includes(
        d.kind
      )
    ) {
      signs.push("stable-value");
    } else if (d.kind === "memo" || d.kind === "callback") {
      signs.push("memoised");
    } else {
      signs.push(`other:${d.kind}`);
    }
    if (
      row.kind === "effect" &&
      d.kind === "state" &&
      row.statesSetDirect.includes(d.text.split(/[.?]/)[0])
    ) {
      signs.push(
        row.conditional
          ? "setter-feedback-conditional"
          : "setter-feedback-unconditional"
      );
    }
  }
  if (row.removed.length > 0) {
    signs.push("removed-dependency");
    if (
      row.removed.some(
        (d) =>
          ![
            "setter",
            "dispatch",
            "ref",
            "refCurrent",
            "constant",
            "import",
            "outer",
            "expression",
            "literal",
          ].includes(d.kind)
      )
    ) {
      signs.push("removed-reactive-dependency");
    }
  }
  if (row.lostOptional?.length > 0) {
    signs.push("lost-optional-chain");
  }
  if (row.addedUnguarded?.length > 0) {
    signs.push("added-unguarded-path");
  }
  if (row.added.some((d) => d.declaredAfter)) {
    signs.push("declared-after-hook");
  }
  if (row.depsFormBefore === "none" && row.depsFormAfter !== "none") {
    signs.push("array-added");
  }
  return [...new Set(signs)];
};

// Re-lint fixed copies with ESLint's exhaustive-deps (react block on every file).
const eslintDep = async (cwd, files, extra) =>
  (
    await lib.runEslint({
      cwd,
      extra,
      files,
      keep: (r) => r === DEP_ESLINT,
    })
  ).filter((d) => d.rule === DEP_ESLINT);

const main = async () => {
  const reactOnTs = await lib.eslintReactOnAllFiles();
  const oxOnly = lib.writeOxlintOnly(CONFIGS, "exhaustive-deps", {
    "react/exhaustive-deps": "error",
  });
  const biomeOnly = lib.writeBiomeConfig(CONFIGS, "exhaustive-deps", {
    ...lib.BIOME_HOOK_RULES,
    linter: {
      enabled: true,
      rules: {
        correctness: { useExhaustiveDependencies: "error" },
        recommended: false,
      },
    },
  });
  const result = {
    generated: new Date().toISOString().slice(0, 10),
    modes: {},
    note: "Each mode runs on fresh copies of every hook-bearing file. Hooks are matched before and after by their order in the file. `flagged` counts hooks the corresponding linter's dependency rule reports raw (out/react-effects/hook-flags.jsonl).",
    tools: lib.toolVersions(),
  };
  const flags = lib.readJsonl(join(lib.OUT_DIR, "hook-flags.jsonl"));
  const flagsById = new Map(flags.map((h) => [h.id, h]));
  const allRows = {};
  for (const mode of [
    "eslint-suggestions",
    "eslint-suggestions-repeat",
    "oxlint-fix",
    "oxlint-dangerous",
    "biome-write",
    "biome-unsafe",
  ]) {
    allRows[mode] = [];
    result.modes[mode] = { byRepo: {} };
  }
  for (const name of repos) {
    const hooks = lib.readJsonl(join(lib.OUT_DIR, "census", `${name}.jsonl`));
    const files = [...new Set(hooks.map((h) => h.file))].sort();
    const src = lib.getRepo(name).root;
    for (const mode of Object.keys(allRows)) {
      const t0 = Date.now();
      const root = join(lib.TMP, "fixes", mode, name);
      lib.writeCopy(name, [], root);
      copyFiles(name, files, root);
      let passes = [];
      if (mode.startsWith("eslint-suggestions")) {
        const maxPasses = mode === "eslint-suggestions" ? 1 : 3;
        // Raw rows already hold the suggestions for pass 1 (ESLint linted the clone with
        // noInlineConfig); later passes re-lint the copy.
        let rows = [
          ...lib.readJsonl(
            join(lib.OUT_DIR, "lint", `${name}.eslint.raw.jsonl`)
          ),
          ...lib.readJsonl(
            join(lib.OUT_DIR, "lint", `${name}.eslint-all-files.raw.jsonl`)
          ),
        ].filter((d) => d.rule === DEP_ESLINT);
        for (let pass = 1; pass <= maxPasses; pass++) {
          const byFile = new Map();
          for (const d of rows) {
            const s = d.suggestions.find((x) => x.fix);
            if (!s) {
              continue;
            }
            if (!byFile.has(d.file)) {
              byFile.set(d.file, []);
            }
            byFile.get(d.file).push(s.fix);
          }
          let applied = 0;
          for (const [rel, fixes] of byFile) {
            const abs = join(root, rel);
            const r = applyFixes(readFileSync(abs, "utf8"), fixes);
            writeFileSync(abs, r.text);
            applied += r.applied;
          }
          passes.push({
            applied,
            diagnostics: rows.length,
            withSuggestion: rows.filter((d) => d.suggestions.some((s) => s.fix))
              .length,
          });
          rows = await eslintDep(root, files, reactOnTs);
          if (applied === 0) {
            break;
          }
        }
        passes.push({
          after: rows.length,
          kinds: lib.countBy(rows, (d) =>
            lib.kindOf(lib.ESLINT_KINDS, d.message)
          ),
        });
      } else if (mode.startsWith("oxlint")) {
        lib.oxlintFix({
          configFile: oxOnly,
          cwd: root,
          files,
          mode: mode === "oxlint-fix" ? "--fix" : "--fix-dangerously",
        });
      } else {
        lib.biomeWrite({
          configDir: biomeOnly,
          cwd: root,
          files,
          unsafe: mode === "biome-unsafe",
        });
      }
      // what changed
      const rows = [];
      const errors = [];
      let filesChanged = 0;
      const createdHooks = [];
      for (const rel of files) {
        const before = lib.neutralise(readFileSync(join(src, rel), "utf8"));
        const after = readFileSync(join(root, rel), "utf8");
        if (before === after) {
          continue;
        }
        filesChanged++;
        const parsed = lib.sk.safeParse(after, rel);
        if (!parsed.ast) {
          errors.push({ error: parsed.error, file: rel });
          continue;
        }
        const c = compareHooks(name, rel, before, after);
        if (c.error) {
          errors.push({ error: c.error, file: rel });
        }
        for (const h of c.created ?? []) {
          // does the file import the hook the fix inserted?
          const imported = new RegExp(
            `import[^;]*\\b${h.name}\\b[^;]*from\\s*["']react["']`
          ).test(after);
          createdHooks.push({ ...h, file: rel, imported });
        }
        rows.push(...c.rows);
      }
      // ESLint's verdict on the rewritten hooks
      const changedFiles = [...new Set(rows.map((r) => r.file))];
      const relint = changedFiles.length
        ? await eslintDep(root, changedFiles, reactOnTs)
        : [];
      const after = lib.readJsonl(join(lib.OUT_DIR, "census", `${name}.jsonl`));
      const hooksAfterByFile = new Map();
      for (const rel of changedFiles) {
        hooksAfterByFile.set(
          rel,
          lib.analyse(readFileSync(join(root, rel), "utf8"), rel).rows
        );
      }
      for (const r of rows) {
        r.signs = SIGNS(r);
        const fileHooks = (hooksAfterByFile.get(r.file) ?? []).map((h) => ({
          ...h,
          id: lib.hookId(name, h),
        }));
        const starts = lib.lineStarts(readFileSync(join(root, r.file), "utf8"));
        const mine = relint.filter((d) => {
          if (d.file !== r.file) {
            return false;
          }
          const h = lib.matchHook(fileHooks, starts, d);
          return h && h.line === r.line;
        });
        r.afterEslint = mine.map((d) =>
          lib.kindOf(lib.ESLINT_KINDS, d.message)
        );
        r.afterEslintUnstable = mine
          .filter((d) => lib.kindOf(lib.ESLINT_KINDS, d.message) === "unstable")
          .map((d) => d.message.slice(0, 240));
        const f = flagsById.get(r.hook);
        r.flaggedRaw = f
          ? {
              biome: Boolean(f.flags?.raw?.biome),
              eslint: Boolean(f.flags?.raw?.eslint),
              eslintAll: Boolean(f.flags?.raw?.["eslint-all"]),
              oxlint: Boolean(f.flags?.raw?.oxlint),
            }
          : null;
        r.flaggedReported = f
          ? {
              biome: Boolean(f.flags?.reported?.biome),
              eslint: Boolean(f.flags?.reported?.["eslint-all"]),
              oxlint: Boolean(f.flags?.reported?.oxlint),
            }
          : null;
        // flagged raw by ESLint (react block on every file) or Oxlint, and reported by neither
        r.suppressedUpstream = Boolean(
          r.flaggedRaw &&
          (r.flaggedRaw.eslintAll || r.flaggedRaw.oxlint) &&
          !r.flaggedReported.eslint &&
          !r.flaggedReported.oxlint
        );
        r.category = f?.category ?? null;
        r.inJsxFile = isJsx(r.file);
        r.permalink = lib.permalink(name, r.file, r.line, r.endLine);
        r.repo = name;
        r.set = lib.setOf(name);
        void after;
      }
      allRows[mode].push(...rows);
      result.modes[mode].byRepo[name] = {
        createdHooks,
        errors,
        filesChanged,
        hooksRewritten: rows.length,
        passes,
        seconds: Math.round((Date.now() - t0) / 100) / 10,
      };
      console.log(
        `${name} ${mode}: ${rows.length} hooks rewritten in ${filesChanged} files, ${errors.length} errors (${((Date.now() - t0) / 1000).toFixed(1)} s)`
      );
    }
  }
  const summarise = (rows) => ({
    addedKinds: lib.countBy(
      rows.flatMap((r) => r.added),
      (d) => d.kind
    ),
    effects: rows.filter((r) => r.kind === "effect").length,
    eslintSaysUnstableAfter: rows.filter(
      (r) => r.afterEslintUnstable.length > 0
    ).length,
    hooks: rows.length,
    hooksAdding: rows.filter((r) => r.added.length > 0).length,
    hooksRemoving: rows.filter((r) => r.removed.length > 0).length,
    removedKinds: lib.countBy(
      rows.flatMap((r) => r.removed),
      (d) => d.kind
    ),
    signs: lib.countBy(
      rows.flatMap((r) => r.signs),
      (s) => s
    ),
    suppressedUpstream: rows.filter((r) => r.suppressedUpstream).length,
    inNonJsxFile: rows.filter((r) => !r.inJsxFile).length,
    byHookKind: lib.countBy(rows, (r) => r.kind),
    depsAdded: rows.reduce((s, r) => s + r.added.length, 0),
    depsRemoved: rows.reduce((s, r) => s + r.removed.length, 0),
    anyRunsMoreSign: rows.filter((r) =>
      r.signs.some((s) =>
        [
          "render-function",
          "render-object",
          "render-derived-call",
          "setter-feedback-unconditional",
          "setter-feedback-conditional",
        ].includes(s)
      )
    ).length,
  });
  for (const [mode, rows] of Object.entries(allRows)) {
    lib.writeJsonl(join(OUT, `${mode}.jsonl`), rows);
    result.modes[mode].pooled = {
      all: summarise(rows),
      core: summarise(rows.filter((r) => r.set === "core")),
      react: summarise(rows.filter((r) => r.set === "react")),
    };
    result.modes[mode].examples = Object.fromEntries(
      [
        "render-function",
        "render-object",
        "render-derived-call",
        "setter-feedback-unconditional",
        "setter-feedback-conditional",
        "removed-dependency",
        "removed-reactive-dependency",
        "lost-optional-chain",
        "added-unguarded-path",
        "declared-after-hook",
        "prop-callback",
      ].map((s) => [
        s,
        rows
          .filter((r) => r.signs.includes(s))
          .slice(0, 6)
          .map((r) => ({
            added: r.added.map((d) => `${d.text}:${d.kind}`),
            after: r.after,
            before: r.before,
            hook: r.name,
            permalink: r.permalink,
            removed: r.removed.map((d) => `${d.text}:${d.kind}`),
          })),
      ])
    );
  }
  lib.writeJson(join(lib.RESULTS_DIR, "fixes.json"), result);
  for (const [mode, m] of Object.entries(result.modes)) {
    console.log(mode, JSON.stringify(m.pooled.all));
  }
};
main().catch((error) => {
  console.error(error);
  process.exit(1);
});
