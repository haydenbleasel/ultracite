import { once } from "node:events";
import { realpathSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import type { Readable } from "node:stream";

import { z } from "zod";

import type { JsonValue } from "./data/types";
import { isGlobPattern } from "./linter-args";

// An empty path names no file; it is dropped after parsing so the fields next
// to it still count.
const filePathSchema = z.string().optional();

// The fields hosts put an edited file's path in: `file_path` (Claude Code,
// CodeBuddy, Cursor, Windsurf), `filePath` (VS Code's edit tools) and `path`
// (the Copilot CLI's `create` and `edit`).
const pathFieldsSchema = z.looseObject({
  filePath: filePathSchema,
  file_path: filePathSchema,
  path: filePathSchema,
});

// VS Code's multi_replace_string_in_file edits several files at once.
const replacementsSchema = z.looseObject({
  replacements: z.array(pathFieldsSchema),
});

// Tool payloads: `tool_name`/`tool_input` (Claude Code, CodeBuddy, VS Code,
// and the Copilot CLI with PascalCase events) or `toolName`/`toolArgs` (the
// Copilot CLI with camelCase events, where toolArgs may be a JSON string).
const toolPayloadSchema = z.looseObject({
  toolArgs: z.unknown().optional(),
  toolName: z.string().optional(),
  tool_input: z.unknown().optional(),
  tool_name: z.string().optional(),
});

// Windsurf `post_write_code`.
const toolInfoPayloadSchema = z.looseObject({
  tool_info: z.looseObject({ file_path: z.string().min(1) }),
});

// Tools that edit files in hosts whose hook runs after every tool (VS Code
// ignores matchers; the Copilot CLI hook is written without one). Claude Code
// and CodeBuddy hooks only fire for Write/Edit through their matcher.
const editToolNames = new Set([
  // Copilot CLI and cloud agent
  "apply_patch",
  "create",
  "edit",
  "str_replace_editor",
  "write",
  // VS Code
  "copilot_applyPatch",
  "copilot_createFile",
  "copilot_editNotebook",
  "copilot_insertEdit",
  "copilot_multiReplaceString",
  "copilot_replaceString",
  "create_file",
  "editFiles",
  "edit_notebook_file",
  "insert_edit_into_file",
  "multi_replace_string_in_file",
  "replace_string_in_file",
]);

// Both hosts name their tools in lower case (`read_file`, `view`), while
// Claude Code's and CodeBuddy's are capitalised (`Write`, `Edit`).
const LOWER_CASE_TOOL_RE = /^[a-z]/u;

// `*** Add File: src/a.ts` / `*** Update File: ...` / `*** Move to: ...`
// headers in an apply_patch patch.
const PATCH_FILE_RE =
  /^\*\*\* (?:Add File|Update File|Move to): (?<file>.+)$/gmu;

// Strict: a lenient parser would recover a file path from a truncated payload
// and lint one file where the whole-project run is the safe fallback.
const parseJson = (text: string): JsonValue | null => {
  try {
    const value: JsonValue = JSON.parse(text);
    return value;
  } catch {
    return null;
  }
};

const pathsIn = (input: JsonValue | null): string[] => {
  const fields = pathFieldsSchema.safeParse(input);
  const direct = fields.success
    ? [fields.data.file_path, fields.data.filePath, fields.data.path]
    : [];

  const replacements = replacementsSchema.safeParse(input);
  const replaced = replacements.success
    ? replacements.data.replacements.flatMap((replacement) => [
        replacement.file_path,
        replacement.filePath,
        replacement.path,
      ])
    : [];

  return [...direct, ...replaced].filter(
    (file): file is string => file !== undefined
  );
};

// Every string anywhere in a JSON value.
const stringsIn = (value: JsonValue | null): string[] => {
  // oxlint-disable-next-line anti-slop/no-runtime-typeof -- walking a hook payload decoded from JSON
  if (typeof value === "string") {
    return [value];
  }
  if (Array.isArray(value)) {
    return value.flatMap(stringsIn);
  }
  // oxlint-disable-next-line anti-slop/no-runtime-typeof -- same JSON walk: nested objects hold more strings
  if (value !== null && typeof value === "object") {
    return Object.values(value).flatMap(stringsIn);
  }
  return [];
};

const patchPathsIn = (input: JsonValue | null): string[] =>
  stringsIn(input).flatMap((text) =>
    [...text.matchAll(PATCH_FILE_RE)].map((match) =>
      (match.groups?.file ?? "").trim()
    )
  );

/**
 * The files an agent's post-edit hook payload names:
 * - a list of paths when the payload names the edited file(s): Claude Code
 *   and CodeBuddy send `tool_input.file_path`, Cursor's `afterFileEdit` sends
 *   `file_path`, Windsurf sends `tool_info.file_path`, VS Code sends
 *   `tool_input.filePath` and the Copilot CLI `toolArgs.path`;
 * - `[]` when a host without matchers ran the hook for a tool that edits
 *   nothing (e.g. VS Code's `read_file`), so there is nothing to fix;
 * - `null` when no file can be read from the payload (another shape, text
 *   that is not JSON, or an edit tool without a single path), which keeps
 *   the whole-project run.
 */
export const editedFilesFromHookPayload = (
  payload: string
): string[] | null => {
  const parsed = parseJson(payload);

  const toolInfo = toolInfoPayloadSchema.safeParse(parsed);
  if (toolInfo.success) {
    return [toolInfo.data.tool_info.file_path];
  }

  const tool = toolPayloadSchema.safeParse(parsed);
  const toolName = tool.success
    ? (tool.data.tool_name ?? tool.data.toolName)
    : undefined;

  if (
    toolName !== undefined &&
    LOWER_CASE_TOOL_RE.test(toolName) &&
    !editToolNames.has(toolName)
  ) {
    return [];
  }

  let input: JsonValue | null = parsed;

  if (tool.success && tool.data.tool_input !== undefined) {
    input = parseJson(JSON.stringify(tool.data.tool_input));
  } else if (tool.success && tool.data.toolArgs !== undefined) {
    // The Copilot CLI sends toolArgs as a JSON string; other versions send
    // an object.
    const argsText = z.string().safeParse(tool.data.toolArgs);
    const rawArgs = argsText.success
      ? argsText.data
      : JSON.stringify(tool.data.toolArgs);
    input = parseJson(rawArgs) ?? rawArgs;
  }

  const files =
    toolName === "apply_patch" ? patchPathsIn(input) : pathsIn(input);
  const unique = [...new Set(files.filter((file) => file !== ""))];

  return unique.length > 0 ? unique : null;
};

// A host writes the payload as it spawns the hook, so it is on stdin within
// milliseconds. The deadline only bounds a host that leaves stdin open without
// writing anything, which would otherwise block the hook until its timeout.
const STDIN_DEADLINE_MS = 1000;

const isCompleteJson = (text: string): boolean => parseJson(text) !== null;

type HookStdin = Readable & { isTTY?: boolean };

/**
 * Reads the hook payload from stdin. Resolves with what has arrived once stdin
 * ends, once the text is a complete JSON document (a host that never closes
 * stdin still gets its payload picked up at once), or at the deadline.
 */
export const readHookStdin = async (
  stdin: HookStdin = process.stdin,
  deadlineMs = STDIN_DEADLINE_MS
): Promise<string> => {
  if (stdin.isTTY) {
    return "";
  }

  let text = "";
  const settled = new AbortController();
  const deadline = setTimeout(() => settled.abort(), deadlineMs);
  const onData = (chunk: Buffer | string): void => {
    text += chunk.toString();

    if (isCompleteJson(text)) {
      settled.abort();
    }
  };

  stdin.on("data", onData);

  try {
    await once(stdin, "end", { signal: settled.signal });
  } catch {
    // The payload is complete, the deadline passed, or stdin errored. In
    // every case what has arrived is all there is to read.
  } finally {
    clearTimeout(deadline);
    stdin.off("data", onData);
    // A paused stdin no longer keeps the process alive, so a host that
    // leaves the pipe open cannot stop the hook from exiting.
    stdin.pause();
  }

  return text;
};

const isInside = (directory: string, file: string): boolean => {
  const relative = path.relative(directory, file);
  // Only a leading `..` segment leaves the directory; a file named `..env`
  // at the root is inside it.
  return (
    relative !== "" &&
    relative !== ".." &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  );
};

// The real path of a target, or null when it does not exist. Both the project
// root and the edited file go through this, so a project opened through a
// symlink (`/tmp` is `/private/tmp` on macOS) still contains its own files.
const realPath = (target: string): string | null => {
  try {
    return realpathSync.native(target);
  } catch {
    return null;
  }
};

// Whether a command line target (a real path) is the file or contains it.
const covers = (target: string | null, file: string): boolean =>
  target !== null && (target === file || isInside(target, file));

interface HookTargetsOptions {
  cwd?: string;
  read?: () => Promise<string> | string;
  resolvePath?: (target: string) => string | null;
  /** Lint targets already given on the command line, e.g. `fix src --hook`. */
  targets?: string[];
}

/**
 * What `fix --hook` lints, read from the agent's payload on stdin:
 * - the edited files that exist inside the project, as paths relative to the
 *   project root.
 * - `[]` when every named file is gone, outside the project, or outside the
 *   command line's own targets, or the tool edited nothing, so there is
 *   nothing to fix. An agent editing its own notes or a temp file must not
 *   format them with this project's config.
 * - `null` when no file can be read from the payload, or the command line's
 *   targets are globs the files cannot be checked against, which keeps the
 *   run the command would have done without `--hook`.
 */
export const hookTargets = async ({
  cwd = process.cwd(),
  read = readHookStdin,
  resolvePath = realPath,
  targets = [],
}: HookTargetsOptions = {}): Promise<string[] | null> => {
  let payload = "";

  try {
    payload = await read();
  } catch {
    return null;
  }

  const files = editedFilesFromHookPayload(payload);

  if (files === null) {
    return null;
  }

  const root = resolvePath(cwd) ?? path.resolve(cwd);
  const resolved = files
    .map((file) => resolvePath(path.resolve(cwd, file)))
    .filter((file): file is string => file !== null && isInside(root, file));

  if (resolved.length === 0) {
    return [];
  }

  const relative = (file: string) => path.relative(root, file);

  if (targets.length === 0) {
    return resolved.map(relative);
  }

  if (targets.some(isGlobPattern)) {
    return null;
  }

  // Targets resolve like the files did, so a symlinked directory on the
  // command line still contains the files under it.
  const resolvedTargets = targets.map((target) =>
    resolvePath(path.resolve(root, target))
  );

  return resolved
    .filter((file) => resolvedTargets.some((target) => covers(target, file)))
    .map(relative);
};
