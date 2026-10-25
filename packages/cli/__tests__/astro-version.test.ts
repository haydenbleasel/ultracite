import { afterAll, describe, expect, mock, test } from "bun:test";
import path from "node:path";
import process from "node:process";

import { detectAstroMajorVersions } from "../src/astro-version";
import { mockFileSystem, restoreFileSystemMock } from "./mock-fs";

interface WorkspacePackage {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

// `files` maps paths to contents for both the async package.json read and the
// sync node_modules lookups; `workspaces` maps workspace dirs to their
// package.json, the shape find-workspaces returns.
const mockProject = (
  files: Record<string, string>,
  workspaces: Record<string, WorkspacePackage> = {}
) => {
  mock.module("node:fs/promises", () => ({
    readFile: mock((filePath: string) =>
      filePath in files
        ? Promise.resolve(files[filePath])
        : Promise.reject(new Error("ENOENT"))
    ),
  }));
  mockFileSystem(files);
  mock.module("find-workspaces", () => ({
    findWorkspaces: mock(() =>
      Object.entries(workspaces).map(([location, pkg]) => ({
        location,
        package: pkg,
      }))
    ),
  }));
};

const installed = (dir: string, version: string) => ({
  [path.join(dir, "node_modules", "astro", "package.json")]: JSON.stringify({
    name: "astro",
    version,
  }),
});

afterAll(() => {
  restoreFileSystemMock();
  mock.module("find-workspaces", () => ({ findWorkspaces: mock(() => []) }));
});

describe("detectAstroMajorVersions", () => {
  test("reads the lowest version the declared range allows", async () => {
    mockProject({
      "package.json": JSON.stringify({ dependencies: { astro: "^6.4.0" } }),
    });

    expect(await detectAstroMajorVersions()).toEqual([6]);
  });

  test("prefers the installed version over the range", async () => {
    mockProject({
      "package.json": JSON.stringify({ dependencies: { astro: "catalog:" } }),
      ...installed(process.cwd(), "7.3.2"),
    });

    expect(await detectAstroMajorVersions()).toEqual([7]);
  });

  test("reads workspaces that depend on Astro", async () => {
    const docs = path.join(process.cwd(), "apps", "docs");

    mockProject(
      { "package.json": JSON.stringify({ name: "root" }) },
      {
        [docs]: { devDependencies: { astro: "~5.2.0" } },
        [path.join(process.cwd(), "apps", "web")]: {
          dependencies: { react: "^19.0.0" },
        },
      }
    );

    expect(await detectAstroMajorVersions()).toEqual([5]);
  });

  test("skips a range it can't read when nothing is installed", async () => {
    mockProject({
      "package.json": JSON.stringify({ dependencies: { astro: "catalog:" } }),
    });

    expect(await detectAstroMajorVersions()).toEqual([]);
  });
});
