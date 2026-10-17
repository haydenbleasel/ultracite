import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import path from "node:path";

import type { Diagnostic } from "./types";

const HASH_LENGTH = 8;

const LEFT_FOR_REVIEW_LABEL = "Left for review";
const LEFT_FOR_REVIEW_RE = /^\W*left for review\W*:(?<numbers>.*)$/imu;
const ISSUE_NUMBER_RE = /\d+/gu;

const formatIssue = (diagnostic: Diagnostic, index: number): string =>
  `${index + 1}. line ${diagnostic.line}, col ${diagnostic.column} — ${diagnostic.rule}: ${diagnostic.message}`;

const buildPromptSections = (
  preamble: string,
  file: string,
  issueLines: string[],
  jsonPath: string,
  extraRules: string[]
): string =>
  [
    preamble,
    "",
    `File: ${path.resolve(file)}`,
    "",
    ...issueLines,
    "",
    `Full diagnostics (JSON, including rule help text, documentation URLs, and source spans) are at: ${jsonPath}`,
    "",
    "Rules:",
    "- Edit only the file above. Do not create, delete, or modify any other file.",
    "- Make the minimal change that resolves each issue while preserving runtime behavior.",
    "- Fix the underlying problem — the file is re-linted after your edit, and a diagnostic that still fires is a failed fix. Restyling the flagged code (renaming, re-spelling escapes, equivalent syntax) will not clear it; rework the code so the rule genuinely no longer applies.",
    "- Follow the rule's help text from the JSON file where provided.",
    "- Do not add suppression comments (// oxlint-disable, // eslint-disable, // biome-ignore) or change lint configuration.",
    "- Do not reformat unrelated code.",
    `- This run is non-interactive: nobody can answer a question or approve a step. Don't ask for input or wait for a reply. If an issue needs a person's decision, leave it, explain why in your final message, and end the message with a line listing the numbers of the issues you left, like \`${LEFT_FOR_REVIEW_LABEL}: 2, 3\`.`,
    ...extraRules,
  ].join("\n");

export const buildPrompt = (
  file: string,
  diagnostics: Diagnostic[],
  jsonPath: string
): string =>
  buildPromptSections(
    "Fix the lint issues below in a single file. They were reported by Ultracite and could not be fixed automatically.",
    file,
    ["Issues:", ...diagnostics.map(formatIssue)],
    jsonPath,
    []
  );

/** What the linter reports after an attempt, against what that attempt was given. */
export interface RetryIssues {
  /** Reported only after the previous edit. */
  introduced: Diagnostic[];
  /** Given to the previous attempt and still reported. */
  still: Diagnostic[];
}

/** The order the issues are numbered in, and written to the JSON file. */
export const retryIssueOrder = ({
  introduced,
  still,
}: RetryIssues): Diagnostic[] => [...still, ...introduced];

const DIFFERENT_APPROACH_RULE =
  "Read the file's current state first, then take a structurally different approach instead of adjusting the earlier attempt.";

/**
 * A retry is worded by what the previous edit did. An issue that's still
 * reported means the approach didn't work. An issue that's new usually means
 * a correct fix tripped another rule, such as a `role="button"` that clears
 * the keyboard rules and then trips `prefer-tag-over-role`. Telling the agent
 * that edit failed would throw away a fix that only needs finishing.
 */
export const buildRetryPrompt = (
  file: string,
  issues: RetryIssues,
  jsonPath: string,
  attempt: number
): string => {
  const { introduced, still } = issues;
  const lineNote = "(line numbers reflect the file's current state)";

  if (introduced.length === 0) {
    return buildPromptSections(
      `This is attempt ${attempt} at fixing the lint issues below — a previous edit to this file did not resolve them and the linter still reports them ${lineNote}.`,
      file,
      ["Issues:", ...still.map(formatIssue)],
      jsonPath,
      [`- The previous approach was insufficient. ${DIFFERENT_APPROACH_RULE}`]
    );
  }

  if (still.length === 0) {
    return buildPromptSections(
      `This is attempt ${attempt} at fixing the lint issues in this file. The previous edit resolved the issues it was given, but the linter now reports the new issues below ${lineNote}.`,
      file,
      ["Issues:", ...introduced.map(formatIssue)],
      jsonPath,
      [
        "- The file already contains that edit, so build on it rather than undoing it. Read the file's current state first, then make the smallest further change that resolves these issues.",
      ]
    );
  }

  return buildPromptSections(
    `This is attempt ${attempt} at fixing the lint issues below ${lineNote}. A previous edit to this file did not resolve some of them, and the rest are new since that edit.`,
    file,
    [
      "Still reported after the previous edit:",
      ...still.map(formatIssue),
      "",
      "New since the previous edit:",
      ...introduced.map((diagnostic, index) =>
        formatIssue(diagnostic, still.length + index)
      ),
    ],
    jsonPath,
    [
      `- For the issues still reported, the previous approach was insufficient. ${DIFFERENT_APPROACH_RULE}`,
      "- For the new issues, build on the previous edit rather than undoing it, and make the smallest further change that resolves them.",
    ]
  );
};

export interface LeftForReview {
  /** The agent's final message, without the line listing the issues. */
  explanation: string;
  issues: Diagnostic[];
}

/**
 * Finds the issues the agent left for a person in its final message, by the
 * numbers the prompt gave them. Markdown around the label is ignored, since
 * agents often bold it.
 */
export const parseLeftForReview = (
  message: string,
  issues: Diagnostic[]
): LeftForReview | null => {
  const match = LEFT_FOR_REVIEW_RE.exec(message);

  if (!match?.groups) {
    return null;
  }

  const numbers = new Set(
    (match.groups.numbers.match(ISSUE_NUMBER_RE) ?? []).map(Number)
  );

  const left = issues.filter((_, index) => numbers.has(index + 1));

  if (left.length === 0) {
    return null;
  }

  return { explanation: message.replace(match[0], "").trim(), issues: left };
};

/**
 * Writes the full, untruncated diagnostics for one file into the temp
 * directory and returns the absolute path of the JSON file. Retries overwrite
 * the same path with the file's fresh diagnostics.
 */
export const writeDiagnosticsFile = (
  dir: string,
  file: string,
  diagnostics: Diagnostic[]
): string => {
  const hash = createHash("sha1")
    .update(file)
    .digest("hex")
    .slice(0, HASH_LENGTH);

  const jsonPath = path.join(dir, `${path.basename(file)}.${hash}.json`);

  writeFileSync(
    jsonPath,
    JSON.stringify({ diagnostics, file }, null, 2),
    "utf-8"
  );

  return jsonPath;
};
