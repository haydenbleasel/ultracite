import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

import { parse } from "jsonc-parser";
import { z } from "zod";

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

const isInside = (directory: string, file: string): boolean => {
  const relative = path.relative(directory, path.resolve(directory, file));
  return (
    relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative)
  );
};

const readStdin = (): string =>
  process.stdin.isTTY ? "" : readFileSync(0, "utf-8");

interface HookTargetsOptions {
  cwd?: string;
  fileExists?: (file: string) => boolean;
  read?: () => string;
}

/**
 * What `fix --hook` lints, read from the agent's payload on stdin:
 * - `[file]` when the payload names a file inside the project that exists.
 * - `[]` when it names a file that is gone or outside the project, so there
 *   is nothing to fix. An agent editing its own notes or a temp file must not
 *   format them with this project's config.
 * - `null` when no file can be read from the payload, which keeps the
 *   whole-project run, so an agent whose payload shape is unknown behaves
 *   exactly as before.
 */
export const hookTargets = ({
  cwd = process.cwd(),
  fileExists = existsSync,
  read = readStdin,
}: HookTargetsOptions = {}): string[] | null => {
  let payload = "";

  try {
    payload = read();
  } catch {
    return null;
  }

  const file = editedFileFromHookPayload(payload);

  if (!file) {
    return null;
  }

  return isInside(cwd, file) && fileExists(file) ? [file] : [];
};
