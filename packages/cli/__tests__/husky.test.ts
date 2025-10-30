import { execSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { addDevDependency } from "nypm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { husky } from "../src/integrations/husky";
import { exists, isMonorepo, updatePackageJson } from "../src/utils";

vi.mock("node:child_process", () => ({
  execSync: vi.fn(),
}));
vi.mock("nypm", () => ({
  addDevDependency: vi.fn(),
  dlxCommand: vi.fn((pm: string, pkg: string, options: any) => {
    if (options?.args?.includes("fix")) {
      if (pm === "npm") {
        return "npx ultracite fix";
      }

      if (pm === "yarn") {
        return "yarn dlx ultracite fix";
      }

      if (pm === "pnpm") {
        return "pnpm dlx ultracite fix";
      }

      if (pm === "bun") {
        return "bunx ultracite fix";
      }

      if (pm === "deno") {
        return "deno run -A npm:ultracite fix";
      }
    }
    if (options?.args?.includes("init")) {
      if (pm === "npm") {
        return "npx husky init";
      }
      if (pm === "yarn") {
        return "yarn dlx husky init";
      }
      if (pm === "pnpm") {
        return "pnpm dlx husky init";
      }
      if (pm === "bun") {
        return "bunx husky init";
      }
      if (pm === "deno") {
        return "deno run -A npm:husky init";
      }
    }
    return `npx ${pkg} ${options?.args?.join(" ") || ""}`;
  }),
}));
vi.mock("node:fs/promises");
vi.mock("../src/utils", () => ({
  exists: vi.fn(),
  isMonorepo: vi.fn(),
  updatePackageJson: vi.fn(),
}));

// Helper to create the expected hook script
const createExpectedHookScript = (command: string) => `#!/bin/sh
# Exit on any error
set -e

# Check if there are any staged files
if [ -z "$(git diff --cached --name-only)" ]; then
  echo "No staged files to format"
  exit 0
fi

# Store the hash of staged changes to detect modifications
STAGED_HASH=$(git diff --cached | sha256sum | cut -d' ' -f1)

# Save list of staged files (handling all file states)
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACMR)
PARTIALLY_STAGED=$(git diff --name-only)

# Stash unstaged changes to preserve working directory
# --keep-index keeps staged changes in working tree
git stash push --quiet --keep-index --message "pre-commit-stash" || true
STASHED=$?

# Run formatter on the staged files
${command}
FORMAT_EXIT_CODE=$?

# Restore working directory state
if [ $STASHED -eq 0 ]; then
  # Re-stage the formatted files
  if [ -n "$STAGED_FILES" ]; then
    echo "$STAGED_FILES" | while IFS= read -r file; do
      if [ -f "$file" ]; then
        git add "$file"
      fi
    done
  fi
  
  # Restore unstaged changes
  git stash pop --quiet || true
  
  # Restore partial staging if files were partially staged
  if [ -n "$PARTIALLY_STAGED" ]; then
    for file in $PARTIALLY_STAGED; do
      if [ -f "$file" ] && echo "$STAGED_FILES" | grep -q "^$file$"; then
        # File was partially staged - need to unstage the unstaged parts
        git restore --staged "$file" 2>/dev/null || true
        git add -p "$file" < /dev/null 2>/dev/null || git add "$file"
      fi
    done
  fi
else
  # No stash was created, just re-add the formatted files
  if [ -n "$STAGED_FILES" ]; then
    echo "$STAGED_FILES" | while IFS= read -r file; do
      if [ -f "$file" ]; then
        git add "$file"
      fi
    done
  fi
fi

# Check if staged files actually changed
NEW_STAGED_HASH=$(git diff --cached | sha256sum | cut -d' ' -f1)
if [ "$STAGED_HASH" != "$NEW_STAGED_HASH" ]; then
  echo "✨ Files formatted by Ultracite"
fi

exit $FORMAT_EXIT_CODE
`;

describe("husky configuration", () => {
  const mockAddDevDependency = vi.mocked(addDevDependency);
  const mockReadFile = vi.mocked(readFile);
  const mockWriteFile = vi.mocked(writeFile);
  const mockMkdir = vi.mocked(mkdir);
  const mockExists = vi.mocked(exists);
  const mockIsMonorepo = vi.mocked(isMonorepo);
  const mockUpdatePackageJson = vi.mocked(updatePackageJson);
  const mockExecSync = vi.mocked(execSync);

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
    it("should install husky as dev dependency and add prepare script", async () => {
      mockAddDevDependency.mockResolvedValue();
      mockUpdatePackageJson.mockResolvedValue();
      const packageManager = "npm";

      await husky.install(packageManager);

      expect(mockAddDevDependency).toHaveBeenCalledWith("husky", {
        packageManager: "npm",
        workspace: false,
      });
      expect(mockUpdatePackageJson).toHaveBeenCalledWith({
        scripts: {
          prepare: "husky",
        },
      });
    });

    it("should work with different package managers", async () => {
      mockAddDevDependency.mockResolvedValue();
      mockUpdatePackageJson.mockResolvedValue();

      // Test with yarn
      await husky.install("yarn");
      expect(mockAddDevDependency).toHaveBeenCalledWith("husky", {
        packageManager: "yarn",
        workspace: false,
      });
      expect(mockUpdatePackageJson).toHaveBeenCalledWith({
        scripts: {
          prepare: "husky",
        },
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

  describe("init", () => {
    it("should run husky init command", () => {
      mockExecSync.mockReturnValue(Buffer.from(""));

      husky.init("npm");

      expect(mockExecSync).toHaveBeenCalledWith("npx husky init", {
        stdio: "inherit",
      });
    });

    it("should handle init failures gracefully", () => {
      mockExecSync.mockImplementation(() => {
        throw new Error("Init failed");
      });

      // Should not throw
      expect(() => husky.init("npm")).not.toThrow();
    });

    it("should work with different package managers", () => {
      mockExecSync.mockReturnValue(Buffer.from(""));

      husky.init("yarn");
      expect(mockExecSync).toHaveBeenCalledWith("yarn dlx husky init", {
        stdio: "inherit",
      });

      husky.init("pnpm");
      expect(mockExecSync).toHaveBeenCalledWith("pnpm dlx husky init", {
        stdio: "inherit",
      });

      husky.init("bun");
      expect(mockExecSync).toHaveBeenCalledWith("bunx husky init", {
        stdio: "inherit",
      });

      husky.init("deno");
      expect(mockExecSync).toHaveBeenCalledWith("deno run -A npm:husky init", {
        stdio: "inherit",
      });
    });
  });

  describe("create", () => {
    it("should create .husky/pre-commit with robust staging preservation", async () => {
      mockMkdir.mockResolvedValue();
      mockWriteFile.mockResolvedValue();

      await husky.create("npm");

      expect(mockMkdir).toHaveBeenCalledWith(".husky", { recursive: true });
      expect(mockWriteFile).toHaveBeenCalledWith(
        "./.husky/pre-commit",
        createExpectedHookScript("npx ultracite fix")
      );
    });
  });

  describe("update", () => {
    it("should append robust staging preservation to existing pre-commit hook", async () => {
      const existingContent = "#!/bin/sh\nnpm test";
      mockReadFile.mockResolvedValue(existingContent);

      await husky.update("npm");

      expect(mockReadFile).toHaveBeenCalledWith("./.husky/pre-commit", "utf-8");
      expect(mockWriteFile).toHaveBeenCalledWith(
        "./.husky/pre-commit",
        `#!/bin/sh
npm test
${createExpectedHookScript("npx ultracite fix")}`
      );
    });

    it("should handle empty existing content", async () => {
      mockReadFile.mockResolvedValue("");

      await husky.update("npm");

      expect(mockWriteFile).toHaveBeenCalledWith(
        "./.husky/pre-commit",
        `\n${createExpectedHookScript("npx ultracite fix")}`
      );
    });
  });
});
