import { describe, expect, mock, test } from "bun:test";

import {
  assertSupportedPackageManagerName,
  getRootInstallOptions,
  isSupportedPackageManagerName,
  normalizePackageManager,
} from "../src/package-manager";

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

  test("presents nub and aube as pnpm so nypm emits --workspace-root", () => {
    mockMonorepo(true);

    expect(getRootInstallOptions({ command: "nub", name: "nub" })).toEqual({
      packageManager: { command: "nub", name: "pnpm" },
      workspace: true,
    });
    expect(getRootInstallOptions({ command: "aube", name: "aube" })).toEqual({
      packageManager: { command: "aube", name: "pnpm" },
      workspace: true,
    });
  });
});
