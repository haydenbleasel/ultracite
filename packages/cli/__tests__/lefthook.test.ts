import { beforeEach, describe, expect, mock, spyOn, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import nodePath from "node:path";
import { fileURLToPath } from "node:url";

import { log } from "@clack/prompts";
import type { PackageManager } from "nypm";
import YAML from "yaml";

import { lefthook } from "../src/integrations/lefthook";
import { stagedFileExtensions } from "../src/integrations/staged-files";
import { mockFileSystem, restoreFileSystemMock } from "./mock-fs";

const stagedGlob =
  "*.{js,jsx,mjs,cjs,ts,tsx,mts,cts,json,jsonc,css,scss,less,vue,svelte,astro,html,md,mdx,yaml,yml,graphql,gql}";

const npmPm: PackageManager = { command: "npm", name: "npm" };

mock.module("../src/spawn-sync", () => ({
  spawnSync: mock(() => ({ status: 0 })),
}));

mock.module("node:fs/promises", () => ({
  access: mock(() => Promise.reject(new Error("ENOENT"))),
  readFile: mock(() => Promise.resolve("")),
  writeFile: mock(() => Promise.resolve()),
}));

mock.module("nypm", () => ({
  addDevDependency: mock(() => Promise.resolve()),
  detectPackageManager: mock(() => Promise.resolve({ name: "npm" })),
  dlxCommand: mock((_pm: string, name: string) => {
    if (name === "ultracite") {
      return "npx ultracite fix";
    }

    return `npx ${name} install`;
  }),
  removeDependency: mock(() => Promise.resolve()),
}));

// A project whose files are exactly `files`; returns what gets written.
const mockProject = (files: Record<string, string>) => {
  const written = new Map<string, string>();

  mock.module("node:fs/promises", () => ({
    access: mock((path: string) =>
      path in files ? Promise.resolve() : Promise.reject(new Error("ENOENT"))
    ),
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

// The pre-commit jobs of a written lefthook config.
const preCommitJobs = (config: string | undefined) =>
  YAML.parse(config ?? "")["pre-commit"].jobs;

const runInHookRepo = (cwd: string, command: string[]): void => {
  const result = Bun.spawnSync(command, {
    cwd,
    env: Object.fromEntries(
      Object.entries(process.env).filter(([key]) => !key.startsWith("GIT_"))
    ),
    stderr: "pipe",
    stdout: "pipe",
  });

  if (result.exitCode !== 0) {
    throw new Error(
      `${command.join(" ")} failed: ${result.stdout}${result.stderr}`
    );
  }
};

describe("lefthook", () => {
  beforeEach(() => {
    mock.restore();
  });

  test.each(["gobwas", "doublestar"])(
    "matches root and deeply nested staged files with Lefthook's %s matcher",
    async (matcher) => {
      const written = mockProject(
        matcher === "doublestar"
          ? { "./lefthook.yml": "glob_matcher: doublestar\n" }
          : {}
      );

      const setup =
        matcher === "doublestar" ? lefthook.update : lefthook.create;

      await setup("bun");

      restoreFileSystemMock();

      const dir = nodePath.join(tmpdir(), `ultracite-lefthook-${randomUUID()}`);

      const config = (written.get("./lefthook.yml") ?? "").replace(
        "bunx ultracite fix {staged_files}",
        "bun capture.ts {staged_files}"
      );

      try {
        await Bun.write(nodePath.join(dir, "lefthook.yml"), config);
        await Bun.write(
          nodePath.join(dir, "capture.ts"),
          'await Bun.write("matched.json", JSON.stringify(process.argv.slice(2).sort()));'
        );
        await Bun.write(nodePath.join(dir, "root.ts"), "root\n");
        await Bun.write(nodePath.join(dir, "a/b/c/nested.js"), "nested\n");
        await Bun.write(nodePath.join(dir, "ignore.txt"), "ignored\n");

        runInHookRepo(dir, ["git", "init", "-q"]);
        runInHookRepo(dir, [
          "git",
          "add",
          "--",
          "root.ts",
          "a/b/c/nested.js",
          "ignore.txt",
        ]);
        runInHookRepo(dir, [
          process.execPath,
          fileURLToPath(import.meta.resolve("lefthook")),
          "run",
          "pre-commit",
        ]);

        expect(
          await Bun.file(nodePath.join(dir, "matched.json")).json()
        ).toEqual(["a/b/c/nested.js", "root.ts"]);
      } finally {
        process
          .getBuiltinModule("node:fs")
          .rmSync(dir, { force: true, recursive: true });
      }
    }
  );

  describe("exists", () => {
    test("returns true when lefthook.yml exists", async () => {
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve("")),
        writeFile: mock(() => Promise.resolve()),
      }));

      mock.module("node:fs", () => ({
        accessSync: mock(() => {}),
        existsSync: mock(() => false),
        readFileSync: mock(() => "{}"),
      }));

      const result = await lefthook.exists();
      expect(result).toBe(true);
    });

    test("returns false when lefthook.yml does not exist", async () => {
      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("")),
        writeFile: mock(() => Promise.resolve()),
      }));

      mock.module("node:fs", () => ({
        accessSync: mock(() => {
          throw new Error("ENOENT");
        }),
        existsSync: mock(() => false),
        readFileSync: mock(() => "{}"),
      }));

      const result = await lefthook.exists();
      expect(result).toBe(false);
    });
  });

  describe("install", () => {
    test("installs lefthook dependency", async () => {
      const mockAddDep = mock(() => Promise.resolve());

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve('{"name": "test"}')),
        writeFile: mock(() => Promise.resolve()),
      }));

      mock.module("node:fs", () => ({
        accessSync: mock(() => {}),
        existsSync: mock(() => false),
        readFileSync: mock(() => "{}"),
      }));

      mock.module("nypm", () => ({
        addDevDependency: mockAddDep,
        detectPackageManager: mock(() => Promise.resolve({ name: "npm" })),
        dlxCommand: mock((_pm: string, name: string) => {
          if (name === "lefthook") {
            return "npx lefthook install";
          }

          return "npx ultracite fix";
        }),
        removeDependency: mock(() => Promise.resolve()),
      }));

      await lefthook.install(npmPm);

      expect(mockAddDep).toHaveBeenCalledWith("lefthook", expect.any(Object));
    });

    test("runs lefthook install command", async () => {
      const mockSpawnSync = mock(() => ({ status: 0 }));
      mock.module("../src/spawn-sync", () => ({
        spawnSync: mockSpawnSync,
      }));

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve('{"name": "test"}')),
        writeFile: mock(() => Promise.resolve()),
      }));

      mock.module("node:fs", () => ({
        accessSync: mock(() => {}),
        existsSync: mock(() => false),
        readFileSync: mock(() => "{}"),
      }));

      mock.module("nypm", () => ({
        addDevDependency: mock(() => Promise.resolve()),
        detectPackageManager: mock(() => Promise.resolve({ name: "npm" })),
        dlxCommand: mock((_pm: string, name: string) => {
          if (name === "lefthook") {
            return "npx lefthook install";
          }

          return "npx ultracite fix";
        }),
        removeDependency: mock(() => Promise.resolve()),
      }));

      await lefthook.install(npmPm);

      expect(mockSpawnSync).toHaveBeenCalledWith(
        "npx",
        ["lefthook", "install"],
        {
          stdio: "pipe",
        }
      );
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
        dlxCommand: mock((_pm: string, name: string) => {
          if (name === "lefthook") {
            return "npx lefthook install";
          }

          return "npx ultracite fix";
        }),
        removeDependency: mock(() => Promise.resolve()),
      }));

      await lefthook.install(npmPm);

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      const writtenContent = JSON.parse(writeCall[1]);
      expect(writtenContent.scripts?.prepare).toBe("lefthook install");
    });
  });

  describe("create", () => {
    test("creates lefthook.yml with correct content", async () => {
      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.reject(new Error("ENOENT"))),
        readFile: mock(() => Promise.resolve("")),
        writeFile: mockWriteFile,
      }));

      mock.module("nypm", () => ({
        addDevDependency: mock(() => Promise.resolve()),
        detectPackageManager: mock(() => Promise.resolve({ name: "npm" })),
        dlxCommand: mock((_pm: string, name: string) => {
          if (name === "ultracite") {
            return "npx ultracite fix";
          }

          return `npx ${name} install`;
        }),
        removeDependency: mock(() => Promise.resolve()),
      }));

      await lefthook.create("npm");

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      expect(writeCall[0]).toBe("./lefthook.yml");
      expect(writeCall[1]).toContain("pre-commit:");
      expect(writeCall[1]).toContain("jobs:");
      // Only the staged files, which stage_fixed then re-stages
      expect(writeCall[1]).toContain(
        "    - run: npx ultracite fix {staged_files}\n"
      );
      expect(writeCall[1]).toContain("stage_fixed: true");
    });
  });

  describe("update", () => {
    test("skips update if ultracite command already present", async () => {
      const existingContent =
        "pre-commit:\n  jobs:\n    - run: npx ultracite fix {staged_files}";

      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
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
        dlxCommand: mock((_pm: string, name: string) => {
          if (name === "ultracite") {
            return "npx ultracite fix";
          }

          return `npx ${name} install`;
        }),
        removeDependency: mock(() => Promise.resolve()),
      }));

      await lefthook.update("npm");

      expect(mockWriteFile).not.toHaveBeenCalled();
    });

    test("replaces default template with ultracite config", async () => {
      const existingContent = "# EXAMPLE USAGE:\n# pre-commit:\n#   commands:";

      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
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
        dlxCommand: mock((_pm: string, name: string) => {
          if (name === "ultracite") {
            return "npx ultracite fix";
          }

          return `npx ${name} install`;
        }),
        removeDependency: mock(() => Promise.resolve()),
      }));

      await lefthook.update("npm");

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      expect(writeCall[1]).toContain("pre-commit:");
      expect(writeCall[1]).not.toContain("# EXAMPLE USAGE:");
    });

    test("adds ultracite job to existing jobs section", async () => {
      const existingContent = 'pre-commit:\n  jobs:\n    - run: echo "test"';

      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
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
        dlxCommand: mock((_pm: string, name: string) => {
          if (name === "ultracite") {
            return "npx ultracite fix";
          }

          return `npx ${name} install`;
        }),
        removeDependency: mock(() => Promise.resolve()),
      }));

      await lefthook.update("npm");

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      expect(writeCall[1]).toContain("npx ultracite fix");
      expect(writeCall[1]).toContain('echo "test"');
    });

    test("adds jobs section to pre-commit without jobs", async () => {
      const existingContent = "pre-commit:\n  parallel: true";

      const mockWriteFile = mock((_path: string, _content: string) =>
        Promise.resolve()
      );

      mock.module("node:fs/promises", () => ({
        access: mock(() => Promise.resolve()),
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
        dlxCommand: mock((_pm: string, name: string) => {
          if (name === "ultracite") {
            return "npx ultracite fix";
          }

          return `npx ${name} install`;
        }),
        removeDependency: mock(() => Promise.resolve()),
      }));

      await lefthook.update("npm");

      expect(mockWriteFile).toHaveBeenCalled();
      const [writeCall] = mockWriteFile.mock.calls;
      expect(writeCall[1]).toContain("jobs:");
      expect(writeCall[1]).toContain("npx ultracite fix");
    });
  });

  describe("update (regressions)", () => {
    test("updates an existing .lefthook.yml instead of shadowing it", async () => {
      const written = mockProject({
        "./.lefthook.yml": "pre-push:\n  jobs:\n    - run: npm test\n",
      });

      expect(lefthook.exists()).toBe(true);
      await lefthook.update("npm");
      restoreFileSystemMock();

      expect(written.has("./lefthook.yml")).toBe(false);
      expect(preCommitJobs(written.get("./.lefthook.yml"))[0].run).toBe(
        "npx ultracite fix {staged_files}"
      );
    });

    test("leaves a TOML config alone with instructions", async () => {
      const written = mockProject({
        "./lefthook.toml": "[pre-commit]\n",
      });

      const warn = spyOn(log, "warn").mockImplementation(() => {});

      await lefthook.update("npm");
      restoreFileSystemMock();

      expect(written.size).toBe(0);
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining("./lefthook.toml")
      );
      warn.mockRestore();
    });

    test("keeps a four-space indented pre-commit block valid", async () => {
      const written = mockProject({
        "./lefthook.yml": "pre-commit:\n    parallel: true\n",
      });

      await lefthook.update("npm");
      restoreFileSystemMock();

      const config = YAML.parse(written.get("./lefthook.yml") ?? "");
      expect(config["pre-commit"].parallel).toBe(true);
      expect(config["pre-commit"].jobs).toHaveLength(1);
    });

    test("keeps a compact jobs list valid", async () => {
      const written = mockProject({
        "./lefthook.yml": "pre-commit:\n  jobs:\n  - run: npm test\n",
      });

      await lefthook.update("npm");
      restoreFileSystemMock();

      const jobs = preCommitJobs(written.get("./lefthook.yml"));
      expect(jobs.map((job: { run: string }) => job.run)).toEqual([
        "npx ultracite fix {staged_files}",
        "npm test",
      ]);
    });

    test("finds the jobs list past a column-0 comment", async () => {
      const written = mockProject({
        "./lefthook.yml":
          "pre-commit:\n  parallel: true\n# lint things\n  jobs:\n    - run: npm test\n",
      });

      await lefthook.update("npm");
      restoreFileSystemMock();

      const output = written.get("./lefthook.yml") ?? "";
      expect(output).toContain("# lint things");
      expect(preCommitJobs(output)).toHaveLength(2);
    });

    test("adds jobs next to a commands-style hook", async () => {
      const written = mockProject({
        "./lefthook.yml":
          "pre-commit:\n  commands:\n    lint:\n      run: npm run lint\n",
      });

      await lefthook.update("npm");
      restoreFileSystemMock();

      const config = YAML.parse(written.get("./lefthook.yml") ?? "");
      expect(config["pre-commit"].commands.lint.run).toBe("npm run lint");
      expect(config["pre-commit"].jobs[0].run).toBe(
        "npx ultracite fix {staged_files}"
      );
    });

    test("uses one compact glob for all supported file types", async () => {
      const written = mockProject({});

      await lefthook.create("npm");
      restoreFileSystemMock();

      const [job] = preCommitJobs(written.get("./lefthook.yml"));
      expect(job.glob).toBe(stagedGlob);
    });

    test.each(["gobwas", "doublestar"])(
      "compacts the generated v8 glob list under the %s matcher",
      async (matcher) => {
        const prefix = matcher === "doublestar" ? "**/" : "";

        const list = stagedFileExtensions
          .map(
            (extension) =>
              `        - "${prefix}*.${extension}" # ${extension} file`
          )
          .join("\n");

        const written = mockProject({
          "./lefthook.yml": `glob_matcher: ${matcher}
pre-commit:
  jobs:
    - run: bunx ultracite fix {staged_files}
      glob: # Staged file types
${list}
      stage_fixed: true
    # Check the result
    - run: bun test
`,
        });

        await lefthook.update("bun");
        restoreFileSystemMock();

        const config = written.get("./lefthook.yml");
        expect(config).toContain(`glob_matcher: ${matcher}`);
        expect(config).toContain("# Staged file types");
        expect(config).toContain("# ts file");
        expect(config).toContain("    # Check the result\n    - run: bun test");
        expect(preCommitJobs(config)).toEqual([
          {
            glob: `${prefix}${stagedGlob}`,
            run: "bunx ultracite fix {staged_files}",
            stage_fixed: true,
          },
          { run: "bun test" },
        ]);

        const rerun = mockProject({ "./lefthook.yml": config ?? "" });
        await lefthook.update("bun");
        restoreFileSystemMock();

        expect(rerun.size).toBe(0);
      }
    );

    test("widens the glob list a pre-v8 init wrote", async () => {
      const written = mockProject({
        "./lefthook.yml": `pre-commit:
  jobs:
    - run: npx ultracite fix
      glob:
        - "*.js"
        - "*.jsx"
        - "*.ts"
        - "*.tsx"
        - "*.json"
        - "*.jsonc"
        - "*.css"
      stage_fixed: true
`,
      });

      await lefthook.update("npm");
      restoreFileSystemMock();

      const [job] = preCommitJobs(written.get("./lefthook.yml"));
      expect(job.glob).toBe(stagedGlob);
    });

    test("widens a pre-v8 doublestar glob list under the doublestar matcher", async () => {
      const written = mockProject({
        "./lefthook.yml": `glob_matcher: doublestar
pre-commit:
  jobs:
    - run: npx ultracite fix {staged_files}
      glob:
        - "**/*.js"
        - "**/*.jsx"
        - "**/*.ts"
        - "**/*.tsx"
        - "**/*.json"
        - "**/*.jsonc"
        - "**/*.css"
      stage_fixed: true
`,
      });

      await lefthook.update("npm");
      restoreFileSystemMock();

      const [job] = preCommitJobs(written.get("./lefthook.yml"));
      expect(job.glob).toBe(`**/${stagedGlob}`);
    });

    test("leaves a glob list a user edited alone", async () => {
      const written = mockProject({
        "./lefthook.yml": `pre-commit:
  jobs:
    - run: npx ultracite fix {staged_files}
      glob:
        - "*.ts"
        - "*.tsx"
      stage_fixed: true
`,
      });

      await lefthook.update("npm");
      restoreFileSystemMock();

      expect(written.size).toBe(0);
    });

    test("uses ** globs when the config opts into the doublestar matcher", async () => {
      const written = mockProject({
        "./lefthook.yml": "glob_matcher: doublestar\n",
      });

      await lefthook.update("npm");
      restoreFileSystemMock();

      const [job] = preCommitJobs(written.get("./lefthook.yml"));
      expect(job.glob).toBe(`**/${stagedGlob}`);
    });

    test("updates a generated compact glob when the matcher changes", async () => {
      const written = mockProject({
        "./lefthook.yml": `glob_matcher: doublestar
pre-commit:
  jobs:
    - run: bunx ultracite fix {staged_files}
      glob: "${stagedGlob}" # Managed file types
      stage_fixed: true
`,
      });

      await lefthook.update("bun");
      restoreFileSystemMock();

      const config = written.get("./lefthook.yml");
      const [job] = preCommitJobs(config);
      expect(job.glob).toBe(`**/${stagedGlob}`);
      expect(config).toContain("# Managed file types");
    });

    test.each([
      `[&shared "*.js", "*.jsx", "*.ts", "*.tsx", "*.json", "*.jsonc", "*.css"]`,
      `&shared "${stagedGlob}"`,
    ])("leaves glob anchors shared by other jobs alone", async (glob) => {
      const written = mockProject({
        "./lefthook.yml": `glob_matcher: doublestar
pre-commit:
  jobs:
    - run: bunx ultracite fix {staged_files}
      glob: ${glob}
      stage_fixed: true
    - run: bun test {staged_files}
      glob: *shared
`,
      });

      await lefthook.update("bun");
      restoreFileSystemMock();

      expect(written.size).toBe(0);
    });

    test("upgrades a job from an earlier init instead of adding a second one", async () => {
      const written = mockProject({
        "./lefthook.yml": `pre-commit:
  jobs:
    - run: yarn dlx ultracite fix
      glob:
        - "**/*.js"
        - "**/*.jsx"
        - "**/*.ts"
        - "**/*.tsx"
        - "**/*.json"
        - "**/*.jsonc"
        - "**/*.css"
      stage_fixed: true
`,
      });

      await lefthook.update("yarn");
      restoreFileSystemMock();

      const jobs = preCommitJobs(written.get("./lefthook.yml"));
      expect(jobs).toHaveLength(1);
      expect(jobs[0].run).toBe("yarn ultracite fix {staged_files}");
      expect(jobs[0].glob).toBe(stagedGlob);
    });

    test("does not add a second job when the package manager changes", async () => {
      const written = mockProject({
        "./lefthook.yml":
          'pre-commit:\n  jobs:\n    - run: npx ultracite fix\n      glob: ["*.js"]\n',
      });

      await lefthook.update("bun");
      restoreFileSystemMock();

      const jobs = preCommitJobs(written.get("./lefthook.yml"));
      expect(jobs).toHaveLength(1);
      expect(jobs[0].run).toBe("bunx ultracite fix {staged_files}");
    });

    test("passes the staged files to a job from before v8", async () => {
      const written = mockProject({
        "./lefthook.yml": `pre-commit:
  jobs:
    - run: pnpm exec ultracite fix
      glob:
        - "*.js"
        - "*.ts"
      stage_fixed: true
`,
      });

      await lefthook.update("pnpm");
      restoreFileSystemMock();

      const jobs = preCommitJobs(written.get("./lefthook.yml"));
      expect(jobs).toHaveLength(1);
      expect(jobs[0]).toEqual({
        glob: ["*.js", "*.ts"],
        run: "pnpm exec ultracite fix {staged_files}",
        stage_fixed: true,
      });
    });

    test("moves a staged-files job onto a new package manager", async () => {
      const written = mockProject({
        "./lefthook.yml":
          "pre-commit:\n  jobs:\n    - run: npx ultracite fix {staged_files}\n",
      });

      await lefthook.update("pnpm");
      restoreFileSystemMock();

      const jobs = preCommitJobs(written.get("./lefthook.yml"));
      expect(jobs).toHaveLength(1);
      expect(jobs[0].run).toBe("pnpm exec ultracite fix {staged_files}");
    });

    test("leaves a hand-written ultracite job alone", async () => {
      const written = mockProject({
        "./lefthook.yml":
          "pre-commit:\n  jobs:\n    - run: npx ultracite fix --unsafe {staged_files}\n",
      });

      await lefthook.update("npm");
      restoreFileSystemMock();

      expect(written.size).toBe(0);
    });
  });

  describe("install (regressions)", () => {
    test("chains onto an existing prepare script", async () => {
      const written = mockProject({
        "package.json": JSON.stringify({ scripts: { prepare: "husky" } }),
      });

      await lefthook.install(npmPm);
      restoreFileSystemMock();

      expect(
        JSON.parse(written.get("package.json") ?? "{}").scripts.prepare
      ).toBe("husky && lefthook install");
    });

    test("runs the installed lefthook with Yarn", async () => {
      const mockSpawn = mock(() => ({ status: 0 }));
      mock.module("../src/spawn-sync", () => ({ spawnSync: mockSpawn }));
      mockProject({ "package.json": "{}" });

      await lefthook.install({ command: "yarn", name: "yarn" });
      restoreFileSystemMock();

      expect(mockSpawn).toHaveBeenCalledWith("yarn", ["lefthook", "install"], {
        stdio: "pipe",
      });
    });
  });
});
