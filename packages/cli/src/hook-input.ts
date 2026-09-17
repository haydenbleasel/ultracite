import { once } from "node:events";
import { realpathSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import type { Readable } from "node:stream";

import { parse } from "jsonc-parser";
import { z } from "zod";

import { isGlobPattern } from "./linter-args";

const editedFileSchema = z.looseObject({ file_path: z.string().min(1) });

// Claude Code and CodeBuddy `PostToolUse`.
const toolInputPayloadSchema = z.looseObject({ tool_input: editedFileSchema });

// Windsurf `post_write_code`.
const toolInfoPayloadSchema = z.looseObject({ tool_info: editedFileSchema });

/**
 * The file an agent's post-edit hook payload names. Claude Code and CodeBuddy
 * send `tool_input.file_path`, Cursor's `afterFileEdit` sends `file_path`, and
 * Windsurf sends `tool_info.file_path`. Any other shape, or text that is not
 * JSON, names no file.
 */
export const editedFileFromHookPayload = (payload: string): string | null => {
  const parsed = parse(payload);

  const toolInput = toolInputPayloadSchema.safeParse(parsed);
  if (toolInput.success) {
    return toolInput.data.tool_input.file_path;
  }

  const cursor = editedFileSchema.safeParse(parsed);
  if (cursor.success) {
    return cursor.data.file_path;
  }

  const toolInfo = toolInfoPayloadSchema.safeParse(parsed);
  return toolInfo.success ? toolInfo.data.tool_info.file_path : null;
};

// A host writes the payload as it spawns the hook, so it is on stdin within
// milliseconds. The deadline only bounds a host that leaves stdin open without
// writing anything, which would otherwise block the hook until its timeout.
const STDIN_DEADLINE_MS = 1000;

const isCompleteJson = (text: string): boolean => {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
};

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
  return (
    relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative)
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
 * - `[file]` when the payload names a file inside the project that exists,
 *   as a path relative to the project root.
 * - `[]` when it names a file that is gone, outside the project, or outside
 *   the command line's own targets, so there is nothing to fix. An agent
 *   editing its own notes or a temp file must not format them with this
 *   project's config.
 * - `null` when no file can be read from the payload, or the command line's
 *   targets are globs the file cannot be checked against, which keeps the
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

  const file = editedFileFromHookPayload(payload);

  if (!file) {
    return null;
  }

  const root = resolvePath(cwd) ?? path.resolve(cwd);
  const resolved = resolvePath(path.resolve(cwd, file));

  if (!resolved || !isInside(root, resolved)) {
    return [];
  }

  const relative = path.relative(root, resolved);

  if (targets.length === 0) {
    return [relative];
  }

  if (targets.some(isGlobPattern)) {
    return null;
  }

  // Targets resolve like the file did, so a symlinked directory on the
  // command line still contains the files under it.
  const covered = targets.some((target) =>
    covers(resolvePath(path.resolve(root, target)), resolved)
  );

  return covered ? [relative] : [];
};
