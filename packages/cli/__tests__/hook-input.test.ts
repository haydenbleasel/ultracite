import { describe, expect, test } from "bun:test";
import path from "node:path";
import { PassThrough } from "node:stream";

import {
  editedFilesFromHookPayload,
  hookFeedsAgent,
  hookTargets,
  readHook,
  readHookStdin,
} from "../src/hook-input";

describe("editedFilesFromHookPayload", () => {
  test("reads tool_input.file_path from Claude Code and CodeBuddy", () => {
    const payload = JSON.stringify({
      hook_event_name: "PostToolUse",
      tool_input: { content: "x", file_path: "/repo/src/a.ts" },
      tool_name: "Write",
    });

    expect(editedFilesFromHookPayload(payload)).toEqual(["/repo/src/a.ts"]);
  });

  test("reads file_path from Cursor's afterFileEdit", () => {
    const payload = JSON.stringify({
      edits: [{ new_string: "b", old_string: "a" }],
      file_path: "/repo/src/b.ts",
    });

    expect(editedFilesFromHookPayload(payload)).toEqual(["/repo/src/b.ts"]);
  });

  test("reads tool_info.file_path from Windsurf's post_write_code", () => {
    const payload = JSON.stringify({
      agent_action_name: "post_write_code",
      tool_info: { edits: [], file_path: "/repo/src/c.py" },
    });

    expect(editedFilesFromHookPayload(payload)).toEqual(["/repo/src/c.py"]);
  });

  test("names no file for an unknown shape, an empty path, or non-JSON", () => {
    expect(editedFilesFromHookPayload('{"toolArgs":{"lines":3}}')).toBe(null);
    expect(editedFilesFromHookPayload('{"tool_input":{"file_path":""}}')).toBe(
      null
    );
    expect(editedFilesFromHookPayload("[]")).toBe(null);
    expect(editedFilesFromHookPayload("not json")).toBe(null);
    expect(
      editedFilesFromHookPayload('{"tool_input":{"file_path":"/repo/a.ts"')
    ).toBe(null);
    expect(editedFilesFromHookPayload("")).toBe(null);
  });
});

describe("editedFilesFromHookPayload (Copilot and VS Code)", () => {
  test("reads toolArgs.path from the Copilot CLI, as a JSON string or object", () => {
    expect(
      editedFilesFromHookPayload(
        JSON.stringify({
          toolArgs: JSON.stringify({
            new_str: "b",
            old_str: "a",
            path: "src/a.ts",
          }),
          toolName: "edit",
        })
      )
    ).toEqual(["src/a.ts"]);
    expect(
      editedFilesFromHookPayload(
        JSON.stringify({
          toolArgs: { file_text: "x", path: "src/new.ts" },
          toolName: "create",
        })
      )
    ).toEqual(["src/new.ts"]);
  });

  test("reads tool_input.filePath from VS Code's edit tools", () => {
    expect(
      editedFilesFromHookPayload(
        JSON.stringify({
          hook_event_name: "PostToolUse",
          tool_input: { filePath: "/repo/src/a.ts", newString: "b" },
          tool_name: "replace_string_in_file",
        })
      )
    ).toEqual(["/repo/src/a.ts"]);
  });

  test("reads every file of a multi-file edit", () => {
    expect(
      editedFilesFromHookPayload(
        JSON.stringify({
          tool_input: {
            replacements: [
              { filePath: "/repo/a.ts" },
              { filePath: "/repo/b.ts" },
              { filePath: "/repo/a.ts" },
            ],
          },
          tool_name: "multi_replace_string_in_file",
        })
      )
    ).toEqual(["/repo/a.ts", "/repo/b.ts"]);
    expect(
      editedFilesFromHookPayload(
        JSON.stringify({
          tool_input: {
            input:
              "*** Begin Patch\n*** Update File: src/a.ts\n@@\n*** Add File: src/b.ts\n+x\n*** End Patch",
          },
          tool_name: "apply_patch",
        })
      )
    ).toEqual(["src/a.ts", "src/b.ts"]);
  });

  test("names nothing to fix for a tool that edits no file", () => {
    expect(
      editedFilesFromHookPayload(
        JSON.stringify({
          tool_input: { filePath: "/repo/src/a.ts", startLine: 1 },
          tool_name: "read_file",
        })
      )
    ).toEqual([]);
    expect(
      editedFilesFromHookPayload(
        JSON.stringify({ toolArgs: '{"command":"ls"}', toolName: "bash" })
      )
    ).toEqual([]);
  });

  test("keeps the whole-project run for an edit tool without a path", () => {
    expect(
      editedFilesFromHookPayload(
        JSON.stringify({ tool_input: {}, tool_name: "editFiles" })
      )
    ).toBe(null);
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

// `src-link` is a symlink to `src`; every other path resolves to itself.
const throughSrcLink = (target: string) =>
  target === inRepo("src-link") ? inRepo("src") : target;

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
    expect(await hookTargets({ ...options, targets: ["missing"] })).toEqual([]);
  });

  test("narrows a symlinked directory target to the edited file under it", async () => {
    expect(
      await hookTargets({
        cwd: repo,
        read: () => payloadFor(inRepo("src", "a.ts")),
        resolvePath: throughSrcLink,
        targets: ["src-link"],
      })
    ).toEqual([edited]);
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
        read: () => '{"hook_event_name":"Stop"}',
      })
    ).toBe(null);
  });

  test("targets a root file whose name starts with two dots", async () => {
    expect(
      await hookTargets({
        cwd: repo,
        read: () => payloadFor(inRepo("..eslintcache.ts")),
        resolvePath: exists,
      })
    ).toEqual(["..eslintcache.ts"]);
  });

  test("targets every edited file inside the project", async () => {
    expect(
      await hookTargets({
        cwd: repo,
        read: () =>
          JSON.stringify({
            tool_input: {
              replacements: [
                { filePath: inRepo("src", "a.ts") },
                { filePath: path.resolve("/tmp/notes.md") },
              ],
            },
            tool_name: "multi_replace_string_in_file",
          }),
        resolvePath: exists,
      })
    ).toEqual([edited]);
  });

  test("targets nothing when the tool edited no file", async () => {
    expect(
      await hookTargets({
        cwd: repo,
        read: () =>
          JSON.stringify({
            tool_input: { filePath: inRepo("src", "a.ts") },
            tool_name: "read_file",
          }),
        resolvePath: exists,
      })
    ).toEqual([]);
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

describe("hookFeedsAgent", () => {
  test("is true for hosts that show the agent stderr on exit code 2", () => {
    // Claude Code and CodeBuddy
    expect(
      hookFeedsAgent(
        JSON.stringify({
          hook_event_name: "PostToolUse",
          tool_input: { file_path: "/repo/src/a.ts" },
          tool_name: "Write",
        })
      )
    ).toBe(true);
    // VS Code
    expect(
      hookFeedsAgent(
        JSON.stringify({
          hook_event_name: "PostToolUse",
          tool_input: { filePath: "/repo/src/a.ts" },
          tool_name: "replace_string_in_file",
        })
      )
    ).toBe(true);
    // Windsurf
    expect(
      hookFeedsAgent(
        JSON.stringify({
          agent_action_name: "post_write_code",
          tool_info: { file_path: "/repo/src/a.py" },
        })
      )
    ).toBe(true);
  });

  test("is false for Cursor, the Copilot CLI and unknown payloads", () => {
    expect(
      hookFeedsAgent(
        JSON.stringify({
          file_path: "/repo/src/b.ts",
          hook_event_name: "afterFileEdit",
        })
      )
    ).toBe(false);
    expect(
      hookFeedsAgent(
        JSON.stringify({ toolArgs: { path: "src/a.ts" }, toolName: "edit" })
      )
    ).toBe(false);
    expect(hookFeedsAgent('{"hook_event_name":"Stop"}')).toBe(false);
    expect(hookFeedsAgent("not json")).toBe(false);
    expect(hookFeedsAgent("")).toBe(false);
  });
});

describe("readHook", () => {
  test("returns the targets and whether the host reports to the agent", async () => {
    expect(
      await readHook({
        cwd: repo,
        read: () =>
          JSON.stringify({
            hook_event_name: "PostToolUse",
            tool_input: { file_path: inRepo("src", "a.ts") },
            tool_name: "Edit",
          }),
        resolvePath: exists,
      })
    ).toEqual({ feedsAgent: true, targets: ["src/a.ts"] });
  });

  test("keeps the whole-project run and the plain exit code when stdin fails", async () => {
    expect(
      await readHook({
        cwd: repo,
        read: () => Promise.reject(new Error("EPIPE")),
      })
    ).toEqual({ feedsAgent: false, targets: null });
  });
});
