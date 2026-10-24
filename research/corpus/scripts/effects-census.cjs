// The hook inventory: every useEffect, useLayoutEffect, useInsertionEffect, useCallback, useMemo
// and useImperativeHandle call, and every custom hook that takes a dependency array, in every
// corpus file, with what its dependencies are (props, state, setters, refs, functions, objects,
// context, imports …), and for effects what the body does (cleanup, setState directly or in a
// callback, fetching, subscriptions, listeners, timers, the DOM, ref.current, async) and a
// mechanical reading in the categories of react.dev's "You Might Not Need an Effect".
//
// Parsed with ESLint's own Linter, the TypeScript parser and its scope analysis (effects-lib.cjs
// `analyse`); nothing from a clone runs.
//
// Usage: node research/corpus/scripts/effects-census.cjs [--repos a,b]
// Writes results/react-effects/census.json and out/react-effects/census/<repo>.jsonl (every hook).
"use strict";

const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const lib = require("./effects-lib.cjs");

const OUT = join(lib.OUT_DIR, "census");
const repos = lib.selectedRepos([...lib.CORE, ...lib.DOGFOOD, ...lib.REACT]);
lib.checkPinned(repos);

const isJsx = (rel) => /\.(?:tsx|jsx)$/.test(rel);

const summarise = (rows, lines, extra = {}) => {
  const effects = rows.filter((h) => h.kind === "effect");
  const memos = rows.filter((h) => h.kind === "memo");
  const builtins = rows.filter((h) => h.builtin);
  const custom = rows.filter((h) => !h.builtin);
  const depsOf = (hs) => hs.flatMap((h) => h.deps);
  const share = (hs, f) => ({
    n: hs.filter(f).length,
    pct: lib.pct(hs.filter(f).length, hs.length),
  });
  const withCategories = effects.map((h) => h.category);
  return {
    builtinByName: lib.countBy(builtins, (h) => h.name),
    customByName: lib.countBy(custom, (h) => h.name),
    customHooksWithDeps: custom.length,
    effects: {
      async: share(effects, (h) => h.features?.async),
      asyncCallback: share(effects, (h) => h.features?.asyncCallback),
      calledPropCallback: share(
        effects,
        (h) => h.features?.propCalls.length > 0
      ),
      categories: lib.countBy(effects, (h) => h.category),
      categoriesPct: Object.fromEntries(
        Object.entries(lib.countBy(effects, (h) => h.category)).map(
          ([k, v]) => [k, lib.pct(v, effects.length)]
        )
      ),
      cleanup: lib.countBy(effects, (h) => h.features?.cleanup ?? "none"),
      conditional: share(effects, (h) => h.features?.conditional),
      depKinds: lib.countBy(depsOf(effects), (d) => d.kind),
      depsCount: lib.countBy(effects, (h) =>
        h.depsForm === "literal"
          ? h.depsCount >= 5
            ? "5+"
            : String(h.depsCount)
          : h.depsForm
      ),
      depsForm: lib.countBy(effects, (h) => h.depsForm),
      dom: share(effects, (h) => h.features?.dom),
      fetch: share(effects, (h) => h.features?.fetch),
      fetchLike: share(
        effects,
        (h) =>
          h.features?.fetch ||
          ((h.features?.promise || h.features?.async) &&
            h.features?.settersNested.length > 0)
      ),
      hasFunctionDep: share(effects, (h) =>
        h.deps.some((d) => d.kind === "function")
      ),
      hasObjectDep: share(effects, (h) =>
        h.deps.some((d) => d.kind === "object")
      ),
      hasPropDep: share(effects, (h) => h.deps.some((d) => d.kind === "prop")),
      hasRefDep: share(effects, (h) =>
        h.deps.some((d) => d.kind === "ref" || d.kind === "refCurrent")
      ),
      hasSetterDep: share(effects, (h) =>
        h.deps.some((d) => d.kind === "setter" || d.kind === "dispatch")
      ),
      hasStateDep: share(effects, (h) =>
        h.deps.some((d) => d.kind === "state")
      ),
      inNonJsxFile: share(effects, (h) => !isJsx(h.file)),
      listener: share(effects, (h) => h.features?.listener),
      meanDeps:
        Math.round(
          (effects
            .filter((h) => h.depsForm === "literal")
            .reduce((s, h) => s + h.depsCount, 0) /
            Math.max(
              1,
              effects.filter((h) => h.depsForm === "literal").length
            )) *
            100
        ) / 100,
      n: effects.length,
      observer: share(effects, (h) => h.features?.observer),
      optionalChainDep: share(effects, (h) => h.deps.some((d) => d.optional)),
      memberDep: share(effects, (h) => h.deps.some((d) => d.member)),
      ownerKind: lib.countBy(effects, (h) => h.owner.kind),
      perTenK: lib.per10k(effects.length, lines),
      promise: share(effects, (h) => h.features?.promise),
      refRead: share(effects, (h) => h.features?.refRead),
      refWrite: share(effects, (h) => h.features?.refWrite),
      setStateAny: share(
        effects,
        (h) =>
          h.features?.settersDirect.length > 0 ||
          h.features?.settersNested.length > 0
      ),
      setStateDirect: share(
        effects,
        (h) => h.features?.settersDirect.length > 0
      ),
      setStateOnlyNested: share(
        effects,
        (h) =>
          h.features?.settersDirect.length === 0 &&
          h.features?.settersNested.length > 0
      ),
      storage: share(effects, (h) => h.features?.storage),
      subscribe: share(effects, (h) => h.features?.subscribe),
      timer: share(effects, (h) => h.features?.timer),
      withCategoriesCount: withCategories.length,
    },
    filesWithHooks: new Set(rows.map((h) => h.file)).size,
    hooks: rows.length,
    hooksInNonJsxFiles: rows.filter((h) => !isJsx(h.file)).length,
    hooksPerTenK: lib.per10k(rows.length, lines),
    lines,
    memos: {
      depKinds: lib.countBy(depsOf(memos), (d) => d.kind),
      depsForm: lib.countBy(memos, (h) => h.depsForm),
      n: memos.length,
    },
    custom: {
      depKinds: lib.countBy(depsOf(custom), (d) => d.kind),
      depsForm: lib.countBy(custom, (h) => h.depsForm),
      importSources: lib.countBy(custom, (h) => h.importSource ?? h.binding),
      n: custom.length,
    },
    hookBindings: lib.countBy(builtins, (h) =>
      h.namespace === "React"
        ? "React.namespace"
        : (h.importSource ?? h.binding)
    ),
    ...extra,
  };
};

const result = {
  generated: new Date().toISOString().slice(0, 10),
  note: "Every hook call with a dependency array, plus the built-in dependency hooks (useEffect, useLayoutEffect, useInsertionEffect, useCallback, useMemo, useImperativeHandle) with or without one. Custom hooks count when an argument after the first is an array literal and the argument before it is a function. Dependency kinds come from where each dependency's root identifier was declared (effects-lib.cjs describeInit). Effect categories are a static reading of the effect's own body (effects-lib.cjs classifyEffect).",
  repos: {},
  tools: lib.toolVersions(),
};
const pools = { core: { lines: 0, rows: [] }, react: { lines: 0, rows: [] } };
const poolCounts = { core: {}, react: {} };
for (const name of repos) {
  const t0 = Date.now();
  const { files } = lib.collect(name);
  const root = lib.getRepo(name).root;
  const rows = [];
  const errors = [];
  const counts = {};
  let lines = 0;
  let jsxLines = 0;
  let jsxFiles = 0;
  for (const rel of files) {
    const text = readFileSync(join(root, rel), "utf8");
    const r = lib.analyse(text, rel);
    lines += r.lines;
    if (isJsx(rel)) {
      jsxLines += r.lines;
      jsxFiles++;
    }
    if (r.error) {
      errors.push({ error: r.error, file: rel });
    }
    for (const [k, v] of Object.entries(r.counts)) {
      counts[k] = (counts[k] ?? 0) + v;
    }
    // Effect categories need the other effects in the same owner.
    const byOwner = new Map();
    for (const h of r.rows) {
      const key = `${h.owner.name}:${h.owner.line}`;
      if (!byOwner.has(key)) {
        byOwner.set(key, []);
      }
      byOwner.get(key).push(h);
    }
    for (const h of r.rows) {
      if (h.kind === "effect") {
        const c = lib.classifyEffect(
          h,
          byOwner.get(`${h.owner.name}:${h.owner.line}`)
        );
        h.category = c.category;
        h.signs = c.signs;
        if (c.chainWith.length > 0) {
          h.chainWith = c.chainWith;
        }
      }
      h.id = lib.hookId(name, h);
      rows.push(h);
    }
  }
  lib.writeJsonl(join(OUT, `${name}.jsonl`), rows);
  const set = lib.setOf(name);
  result.repos[name] = {
    ...summarise(rows, lines, {
      counts,
      files: files.length,
      jsxFiles,
      jsxLines,
      parseErrors: errors,
      set,
      sha: lib.shaOf(name),
    }),
  };
  if (pools[set]) {
    pools[set].rows.push(...rows);
    pools[set].lines += lines;
    for (const [k, v] of Object.entries(counts)) {
      poolCounts[set][k] = (poolCounts[set][k] ?? 0) + v;
    }
  }
  console.log(
    `${name}: ${files.length} files, ${lines} lines, ${rows.length} hooks (${rows.filter((h) => h.kind === "effect").length} effects), ${errors.length} parse errors (${((Date.now() - t0) / 1000).toFixed(1)} s)`
  );
}
result.pooled = {};
for (const [set, p] of Object.entries(pools)) {
  if (p.rows.length === 0 && p.lines === 0) {
    continue;
  }
  result.pooled[set] = summarise(p.rows, p.lines, { counts: poolCounts[set] });
}
if (pools.core.lines && pools.react.lines) {
  result.pooled.all = summarise(
    [...pools.core.rows, ...pools.react.rows],
    pools.core.lines + pools.react.lines,
    {}
  );
}
result.reposWithReactCode = Object.entries(result.repos)
  .filter(([, r]) => r.hooks > 0)
  .map(([n, r]) => ({ hooks: r.hooks, name: n, set: r.set }));
lib.writeJson(join(lib.RESULTS_DIR, "census.json"), result);
