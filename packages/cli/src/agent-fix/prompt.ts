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
    "- Edit only the file above. Do not create, delete, or modify any other file. If the proper fix needs changes outside this file (an import cycle, a barrel file), don't work around it here: leave the issue for review and say what the fix is.",
    "- Make the minimal change that resolves each issue. For a style rule, keep runtime behavior the same. When a rule reports a bug (a lost rejection, a missing `await`), fixing that behavior is the point. If a fix would change behavior and it isn't clear that's intended, leave the issue for review and say why.",
    "- Fix the underlying problem. An edit that only hides the code from the rule (rewording it, re-spelling it, an equivalent construct) is not a fix, even if the linter goes quiet. If that's the only way to clear an issue, leave it for review.",
    "- The JSON file has each rule's help text, which describes the usual fix. When that fix doesn't fit this code (a TODO that's still true, key or declaration order the code depends on), leaving the issue for review is a valid result: the minimal change can be no change.",
    "- Before adding a dependency to a hook, check whether it changes when the effect or memo runs. If it does and that isn't clearly intended, leave the issue for review.",
    "- Before splitting a function to meet a size limit, decide whether the split makes the code easier to read. If it doesn't, leave the issue for review.",
    "- Do not add suppression comments (// oxlint-disable, // eslint-disable, // biome-ignore) or change lint configuration.",
    "- Do not reformat unrelated code.",
    "- Don't run the linter or other commands to check your edit. The file is re-linted when you finish, and you get another attempt if anything is still reported.",
    `- This run is non-interactive: nobody can answer a question or approve a step. Don't ask for input or wait for a reply. To leave an issue for review, explain why in your final message, and end the message with a line listing the numbers of the issues you left, like \`${LEFT_FOR_REVIEW_LABEL}: 2, 3\`. Leave that line out when you left nothing.`,
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
