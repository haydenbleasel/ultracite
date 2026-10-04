import { describe, expect, test } from "bun:test";
import path from "node:path";

import { isCommandAvailable, resolveCommand } from "../src/resolve-command";
import { mockFileSystem, restoreFileSystemMock } from "./mock-fs";

const winEnv = (pathValue: string) => ({
  PATH: pathValue,
  PATHEXT: ".CMD;.EXE",
});

describe("resolve-command", () => {
  test("finds stylelint in an ancestor node_modules/.bin on Windows", () => {
    const cwd = path.join("C:\\", "proj", "sub");
    const binStylelint = path.join(
      "C:\\",
      "proj",
      "node_modules",
      ".bin",
      "stylelint.CMD"
    );
    mockFileSystem({ [binStylelint]: "" });

    try {
      expect(
        resolveCommand("stylelint", {
          cwd,
          env: winEnv("C:\\tools\\bin"),
          platform: "win32",
        })
      ).toBe(binStylelint);
    } finally {
      restoreFileSystemMock();
    }
  });

  test("returns undefined when the command cannot be resolved", () => {
    mockFileSystem({});

    try {
      expect(
        resolveCommand("stylelint", {
          cwd: path.join("C:\\", "proj"),
          env: winEnv("C:\\tools\\bin"),
          platform: "win32",
        })
      ).toBeUndefined();
      expect(
        isCommandAvailable("stylelint", {
          cwd: path.join("C:\\", "proj"),
          env: winEnv("C:\\tools\\bin"),
          platform: "win32",
        })
      ).toBe(false);
    } finally {
      restoreFileSystemMock();
    }
  });

  test("searches quoted PATH entries and case-insensitive Path on Windows", () => {
    const cwd = path.join("C:\\", "proj");
    const toolStylelint = path.join("C:\\", "my tools", "bin", "stylelint.CMD");
    mockFileSystem({ [toolStylelint]: "" });

    try {
      expect(
        resolveCommand("stylelint", {
          cwd,
          env: { PATHEXT: ".CMD;.EXE", Path: '"C:\\my tools\\bin"' },
          platform: "win32",
        })
      ).toBe(toolStylelint);
    } finally {
      restoreFileSystemMock();
    }
  });

  test("prefers project binaries over PATH entries", () => {
    const cwd = path.join("C:\\", "proj");
    const localBin = path.join(cwd, "node_modules", ".bin", "stylelint.CMD");
    const pathBin = path.join("C:\\", "tools", "bin", "stylelint.CMD");
    mockFileSystem({ [localBin]: "", [pathBin]: "" });

    try {
      expect(
        resolveCommand("stylelint", {
          cwd,
          env: winEnv("C:\\tools\\bin"),
          platform: "win32",
        })
      ).toBe(localBin);
    } finally {
      restoreFileSystemMock();
    }
  });

  test("finds a bare executable on POSIX", () => {
    const cwd = path.resolve("test-posix-proj");
    const binStylelint = path.join(cwd, "node_modules", ".bin", "stylelint");
    mockFileSystem({ [binStylelint]: "" });

    try {
      expect(
        resolveCommand("stylelint", {
          cwd,
          env: { PATH: "/usr/bin" },
          platform: "linux",
        })
      ).toBe(binStylelint);
    } finally {
      restoreFileSystemMock();
    }
  });
});
