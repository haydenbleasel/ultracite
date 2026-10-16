import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import nodePath from "node:path";

import type { PackageManager } from "nypm";

import { husky } from "../src/integrations/husky";
import { mockFileSystem, restoreFileSystemMock } from "./mock-fs";

const npmPm: PackageManager = { command: "npm", name: "npm" };

mock.module("node:fs/promises", () => ({
  access: mock(() => Promise.reject(new Error("ENOENT"))),
  mkdir: mock(() => Promise.resolve()),
  readFile: mock(() => Promise.resolve("{}")),
  writeFile: mock(() => Promise.resolve()),
}));

mock.module("nypm", () => ({
  addDevDependency: mock(() => Promise.resolve()),
  detectPackageManager: mock(() => Promise.resolve({ name: "npm" })),
  dlxCommand: mock((_pm: string, pkg: string) => `npx ${pkg}`),
  removeDependency: mock(() => Promise.resolve()),
}));

// A project whose files are exactly `files`; returns what gets written.
const mockProject = (files: Record<string, string>) => {
  const written = new Map<string, string>();

  mock.module("node:fs/promises", () => ({
    access: mock((path: string) =>
      path in files ? Promise.resolve() : Promise.reject(new Error("ENOENT"))
    ),
    mkdir: mock(() => Promise.resolve()),
    readFile: mock((path: string) =>
      path in files
        ? Promise.resolve(files[path])
        : Promise.reject(new Error("ENOENT"))
    ),
    writeFile: mock((path: string, content: string) => {
      written.set(path, content);

      return Promise.resolve();
    }),
  }));
  mockFileSystem(files);

  return written;
};

const countMarkers = (script: string | undefined): number =>
  (script ?? "").split("\n").filter((line) => line === "# ultracite").length;

// The environment without git's own variables. The repo's pre-commit hook
// runs this suite, and in a linked worktree git hands hooks an absolute
// GIT_DIR and GIT_INDEX_FILE. Inherited, they point every git command below
// at this repository instead of the temp one: `git init` marks it bare,
// `git config` writes the test identity and turns off commit signing in its
// shared config, and the hook runs against its index.
const cleanEnv = Object.fromEntries(
  Object.entries(process.env).filter(([key]) => !key.startsWith("GIT_"))
);

// Runs a command for real (node:fs and spawn-sync are mocked in tests) and
// returns its exit code and combined output.
const run = (cwd: string, command: string[]) => {
  const result = Bun.spawnSync(command, {
    cwd,
    env: cleanEnv,
    stderr: "pipe",
    stdout: "pipe",
  });

  return {
    exitCode: result.exitCode,
    output: `${result.stdout.toString()}${result.stderr.toString()}`,
  };
};

const git = (cwd: string, ...args: string[]): string => {
  const { exitCode, output } = run(cwd, ["git", ...args]);

  if (exitCode !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${output}`);
  }

  return output;
};

// A stand-in for `ultracite fix` that appends a line to each file it gets,
// and fails when FIX_FAILS is set.
const FIXER = `for file in "$@"; do
  printf 'fixed\\n' >> "$file"
done
if [ -n "$FIX_FAILS" ]; then
  exit 1
fi
`;

// A git repository holding the generated standalone hook, with `a.ts`,
// `b.ts` and `my file.ts` committed. The hook runs `sh fix.sh` in place of
// `npx ultracite fix`.
const createHookRepo = async (dir: string): Promise<void> => {
  const written = mockProject({});
  await husky.create("npm", false);
  restoreFileSystemMock();

  const script = (written.get("./.husky/pre-commit") ?? "").replace(
    "xargs -0 npx ultracite fix",
    "xargs -0 sh fix.sh"
  );

  if (!script.includes("xargs -0 sh fix.sh")) {
    throw new Error("The hook no longer runs the fix through xargs");
  }

  await Bun.write(nodePath.join(dir, ".husky", "pre-commit"), script);
  await Bun.write(nodePath.join(dir, "fix.sh"), FIXER);
  await Bun.write(nodePath.join(dir, "a.ts"), "a\n");
  await Bun.write(nodePath.join(dir, "b.ts"), "b\n");
  await Bun.write(nodePath.join(dir, "my file.ts"), "c\n");

  git(dir, "init", "-q");
  git(dir, "config", "user.email", "test@example.com");
  git(dir, "config", "user.name", "Test");
  git(dir, "config", "core.autocrlf", "false");
  git(dir, "config", "commit.gpgsign", "false");
  git(dir, "add", ".");
  git(dir, "commit", "-q", "--no-verify", "-m", "init");
};

// Husky runs hook scripts as `sh -e .husky/pre-commit`.
const runHook = (dir: string, env: Record<string, string> = {}) => {
  const result = Bun.spawnSync(["sh", "-e", ".husky/pre-commit"], {
    cwd: dir,
    env: { ...cleanEnv, ...env },
    stderr: "pipe",
    stdout: "pipe",
  });

  return {
    exitCode: result.exitCode,
    output: `${result.stdout.toString()}${result.stderr.toString()}`,
  };
};

const append = async (dir: string, file: string, text: string) => {
  const filePath = nodePath.join(dir, file);
  await Bun.write(filePath, `${await Bun.file(filePath).text()}${text}`);
};

describe("husky", () => {
  beforeEach(() => {
    mock.restore();
  });

  describe("exists", () => {
    test("returns true when pre-commit hook exists", async () => {
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mock(() => Promise.resolve()),
      }));

      mock.module("node:fs", () => ({
        accessSync: mock(() => {}),
        existsSync: mock(() => false),
        readFileSync: mock(() => "{}"),
      }));

      const result = await husky.exists();
      expect(result).toBe(true);
    });

    test("returns false when pre-commit hook does not exist", async () => {
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mock(() => Promise.resolve()),
      }));

      mock.module("node:fs", () => ({
        accessSync: mock(() => {
          throw new Error("ENOENT");
        }),
        existsSync: mock(() => false),
        readFileSync: mock(() => "{}"),
      }));

      const result = await husky.exists();
      expect(result).toBe(false);
    });
  });

  describe("install", () => {
    test("installs husky dependency", async () => {
      const mockAddDep = mock(() => Promise.resolve());
      mock.module("nypm", () => ({
        addDevDependency: mockAddDep,
        detectPackageManager: mock(() => Promise.resolve({ name: "npm" })),
        dlxCommand: mock(() => "npx ultracite fix"),
        removeDependency: mock(() => Promise.resolve()),
      }));

      await husky.install(npmPm);

      expect(mockAddDep).toHaveBeenCalledWith("husky", expect.any(Object));
    });

    test("adds prepare script to package.json", async () => {
      const mockReadFile = mock((_path: string) =>
        Promise.resolve('{"name": "test"}')
      );

      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        mkdir: mock(() => Promise.resolve()),
        readFile: mockReadFile,
        writeFile: mockWriteFile,
      }));

      mock.module("node:fs", () => ({
        accessSync: mock(() => {}),
        existsSync: mock(() => false),
        readFileSync: mock(() => "{}"),
      }));

      mock.module("nypm", () => ({
        addDevDependency: mock(() => Promise.resolve()),
        detectPackageManager: mock(() => Promise.resolve({ name: "npm" })),
        dlxCommand: mock(() => "npx ultracite fix"),
        removeDependency: mock(() => Promise.resolve()),
      }));

      await husky.install(npmPm);

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      const writtenContent = JSON.parse(writeCall[1]);
      expect(writtenContent.scripts?.prepare).toBe("husky");
    });
  });

  describe("create", () => {
    test("creates .husky directory", async () => {
      const mockMkdir = mock(() => Promise.resolve());
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        mkdir: mockMkdir,
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mock(() => Promise.resolve()),
      }));

      await husky.create("npm");

      expect(mockMkdir).toHaveBeenCalledWith(".husky", { recursive: true });
    });

    test("creates standalone hook when useLintStaged is false", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
      }));

      await husky.create("npm", false);

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      expect(writeCall[0]).toBe("./.husky/pre-commit");
      expect(writeCall[1]).toContain("#!/bin/sh");
      expect(writeCall[1]).toContain("npx ultracite");
      expect(writeCall[1]).toContain("# ultracite");
    });

    test("creates lint-staged hook when useLintStaged is true", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
      }));
      mock.module("nypm", () => ({
        addDevDependency: mock(() => Promise.resolve()),
        detectPackageManager: mock(() => Promise.resolve({ name: "npm" })),
        dlxCommand: mock((_pm: string, pkg: string) => `npx ${pkg}`),
        removeDependency: mock(() => Promise.resolve()),
      }));

      await husky.create("npm", true);

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      expect(writeCall[0]).toBe("./.husky/pre-commit");
      expect(writeCall[1]).toContain("npx lint-staged");
      expect(writeCall[1]).not.toContain("npx ultracite");
    });

    test("standalone hook does not use git stash", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
      }));

      await husky.create("npm", false);

      const [writeCall] = mockWriteFile.mock.calls;
      expect(writeCall[1]).not.toContain("git stash");
    });

    test("standalone hook terminates git add options before filenames", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
      }));

      await husky.create("npm", false);

      const [writeCall] = mockWriteFile.mock.calls;
      expect(writeCall[1]).toContain('git add -- "$file"');
    });
  });

  describe("update", () => {
    test("appends to existing hook that has no ultracite marker", async () => {
      const existingContent = '#!/bin/sh\necho "existing"';

      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve(existingContent)),
        writeFile: mockWriteFile,
      }));

      mock.module("node:fs", () => ({
        accessSync: mock(() => {}),
        existsSync: mock(() => false),
        readFileSync: mock(() => "{}"),
      }));

      await husky.update("npm");

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      expect(writeCall[1]).toContain("existing");
      expect(writeCall[1]).toContain("npx ultracite");
      expect(writeCall[1]).toContain("# ultracite");
    });

    test("replaces existing ultracite section on re-run", async () => {
      const existingContent =
        '#!/bin/sh\necho "other"\n# ultracite\n#!/bin/sh\nnpx ultracite fix\n';

      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve(existingContent)),
        writeFile: mockWriteFile,
      }));

      mock.module("node:fs", () => ({
        accessSync: mock(() => {}),
        existsSync: mock(() => false),
        readFileSync: mock(() => "{}"),
      }));

      await husky.update("npm");

      const [writeCall] = mockWriteFile.mock.calls;
      const [, written] = writeCall;
      // Should contain the "other" line
      expect(written).toContain("other");

      // Should have exactly one ultracite start marker
      const markerCount = written
        .split("\n")
        .filter((line) => line === "# ultracite").length;

      expect(markerCount).toBe(1);
    });

    test("keeps user commands after the ultracite section on re-run", async () => {
      const existingContent = [
        '#!/bin/sh\necho "before"',
        "# ultracite",
        "#!/bin/sh",
        "npx ultracite fix",
        "# ultracite end",
        "npm test",
        "",
      ].join("\n");

      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve(existingContent)),
        writeFile: mockWriteFile,
      }));

      mock.module("node:fs", () => ({
        accessSync: mock(() => {}),
        existsSync: mock(() => false),
        readFileSync: mock(() => "{}"),
      }));

      await husky.update("npm");

      const [writeCall] = mockWriteFile.mock.calls;
      const [, written] = writeCall;
      expect(written).toContain('echo "before"');
      expect(written).toContain("npm test");

      const markerCount = written
        .split("\n")
        .filter((line) => line === "# ultracite").length;

      expect(markerCount).toBe(1);
      // npm test must come after the replaced section
      expect(written.indexOf("npm test")).toBeGreaterThan(
        written.indexOf("# ultracite end")
      );
    });

    test("keeps user commands after a legacy standalone section", async () => {
      const existingContent = [
        "# ultracite",
        "#!/bin/sh",
        "npx ultracite fix",
        'echo "✨ Files formatted by Ultracite"',
        "npm test",
        "",
      ].join("\n");

      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve(existingContent)),
        writeFile: mockWriteFile,
      }));

      mock.module("node:fs", () => ({
        accessSync: mock(() => {}),
        existsSync: mock(() => false),
        readFileSync: mock(() => "{}"),
      }));

      await husky.update("npm");

      const [writeCall] = mockWriteFile.mock.calls;
      const [, written] = writeCall;
      expect(written).toContain("npm test");
      expect(written.indexOf("npm test")).toBeGreaterThan(
        written.indexOf("# ultracite end")
      );
    });

    test("standalone hook captures formatter failures without set -e", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("{}")),
        writeFile: mockWriteFile,
      }));

      await husky.create("npm", false);

      const [writeCall] = mockWriteFile.mock.calls;
      const [, written] = writeCall;
      // set -e would abort the script before the failure-handling block runs
      expect(written).not.toContain("set -e");
      expect(written).toContain("|| FORMAT_EXIT_CODE=$?");
      expect(written).toContain("exit $FORMAT_EXIT_CODE");
    });

    test("uses lint-staged hook when useLintStaged is true", async () => {
      const existingContent = "#!/bin/sh";

      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        mkdir: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve(existingContent)),
        writeFile: mockWriteFile,
      }));

      mock.module("node:fs", () => ({
        accessSync: mock(() => {}),
        existsSync: mock(() => false),
        readFileSync: mock(() => "{}"),
      }));

      mock.module("nypm", () => ({
        addDevDependency: mock(() => Promise.resolve()),
        detectPackageManager: mock(() => Promise.resolve({ name: "npm" })),
        dlxCommand: mock((_pm: string, pkg: string) => `npx ${pkg}`),
        removeDependency: mock(() => Promise.resolve()),
      }));

      await husky.update("npm", true);

      const [writeCall] = mockWriteFile.mock.calls;
      expect(writeCall[1]).toContain("npx lint-staged");
      expect(writeCall[1]).not.toContain("npx ultracite");
    });
  });

  describe("regressions", () => {
    test("chains onto an existing prepare script", async () => {
      const written = mockProject({
        "package.json": JSON.stringify({
          scripts: { prepare: "svelte-kit sync || echo ''" },
        }),
      });

      await husky.install(npmPm);
      restoreFileSystemMock();

      expect(
        JSON.parse(written.get("package.json") ?? "{}").scripts.prepare
      ).toBe("svelte-kit sync || echo '' && husky");
    });

    test("keeps a prepare script that already runs husky", async () => {
      const written = mockProject({
        "package.json": JSON.stringify({
          scripts: { prepare: "lefthook install && husky" },
        }),
      });

      await husky.install(npmPm);
      restoreFileSystemMock();

      expect(
        JSON.parse(written.get("package.json") ?? "{}").scripts.prepare
      ).toBe("lefthook install && husky");
    });

    test("runs the project's installed tools with Yarn and pnpm", async () => {
      const written = mockProject({});

      await husky.create("yarn", true);
      expect(written.get("./.husky/pre-commit")).toContain(
        "\nyarn lint-staged\n"
      );

      await husky.create("pnpm", false);
      restoreFileSystemMock();

      const script = written.get("./.husky/pre-commit") ?? "";
      expect(script).toContain(
        "xargs -0 pnpm exec ultracite fix || FORMAT_EXIT_CODE"
      );
      expect(script).not.toContain("dlx");
    });

    test("initializes husky with the installed binary", () => {
      const mockSpawn = mock(() => ({ status: 0 }));
      mock.module("../src/spawn-sync", () => ({ spawnSync: mockSpawn }));

      husky.init("pnpm");

      expect(mockSpawn).toHaveBeenCalledWith("pnpm", ["exec", "husky"], {
        stdio: "pipe",
      });
    });

    test("lets commands after the section run when nothing is staged", async () => {
      const written = mockProject({});

      await husky.create("npm", false);
      restoreFileSystemMock();

      const script = written.get("./.husky/pre-commit") ?? "";
      expect(script).not.toContain("exit 0");
      expect(script).toContain('echo "No staged files to format"\nelse');
    });

    test("fixes only the staged files, passed safely through xargs", async () => {
      const written = mockProject({});

      await husky.create("pnpm", false);
      restoreFileSystemMock();

      const script = written.get("./.husky/pre-commit") ?? "";
      expect(script).toContain(
        "git diff --cached --name-only -z --diff-filter=ACMR | xargs -0 pnpm exec ultracite fix || FORMAT_EXIT_CODE=$?"
      );
      // The empty check guards xargs, which runs the command once with no
      // arguments (fixing the whole project) on empty input with GNU xargs
      expect(script.indexOf('if [ -z "$STAGED_FILES" ]')).toBeLessThan(
        script.indexOf("xargs -0")
      );
      // No bare fix run over the whole project
      expect(script).not.toMatch(/^\s*pnpm exec ultracite fix/mu);
    });

    test("re-stages only the files that had no unstaged changes", async () => {
      const written = mockProject({});

      await husky.create("npm", false);
      restoreFileSystemMock();

      const script = written.get("./.husky/pre-commit") ?? "";
      // Names with spaces or non-ASCII characters are read unquoted, a line
      // each, so `git add -- "$file"` gets the real path
      expect(script).toContain(
        "STAGED_FILES=$(git -c core.quotePath=false diff --cached --name-only --diff-filter=ACMR)"
      );
      // Partially staged files are found before the fix runs
      expect(script.indexOf("UNSTAGED_FILES=$(")).toBeLessThan(
        script.indexOf("xargs -0")
      );
      expect(script).toContain(
        "printf '%s\\n' \"$FULLY_STAGED\" | while IFS= read -r file; do"
      );
      expect(script).toContain("printf '%s\\n' \"$PARTIALLY_STAGED\" | sed");
      expect(script).not.toContain('"$STAGED_FILES" | while');
    });

    test("replaces a pre-v8 section that fixed the whole project", async () => {
      const written = mockProject({
        "./.husky/pre-commit": [
          'echo "before"',
          "# ultracite",
          "#!/bin/sh",
          "# Check if there are any staged files",
          "STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACMR)",
          'if [ -z "$STAGED_FILES" ]; then',
          '  echo "No staged files to format"',
          "else",
          "  FORMAT_EXIT_CODE=0",
          "  npx ultracite fix || FORMAT_EXIT_CODE=$?",
          '  echo "$STAGED_FILES" | while IFS= read -r file; do',
          '    if [ -f "$file" ]; then',
          '      git add -- "$file"',
          "    fi",
          "  done",
          '  echo "✨ Files formatted by Ultracite"',
          "fi",
          "# ultracite end",
          "npm test",
          "",
        ].join("\n"),
      });

      await husky.update("npm", false);
      restoreFileSystemMock();

      const script = written.get("./.husky/pre-commit") ?? "";
      expect(countMarkers(script)).toBe(1);
      expect(script).toContain("xargs -0 npx ultracite fix");
      expect(script).not.toContain("  npx ultracite fix ||");
      expect(script.startsWith('echo "before"\n# ultracite\n')).toBe(true);
      expect(script.endsWith("# ultracite end\nnpm test\n")).toBe(true);
    });

    test("replaces the section of a CRLF hook instead of appending another", async () => {
      const written = mockProject({
        "./.husky/pre-commit":
          "npm test\r\n# ultracite\r\n#!/bin/sh\r\nnpx lint-staged\r\n# ultracite end\r\n",
      });

      await husky.update("npm", true);
      restoreFileSystemMock();

      const script = written.get("./.husky/pre-commit");
      expect(countMarkers(script)).toBe(1);
      expect(script).toContain("npm test\n# ultracite\n");
      expect(script).not.toContain("\r");
    });

    test("keeps the last line when the hook only mentions ultracite in a comment", async () => {
      const written = mockProject({
        "./.husky/pre-commit": "# ultracite runs below\nnpm test",
      });

      await husky.update("npm", true);
      restoreFileSystemMock();

      const script = written.get("./.husky/pre-commit") ?? "";
      expect(script).toContain("# ultracite runs below\nnpm test\n");
      expect(countMarkers(script)).toBe(1);
    });

    test("keeps user commands after a legacy lint-staged section", async () => {
      const written = mockProject({
        "./.husky/pre-commit":
          "# ultracite\n#!/bin/sh\nyarn dlx lint-staged\nnpm test\n",
      });

      await husky.update("yarn", true);
      restoreFileSystemMock();

      const script = written.get("./.husky/pre-commit") ?? "";
      expect(script).toContain("# ultracite end\nnpm test\n");
      expect(script).toContain("\nyarn lint-staged\n");
      expect(script).not.toContain("dlx");
    });
  });

  describe("standalone hook run by husky", () => {
    let dir = "";

    beforeEach(async () => {
      dir = nodePath.join(tmpdir(), `ultracite-husky-${randomUUID()}`);
      await createHookRepo(dir);
    });

    afterEach(() => {
      // node:fs is mocked, and Git's sh (which the hook needs anyway) has rm
      // on Windows too.
      run(tmpdir(), ["sh", "-c", 'rm -rf "$1"', "sh", dir]);
    });

    test("fixes and re-stages the staged files on a clean tree", async () => {
      await append(dir, "a.ts", "a2\n");
      git(dir, "add", "a.ts");

      const { exitCode } = runHook(dir);

      expect(exitCode).toBe(0);
      expect(git(dir, "show", ":a.ts")).toBe("a\na2\nfixed\n");
      expect(git(dir, "diff", "--name-only")).toBe("");
    });

    test("ignores an unrelated file with unstaged changes", async () => {
      // grep finds no partially staged file here, which ended the script
      // under `sh -e` before anything was fixed.
      await append(dir, "a.ts", "a2\n");
      git(dir, "add", "a.ts");
      await append(dir, "b.ts", "b2\n");

      const { exitCode } = runHook(dir);

      expect(exitCode).toBe(0);
      expect(git(dir, "show", ":a.ts")).toBe("a\na2\nfixed\n");
      expect(await Bun.file(nodePath.join(dir, "b.ts")).text()).toBe("b\nb2\n");
      expect(git(dir, "diff", "--name-only")).toBe("b.ts\n");
    });

    test("fixes a partially staged file but leaves the fix unstaged", async () => {
      await append(dir, "a.ts", "a2\n");
      git(dir, "add", "a.ts");
      await append(dir, "a.ts", "a3\n");

      const { exitCode, output } = runHook(dir);

      expect(exitCode).toBe(0);
      expect(output).toContain("left unstaged");
      expect(output).toContain("  a.ts");
      expect(git(dir, "show", ":a.ts")).toBe("a\na2\n");
      expect(await Bun.file(nodePath.join(dir, "a.ts")).text()).toBe(
        "a\na2\na3\nfixed\n"
      );
    });

    test("fixes and re-stages a file with a space in its name", async () => {
      await append(dir, "my file.ts", "c2\n");
      git(dir, "add", "my file.ts");

      const { exitCode } = runHook(dir);

      expect(exitCode).toBe(0);
      expect(git(dir, "show", ":my file.ts")).toBe("c\nc2\nfixed\n");
    });

    test("does nothing when no files are staged", async () => {
      await append(dir, "a.ts", "a2\n");

      const { exitCode, output } = runHook(dir);

      expect(exitCode).toBe(0);
      expect(output).toContain("No staged files to format");
      expect(await Bun.file(nodePath.join(dir, "a.ts")).text()).toBe("a\na2\n");
    });

    test("blocks the commit when the fix fails, after re-staging", async () => {
      await append(dir, "a.ts", "a2\n");
      git(dir, "add", "a.ts");

      const { exitCode, output } = runHook(dir, { FIX_FAILS: "1" });

      expect(exitCode).not.toBe(0);
      expect(output).toContain("could not be auto-fixed");
      expect(git(dir, "show", ":a.ts")).toBe("a\na2\nfixed\n");
    });
  });
});
