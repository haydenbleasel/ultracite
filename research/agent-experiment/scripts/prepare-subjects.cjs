// Builds the two subject files from the extracted examples. This is the cognitive-complexity
// topic's code; a topic module with a `prepareSubjects` hook (scripts/topics.cjs) builds its
// own, e.g. RESEARCH_TOPIC=floating-promises writes subjects/floating-promises/.
//
// The extracted example headers contain experiment metadata (the example's role and the
// complexity scores we measured). That would prime the agent, so it is removed; the source
// attribution (repo, path, commit, permalink) and the full license text are kept verbatim.
// The code below the header is untouched.
//
// Output: subjects/<id>/<basename>  (made read-only: this is the pristine reference)
//         subjects/subjects.json
"use strict";

const {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} = require("node:fs");
const { createHash } = require("node:crypto");
const { join, relative, resolve } = require("node:path");
const { loadTopic } = require("./topics.cjs");

const HERE = resolve(__dirname, "..");
const EXAMPLES = resolve(HERE, "../corpus/examples");

const SUBJECTS = [
  {
    id: "s1",
    example: "c-pure-21-30.ts",
    basename: "cache-life-type-utils.ts",
    exportName: "formatTimespan",
    source:
      "vercel/next.js packages/next/src/server/lib/router-utils/cache-life-type-utils.ts",
  },
  {
    id: "s2",
    example: "b-alt-nested-loops.ts",
    basename: "utils.ts",
    exportName: "computePreferredLocaleList",
    source: "withastro/astro packages/astro/src/i18n/utils.ts",
  },
];

function cleanHeader(text) {
  const lines = text.split("\n");
  const out = [];
  let inScores = false;
  for (const line of lines) {
    if (/^ \* Example [\w-]+: /.test(line)) continue; // role line (+ the blank " *" after it)
    if (/^ \* Scores \(measured/.test(line)) {
      inScores = true;
      continue;
    }
    if (inScores) {
      if (/^ \*   /.test(line)) continue;
      inScores = false;
    }
    out.push(line);
  }
  // The role line was followed by a blank comment line; drop a leading "/*\n *\n".
  if (out[0] === "/*" && out[1] === " *") out.splice(1, 1);
  return out.join("\n");
}

const sha256 = (s) => createHash("sha256").update(s).digest("hex");

function prepareCognitiveComplexity() {
  const manifest = [];
  for (const s of SUBJECTS) {
    const dir = join(HERE, "subjects", s.id);
    mkdirSync(dir, { recursive: true });
    const original = readFileSync(join(EXAMPLES, s.example), "utf8");
    const cleaned = cleanHeader(original);
    const dest = join(dir, s.basename);
    if (existsSync(dest)) chmodSync(dest, 0o644);
    writeFileSync(dest, cleaned);
    chmodSync(dest, 0o444);
    manifest.push({
      ...s,
      path: relative(HERE, dest),
      sha256: sha256(cleaned),
    });
  }
  writeFileSync(
    join(HERE, "subjects", "subjects.json"),
    `${JSON.stringify(manifest, null, 2)}\n`
  );
  return manifest;
}

// Other topics build their subjects with their own hook (RESEARCH_TOPIC, scripts/topics.cjs).
const topic = loadTopic();
const manifest = topic.prepareSubjects
  ? topic.prepareSubjects()
  : prepareCognitiveComplexity();
console.log(JSON.stringify(manifest, null, 2));
