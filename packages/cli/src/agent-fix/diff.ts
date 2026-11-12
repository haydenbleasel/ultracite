import { readFileSync } from "node:fs";

import type { Diagnostic } from "./types";

const LINE_BREAK_RE = /\r?\n/u;
const NUMBER_RE = /\b\d+(?:\.\d+)?\b/gu;

// Numbers that point at other code or count repeats, which an edit anywhere
// in the file changes: "declared in the upper scope on line 3 column 7",
// "identical to the one on line 12", "duplicating this literal 3 times".
const POSITION_RE = /(?<=\b(?:line|column|col)\s+)\d+\b|\b\d+(?=\s+times\b)/giu;

// Rules that measure code against a limit and put the measure in their
// message: the max-* rules of ESLint and its plugins, the complexity rules,
// and Biome's noExcessive* and useMax* rules. Matched on the rule's own
// name, after any plugin prefix or Biome group.
const LIMIT_RULE_RE =
  /(?:^|\/)(?:(?:jsx-)?max-[\w-]+|(?:[\w-]+-)?complexity|nested-control-flow|noExcessive\w+|useMax\w+)$/u;

// Can't appear in a rule name, so a rule and a message never run together.
const KEY_SEPARATOR = "\u0000";

/** A file as the linter read it, one trimmed line per entry. */
interface Snapshot {
  lines: string[];
  /** Each non-blank line that occurs once in the file, by its index. */
  unique?: Map<string, number>;
}

/**
 * The file each diagnostic was reported in. Kept beside the diagnostics
 * rather than on them, so the handoff file stays the linter's own report.
 */
const snapshots = new WeakMap<Diagnostic, Snapshot>();

// Every snapshot taken of a file, so they can be let go once it's fixed.
const snapshotsByFile = new Map<string, Snapshot[]>();

/** A report's line, as its file read when the linter ran. */
interface Fingerprint {
  /** The line with the lines either side (see linesAround). */
  around: string;
  line: string;
}

/**
 * Where each report whose file is read later was (see fingerprintSources),
 * until recordSourceLines finds it again.
 */
const fingerprints = new WeakMap<Diagnostic, Fingerprint>();

const readLines = (file: string): string[] => {
  try {
    return readFileSync(file, "utf-8")
      .split(LINE_BREAK_RE)
      .map((line) => line.trim());
  } catch {
    return [];
  }
};

const uniqueLines = (snapshot: Snapshot): Map<string, number> => {
  if (snapshot.unique) {
    return snapshot.unique;
  }

  const unique = new Map<string, number>();
  const seen = new Set<string>();

  for (const [index, line] of snapshot.lines.entries()) {
    if (seen.has(line)) {
      unique.delete(line);
    } else if (line) {
      seen.add(line);
      unique.set(line, index);
    }
  }

  snapshot.unique = unique;

  return unique;
};

/**
 * A line with the lines either side, as one string. Joining copies them:
 * each line is a slice of the file's text, and holding one would hold the
 * whole file.
 */
const linesAround = (lines: string[], index: number): string =>
  [lines[index - 1] ?? "", lines[index] ?? "", lines[index + 1] ?? ""].join(
    KEY_SEPARATOR
  );

const fingerprintAt = (lines: string[], index: number): Fingerprint => {
  const around = linesAround(lines, index);
  const start = (lines[index - 1] ?? "").length + KEY_SEPARATOR.length;

  return {
    around,
    line: around.slice(start, start + (lines[index] ?? "").length),
  };
};

/**
 * Where each line, with the lines either side, is in a file: its index, or
 * undefined for one that occurs more than once.
 */
const placeLines = (lines: string[]): Map<string, number | undefined> => {
  const places = new Map<string, number | undefined>();

  for (const index of lines.keys()) {
    const around = linesAround(lines, index);

    places.set(around, places.has(around) ? undefined : index);
  }

  return places;
};

/**
 * Where a fingerprinted report's line is in its file now. The line it names,
 * when that still reads the same with the same lines around it. Otherwise
 * the one place in the file that does, since an edit above it moved it.
 * Otherwise the line it names when that line alone still reads the same,
 * since an edit beside it changed its neighbours, or the one line in the
 * file that reads the same. Undefined when there's none of those.
 */
const findLine = (
  snapshot: Snapshot,
  index: number,
  { around, line }: Fingerprint,
  // placeLines for the snapshot, built the first time a report has moved.
  places: () => Map<string, number | undefined>
): number | undefined => {
  if (linesAround(snapshot.lines, index) === around) {
    return index;
  }

  const moved = places().get(around);

  if (moved !== undefined) {
    return moved;
  }

  if ((snapshot.lines[index] ?? "") === line) {
    return index;
  }

  return uniqueLines(snapshot).get(line);
};

/**
 * Notes the line each report is on, and the lines either side, for reports
 * whose file is read later than the linter ran: an earlier file's agent may
 * have edited it by then. recordSourceLines then finds each report's line
 * in the file as it is, and a report whose line it can't find is matched as
 * if its file couldn't be read. Only the fingerprints are kept, not the
 * files they were read from.
 */
export const fingerprintSources = (diagnostics: Diagnostic[]): void => {
  const files = new Map<string, string[]>();

  for (const diagnostic of diagnostics) {
    const lines = files.get(diagnostic.file) ?? readLines(diagnostic.file);

    files.set(diagnostic.file, lines);
    fingerprints.set(diagnostic, fingerprintAt(lines, diagnostic.line - 1));
  }
};

/**
 * Remembers the file behind each diagnostic. Call it on a linter's report
 * before the file changes again: the text of a report's line, and the lines
 * around it, are what tell one report of a rule from another once an edit
 * has moved them. A report fingerprintSources saw is found again in the file
 * as it is now. It comes back as a copy on the line it's on now when an edit
 * moved it, and without the file when it can't be found. Match and hand
 * over the diagnostics this returns.
 */
export const recordSourceLines = (diagnostics: Diagnostic[]): Diagnostic[] => {
  const files = new Map<string, Snapshot>();
  const places = new Map<Snapshot, Map<string, number | undefined>>();

  const snapshotOf = (file: string): Snapshot => {
    const read = files.get(file);

    if (read) {
      return read;
    }

    const snapshot = { lines: readLines(file) };
    const taken = snapshotsByFile.get(file) ?? [];

    files.set(file, snapshot);
    taken.push(snapshot);
    snapshotsByFile.set(file, taken);

    return snapshot;
  };

  const placesOf = (snapshot: Snapshot) => {
    const placed = places.get(snapshot) ?? placeLines(snapshot.lines);
    places.set(snapshot, placed);

    return placed;
  };

  return diagnostics.map((diagnostic) => {
    const snapshot = snapshotOf(diagnostic.file);
    const fingerprint = fingerprints.get(diagnostic);
    const index = diagnostic.line - 1;

    // Each report is looked for once, at its file's turn.
    fingerprints.delete(diagnostic);

    const line = fingerprint
      ? findLine(snapshot, index, fingerprint, () => placesOf(snapshot))
      : index;

    if (line === undefined) {
      return diagnostic;
    }

    const current =
      line === index ? diagnostic : { ...diagnostic, line: line + 1 };

    snapshots.set(current, snapshot);

    return current;
  });
};

/**
 * Lets go of every snapshot recordSourceLines took of a file, once nothing
 * will be matched against them again. Reports recorded with them are then
 * matched as if their file couldn't be read.
 */
export const releaseSourceLines = (file: string): void => {
  for (const snapshot of snapshotsByFile.get(file) ?? []) {
    snapshot.lines = [];
    snapshot.unique = undefined;
  }

  snapshotsByFile.delete(file);
};

// The text of the line a diagnostic was reported on, unless it's blank.
const sourceLine = (diagnostic: Diagnostic): string | undefined =>
  snapshots.get(diagnostic)?.lines[diagnostic.line - 1] || undefined;

/**
 * Line and column spans shift as soon as the agent edits the file, so a
 * diagnostic is matched by its rule and message. A limit rule's numbers are
 * left out of the message: `max-lines-per-function` reports the count ("too
 * many lines (88)"), and a function cut to 55 lines is the same issue, still
 * reported, not one fixed and a new one. Other rules keep their numbers,
 * which tell reports apart (`No magic number: 42`), except the ones that
 * point at a line or count repeats, which any edit changes.
 */
const diagnosticKey = (diagnostic: Diagnostic): string => {
  const message = diagnostic.message.replaceAll(
    LIMIT_RULE_RE.test(diagnostic.rule) ? NUMBER_RE : POSITION_RE,
    "#"
  );

  return `${diagnostic.rule}${KEY_SEPARATOR}${message}`;
};

// The rule and message with every number left out (see partitionByRemaining).
const looseKey = (diagnostic: Diagnostic): string =>
  `${diagnostic.rule}${KEY_SEPARATOR}${diagnostic.message.replaceAll(NUMBER_RE, "#")}`;

export interface DiagnosticPartition {
  cleared: Diagnostic[];
  /** Diagnostics reported after the fix that match none of the originals. */
  introduced: Diagnostic[];
  still: Diagnostic[];
  /** The fresh reports of the `still` diagnostics, with current line numbers. */
  stillReported: Diagnostic[];
}

const groupByKey = (
  diagnostics: Diagnostic[],
  keyOf: (diagnostic: Diagnostic) => string
): Map<string, Diagnostic[]> => {
  const groups = new Map<string, Diagnostic[]>();

  for (const diagnostic of diagnostics) {
    const key = keyOf(diagnostic);
    const group = groups.get(key);

    if (group) {
      group.push(diagnostic);
      continue;
    }

    groups.set(key, [diagnostic]);
  }

  return groups;
};

/**
 * Where each line of the file before an edit sits after it, when it's
 * certainly the same line: one that occurs once in each file.
 */
const anchorPositions = (
  before: Snapshot,
  after: Snapshot
): (number | undefined)[] => {
  const beforeLines = uniqueLines(before);
  const afterLines = uniqueLines(after);

  return before.lines.map((line) =>
    beforeLines.has(line) ? afterLines.get(line) : undefined
  );
};

/** The indexes, exclusive, an original's line sits between after the edit. */
interface LineWindow {
  lower: number;
  upper: number;
}

/**
 * Where the edit left an original's line: between the nearest lines above
 * and below it that are the same line in both files. Null when that can't be
 * told: without both files, for a limit rule (reported where a count runs
 * out, such as `max-lines` on the first line past the limit, rather than on
 * the code it's about), or when no code is left between those lines, as
 * when the edit moved the code the line was in.
 */
const lineWindow = (
  original: Diagnostic,
  after: Snapshot,
  // anchorPositions for each file before the edit, filled in as needed.
  anchors: Map<Snapshot, (number | undefined)[]>
): LineWindow | null => {
  const before = snapshots.get(original);
  const index = original.line - 1;

  if (
    !before ||
    index < 0 ||
    index >= before.lines.length ||
    LIMIT_RULE_RE.test(original.rule)
  ) {
    return null;
  }

  const positions = anchors.get(before) ?? anchorPositions(before, after);
  anchors.set(before, positions);

  // Without one, the window runs to the edge of the file.
  const lower =
    positions.findLast(
      (position, line) => line < index && position !== undefined
    ) ?? -1;

  const upper =
    positions.find(
      (position, line) => line > index && position !== undefined
    ) ?? after.lines.length;

  // Blank lines aside; swapped anchors leave nothing between them either.
  const hasCode = after.lines.some(
    (line, position) => position > lower && position < upper && line !== ""
  );

  return hasCode ? { lower, upper } : null;
};

/** Whether a report is where the edit left an original's line. */
type Place = (report: Diagnostic) => boolean;

/**
 * Each original with its place among the reports (see lineWindow), or null
 * when that can't be told.
 */
const placeOriginals = (
  originals: Diagnostic[],
  reports: Diagnostic[]
): [Diagnostic, Place | null][] => {
  const [firstReport] = reports;
  // One linter run reported them all, so they share the file it read.
  const after = firstReport ? snapshots.get(firstReport) : undefined;
  const anchors = new Map<Snapshot, (number | undefined)[]>();

  return originals.map((original) => {
    const window = after ? lineWindow(original, after, anchors) : null;

    const place =
      window &&
      ((report: Diagnostic) =>
        snapshots.get(report) === after &&
        window.lower < report.line - 1 &&
        report.line - 1 < window.upper);

    return [original, place];
  });
};

/** Which original each fresh report is, for one key's reports. */
type Pairing = (
  originals: Diagnostic[],
  fresh: Diagnostic[]
) => Map<Diagnostic, Diagnostic>;

/**
 * Pairs the fresh reports of one rule and message with the originals. Many
 * rules give every report the same message (`no-explicit-any`), so when an
 * edit adds reports, pairing in file order would call the agent's new ones
 * "still reported" and the untouched originals "new". Reports on a line whose
 * text hasn't changed are paired first. Then a report where an original's
 * line went is that original, rewritten. An original whose line's
 * surroundings are still there with no report among them was fixed where it
 * stood, so a report the edit added elsewhere stays new. The rest, whose
 * place can't be told, are paired in file order.
 */
const pairGroup: Pairing = (originals, fresh) => {
  const pairs = new Map<Diagnostic, Diagnostic>();
  const matched = new Set<Diagnostic>();

  const pair = (report: Diagnostic, original: Diagnostic) => {
    pairs.set(report, original);
    matched.add(original);
  };

  for (const report of fresh) {
    const text = sourceLine(report);

    const match =
      text === undefined
        ? undefined
        : originals.find(
            (original) =>
              !matched.has(original) && sourceLine(original) === text
          );

    if (match) {
      pair(report, match);
    }
  }

  const reports = fresh.filter((report) => !pairs.has(report));

  // Every original but the ones fixed where they stood.
  const open = placeOriginals(
    originals.filter((original) => !matched.has(original)),
    reports
  ).filter(([, place]) => place === null || reports.some(place));

  for (const [original, place] of open) {
    const report =
      place &&
      reports.find((candidate) => !pairs.has(candidate) && place(candidate));

    if (report) {
      pair(report, original);
    }
  }

  const rest = open.filter(([original]) => !matched.has(original));
  const unplaced = reports.filter((report) => !pairs.has(report));

  for (const [index, [original]] of rest.entries()) {
    const report = unplaced[index];

    if (!report) {
      break;
    }

    pair(report, original);
  }

  return pairs;
};

/**
 * Pairs a fresh report with an original only when it's on the original's
 * line, unchanged, where the edit left it. A line that reads the same
 * elsewhere, such as `}`, isn't the original's.
 */
const pairOnSameLine: Pairing = (originals, fresh) => {
  const pairs = new Map<Diagnostic, Diagnostic>();

  for (const [original, place] of placeOriginals(originals, fresh)) {
    const text = sourceLine(original);

    const report =
      place &&
      text !== undefined &&
      fresh.find(
        (candidate) =>
          !pairs.has(candidate) &&
          place(candidate) &&
          sourceLine(candidate) === text
      );

    if (report) {
      pairs.set(report, original);
    }
  }

  return pairs;
};

// Pairs the fresh reports with the originals that have the same key.
const pairByKey = (
  original: Diagnostic[],
  remaining: Diagnostic[],
  keyOf: (diagnostic: Diagnostic) => string,
  pairing: Pairing
): Map<Diagnostic, Diagnostic> => {
  const originalGroups = groupByKey(original, keyOf);
  const pairs = new Map<Diagnostic, Diagnostic>();

  for (const [key, fresh] of groupByKey(remaining, keyOf)) {
    for (const [report, match] of pairing(
      originalGroups.get(key) ?? [],
      fresh
    )) {
      pairs.set(report, match);
    }
  }

  return pairs;
};

/**
 * Matches the fresh reports to the originals by rule and message. A number
 * diagnosticKey keeps can still change without the issue changing, such as
 * the line in another file a cycle runs through (`Dependency cycle via
 * ./b:3`). So a report left over that differs from a leftover original only
 * in its numbers is that original when it's on the original's line, and
 * that line is unchanged where the edit left it. A number written in the
 * code changes the line it's on, so a `no-magic-numbers` report for `100`
 * the edit added isn't taken for the `42` it fixed, however close by.
 */
export const partitionByRemaining = (
  original: Diagnostic[],
  remaining: Diagnostic[]
): DiagnosticPartition => {
  const pairs = pairByKey(original, remaining, diagnosticKey, pairGroup);
  const paired = new Set(pairs.values());

  const loosePairs = pairByKey(
    original.filter((diagnostic) => !paired.has(diagnostic)),
    remaining.filter((diagnostic) => !pairs.has(diagnostic)),
    looseKey,
    pairOnSameLine
  );

  for (const [report, match] of loosePairs) {
    pairs.set(report, match);
  }

  const matched = new Set(pairs.values());

  return {
    cleared: original.filter((diagnostic) => !matched.has(diagnostic)),
    introduced: remaining.filter((diagnostic) => !pairs.has(diagnostic)),
    still: original.filter((diagnostic) => matched.has(diagnostic)),
    stillReported: remaining.filter((diagnostic) => pairs.has(diagnostic)),
  };
};
