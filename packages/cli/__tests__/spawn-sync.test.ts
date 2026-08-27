import { describe, expect, test } from "bun:test";
import process from "node:process";

// Other test files mock ../src/spawn-sync globally, so the real
// implementation is captured (and typed via `declare global`) by preload.ts
// before any mock is registered.
const spawnSync = globalThis.__realSpawnSync;

const node = process.execPath;

describe("spawnSync", () => {
  test("maps a clean exit to status 0 with captured stdout", () => {
    const result = spawnSync(node, ["-e", "console.log('hello')"]);

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("hello");
  });

  test("maps a non-zero exit to its status code", () => {
    const result = spawnSync(node, ["-e", "process.exit(3)"]);

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(3);
  });

  test("maps a spawn failure to an error with a null status", () => {
    const result = spawnSync("definitely-not-a-real-command", []);

    expect(result.error).toBeInstanceOf(Error);
    expect(result.status).toBeNull();
  });

  test("maps process termination according to the host platform", () => {
    const result = spawnSync(node, [
      "-e",
      "process.kill(process.pid, 'SIGKILL')",
    ]);

    if (process.platform === "win32") {
      // Windows does not expose POSIX signals through child_process.
      expect(result.status).not.toBe(0);
      expect(result.signal).toBeUndefined();
      return;
    }

    expect(result.status).toBeNull();
    expect(result.signal).toBe("SIGKILL");
  });

  // The Windows-compatibility guarantee the callers rely on: arguments are
  // passed to the executable verbatim, never interpreted by a shell.
  test("passes shell metacharacters through as literal arguments", () => {
    const tricky = "src/my file.ts; echo pwned $HOME";
    const result = spawnSync(node, [
      "-e",
      "console.log(process.argv[1])",
      tricky,
    ]);

    expect(result.status).toBe(0);
    expect(result.stdout?.trim()).toBe(tricky);
  });

  test("does not capture stdout when stdio is ignore", () => {
    const result = spawnSync(node, ["-e", "process.exit(0)"], {
      stdio: "ignore",
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toBeUndefined();
  });

  // Callers such as `skills list --json` don't set maxBuffer and rely on
  // execa's 100 MB default rather than Node's 1 MiB.
  test("captures more than Node's 1 MiB default maxBuffer", () => {
    const result = spawnSync(node, [
      "-e",
      "process.stdout.write('x'.repeat(2 * 1024 * 1024))",
    ]);

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(result.stdout?.length).toBe(2 * 1024 * 1024);
  });
});
