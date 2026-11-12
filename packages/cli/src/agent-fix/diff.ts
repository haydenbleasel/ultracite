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

const readLines = (file: string): string[] => {
  try {
    return readFileSync(file, "utf-8")
      .split(LINE_BREAK_RE)
      .map((line) => line.trim());
  } catch {
    return [];
  }
};

/**
 * Remembers the file behind each diagnostic. Call it on a linter's report
 * before the file changes again: the text of a report's line, and the lines
 * around it, are what tell one report of a rule from another once an edit
 * has moved them.
 */
export const recordSourceLines = (diagnostics: Diagnostic[]): void => {
  const files = new Map<string, Snapshot>();

  for (const diagnostic of diagnostics) {
    const snapshot = files.get(diagnostic.file) ?? {
      lines: readLines(diagnostic.file),
    };

    if (!files.has(diagnostic.file)) {
      files.set(diagnostic.file, snapshot);
      snapshotsByFile.set(diagnostic.file, [
        ...(snapshotsByFile.get(diagnostic.file) ?? []),
        snapshot,
      ]);
    }

    snapshots.set(diagnostic, snapshot);
  }
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

export interface DiagnosticPartition {
  cleared: Diagnostic[];
  /** Diagnostics reported after the fix that match none of the originals. */
  introduced: Diagnostic[];
  still: Diagnostic[];
  /** The fresh reports of the `still` diagnostics, with current line numbers. */
  stillReported: Diagnostic[];
}

const groupByKey = (diagnostics: Diagnostic[]): Map<string, Diagnostic[]> => {
  const groups = new Map<string, Diagnostic[]>();

  for (const diagnostic of diagnostics) {
    const key = diagnosticKey(diagnostic);
    const group = groups.get(key);

    if (group) {
      group.push(diagnostic);
      continue;
    }

    groups.set(key, [diagnostic]);
  }

  return groups;
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
const pairGroup = (
  originals: Diagnostic[],
  fresh: Diagnostic[]
): Map<Diagnostic, Diagnostic> => {
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
  const [firstReport] = reports;
  // One linter run reported them all, so they share the file it read.
  const after = firstReport ? snapshots.get(firstReport) : undefined;
  const anchors = new Map<Snapshot, (number | undefined)[]>();

  const windows = originals.flatMap(
    (original): [Diagnostic, LineWindow | null][] =>
      matched.has(original)
        ? []
        : [[original, after ? lineWindow(original, after, anchors) : null]]
  );

  const isInside = (report: Diagnostic, window: LineWindow | null) =>
    window !== null &&
    snapshots.get(report) === after &&
    window.lower < report.line - 1 &&
    report.line - 1 < window.upper;

  // Every original but the ones fixed where they stood.
  const open = windows.filter(
    ([, window]) =>
      window === null || reports.some((report) => isInside(report, window))
  );

  for (const [original, window] of open) {
    const report = reports.find(
      (candidate) => !pairs.has(candidate) && isInside(candidate, window)
    );

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

export const partitionByRemaining = (
  original: Diagnostic[],
  remaining: Diagnostic[]
): DiagnosticPartition => {
  const originalGroups = groupByKey(original);
  const pairs = new Map<Diagnostic, Diagnostic>();

  for (const [key, fresh] of groupByKey(remaining)) {
    const group = pairGroup(originalGroups.get(key) ?? [], fresh);

    for (const [report, match] of group) {
      pairs.set(report, match);
    }
  }

  const matched = new Set(pairs.values());

  return {
    cleared: original.filter((diagnostic) => !matched.has(diagnostic)),
    introduced: remaining.filter((diagnostic) => !pairs.has(diagnostic)),
    still: original.filter((diagnostic) => matched.has(diagnostic)),
    stillReported: remaining.filter((diagnostic) => pairs.has(diagnostic)),
  };
};
