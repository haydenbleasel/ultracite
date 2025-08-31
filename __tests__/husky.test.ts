import { mkdir, readFile, writeFile } from "node:fs/promises";
import * as nypm from "nypm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { husky } from "../scripts/integrations/husky";
import { exists, isMonorepo } from "../scripts/utils";

vi.mock("nypm", () => ({
  addDevDependency: vi.fn(),
  dlxCommand: vi.fn((pm: string, pkg: string, options: any) => {
    if (options?.args?.includes("format")) {
      if (pm === "npm") return "npx ultracite format";
      if (pm === "yarn") return "yarn dlx ultracite format";
      if (pm === "pnpm") return "pnpm dlx ultracite format";
      if (pm === "bun") return "bunx ultracite format";
      if (pm === "deno") return "deno run -A npm:ultracite format";
    }
    return `npx ${pkg} ${options?.args?.join(" ") || ""}`;
  }),
}));
vi.mock("node:fs/promises");
vi.mock("../scripts/utils", () => ({
  exists: vi.fn(),
  isMonorepo: vi.fn(),
}));

describe("husky configuration", () => {
  const mockAddDevDependency = vi.mocked(nypm.addDevDependency);
  const mockReadFile = vi.mocked(readFile);
  const mockWriteFile = vi.mocked(writeFile);
  const mockMkdir = vi.mocked(mkdir);
  const mockExists = vi.mocked(exists);
  const mockIsMonorepo = vi.mocked(isMonorepo);

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsMonorepo.mockResolvedValue(false);
  });

  describe("exists", () => {
    it("should return true when .husky/pre-commit exists", async () => {
      mockExists.mockResolvedValue(true);

      const result = await husky.exists();

      expect(result).toBe(true);
      expect(mockExists).toHaveBeenCalledWith("./.husky/pre-commit");
    });

    it("should return false when .husky/pre-commit does not exist", async () => {
      mockExists.mockResolvedValue(false);

      const result = await husky.exists();

      expect(result).toBe(false);
      expect(mockExists).toHaveBeenCalledWith("./.husky/pre-commit");
    });
  });

  describe("install", () => {
    it("should install husky as dev dependency", async () => {
      mockAddDevDependency.mockResolvedValue();
      const packageManager = "npm";

      await husky.install(packageManager);

      expect(mockAddDevDependency).toHaveBeenCalledWith("husky", {
        packageManager: "npm",
        workspace: false,
      });
    });

    it("should work with different package managers", async () => {
      mockAddDevDependency.mockResolvedValue();

      // Test with yarn
      await husky.install("yarn");
      expect(mockAddDevDependency).toHaveBeenCalledWith("husky", {
        packageManager: "yarn",
        workspace: false,
      });

      // Test with pnpm
      await husky.install("pnpm");
      expect(mockAddDevDependency).toHaveBeenCalledWith("husky", {
        packageManager: "pnpm",
        workspace: false,
      });

      // Test with bun
      await husky.install("bun");
      expect(mockAddDevDependency).toHaveBeenCalledWith("husky", {
        packageManager: "bun",
        workspace: false,
      });

      // Test with deno
      await husky.install("deno");
      expect(mockAddDevDependency).toHaveBeenCalledWith("husky", {
        packageManager: "deno",
        workspace: false,
      });
    });
  });

  describe("create", () => {
    it("should create .husky/pre-commit with ultracite format command", async () => {
      mockMkdir.mockResolvedValue();
      mockWriteFile.mockResolvedValue();

      await husky.create("npm");

      expect(mockMkdir).toHaveBeenCalledWith(".husky", { recursive: true });
      expect(mockWriteFile).toHaveBeenCalledWith(
        "./.husky/pre-commit",
        "npx ultracite format"
      );
    });
  });

  describe("update", () => {
    it("should append ultracite format command to existing pre-commit hook", async () => {
      const existingContent = "#!/bin/sh\nnpm test";
      mockReadFile.mockResolvedValue(existingContent);

      await husky.update("npm");

      expect(mockReadFile).toHaveBeenCalledWith("./.husky/pre-commit", "utf-8");
      expect(mockWriteFile).toHaveBeenCalledWith(
        "./.husky/pre-commit",
        "#!/bin/sh\nnpm test\nnpx ultracite format"
      );
    });

    it("should handle empty existing content", async () => {
      mockReadFile.mockResolvedValue("");

      await husky.update("npm");

      expect(mockWriteFile).toHaveBeenCalledWith(
        "./.husky/pre-commit",
        "\nnpx ultracite format"
      );
    });
  });
});
