import { describe, expect, test } from "bun:test";
import process from "node:process";

// Other test files mock ../src/spawn-sync globally, so the real
// implementations are captured (and typed via `declare global`) by preload.ts
// before any mock is registered.
const spawnSync = globalThis.__realSpawnSync;

const node = process.execPath;
const isWindows = process.platform === "win32";

// execa's sync path is what breaks under Bun on Windows (the reason the
// native implementation exists), so it can only be exercised elsewhere.
const implementations = [
  { name: "native", skip: false, spawnSync: globalThis.__realNativeSpawnSync },
  {
    name: "execa",
    skip: isWindows,
    spawnSync: globalThis.__realExecaSpawnSync,
  },
];

test("dispatches to the native implementation under Bun", () => {
  expect(spawnSync).toBe(globalThis.__realNativeSpawnSync);
});

describe.each(implementations)(
  "$name spawnSync",
  ({ skip, spawnSync: run }) => {
    test.skipIf(skip)(
      "maps a clean exit to status 0 with captured stdout",
      () => {
        const result = run(node, ["-e", "console.log('hello')"]);

        expect(result.error).toBeUndefined();
        expect(result.status).toBe(0);
        expect(result.stdout).toContain("hello");
      }
    );

    test.skipIf(skip)("maps a non-zero exit to its status code", () => {
      const result = run(node, ["-e", "process.exit(3)"]);

      expect(result.error).toBeUndefined();
      expect(result.status).toBe(3);
    });

    test.skipIf(skip)(
      "maps a spawn failure to an error with a null status",
      () => {
        const result = run("definitely-not-a-real-command", []);

        expect(result.error).toBeInstanceOf(Error);
        expect(result.status).toBeNull();
      }
    );

    test.skipIf(skip)(
      "maps process termination according to the host platform",
      () => {
        const result = run(node, [
          "-e",
          "process.kill(process.pid, 'SIGKILL')",
        ]);

        if (isWindows) {
          // Windows does not expose POSIX signals through child_process.
          expect(result.status).not.toBe(0);
          expect(result.signal).toBeUndefined();
          return;
        }

        expect(result.status).toBeNull();
        expect(result.signal).toBe("SIGKILL");
      }
    );

    // The Windows-compatibility guarantee the callers rely on: arguments are
    // passed to the executable verbatim, never interpreted by a shell.
    test.skipIf(skip)(
      "passes shell metacharacters through as literal arguments",
      () => {
        const tricky = "src/my file.ts; echo pwned $HOME";
        const result = run(node, [
          "-e",
          "console.log(process.argv[1])",
          tricky,
        ]);

        expect(result.status).toBe(0);
        expect(result.stdout?.trim()).toBe(tricky);
      }
    );

    test.skipIf(skip)("does not capture stdout when stdio is ignore", () => {
      const result = run(node, ["-e", "process.exit(0)"], {
        stdio: "ignore",
      });

      expect(result.status).toBe(0);
      expect(result.stdout).toBeUndefined();
    });

    test.skipIf(skip)(
      "captures more than Node's 1 MiB default maxBuffer",
      () => {
        const result = run(node, [
          "-e",
          "process.stdout.write('x'.repeat(2 * 1024 * 1024))",
        ]);

        expect(result.error).toBeUndefined();
        expect(result.status).toBe(0);
        expect(result.stdout?.length).toBe(2 * 1024 * 1024);
      }
    );
  }
);
