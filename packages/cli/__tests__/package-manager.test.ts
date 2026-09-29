import { afterAll, describe, expect, mock, test } from "bun:test";

import * as nypm from "nypm";

import {
  assertSupportedPackageManagerName,
  getRootInstallOptions,
  isSupportedPackageManagerName,
  normalizePackageManager,
  resolveRequestedPackageManager,
} from "../src/package-manager";
import { restoreFileSystemMock } from "./mock-fs";

// mock.module is process-wide; put nypm and node:fs back for later suites.
const realNypm = { ...nypm };
afterAll(() => {
  mock.module("nypm", () => realNypm);
  restoreFileSystemMock();
});

// isMonorepo() looks for pnpm-workspace.yaml, then a `workspaces` field in
// package.json — drive it through node:fs like the initialize tests do.
const mockMonorepo = (isMonorepo: boolean) => {
  mock.module("node:fs", () => ({
    accessSync: mock(() => {
      throw new Error("ENOENT");
    }),
    existsSync: mock(() => false),
    readFileSync: mock(() =>
      isMonorepo ? '{"workspaces": ["packages/*"]}' : "{}"
    ),
  }));
};

describe("isSupportedPackageManagerName", () => {
  test("accepts every supported package manager", () => {
    for (const name of ["npm", "yarn", "pnpm", "bun", "deno", "nub", "aube"]) {
      expect(isSupportedPackageManagerName(name)).toBe(true);
    }
  });

  test("rejects unknown names", () => {
    expect(isSupportedPackageManagerName("node")).toBe(false);
  });
});

describe("assertSupportedPackageManagerName", () => {
  test("throws a descriptive error for unknown names", () => {
    expect(() => assertSupportedPackageManagerName("node")).toThrow(
      'Unsupported package manager "node". Supported package managers: npm, yarn, pnpm, bun, deno, nub, aube.'
    );
  });
});

describe("normalizePackageManager", () => {
  test("uses the name as the command", () => {
    expect(
      normalizePackageManager({ command: "/usr/bin/nub", name: "nub" })
    ).toEqual({ command: "nub", name: "nub" });
  });
});

describe("getRootInstallOptions", () => {
  test("never passes the workspace flag outside a monorepo", () => {
    mockMonorepo(false);

    expect(getRootInstallOptions({ command: "nub", name: "nub" })).toEqual({
      packageManager: { command: "nub", name: "nub" },
      workspace: false,
    });
  });

  test("never passes the workspace flag to npm", () => {
    mockMonorepo(true);

    expect(getRootInstallOptions({ command: "npm", name: "npm" })).toEqual({
      packageManager: { command: "npm", name: "npm" },
      workspace: false,
    });
  });

  test("passes the workspace flag to pnpm in a monorepo", () => {
    mockMonorepo(true);

    expect(getRootInstallOptions({ command: "pnpm", name: "pnpm" })).toEqual({
      packageManager: { command: "pnpm", name: "pnpm" },
      workspace: true,
    });
  });

  test("passes the workspace flag to nub and aube as they are", () => {
    mockMonorepo(true);

    expect(getRootInstallOptions({ command: "nub", name: "nub" })).toEqual({
      packageManager: { command: "nub", name: "nub" },
      workspace: true,
    });
    expect(getRootInstallOptions({ command: "aube", name: "aube" })).toEqual({
      packageManager: { command: "aube", name: "aube" },
      workspace: true,
    });
  });
});

// A project with the given files; every other path is missing.
const mockYarnProject = (files: Record<string, string>) => {
  mock.module("node:fs", () => ({
    accessSync: mock(() => {
      throw new Error("ENOENT");
    }),
    existsSync: mock((filePath: string) =>
      Object.keys(files).some((name) => String(filePath).endsWith(name))
    ),
    readFileSync: mock((filePath: string) => {
      const name = Object.keys(files).find((file) =>
        String(filePath).endsWith(file)
      );
      if (name === undefined) {
        throw new Error("ENOENT");
      }
      return files[name];
    }),
  }));
};

describe("Yarn major version", () => {
  test("marks a Yarn project with .yarnrc.yml as Yarn 2+", () => {
    mockYarnProject({ ".yarnrc.yml": "nodeLinker: node-modules\n" });

    expect(
      normalizePackageManager({ command: "yarn", name: "yarn" }).majorVersion
    ).toBe("2");
  });

  test("marks a Yarn 2+ lockfile as Yarn 2+", () => {
    mockYarnProject({
      "yarn.lock": "# This file is generated\n\n__metadata:\n  version: 8\n",
    });

    expect(
      normalizePackageManager({ command: "yarn", name: "yarn" }).majorVersion
    ).toBe("2");
  });

  test("marks a Yarn 1 project as Yarn 1", () => {
    mockYarnProject({ "yarn.lock": "# yarn lockfile v1\n" });

    expect(
      normalizePackageManager({ command: "yarn", name: "yarn" }).majorVersion
    ).toBe("1");
  });

  test("keeps a major version nypm detected from packageManager", () => {
    mockYarnProject({});

    expect(
      normalizePackageManager({
        command: "yarn",
        majorVersion: "4",
        name: "yarn",
      }).majorVersion
    ).toBe("4");
  });

  test("keeps detected details when --pm names the project's package manager", async () => {
    mockYarnProject({});
    mock.module("nypm", () => ({
      detectPackageManager: mock(() =>
        Promise.resolve({ command: "yarn", majorVersion: "4", name: "yarn" })
      ),
    }));

    expect(await resolveRequestedPackageManager("yarn")).toEqual({
      command: "yarn",
      majorVersion: "4",
      name: "yarn",
    });
  });
});
