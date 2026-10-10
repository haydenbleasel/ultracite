// Sanity check for behavior.ts: correct refactors must pass, broken ones must fail.
"use strict";

const { execFileSync } = require("node:child_process");
const { join, resolve } = require("node:path");

const HERE = resolve(__dirname, "..");
const T = join(HERE, "harness-tests");
const ref = {
  s1: join(HERE, "subjects/s1/cache-life-type-utils.ts"),
  s2: join(HERE, "subjects/s2/utils.ts"),
};
const expect = {
  "s1-guard.ts": true,
  "s1-nodead.ts": true,
  "s1-template.ts": true,
  "s1-noguard.ts": false,
  "s1-reorder.ts": false,
  "s2-hoist.ts": true,
  "s2-swap.ts": false,
  "s2-dedupe.ts": false,
  "s2-some.ts": false,
  "s2-ref-guards.ts": true,
  "s2-ref-guards-unified.ts": true,
  "s2-ref-guards-filter.ts": true,
};
// Mode C (helper call trace) must flag the hoisting mutant even though its outputs match.
const expectTraceFail = new Set(["s2-hoist.ts"]);

let bad = 0;
const runs = [
  ["self-s1", "s1", ref.s1, true],
  ["self-s2", "s2", ref.s2, true],
];
for (const [f, e] of Object.entries(expect))
  runs.push([f, f.slice(0, 2), join(T, f), e]);
for (const [name, subject, cand, e] of runs) {
  const out = JSON.parse(
    execFileSync(
      "bun",
      [join(HERE, "scripts/behavior.ts"), subject, ref[subject], cand],
      { encoding: "utf8" }
    )
  );
  let pass;
  if (e === "modeB-only")
    pass =
      !out.ok &&
      out.modes.realHelpers.ok &&
      !out.modes.arbitraryHelperOutput.ok;
  else pass = out.ok === e;
  if (expectTraceFail.has(name))
    pass = pass && out.modes.helperCallTrace.ok === false;
  if (subject === "s2" && e === true && !expectTraceFail.has(name))
    pass = pass && out.modes.helperCallTrace.ok === true;
  if (!pass) bad++;
  const detail = out.ok
    ? `${out.cases} cases`
    : JSON.stringify(out.mismatch ?? out.modes ?? out).slice(0, 220);
  console.log(`${pass ? "OK  " : "BAD "} ${name}: ok=${out.ok} ${detail}`);
}
process.exit(bad ? 1 : 0);
