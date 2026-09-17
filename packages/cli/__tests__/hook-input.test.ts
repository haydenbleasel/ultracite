import { describe, expect, test } from "bun:test";
import path from "node:path";
import { PassThrough } from "node:stream";

import {
  editedFileFromHookPayload,
  hookTargets,
  readHookStdin,
} from "../src/hook-input";

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

describe("readHookStdin", () => {
  test("reads nothing from a TTY", async () => {
    const stdin = Object.assign(new PassThrough(), { isTTY: true });

    expect(await readHookStdin(stdin)).toBe("");
  });

  test("reads the payload once stdin ends", async () => {
    const stdin = new PassThrough();
    const pending = readHookStdin(stdin);

    stdin.end(payloadFor("/repo/src/a.ts"));

    expect(await pending).toBe(payloadFor("/repo/src/a.ts"));
  });

  test("reads a complete payload from a host that leaves stdin open", async () => {
    const stdin = new PassThrough();
    const pending = readHookStdin(stdin, 10_000);
    const payload = payloadFor("/repo/src/a.ts");

    stdin.write(payload.slice(0, 10));
    stdin.write(payload.slice(10));

    expect(await pending).toBe(payload);
  });

  test("gives up at the deadline when nothing arrives", async () => {
    const stdin = new PassThrough();

    expect(await readHookStdin(stdin, 20)).toBe("");
  });
});

// Every path exists, at itself.
const exists = (target: string) => target;

// Platform-native absolute paths, so the expectations hold on Windows too.
const repo = path.resolve("/repo");
const inRepo = (...segments: string[]) => path.join(repo, ...segments);
const edited = path.join("src", "a.ts");

describe("hookTargets", () => {
  test("targets the edited file, relative to the project, when it exists inside it", async () => {
    expect(
      await hookTargets({
        cwd: repo,
        read: () => payloadFor(inRepo("src", "a.ts")),
        resolvePath: exists,
      })
    ).toEqual([edited]);
    expect(
      await hookTargets({
        cwd: repo,
        read: () => payloadFor("src/a.ts"),
        resolvePath: exists,
      })
    ).toEqual([edited]);
  });

  test("targets the edited file when the project is opened through a symlink", async () => {
    // macOS resolves `/tmp` to `/private/tmp`.
    const link = path.resolve("/tmp/repo");
    const real = path.resolve("/private/tmp/repo");
    const throughSymlink = (target: string) =>
      target.startsWith(link) ? `${real}${target.slice(link.length)}` : target;

    expect(
      await hookTargets({
        cwd: real,
        read: () => payloadFor(path.join(link, "src", "a.ts")),
        resolvePath: throughSymlink,
      })
    ).toEqual([edited]);
  });

  test("targets nothing when the edited file is outside the project", async () => {
    expect(
      await hookTargets({
        cwd: repo,
        read: () => payloadFor(path.resolve("/tmp/notes.md")),
        resolvePath: exists,
      })
    ).toEqual([]);
    expect(
      await hookTargets({
        cwd: repo,
        read: () => payloadFor(path.resolve("/repo-other/a.ts")),
        resolvePath: exists,
      })
    ).toEqual([]);
  });

  test("targets nothing when the edited file no longer exists", async () => {
    expect(
      await hookTargets({
        cwd: repo,
        read: () => payloadFor(inRepo("src", "a.ts")),
        resolvePath: (target) => (target === repo ? target : null),
      })
    ).toEqual([]);
  });

  test("narrows the command line's own targets to the edited file", async () => {
    const options = {
      cwd: repo,
      read: () => payloadFor(inRepo("src", "a.ts")),
      resolvePath: exists,
    };

    expect(await hookTargets({ ...options, targets: ["src"] })).toEqual([
      edited,
    ]);
    expect(await hookTargets({ ...options, targets: ["src/a.ts"] })).toEqual([
      edited,
    ]);
    expect(
      await hookTargets({ ...options, targets: ["docs", "lib/a.ts"] })
    ).toEqual([]);
  });

  test("keeps the command line's targets when they are globs", async () => {
    expect(
      await hookTargets({
        cwd: repo,
        read: () => payloadFor(inRepo("src", "a.ts")),
        resolvePath: exists,
        targets: ["src/**/*.ts"],
      })
    ).toBe(null);
  });

  test("keeps the whole-project run when the payload names no file", async () => {
    expect(
      await hookTargets({
        cwd: repo,
        read: () => '{"toolArgs":{"path":"a.ts"}}',
      })
    ).toBe(null);
  });

  test("keeps the whole-project run when stdin cannot be read", async () => {
    expect(
      await hookTargets({
        cwd: repo,
        read: () => Promise.reject(new Error("EAGAIN")),
      })
    ).toBe(null);
  });
});
