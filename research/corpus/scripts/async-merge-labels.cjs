// Assembles results/<topic>/classifications.json from the hand classification passes of the
// floating-promise and await-in-loop samples (async-sample.cjs): the codebook, the first pass
// (one labels file per kind) and the blind second pass. Run async-agreement.cjs --compute after.
//
// Usage (from the repo root):
//   node research/corpus/scripts/async-merge-labels.cjs --floating <labels.json>
//     --await-loop <labels.json> --second <second-rater.json> [--topic floating-promises]
"use strict";

const { readFileSync, writeFileSync } = require("node:fs");
const { join, resolve } = require("node:path");

const HERE = resolve(__dirname, "..");
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const TOPIC = arg("topic", process.env.RESEARCH_TOPIC ?? "floating-promises");
const DIR = join(HERE, "results", TOPIC);
const read = (path) => JSON.parse(readFileSync(path, "utf8"));

const CODEBOOK = {
  "await-loop": {
    categories: {
      "already-concurrent":
        "The awaited promises were created before or outside the loop, so the work already runs in parallel and the loop only collects results in order. (A later promise that rejects while an earlier one is awaited is briefly unhandled.)",
      parallelizable:
        "Iterations are independent; Promise.all (or a bounded pool) would give the same result, apart from error timing and load. Only when the reviewer would propose the change.",
      "sequential-dependency":
        "An iteration needs the previous one's result or state: an accumulator, a cursor or page token, a loop condition on the awaited value, retry/poll/backoff, the next chunk of a stream or queue.",
      "sequential-ordering":
        "No data passes between iterations, but they must run in order or stop early: first-match search with break/return, ordered side effects (writes, output, hooks or middleware in sequence), shared state that would race.",
      "sequential-throttle":
        "Could run in parallel but is deliberately serialized to limit load (rate limits, processes, memory, open files), stated or evident.",
      unclear: "Can't tell from the file and a reasonable lookup.",
    },
    fields: {
      documented: "A comment at or near the loop says why it is sequential.",
      earlyExit: "The loop can break, return or throw on an awaited result.",
      evidence: "One or two concrete sentences.",
    },
  },
  floating: {
    categories: {
      "intentional-documented":
        "Fire-and-forget on purpose, and the code says so at or next to the site (a comment, an explicit marker or suppression).",
      "intentional-undocumented":
        "Fire-and-forget by design: nothing downstream needs the result or timing, and a rejection is impossible or already handled (the callee catches its own errors, or no promise exists at runtime), but nothing at the site says so.",
      "latent-bug":
        "Something can be lost: (a) lost error, a possible rejection that nothing handles (an unhandled rejection: fatal in Node by default since v15, 'Uncaught (in promise)' in browsers); or (b) ordering, later code or the caller depends on the work having finished.",
      unclear: "Can't tell from the file and a reasonable lookup.",
    },
    fields: {
      bugKind: "For latent-bug: lost-error, ordering or both.",
      canReject: "yes, no or unknown.",
      evidence: "One or two concrete sentences.",
      fix: "What a careful maintainer would do: none, void, await, catch, return or restructure.",
    },
  },
};

// Cross-cutting notes the lead agent added after both passes, from the first pass's evidence
// and the code: sites where no promise exists at runtime (the type over-approximates), and
// latent bugs whose unhandled rejection duplicates an error that is already reported elsewhere.
const ANNOTATIONS = {
  duplicateRejection: {
    ids: ["f006", "f007", "f008", "f048", "f058", "f063"],
    note: "Labelled latent-bug under the codebook (an unhandled rejection), but the same error is also handled, rethrown or reported elsewhere, so the cost is a duplicate 'Uncaught (in promise)' or unhandledRejection, not a lost error. f063 rests on Monaco's factory API, which is outside the sparse clone.",
  },
  notAPromiseAtRuntime: {
    ids: ["f001", "f009", "f012", "f013", "f025", "f060"],
    note: "The rule fires on the declared type, but no promise is dropped at runtime: a MaybeAsync check that is always sync here (f001), Array splice/pop on an array whose element type includes Promise (f009, f012, f013), removing a listener (f025), and Object.defineProperties returning the promise the function returns two lines later (f060).",
  },
};

const main = () => {
  const floating = read(arg("floating"));
  const awaitLoop = read(arg("await-loop"));
  const second = read(arg("second"));
  const sample = read(join(DIR, "sample.json"));
  const kindOf = new Map(sample.sites.map((s) => [s.id, s.kind]));
  const labels = [...floating.labels, ...awaitLoop.labels].map((l) => ({
    kind: kindOf.get(l.id),
    ...l,
  }));
  const missing = sample.sites.filter(
    (s) => !labels.some((l) => l.id === s.id)
  );
  if (missing.length > 0) {
    throw new Error(`No first-pass label for ${missing.map((s) => s.id)}`);
  }
  const out = {
    annotations: ANNOTATIONS,
    codebook: CODEBOOK,
    labels,
    raters: {
      first: `${floating.rater} (floating); ${awaitLoop.rater} (await-loop). Each read the worksheet (code context and permalink) and the repo file, read-only.`,
      second: second.rater,
    },
    secondRater: second.labels,
  };
  writeFileSync(
    join(DIR, "classifications.json"),
    `${JSON.stringify(out, null, 2)}\n`
  );
  console.log(
    `${labels.length} labels, ${Object.keys(second.labels).length} second-rater labels`
  );
};

main();
