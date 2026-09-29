import { beforeEach, describe, expect, mock, spyOn, test } from "bun:test";

import { log } from "@clack/prompts";
import type { PackageManager } from "nypm";
import YAML from "yaml";

import { lefthook } from "../src/integrations/lefthook";
import { mockFileSystem, restoreFileSystemMock } from "./mock-fs";

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

describe("lefthook", () => {
  beforeEach(() => {
    mock.restore();
  });

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
      expect(writeCall[1]).toContain("npx ultracite fix");
    });
  });

  describe("update", () => {
    test("skips update if ultracite command already present", async () => {
      const existingContent =
        "pre-commit:\n  jobs:\n    - run: npx ultracite fix";
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
        "npx ultracite fix"
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
        "npx ultracite fix",
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
      expect(config["pre-commit"].jobs[0].run).toBe("npx ultracite fix");
    });

    test("uses globs that match root-level files", async () => {
      const written = mockProject({});

      await lefthook.create("npm");
      restoreFileSystemMock();

      const [job] = preCommitJobs(written.get("./lefthook.yml"));
      expect(job.glob).toContain("*.ts");
      expect(job.glob).not.toContain("**/*.ts");
    });

    test("uses ** globs when the config opts into the doublestar matcher", async () => {
      const written = mockProject({
        "./lefthook.yml": "glob_matcher: doublestar\n",
      });

      await lefthook.update("npm");
      restoreFileSystemMock();

      const [job] = preCommitJobs(written.get("./lefthook.yml"));
      expect(job.glob).toContain("**/*.ts");
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
      expect(jobs[0].run).toBe("yarn ultracite fix");
      expect(jobs[0].glob).toContain("*.js");
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
      expect(jobs[0].run).toBe("bunx ultracite fix");
    });

    test("leaves a hand-written ultracite job alone", async () => {
      const written = mockProject({
        "./lefthook.yml":
          "pre-commit:\n  jobs:\n    - run: npx ultracite fix {staged_files}\n",
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
