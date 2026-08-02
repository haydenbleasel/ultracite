import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import path from "node:path";

import type { Diagnostic } from "./types";

const HASH_LENGTH = 8;

const formatIssue = (diagnostic: Diagnostic, index: number): string =>
  `${index + 1}. line ${diagnostic.line}, col ${diagnostic.column} — ${diagnostic.rule}: ${diagnostic.message}`;

export const buildPrompt = (
  file: string,
  diagnostics: Diagnostic[],
  jsonPath: string
): string =>
  [
    "Fix the lint issues below in a single file. They were reported by Ultracite and could not be fixed automatically.",
    "",
    `File: ${path.resolve(file)}`,
    "",
    "Issues:",
    ...diagnostics.map(formatIssue),
    "",
    `Full diagnostics (JSON, including rule help text, documentation URLs, and source spans) are at: ${jsonPath}`,
    "",
    "Rules:",
    "- Edit only the file above. Do not create, delete, or modify any other file.",
    "- Make the minimal change that resolves each issue while preserving runtime behavior.",
    "- Follow the rule's help text from the JSON file where provided.",
    "- Do not add suppression comments (// oxlint-disable, // eslint-disable, // biome-ignore) or change lint configuration.",
    "- Do not reformat unrelated code.",
  ].join("\n");

/**
 * Writes the full, untruncated diagnostics for one file into the temp
 * directory and returns the absolute path of the JSON file.
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
