import { describe, expect, test } from "bun:test";

import { editedFileFromHookPayload, hookTargets } from "../src/hook-input";

describe("editedFileFromHookPayload", () => {
  test("reads tool_input.file_path from Claude Code and CodeBuddy", () => {
    const payload = JSON.stringify({
      hook_event_name: "PostToolUse",
      tool_input: { content: "x", file_path: "/repo/src/a.ts" },
      tool_name: "Write",
    });

    expect(editedFileFromHookPayload(payload)).toBe("/repo/src/a.ts");
  });

  test("reads file_path from Cursor's afterFileEdit", () => {
    const payload = JSON.stringify({
      edits: [{ new_string: "b", old_string: "a" }],
      file_path: "/repo/src/b.ts",
    });

    expect(editedFileFromHookPayload(payload)).toBe("/repo/src/b.ts");
  });

  test("reads tool_info.file_path from Windsurf's post_write_code", () => {
    const payload = JSON.stringify({
      agent_action_name: "post_write_code",
      tool_info: { edits: [], file_path: "/repo/src/c.py" },
    });

    expect(editedFileFromHookPayload(payload)).toBe("/repo/src/c.py");
  });

  test("names no file for an unknown shape, an empty path, or non-JSON", () => {
    expect(editedFileFromHookPayload('{"toolArgs":{"path":"a.ts"}}')).toBe(
      null
    );
    expect(editedFileFromHookPayload('{"tool_input":{"file_path":""}}')).toBe(
      null
    );
    expect(editedFileFromHookPayload("[]")).toBe(null);
    expect(editedFileFromHookPayload("not json")).toBe(null);
    expect(editedFileFromHookPayload("")).toBe(null);
  });
});

const payloadFor = (file: string) =>
  JSON.stringify({ tool_input: { file_path: file } });

describe("hookTargets", () => {
  test("targets the edited file when it exists inside the project", () => {
    expect(
      hookTargets({
        cwd: "/repo",
        fileExists: () => true,
        read: () => payloadFor("/repo/src/a.ts"),
      })
    ).toEqual(["/repo/src/a.ts"]);
  });

  test("targets nothing when the edited file is outside the project", () => {
    expect(
      hookTargets({
        cwd: "/repo",
        fileExists: () => true,
        read: () => payloadFor("/tmp/notes.md"),
      })
    ).toEqual([]);
    expect(
      hookTargets({
        cwd: "/repo",
        fileExists: () => true,
        read: () => payloadFor("/repo-other/a.ts"),
      })
    ).toEqual([]);
  });

  test("targets nothing when the edited file no longer exists", () => {
    expect(
      hookTargets({
        cwd: "/repo",
        fileExists: () => false,
        read: () => payloadFor("/repo/src/a.ts"),
      })
    ).toEqual([]);
  });

  test("keeps the whole-project run when the payload names no file", () => {
    expect(
      hookTargets({
        cwd: "/repo",
        read: () => '{"toolArgs":{"path":"a.ts"}}',
      })
    ).toBe(null);
  });

  test("keeps the whole-project run when stdin cannot be read", () => {
    expect(
      hookTargets({
        cwd: "/repo",
        read: () => {
          throw new Error("EAGAIN");
        },
      })
    ).toBe(null);
  });
});
