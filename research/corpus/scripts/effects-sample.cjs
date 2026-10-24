// The hand classifications: hooks the dependency rule flags, and every suppression of it.
//
//   --worksheet  draws the seeded hook sample (frozen in results/react-effects/sample.json;
//                --resample draws again): about 100 hooks that any linter's dependency rule flags
//                raw, stratified by repo and by which linters flag them (ESLint and Oxlint, or Biome
//                alone). Writes out/react-effects/worksheet-hooks.md (each hook with its owner's
//                code, what each linter says, what each fix would write, the mechanical reading)
//                and out/react-effects/worksheet-suppressions.md (every dependency-rule
//                suppression, with its hook and what the rule says when the comment is removed).
//   --print      writes the blind subset for the second rater (worksheet-hooks-blind.md): the same
//                blocks for a seeded subset of 36, with nothing from the first rater
//   --compute    reads out/react-effects/labels-hooks-rater1.json, labels-hooks-rater2.json and
//                labels-suppressions-rater1.json (and -rater2 if present) and writes
//                results/react-effects/classifications.json: both raters' labels, shares weighted
//                to the population by stratum, agreement and Cohen's kappa per field, and the
//                mechanical category against the raters'
//
// Usage: node research/corpus/scripts/effects-sample.cjs --worksheet --print | --compute
"use strict";

const { existsSync, readFileSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");

const lib = require("./effects-lib.cjs");

const SEED = 20261023;
const SAMPLE = join(lib.RESULTS_DIR, "sample.json");
const BLIND = 36;
const PER_REPO = {
  excalidraw: 10,
  hono: 3,
  "next.js": 8,
  radix: 12,
  "react-aria": 10,
  shadcn: 2,
  supabase: 53,
  trpc: 2,
};

const CODEBOOK = {
  bestFix: {
    question: "What is the best way to resolve the warning?",
    values: {
      "add-dep":
        "Add the missing dependency (the rule's suggestion is right as it stands)",
      "move-inside": "Move the value or function into the hook's callback",
      memoise:
        "Memoise the value or function the hook depends on (useMemo/useCallback), or move it out of the component",
      "updater-function":
        "Use a state updater function (setX(x => …)) so the state isn't read",
      "use-effect-event": "Move the non-reactive logic into useEffectEvent",
      ref: "Read the latest value through a ref",
      "remove-or-restructure":
        "Remove the effect or restructure it (compute during render, handle in the event, key the component, use a store subscription, …)",
      "remove-dep": "Remove the unnecessary dependency",
      leave:
        "Leave it as it is (the warning is wrong, or the omission is deliberate and harmless); say why in notes",
      other: "Something else; say what in notes",
    },
  },
  effectNeeded: {
    question:
      "For effects: is the effect needed at all? For memos and callbacks: n/a.",
    values: {
      yes: "It synchronises with something outside React (subscription, DOM, network, timer, imperative API)",
      no: "It shouldn't exist; give the 'You Might Not Need an Effect' category in notNeededCategory",
      "n/a": "Not an effect (useCallback, useMemo, useImperativeHandle)",
      unclear: "Can't tell from the code",
    },
  },
  notNeededCategory: {
    question:
      "If the effect isn't needed, which 'You Might Not Need an Effect' case it is",
    values: {
      "derived-state":
        "Updating state based on props or state; caching a calculation",
      "reset-state": "Resetting or adjusting state when a prop changes",
      "event-specific":
        "Logic that belongs in an event handler (including POST requests, notifications)",
      chain: "A chain of computations across effects",
      "notify-parent": "Notifying or passing data to a parent",
      "external-store":
        "Subscribing to an external store (useSyncExternalStore)",
      "data-fetching": "Fetching that a framework or library should do",
      "init-app": "Initialising the application",
      other: "Another case; say which",
      none: "The effect is needed",
    },
  },
  realBug: {
    question:
      "Is the warning a real bug: can someone observe a stale value (or an effect that should have re-run and didn't, or ran when it shouldn't)?",
    values: {
      yes: "Yes: the omitted value can change while the hook doesn't re-run, and the stale result is visible (a wrong render, a missed update, a call with old arguments)",
      latent:
        "It can't be seen today (the value never changes in practice, or the stale read is harmless), but it would go stale if the code around it changed",
      no: "No: the omitted value is stable or irrelevant, or the dependency is unnecessary and listing it does no harm",
      unclear: "Can't tell from the code and its visible uses",
    },
  },
  suggestedFix: {
    question:
      "Would the linters' suggested fix (add every missing dependency, remove the unnecessary ones, as the worksheet shows) be right?",
    values: {
      right:
        "Right: it fixes the staleness and runs the hook no more often than it should",
      harmless:
        "Harmless: behaviour is the same (the added value is stable), the rule is just satisfied",
      "reruns-more":
        "Runs the hook more often than it should (every render, or on unrelated changes): a perf or behaviour problem, but not a loop",
      loop: "Loops or re-subscribes on every render in a way that breaks the feature",
      "changes-behaviour":
        "Changes behaviour another way (a mount-only effect now repeats, a trigger dependency is removed, an event fires again)",
      unclear: "Can't tell",
    },
  },
  whyOmitted: {
    question: "Why does the code look the way it does?",
    values: {
      "mount-only": "Deliberately runs once (on mount) or only for some values",
      "avoid-loop": "Avoids a loop or extra runs the dependency would cause",
      "event-like":
        "The omitted value is read like an event's argument, not something to react to",
      "stable-value":
        "The value is stable, but the rule can't see it (a store, a form object, a ref-like value from a custom hook)",
      trigger:
        "A dependency listed on purpose to re-run the effect, though the body doesn't read it",
      oversight: "Looks like an oversight",
      unclear: "Can't tell",
    },
  },
};
const SUPPRESSION_CODEBOOK = {
  purpose: {
    question: "What is the suppression for?",
    values: {
      "mount-only": "Run once (or only on some changes) on purpose",
      "avoid-loop": "Listing the dependency would loop or re-run too often",
      "event-like": "The omitted value is read like an event argument",
      "stable-value": "The omitted value is stable but the rule can't see it",
      "workaround-now-wrong":
        "A workaround that's no longer needed or now hides a real bug",
      other: "Something else; say what",
      unclear: "Can't tell",
    },
  },
  fixWithoutSuppression: {
    question: "Is there a fix that needs no suppression?",
    values: {
      "use-effect-event": "useEffectEvent",
      ref: "A ref for the latest value",
      "move-inside": "Move code inside the effect",
      memoise: "Memoise a value or function (or move it out of the component)",
      "updater-function": "A state updater function",
      "remove-effect": "Remove or restructure the effect",
      "add-dep-is-fine": "Just add the dependency; nothing bad happens",
      none: "No: the suppression is the best option",
      unclear: "Can't tell",
    },
  },
  addingChangesBehaviour: {
    question:
      "Would adding the missing dependencies (the rule's suggestion) change behaviour?",
    values: { yes: "Yes", no: "No", unclear: "Can't tell" },
  },
  justified: {
    question:
      "Is the suppression justified as written (would a careful reviewer keep it)?",
    values: { yes: "Yes", no: "No", unclear: "Can't tell" },
  },
};

const flagsOf = (h) => ({
  biome: Boolean(h.flags?.raw?.biome),
  eslint: Boolean(h.flags?.raw?.["eslint-all"]),
  oxlint: Boolean(h.flags?.raw?.oxlint),
});
const stratumOf = (h) => {
  const f = flagsOf(h);
  return f.eslint || f.oxlint ? "eslint-or-oxlint" : "biome-only";
};
const population = () =>
  lib.readJsonl(join(lib.OUT_DIR, "hook-flags.jsonl")).filter((h) => {
    const f = flagsOf(h);
    return f.biome || f.eslint || f.oxlint;
  });

const fixRows = () => {
  const out = {};
  for (const mode of [
    "eslint-suggestions",
    "oxlint-dangerous",
    "biome-unsafe",
  ]) {
    for (const r of lib.readJsonl(
      join(lib.OUT_DIR, "fixes", `${mode}.jsonl`)
    )) {
      (out[r.hook] ??= {})[mode] = r;
    }
  }
  return out;
};

const ownerCode = (repo, h) => {
  const text = readFileSync(join(lib.getRepo(repo).root, h.file), "utf8").split(
    "\n"
  );
  const start = h.owner.line ?? Math.max(1, h.line - 30);
  // the owner function to the hook's end, trimmed to the 80 lines before the hook
  const from = Math.max(start, h.line - 80);
  const to = Math.min(text.length, h.endLine + 6);
  const lines = [];
  if (from > start) {
    lines.push(`${String(start).padStart(5)}  ${text[start - 1]}`);
    lines.push("       … (lines omitted)");
  }
  for (let i = from; i <= to; i++) {
    lines.push(
      `${String(i).padStart(5)}${i >= h.line && i <= h.endLine ? "> " : "  "}${text[i - 1]}`
    );
  }
  return lines.join("\n");
};

const block = (s, fixes, { blind = false } = {}) => {
  const h = s.hook;
  const f = h.flags?.raw ?? {};
  const msgs = (v) =>
    (f[v]?.messages ?? []).map((m) => `    - ${m}`).join("\n") ||
    "    (nothing)";
  const fx = fixes[h.id] ?? {};
  const fixLine = (m) =>
    fx[m]
      ? `[${fx[m].after.join(", ")}]${fx[m].signs?.length ? `  (signs: ${fx[m].signs.join(", ")})` : ""}`
      : "(unchanged)";
  return [
    `### ${s.id} — ${h.repo} — ${h.name} (${h.kind}) in ${h.owner.name ?? "?"} (${h.owner.kind})`,
    "",
    `- Permalink: ${lib.permalink(h.repo, h.file, h.line, h.endLine)}`,
    `- Dependencies as written: ${h.depsForm === "none" ? "(no array)" : `[${h.deps.map((d) => d.text).join(", ")}]`}`,
    `- What the callback reads from the component: ${(h.captures ?? []).map((c) => `${c.path}${c.called ? "()" : ""} (${c.kind})`).join(", ") || "(nothing)"}`,
    "- ESLint react-hooks/exhaustive-deps:",
    msgs("eslint-all"),
    "- Oxlint react-hooks(exhaustive-deps):",
    msgs("oxlint"),
    "- Biome useExhaustiveDependencies:",
    msgs("biome"),
    `- After ESLint's suggestion: ${fixLine("eslint-suggestions")}`,
    `- After Oxlint's dangerous fix: ${fixLine("oxlint-dangerous")}`,
    `- After Biome's unsafe fix: ${fixLine("biome-unsafe")}`,
    blind ? null : `- Static reading (effects only): ${h.category ?? "n/a"}`,
    "",
    "```tsx",
    ownerCode(h.repo, h),
    "```",
    "",
  ]
    .filter((x) => x !== null)
    .join("\n");
};

const draw = () => {
  const pop = population();
  const random = lib.rng(SEED);
  const items = [];
  for (const [repo, n] of Object.entries(PER_REPO)) {
    const inRepo = pop.filter((h) => h.repo === repo);
    const strata = lib.countBy(inRepo, stratumOf);
    const total = inRepo.length;
    // proportional allocation within the repo, at least one per non-empty stratum
    const alloc = {};
    let left = Math.min(n, total);
    const keys = Object.keys(strata);
    for (const k of keys) {
      alloc[k] = Math.max(
        1,
        Math.round((strata[k] / total) * Math.min(n, total))
      );
    }
    let sum = Object.values(alloc).reduce((a, b) => a + b, 0);
    while (sum > left) {
      const k = keys.sort((a, b) => alloc[b] - alloc[a])[0];
      alloc[k]--;
      sum--;
    }
    while (sum < left) {
      const k = keys.sort(
        (a, b) => strata[b] - alloc[b] - (strata[a] - alloc[a])
      )[0];
      alloc[k]++;
      sum++;
    }
    left = 0;
    for (const k of Object.keys(alloc)) {
      const pool = lib.shuffle(
        inRepo
          .filter((h) => stratumOf(h) === k)
          .sort((a, b) => (a.id < b.id ? -1 : 1)),
        random
      );
      for (const h of pool.slice(0, alloc[k])) {
        items.push({ hookId: h.id, repo, stratum: k });
      }
    }
  }
  items.sort((a, b) => (a.hookId < b.hookId ? -1 : 1));
  items.forEach((it, i) => {
    it.id = `h${String(i + 1).padStart(3, "0")}`;
  });
  const strataPop = {};
  for (const h of pop) {
    const key = `${h.repo}|${stratumOf(h)}`;
    strataPop[key] = (strataPop[key] ?? 0) + 1;
  }
  const blindIds = lib
    .shuffle(
      items.map((i) => i.id),
      lib.rng(SEED + 1)
    )
    .slice(0, BLIND)
    .sort();
  return {
    blind: blindIds,
    generated: new Date().toISOString().slice(0, 10),
    items,
    note: "Hooks any linter's dependency rule flags raw (ESLint with the react block on every file, Oxlint, Biome). Strata: repo × whether ESLint or Oxlint flags it, or Biome alone. Proportional within repo, at least one per stratum.",
    perRepo: PER_REPO,
    population: pop.length,
    seed: SEED,
    strataPopulation: strataPop,
  };
};

const worksheet = () => {
  const sample =
    existsSync(SAMPLE) && !lib.flag("resample") ? lib.readJson(SAMPLE) : draw();
  lib.writeJson(SAMPLE, sample);
  const pop = new Map(population().map((h) => [h.id, h]));
  const fixes = fixRows();
  const header = [
    "# Hand classification: hooks the dependency rule flags",
    "",
    'Label every item with the fields below. Read the code (open the permalink or the clone under research/corpus/repos/ for more context; read-only). Record labels as JSON: `{ "h001": { "realBug": …, "suggestedFix": …, "effectNeeded": …, "notNeededCategory": …, "bestFix": …, "whyOmitted": …, "notes": "…" }, … }`.',
    "",
    "## Codebook",
    "",
    ...Object.entries(CODEBOOK).flatMap(([k, v]) => [
      `### ${k}`,
      "",
      v.question,
      "",
      ...Object.entries(v.values).map(([val, d]) => `- \`${val}\`: ${d}`),
      "",
    ]),
    "## Items",
    "",
  ].join("\n");
  const blocks = sample.items.map((it) =>
    block({ hook: pop.get(it.hookId), id: it.id }, fixes)
  );
  writeFileSync(
    join(lib.OUT_DIR, "worksheet-hooks.md"),
    header + blocks.join("\n")
  );
  // suppressions
  const supp = [];
  for (const repo of lib.ALL) {
    for (const d of lib.readJsonl(
      join(lib.OUT_DIR, "suppressions", `${repo}.jsonl`)
    )) {
      if (d.depRules.length > 0) {
        supp.push({ ...d, repo });
      }
    }
  }
  supp.forEach((d, i) => {
    d.id = `s${String(i + 1).padStart(3, "0")}`;
  });
  const sHeader = [
    "# Hand classification: suppressions of the dependency rule",
    "",
    'Every disable comment in the corpus and the React set that names react-hooks/exhaustive-deps (or Oxlint\'s or Biome\'s dependency rule). Label each with the fields below as JSON: `{ "s001": { "purpose": …, "fixWithoutSuppression": …, "addingChangesBehaviour": …, "justified": …, "notes": "…" }, … }`. Open the permalink or the clone for more context (read-only).',
    "",
    "## Codebook",
    "",
    ...Object.entries(SUPPRESSION_CODEBOOK).flatMap(([k, v]) => [
      `### ${k}`,
      "",
      v.question,
      "",
      ...Object.entries(v.values).map(([val, d]) => `- \`${val}\`: ${d}`),
      "",
    ]),
    "## Items",
    "",
  ].join("\n");
  const sBlocks = supp.map((d) => {
    const hk = d.hooks?.[0];
    const h = hk ? (pop.get(hk.id) ?? null) : null;
    const code = h ? ownerCode(d.repo, h) : d.context;
    return [
      `### ${d.id} — ${d.repo} — ${d.file}:${d.line}`,
      "",
      `- Permalink: ${d.permalink}`,
      `- Comment: \`${d.text}\`${d.reason ? ` (reason: ${d.reason})` : ""}`,
      `- Nearby comment: ${d.nearby ?? "(none)"}`,
      `- Hook: ${hk ? `${hk.name} (${hk.kind}) [${hk.deps.join(", ")}]` : "(none found)"}`,
      `- With the comment removed, ESLint says: ${(h?.flags?.raw?.["eslint-all"]?.messages ?? ["(nothing)"]).join(" / ")}`,
      `- Oxlint says: ${(h?.flags?.raw?.oxlint?.messages ?? ["(nothing)"]).join(" / ")}`,
      `- After ESLint's suggestion: ${fixes[hk?.id]?.["eslint-suggestions"] ? `[${fixes[hk.id]["eslint-suggestions"].after.join(", ")}]` : "(unchanged)"}`,
      "",
      "```tsx",
      code,
      "```",
      "",
    ].join("\n");
  });
  writeFileSync(
    join(lib.OUT_DIR, "worksheet-suppressions.md"),
    sHeader + sBlocks.join("\n")
  );
  lib.writeJson(
    join(lib.OUT_DIR, "suppressions-index.json"),
    supp.map((d) => ({
      file: d.file,
      hook: d.hooks?.[0]?.id ?? null,
      id: d.id,
      line: d.line,
      repo: d.repo,
    }))
  );
  console.log(
    `hooks: ${sample.items.length} of ${sample.population}; suppressions: ${supp.length}`
  );
};

const print = () => {
  const sample = lib.readJson(SAMPLE);
  const pop = new Map(population().map((h) => [h.id, h]));
  const fixes = fixRows();
  const sheet = readFileSync(join(lib.OUT_DIR, "worksheet-hooks.md"), "utf8");
  const head = sheet
    .split("\n## Items\n")[0]
    .replace("# Hand classification", "# Hand classification (blind subset)");
  const blocks = sample.items
    .filter((it) => sample.blind.includes(it.id))
    .map((it) =>
      block({ hook: pop.get(it.hookId), id: it.id }, fixes, { blind: true })
    );
  writeFileSync(
    join(lib.OUT_DIR, "worksheet-hooks-blind.md"),
    `${head}\n## Items\n\n${blocks.join("\n")}`
  );
  // the suppressions' blind subset (30, seeded, frozen in suppression-blind.json)
  const blindFile = join(lib.RESULTS_DIR, "suppression-blind.json");
  const sheetS = readFileSync(
    join(lib.OUT_DIR, "worksheet-suppressions.md"),
    "utf8"
  );
  const [headS, itemsS] = sheetS.split("\n## Items\n");
  const sBlocks = itemsS
    .split(/\n(?=### s\d{3} )/)
    .filter((b) => b.startsWith("### s"));
  const frozen = lib.readJson(blindFile);
  const ids =
    frozen?.ids ??
    lib
      .shuffle(
        sBlocks.map((b) => b.slice(4, 8)),
        lib.rng(SEED + 1)
      )
      .slice(0, 30)
      .sort();
  if (!frozen) {
    lib.writeJson(blindFile, {
      ids,
      note: "Seeded blind subset of the suppression worksheet for the second rater",
      seed: SEED + 1,
    });
  }
  writeFileSync(
    join(lib.OUT_DIR, "worksheet-suppressions-blind.md"),
    `${headS.replace("# Hand classification", "# Hand classification (blind subset)")}\n## Items\n\n${sBlocks.filter((b) => ids.includes(b.slice(4, 8))).join("\n")}`
  );
  console.log(`blind: ${blocks.length} hooks, ${ids.length} suppressions`);
};

// Cohen's kappa
const kappa = (pairs) => {
  const n = pairs.length;
  if (n === 0) {
    return null;
  }
  const cats = [...new Set(pairs.flat())];
  const observed = pairs.filter(([a, b]) => a === b).length / n;
  const expected = cats.reduce((sum, c) => {
    const pa = pairs.filter(([a]) => a === c).length / n;
    const pb = pairs.filter(([, b]) => b === c).length / n;
    return sum + pa * pb;
  }, 0);
  return expected === 1
    ? 1
    : Math.round(((observed - expected) / (1 - expected)) * 100) / 100;
};

const compute = () => {
  const sample = lib.readJson(SAMPLE);
  const r1 = lib.readJson(join(lib.OUT_DIR, "labels-hooks-rater1.json"));
  const r2 = lib.readJson(join(lib.OUT_DIR, "labels-hooks-rater2.json"), {});
  const s1 = lib.readJson(
    join(lib.OUT_DIR, "labels-suppressions-rater1.json"),
    {}
  );
  const s2 = lib.readJson(
    join(lib.OUT_DIR, "labels-suppressions-rater2.json"),
    {}
  );
  const pop = new Map(population().map((h) => [h.id, h]));
  const missing = sample.items.filter((it) => !r1[it.id]).map((it) => it.id);
  if (missing.length > 0) {
    throw new Error(`rater 1 has no label for ${missing.join(", ")}`);
  }
  // weights: population of the stratum / sampled in the stratum
  const sampledIn = lib.countBy(
    sample.items,
    (it) => `${it.repo}|${it.stratum}`
  );
  const weight = (it) =>
    sample.strataPopulation[`${it.repo}|${it.stratum}`] /
    sampledIn[`${it.repo}|${it.stratum}`];
  const weighted = (field, filter = () => true) => {
    const out = {};
    let total = 0;
    for (const it of sample.items.filter(filter)) {
      const v = r1[it.id][field] ?? "unlabelled";
      out[v] = (out[v] ?? 0) + weight(it);
      total += weight(it);
    }
    return Object.fromEntries(
      Object.entries(out)
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => [k, Math.round((v / total) * 1000) / 10])
    );
  };
  const raw = (field, filter = () => true) =>
    lib.countBy(
      sample.items.filter(filter),
      (it) => r1[it.id][field] ?? "unlabelled"
    );
  const isEffect = (it) => pop.get(it.hookId)?.kind === "effect";
  const fields = Object.keys(CODEBOOK);
  const agreement = {};
  for (const f of fields) {
    const ids = sample.blind.filter((id) => r2[id]);
    const pairs = ids.map((id) => [
      r1[id][f] ?? "unlabelled",
      r2[id][f] ?? "unlabelled",
    ]);
    agreement[f] = {
      disagreements: ids
        .filter((id) => (r1[id][f] ?? "") !== (r2[id][f] ?? ""))
        .map((id) => ({ first: r1[id][f], id, second: r2[id][f] })),
      kappa: kappa(pairs),
      n: pairs.length,
      same: pairs.filter(([a, b]) => a === b).length,
    };
  }
  // the static reading against the raters (effects only)
  const mechanical = sample.items.filter(isEffect).map((it) => ({
    id: it.id,
    mech: pop.get(it.hookId).category,
    needed: r1[it.id].effectNeeded,
    rater: r1[it.id].notNeededCategory,
  }));
  const supp = lib.readJson(join(lib.OUT_DIR, "suppressions-index.json"), []);
  const suppMissing = supp.filter((s) => !s1[s.id]).map((s) => s.id);
  const suppAgreement = {};
  for (const f of Object.keys(SUPPRESSION_CODEBOOK)) {
    const ids = Object.keys(s2).filter((id) => s1[id]);
    const pairs = ids.map((id) => [
      s1[id][f] ?? "unlabelled",
      s2[id][f] ?? "unlabelled",
    ]);
    suppAgreement[f] = {
      kappa: kappa(pairs),
      n: pairs.length,
      same: pairs.filter(([a, b]) => a === b).length,
    };
  }
  const out = {
    agreement,
    codebook: CODEBOOK,
    generated: new Date().toISOString().slice(0, 10),
    hooks: sample.items.map((it) => ({
      ...it,
      kind: pop.get(it.hookId)?.kind ?? null,
      mechanicalCategory: pop.get(it.hookId)?.category ?? null,
      permalink: (() => {
        const h = pop.get(it.hookId);
        return h ? lib.permalink(h.repo, h.file, h.line, h.endLine) : null;
      })(),
      rater1: r1[it.id],
      rater2: r2[it.id] ?? null,
    })),
    mechanicalVsRater: mechanical,
    note: "Rater 1 (a Claude subagent with read-only access to the clones) labelled every item; rater 2 (a separate Claude subagent, blind to rater 1) labelled the seeded subset in sample.json `blind`. Both raters are Claude models, so agreement measures how consistently the codebook applies, not independent human judgement. Shares are weighted to the flagged population by repo and stratum (sample.json strataPopulation).",
    raw: Object.fromEntries(fields.map((f) => [f, raw(f)])),
    rawEffects: Object.fromEntries(fields.map((f) => [f, raw(f, isEffect)])),
    suppressions: {
      agreement: suppAgreement,
      codebook: SUPPRESSION_CODEBOOK,
      items: supp.map((s) => ({
        ...s,
        rater1: s1[s.id] ?? null,
        rater2: s2[s.id] ?? null,
      })),
      missing: suppMissing,
      raw: Object.fromEntries(
        Object.keys(SUPPRESSION_CODEBOOK).map((f) => [
          f,
          lib.countBy(supp, (s) => s1[s.id]?.[f] ?? "unlabelled"),
        ])
      ),
    },
    weighted: Object.fromEntries(fields.map((f) => [f, weighted(f)])),
    weightedEffects: Object.fromEntries(
      fields.map((f) => [f, weighted(f, isEffect)])
    ),
  };
  lib.writeJson(join(lib.RESULTS_DIR, "classifications.json"), out);
  console.log(
    JSON.stringify(
      {
        agreement: Object.fromEntries(
          Object.entries(agreement).map(([k, v]) => [
            k,
            `${v.same}/${v.n} κ ${v.kappa}`,
          ])
        ),
        weighted: out.weighted,
      },
      null,
      1
    )
  );
};

if (lib.flag("worksheet")) {
  worksheet();
}
if (lib.flag("print")) {
  print();
}
if (lib.flag("compute")) {
  compute();
}
