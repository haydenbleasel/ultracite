import { execSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import * as nypm from "nypm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { lefthook } from "../scripts/integrations/lefthook";
import { exists, isMonorepo } from "../scripts/utils";

vi.mock("node:child_process");
vi.mock("nypm", () => ({
  addDevDependency: vi.fn(),
  dlxCommand: vi.fn((pm: string, pkg: string, options: any) => {
    if (pkg === "ultracite" && options?.args?.includes("format")) {
      if (pm === "npm") {
        return "npx ultracite format";
      }
      if (pm === "yarn") {
        return "yarn dlx ultracite format";
      }
      if (pm === "pnpm") {
        return "pnpm dlx ultracite format";
      }
      if (pm === "bun") {
        return "bunx ultracite format";
      }
      if (pm === "deno") {
        return "deno run -A npm:ultracite format";
      }
    }
    if (pkg === "lefthook" && options?.args?.includes("install")) {
      if (pm === "npm") {
        return "npx lefthook install";
      }
      if (pm === "yarn") {
        return "yarn dlx lefthook install";
      }
      if (pm === "pnpm") {
        return "pnpm dlx lefthook install";
      }
      if (pm === "bun") {
        return "bunx lefthook install";
      }
      if (pm === "deno") {
        return "deno run -A npm:lefthook install";
      }
    }
    return `npx ${pkg} ${options?.args?.join(" ") || ""}`;
  }),
}));
vi.mock("node:fs/promises");
vi.mock("../scripts/utils", () => ({
  exists: vi.fn(),
  isMonorepo: vi.fn(),
}));

describe("lefthook configuration", () => {
  const mockExecSync = vi.mocked(execSync);
  const mockAddDevDependency = vi.mocked(nypm.addDevDependency);
  const mockReadFile = vi.mocked(readFile);
  const mockWriteFile = vi.mocked(writeFile);
  const mockExists = vi.mocked(exists);
  const mockIsMonorepo = vi.mocked(isMonorepo);

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsMonorepo.mockResolvedValue(false);
  });

  describe("exists", () => {
    it("should return true when lefthook.yml exists", async () => {
      mockExists.mockResolvedValue(true);

      const result = await lefthook.exists();

      expect(result).toBe(true);
      expect(mockExists).toHaveBeenCalledWith("./lefthook.yml");
    });

    it("should return false when lefthook.yml does not exist", async () => {
      mockExists.mockResolvedValue(false);

      const result = await lefthook.exists();

      expect(result).toBe(false);
      expect(mockExists).toHaveBeenCalledWith("./lefthook.yml");
    });
  });

  describe("install", () => {
    it("should install lefthook as dev dependency and run install", async () => {
      mockAddDevDependency.mockResolvedValue();
      const packageManager = "npm";

      await lefthook.install(packageManager);

      expect(mockAddDevDependency).toHaveBeenCalledWith("lefthook", {
        packageManager: "npm",
        workspace: false,
      });
      expect(mockExecSync).toHaveBeenCalledWith("npx lefthook install");
    });

    it("should work with different package managers", async () => {
      mockAddDevDependency.mockResolvedValue();

      // Test with yarn
      await lefthook.install("yarn");
      expect(mockAddDevDependency).toHaveBeenCalledWith("lefthook", {
        packageManager: "yarn",
        workspace: false,
      });
      expect(mockExecSync).toHaveBeenCalledWith("yarn dlx lefthook install");

      // Test with pnpm
      await lefthook.install("pnpm");
      expect(mockAddDevDependency).toHaveBeenCalledWith("lefthook", {
        packageManager: "pnpm",
        workspace: false,
      });
      expect(mockExecSync).toHaveBeenCalledWith("pnpm dlx lefthook install");

      // Test with bun
      await lefthook.install("bun");
      expect(mockAddDevDependency).toHaveBeenCalledWith("lefthook", {
        packageManager: "bun",
        workspace: false,
      });
      expect(mockExecSync).toHaveBeenCalledWith("bunx lefthook install");

      // Test with deno
      await lefthook.install("deno");
      expect(mockAddDevDependency).toHaveBeenCalledWith("lefthook", {
        packageManager: "deno",
        workspace: false,
      });
      expect(mockExecSync).toHaveBeenCalledWith(
        "deno run -A npm:lefthook install"
      );
    });
  });

  describe("create", () => {
    it("should create lefthook.yml with ultracite format command", async () => {
      await lefthook.create("npm");

      expect(mockWriteFile).toHaveBeenCalledWith(
        "./lefthook.yml",
        `pre-commit:
  jobs:
    - run: npx ultracite format
      glob: 
        - "*.js"
        - "*.jsx"
        - "*.ts"
        - "*.tsx"
        - "*.json"
        - "*.jsonc"
        - "*.css"
      stage_fixed: true
`
      );
    });
  });

  describe("update", () => {
    it("should not modify config if ultracite command already exists", async () => {
      const existingContent = `pre-commit:
  jobs:
    - run: npx ultracite format
      glob: 
        - "*.js"
        - "*.jsx"
        - "*.ts"
        - "*.tsx"
        - "*.json"
        - "*.jsonc"
        - "*.css"
      stage_fixed: true
    - run: npm run lint`;
      mockReadFile.mockResolvedValue(existingContent);

      await lefthook.update("npm");

      expect(mockReadFile).toHaveBeenCalledWith("./lefthook.yml", "utf-8");
      expect(mockWriteFile).not.toHaveBeenCalled();
    });

    it("should add ultracite job to existing pre-commit jobs section", async () => {
      const existingContent = `pre-commit:
  jobs:
    - run: npm run lint`;
      mockReadFile.mockResolvedValue(existingContent);

      await lefthook.update("npm");

      expect(mockReadFile).toHaveBeenCalledWith("./lefthook.yml", "utf-8");
      expect(mockWriteFile).toHaveBeenCalledWith(
        "./lefthook.yml",
        `pre-commit:
  jobs:
    - run: npx ultracite format
      glob: 
        - "*.js"
        - "*.jsx"
        - "*.ts"
        - "*.tsx"
        - "*.json"
        - "*.jsonc"
        - "*.css"
      stage_fixed: true
    - run: npm run lint`
      );
    });

    it("should add jobs section to existing pre-commit without jobs", async () => {
      const existingContent = `pre-commit:
  commands:
    lint:
      run: npm run lint`;
      mockReadFile.mockResolvedValue(existingContent);

      await lefthook.update("npm");

      expect(mockReadFile).toHaveBeenCalledWith("./lefthook.yml", "utf-8");
      expect(mockWriteFile).toHaveBeenCalledWith(
        "./lefthook.yml",
        `pre-commit:
  jobs:
    - run: npx ultracite format
      glob: 
        - "*.js"
        - "*.jsx"
        - "*.ts"
        - "*.tsx"
        - "*.json"
        - "*.jsonc"
        - "*.css"
      stage_fixed: true
  commands:
    lint:
      run: npm run lint`
      );
    });

    it("should append new pre-commit section if none exists", async () => {
      const existingContent = `commit-msg:
  commands:
    lint:
      run: npm run lint`;
      mockReadFile.mockResolvedValue(existingContent);

      await lefthook.update("npm");

      expect(mockReadFile).toHaveBeenCalledWith("./lefthook.yml", "utf-8");
      expect(mockWriteFile).toHaveBeenCalledWith(
        "./lefthook.yml",
        `commit-msg:
  commands:
    lint:
      run: npm run lint
pre-commit:
  jobs:
    - run: npx ultracite format
      glob: 
        - "*.js"
        - "*.jsx"
        - "*.ts"
        - "*.tsx"
        - "*.json"
        - "*.jsonc"
        - "*.css"
      stage_fixed: true
`
      );
    });

    it("should handle empty existing content", async () => {
      mockReadFile.mockResolvedValue("");

      await lefthook.update("npm");

      expect(mockWriteFile).toHaveBeenCalledWith(
        "./lefthook.yml",
        `
pre-commit:
  jobs:
    - run: npx ultracite format
      glob: 
        - "*.js"
        - "*.jsx"
        - "*.ts"
        - "*.tsx"
        - "*.json"
        - "*.jsonc"
        - "*.css"
      stage_fixed: true
`
      );
    });

    it("should replace default commented template from lefthook install", async () => {
      const defaultTemplate = `# EXAMPLE USAGE:
#
#   Refer for explanation to following link:
#   https://lefthook.dev/configuration/
#
# pre-push:
#   jobs:
#     - name: packages audit
#       tags:
#         - frontend
#         - security
#       run: yarn audit
#
#     - name: gems audit
#       tags:
#         - backend
#         - security
#       run: bundle audit
#
# pre-commit:
#   parallel: true
#   jobs:
#     - run: yarn eslint {staged_files}
#       glob: "*.{js,ts,jsx,tsx}"
#
#     - name: rubocop
#       glob: "*.rb"
#       exclude:
#         - config/application.rb
#         - config/routes.rb
#       run: bundle exec rubocop --force-exclusion {all_files}
#
#     - name: govet
#       files: git ls-files -m
#       glob: "*.go"
#       run: go vet {files}
#
#     - script: "hello.js"
#       runner: node
#
#     - script: "hello.go"
#       runner: go run`;

      mockReadFile.mockResolvedValue(defaultTemplate);

      await lefthook.update("npm");

      expect(mockWriteFile).toHaveBeenCalledWith(
        "./lefthook.yml",
        `pre-commit:
  jobs:
    - run: npx ultracite format
      glob: 
        - "*.js"
        - "*.jsx"
        - "*.ts"
        - "*.tsx"
        - "*.json"
        - "*.jsonc"
        - "*.css"
      stage_fixed: true
`
      );
    });
  });
});
