// Behavior-equivalence check: imports the pristine reference and an agent-modified copy and
// compares their outputs on edge cases plus a few thousand seeded-random inputs.
//
// Usage: bun scripts/behavior.ts <s1|s2> <referenceFile> <candidateFile>
// Prints one JSON object: { ok, cases, mismatch?, importError?, exportMissing? , modes? }
//
// Only scratch files are executed: the two subject copies and astro-helpers.ts.

import * as helpers from "./astro-helpers.ts";

const [subject, referencePath, candidatePath] = process.argv.slice(2);
const SEED = 20_261_010;

// mulberry32: small seeded PRNG so every run sees the same inputs.
const rng = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
};

type Outcome = { ok: true; value: string } | { ok: false; error: string };
const run = (fn: () => unknown): Outcome => {
  try {
    return { ok: true, value: JSON.stringify(fn()) ?? "undefined" };
  } catch (error) {
    return {
      ok: false,
      error: `${(error as Error)?.name}: ${(error as Error)?.message}`,
    };
  }
};
const same = (a: Outcome, b: Outcome) =>
  a.ok === b.ok &&
  (a.ok
    ? a.value === (b as typeof a).value
    : a.error === (b as { error: string }).error);

const describeNumber = (n: number) => (Object.is(n, -0) ? "-0" : String(n));

async function load(path: string, name: string) {
  const mod = await import(path);
  return mod[name];
}

// ------------------------------------------------------------------ s1: formatTimespan

function timespanInputs(): number[] {
  const MIN = 60;
  const HOUR = 3600;
  const DAY = 86_400;
  const WEEK = 604_800;
  const MONTH = 2_592_000;
  const units = [1, MIN, HOUR, DAY, WEEK, MONTH, 18_144_000, 31_536_000];
  const edge = [
    0,
    -0,
    1,
    -1,
    0.5,
    -0.5,
    0.1 + 0.2,
    59,
    61,
    119,
    3599,
    3601,
    86_399,
    86_401,
    604_799,
    604_801,
    2_591_999,
    2_592_001,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    Number.MAX_SAFE_INTEGER,
    Number.MIN_SAFE_INTEGER,
    Number.MAX_VALUE,
    -Number.MAX_VALUE,
    Number.MIN_VALUE,
    -Number.MIN_VALUE,
    Number.EPSILON,
    1e21,
    -1e21,
    1e21 + 60 * 1e6,
    2 ** 53,
    2 ** 53 + 2,
    2 ** 60,
    60 * 2 ** 50,
    MONTH * 1e15,
    WEEK * 1e17,
    60.000_000_1,
    3600.5,
    1e-7,
    -1e-7,
  ];
  for (const u of units) {
    for (let k = -12; k <= 12; k++)
      edge.push(k * u, k * u + 1, k * u - 1, k * u + 0.5);
  }
  const r = rng(SEED);
  const random: number[] = [];
  for (let i = 0; i < 1500; i++) random.push(Math.floor((r() - 0.5) * 2e7)); // ints, +/-1e7
  for (let i = 0; i < 1500; i++) {
    // random multiples of a unit, both signs, small and large multipliers
    const u = units[Math.floor(r() * units.length)];
    const k = Math.floor(r() * (r() < 0.5 ? 50 : 1e9)) * (r() < 0.3 ? -1 : 1);
    random.push(k * u);
  }
  for (let i = 0; i < 1000; i++)
    random.push((r() - 0.5) * 10 ** Math.floor(r() * 12)); // floats
  for (let i = 0; i < 500; i++)
    random.push((r() < 0.5 ? -1 : 1) * r() * 10 ** Math.floor(r() * 309)); // huge
  for (let i = 0; i < 500; i++)
    random.push(Math.round(r() * 100) * 60 * 10 ** Math.floor(r() * 20)); // big round
  return [...edge, ...random];
}

async function checkS1(
  reference: (n: number) => string,
  candidate: (n: number) => string
) {
  const inputs = timespanInputs();
  for (const n of inputs) {
    const a = run(() => reference(n));
    const b = run(() => candidate(n));
    if (!same(a, b)) {
      return {
        ok: false,
        cases: inputs.length,
        mismatch: { input: describeNumber(n), expected: a, actual: b },
      };
    }
  }
  return { ok: true, cases: inputs.length };
}

// ------------------------------------------------------------------ s2: computePreferredLocaleList

type Locales = (string | { path: string; codes: string[] })[];
type BrowserLocale = { locale: string; qualityValue: number | undefined };
const g = globalThis as Record<string, unknown>;

const installRealHelpers = () => {
  g.parseLocale = helpers.parseLocale;
  g.sortAndFilterLocales = helpers.sortAndFilterLocales;
  g.getAllCodes = helpers.getAllCodes;
  g.normalizeTheLocale = helpers.normalizeTheLocale;
};

const CODES = [
  "en",
  "en-US",
  "en_US",
  "EN-us",
  "en-GB",
  "fr",
  "fr-CA",
  "fr_CA",
  "es",
  "pt-BR",
  "pt_br",
  "de",
  "ja",
  "zh-Hant",
  "it",
  "*",
];

function randomLocales(r: () => number): Locales {
  const pick = () =>
    CODES.filter((c) => c !== "*")[Math.floor(r() * (CODES.length - 1))];
  const n = Math.floor(r() * 6);
  const out: Locales = [];
  for (let i = 0; i < n; i++) {
    if (r() < 0.6) out.push(pick());
    else {
      const codes = Array.from({ length: 1 + Math.floor(r() * 3) }, pick);
      out.push({ path: `p${i}`, codes });
    }
  }
  // occasionally a "*" code, which only an exact match can hit
  if (r() < 0.05) out.push("*");
  return out;
}

function randomHeader(r: () => number): string | null {
  const roll = r();
  if (roll < 0.05) return null;
  if (roll < 0.08) return "";
  if (roll < 0.12) return "*";
  if (roll < 0.15) return `*;q=0.${Math.floor(r() * 10)}`;
  const n = 1 + Math.floor(r() * 6);
  const parts: string[] = [];
  for (let i = 0; i < n; i++) {
    let tag = CODES[Math.floor(r() * CODES.length)];
    const q = r();
    if (q < 0.4) tag += `;q=${(Math.floor(r() * 11) / 10).toFixed(1)}`;
    else if (q < 0.45) tag += ";q=abc";
    else if (q < 0.5) tag += ";q=1.5";
    else if (q < 0.53) tag += ";level=1";
    parts.push(r() < 0.2 ? ` ${tag} ` : tag);
  }
  return parts.join(r() < 0.5 ? "," : ", ");
}

function randomBrowserList(r: () => number): BrowserLocale[] {
  const n = Math.floor(r() * 6);
  return Array.from({ length: n }, () => ({
    locale: CODES[Math.floor(r() * CODES.length)],
    qualityValue: r() < 0.5 ? undefined : Math.floor(r() * 11) / 10,
  }));
}

const makeRequest = (header: string | null) =>
  new Request(
    "http://localhost/",
    header === null ? {} : { headers: { "Accept-Language": header } }
  );

type Fn = (request: Request, locales: Locales) => string[];

async function checkS2(reference: Fn, candidate: Fn) {
  const r = rng(SEED);
  const modes: Record<string, unknown> = {};

  // Mode A: the real Astro helpers, random Accept-Language headers and locale configs.
  installRealHelpers();
  const edgeA: [string | null, Locales][] = [
    [null, ["en"]],
    ["", ["en"]],
    ["*", []],
    ["*", ["en", { path: "fr", codes: ["fr", "fr-CA"] }]],
    ["*;q=0.5", ["en"]],
    ["*, en", ["en"]],
    ["en, *", ["en"]],
    ["en", []],
    ["EN_us", ["en-US"]],
    [
      "en-US, en;q=0.9",
      ["en", "en-US", { path: "us", codes: ["en_US", "en-us"] }],
    ],
    ["fr;q=0.1, en;q=0.9", ["fr", "en"]],
    ["en, en", ["en"]],
    ["de", ["en"]],
    ["*", ["*"]],
    ["en;q=abc, fr;q=1.5", ["fr", "en"]],
    [" , ,", ["en"]],
  ];
  const casesA: [string | null, Locales][] = [...edgeA];
  for (let i = 0; i < 3000; i++)
    casesA.push([randomHeader(r), randomLocales(r)]);
  let failA: unknown = null;
  for (const [header, locales] of casesA) {
    const a = run(() =>
      reference(makeRequest(header), structuredClone(locales))
    );
    const b = run(() =>
      candidate(makeRequest(header), structuredClone(locales))
    );
    if (!same(a, b)) {
      failA = { header, locales, expected: a, actual: b };
      break;
    }
  }
  modes.realHelpers = failA
    ? { ok: false, cases: casesA.length, mismatch: failA }
    : { ok: true, cases: casesA.length };

  // Mode B (stricter): sortAndFilterLocales replaced by a stub that returns an arbitrary list
  // (unsorted, unfiltered, may contain "*" anywhere and duplicates), so the function's own logic
  // is exercised without relying on the helper's invariants. Other helpers stay real.
  installRealHelpers();
  const edgeB: BrowserLocale[][] = [
    [],
    [{ locale: "*", qualityValue: undefined }],
    [{ locale: "*", qualityValue: 0.5 }],
    [
      { locale: "*", qualityValue: undefined },
      { locale: "en", qualityValue: undefined },
    ],
    [
      { locale: "en", qualityValue: undefined },
      { locale: "*", qualityValue: undefined },
    ],
    [{ locale: "de", qualityValue: undefined }],
    [
      { locale: "en", qualityValue: 1 },
      { locale: "en", qualityValue: 1 },
    ],
  ];
  const casesB: [BrowserLocale[], Locales][] = edgeB.map((l) => [
    l,
    ["en", "*", { path: "f", codes: ["fr", "en_US"] }],
  ]);
  for (let i = 0; i < 3000; i++)
    casesB.push([randomBrowserList(r), randomLocales(r)]);
  let failB: unknown = null;
  for (const [list, locales] of casesB) {
    g.sortAndFilterLocales = () => structuredClone(list);
    const a = run(() => reference(makeRequest("x"), structuredClone(locales)));
    const b = run(() => candidate(makeRequest("x"), structuredClone(locales)));
    if (!same(a, b)) {
      failB = { browserLocaleList: list, locales, expected: a, actual: b };
      break;
    }
  }
  installRealHelpers();
  modes.arbitraryHelperOutput = failB
    ? { ok: false, cases: casesB.length, mismatch: failB }
    : { ok: true, cases: casesB.length };

  // Mode C (strictest, reported separately, not part of `ok`): the helpers are opaque
  // `declare function`s, so also compare the exact sequence of calls made to them (name +
  // arguments) on the mode-A inputs. A refactor that hoists or skips a normalizeTheLocale call
  // returns the same value with pure helpers but would differ if a helper had side effects.
  let trace: string[] = [];
  const traced = <T extends (...args: never[]) => unknown>(
    name: string,
    fn: T
  ) =>
    ((...args: Parameters<T>) => {
      trace.push(`${name}(${JSON.stringify(args)})`);
      return fn(...args);
    }) as T;
  const installTraced = () => {
    g.parseLocale = traced("parseLocale", helpers.parseLocale);
    g.sortAndFilterLocales = traced(
      "sortAndFilterLocales",
      helpers.sortAndFilterLocales
    );
    g.getAllCodes = traced("getAllCodes", helpers.getAllCodes);
    g.normalizeTheLocale = traced(
      "normalizeTheLocale",
      helpers.normalizeTheLocale
    );
  };
  let failC: unknown = null;
  for (const [header, locales] of casesA) {
    installTraced();
    trace = [];
    run(() => reference(makeRequest(header), structuredClone(locales)));
    const ta = trace;
    trace = [];
    run(() => candidate(makeRequest(header), structuredClone(locales)));
    const tb = trace;
    if (ta.join("\n") !== tb.join("\n")) {
      const i = ta.findIndex((c, k) => c !== tb[k]);
      failC = {
        header,
        locales,
        referenceCalls: ta.length,
        candidateCalls: tb.length,
        firstDifference: {
          index: i,
          reference: ta[i] ?? null,
          candidate: tb[i] ?? null,
        },
      };
      break;
    }
  }
  installRealHelpers();
  modes.helperCallTrace = failC
    ? { ok: false, cases: casesA.length, mismatch: failC }
    : { ok: true, cases: casesA.length };

  const ok = Boolean(
    (modes.realHelpers as { ok: boolean }).ok &&
    (modes.arbitraryHelperOutput as { ok: boolean }).ok
  );
  return { ok, cases: casesA.length + casesB.length, modes };
}

// ------------------------------------------------------------------ main

const EXPORT =
  subject === "s1" ? "formatTimespan" : "computePreferredLocaleList";
if (subject === "s2") installRealHelpers();

let reference: unknown;
let candidate: unknown;
try {
  reference = await load(referencePath, EXPORT);
} catch (error) {
  console.log(
    JSON.stringify({
      ok: false,
      harnessError: `reference import failed: ${(error as Error).message}`,
    })
  );
  process.exit(0);
}
try {
  candidate = await load(candidatePath, EXPORT);
} catch (error) {
  console.log(
    JSON.stringify({ ok: false, importError: (error as Error).message })
  );
  process.exit(0);
}
if (typeof candidate !== "function") {
  console.log(JSON.stringify({ ok: false, exportMissing: EXPORT }));
  process.exit(0);
}

const result =
  subject === "s1"
    ? await checkS1(
        reference as (n: number) => string,
        candidate as (n: number) => string
      )
    : await checkS2(reference as Fn, candidate as Fn);
console.log(JSON.stringify({ seed: SEED, ...result }));
