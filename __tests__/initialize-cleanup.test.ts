import { log, multiselect, spinner } from "@clack/prompts";
import { addDevDependency } from "nypm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { vscode } from "../scripts/editor-config/vscode";
import { zed } from "../scripts/editor-config/zed";
import { initialize } from "../scripts/initialize";
import { eslintCleanup } from "../scripts/migrations/eslint";
import { prettierCleanup } from "../scripts/migrations/prettier";

// Mock all dependencies
vi.mock("nypm");
vi.mock("node:fs/promises");
vi.mock("node:process", () => ({
  default: {
    exit: vi.fn(),
    cwd: vi.fn(() => "/test/path"),
  },
}));
vi.mock("@clack/prompts");
vi.mock("../scripts/utils", () => ({
  exists: vi.fn(),
  isMonorepo: vi.fn(() => Promise.resolve(false)),
  title: "test-title",
  updatePackageJson: vi.fn(),
}));
vi.mock("../scripts/biome", () => ({
  biome: {
    exists: vi.fn(() => Promise.resolve(false)),
    create: vi.fn(() => Promise.resolve()),
    update: vi.fn(() => Promise.resolve()),
  },
}));
vi.mock("../scripts/tsconfig", () => ({
  tsconfig: {
    exists: vi.fn(() => Promise.resolve(false)),
    create: vi.fn(() => Promise.resolve()),
    update: vi.fn(() => Promise.resolve()),
  },
}));
vi.mock("../scripts/editor-config/vscode", () => ({
  vscode: {
    exists: vi.fn(() => Promise.resolve(false)),
    create: vi.fn(() => Promise.resolve()),
    update: vi.fn(() => Promise.resolve()),
  },
}));
vi.mock("../scripts/editor-config/zed", () => ({
  zed: {
    exists: vi.fn(() => Promise.resolve(false)),
    create: vi.fn(() => Promise.resolve()),
    update: vi.fn(() => Promise.resolve()),
  },
}));
vi.mock("../scripts/editor-rules", () => ({
  createEditorRules: vi.fn(() => ({
    exists: vi.fn(() => Promise.resolve(false)),
    create: vi.fn(() => Promise.resolve()),
    update: vi.fn(() => Promise.resolve()),
  })),
}));
vi.mock("../scripts/integrations/husky", () => ({
  husky: {
    exists: vi.fn(() => Promise.resolve(false)),
    create: vi.fn(() => Promise.resolve()),
    update: vi.fn(() => Promise.resolve()),
    install: vi.fn(() => Promise.resolve()),
  },
}));
vi.mock("../scripts/integrations/lefthook", () => ({
  lefthook: {
    exists: vi.fn(() => Promise.resolve(false)),
    create: vi.fn(() => Promise.resolve()),
    update: vi.fn(() => Promise.resolve()),
    install: vi.fn(() => Promise.resolve()),
  },
}));
vi.mock("../scripts/integrations/lint-staged", () => ({
  lintStaged: {
    exists: vi.fn(() => Promise.resolve(false)),
    create: vi.fn(() => Promise.resolve()),
    update: vi.fn(() => Promise.resolve()),
    install: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock("../scripts/migrations/eslint", () => ({
  eslintCleanup: {
    hasEsLint: vi.fn(),
    remove: vi.fn(),
  },
}));

vi.mock("../scripts/migrations/prettier", () => ({
  prettierCleanup: {
    hasPrettier: vi.fn(),
    remove: vi.fn(),
  },
}));

describe("initialize - cleanup features", () => {
  const mockEslintCleanup = vi.mocked(eslintCleanup);
  const mockPrettierCleanup = vi.mocked(prettierCleanup);
  const mockSpinner = vi.mocked(spinner);
  const mockLog = vi.mocked(log);
  const mockMultiselect = vi.mocked(multiselect);
  const mockAddDevDependency = vi.mocked(addDevDependency);
  const mockZed = vi.mocked(zed);
  const mockVscode = vi.mocked(vscode);

  const mockSpinnerInstance = {
    start: vi.fn(),
    stop: vi.fn(),
    message: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockSpinner.mockReturnValue(mockSpinnerInstance);
    mockAddDevDependency.mockResolvedValue();
    mockLog.success = vi.fn();
    mockLog.error = vi.fn();
    mockLog.info = vi.fn();
    mockLog.warn = vi.fn();

    // Default: no existing Prettier/ESLint
    mockPrettierCleanup.hasPrettier.mockResolvedValue(false);
    mockEslintCleanup.hasEsLint.mockResolvedValue(false);
  });

  describe("ESLint removal", () => {
    it("should remove ESLint when removeEslint flag is true", async () => {
      mockEslintCleanup.remove.mockResolvedValue({
        packagesRemoved: ["eslint", "eslint-config-prettier"],
        filesRemoved: [".eslintrc.js", ".eslintignore"],
        vsCodeCleaned: true,
      });

      await initialize({
        pm: "npm",
        removeEslint: true,
        removePrettier: false,
        editors: [],
        rules: [],
        integrations: [],
      });

      expect(mockEslintCleanup.remove).toHaveBeenCalledWith("npm");
      expect(mockSpinnerInstance.start).toHaveBeenCalledWith(
        "Removing ESLint dependencies and configuration..."
      );
      expect(mockSpinnerInstance.stop).toHaveBeenCalledWith(
        "ESLint removed successfully."
      );
    });

    it("should prompt for ESLint removal when hasEsLint is true and flag is undefined", async () => {
      mockEslintCleanup.hasEsLint.mockResolvedValue(true);
      mockMultiselect.mockResolvedValue(["eslint"]);

      mockEslintCleanup.remove.mockResolvedValue({
        packagesRemoved: ["eslint"],
        filesRemoved: [".eslintrc.js"],
        vsCodeCleaned: false,
      });

      await initialize({
        pm: "yarn",
        // removeEslint is undefined, should prompt
        editors: [],
        rules: [],
        integrations: [],
      });

      expect(mockEslintCleanup.hasEsLint).toHaveBeenCalled();
      expect(mockMultiselect).toHaveBeenCalledWith(
        expect.objectContaining({
          message:
            "Remove existing formatters/linters (recommended for clean migration)?",
          options: expect.arrayContaining([
            expect.objectContaining({
              label:
                "Remove ESLint (dependencies, config files, VS Code settings)",
              value: "eslint",
            }),
          ]),
        })
      );
      expect(mockEslintCleanup.remove).toHaveBeenCalledWith("yarn");
    });

    it("should handle ESLint removal errors gracefully", async () => {
      mockEslintCleanup.remove.mockRejectedValue(
        new Error("Failed to remove ESLint")
      );

      await initialize({
        pm: "pnpm",
        removeEslint: true,
        removePrettier: false,
        editors: [],
        rules: [],
        integrations: [],
      });

      expect(mockEslintCleanup.remove).toHaveBeenCalledWith("pnpm");
      expect(mockSpinnerInstance.stop).toHaveBeenCalledWith(
        "Failed to remove ESLint completely, but continuing..."
      );
      // Should continue with initialization
      expect(mockLog.success).toHaveBeenCalledWith(
        "Successfully initialized Ultracite configuration!"
      );
    });

    it("should not prompt for ESLint removal when explicitly set to false", async () => {
      mockEslintCleanup.hasEsLint.mockResolvedValue(true);

      await initialize({
        pm: "npm",
        removeEslint: false,
        removePrettier: false,
        editors: [],
        rules: [],
        integrations: [],
      });

      expect(mockEslintCleanup.hasEsLint).not.toHaveBeenCalled();
      expect(mockMultiselect).not.toHaveBeenCalled();
      expect(mockEslintCleanup.remove).not.toHaveBeenCalled();
    });
  });

  describe("Prettier removal", () => {
    it("should remove Prettier when removePrettier flag is true", async () => {
      mockPrettierCleanup.remove.mockResolvedValue({
        packagesRemoved: ["prettier", "prettier-plugin-tailwindcss"],
        filesRemoved: [".prettierrc", ".prettierignore"],
        vsCodeCleaned: true,
      });

      await initialize({
        pm: "bun",
        removePrettier: true,
        removeEslint: false,
        editors: [],
        rules: [],
        integrations: [],
      });

      expect(mockPrettierCleanup.remove).toHaveBeenCalledWith("bun");
      expect(mockSpinnerInstance.start).toHaveBeenCalledWith(
        "Removing Prettier dependencies and configuration..."
      );
      expect(mockSpinnerInstance.stop).toHaveBeenCalledWith(
        "Prettier removed successfully."
      );
    });

    it("should prompt for Prettier removal when hasPrettier is true and flag is undefined", async () => {
      mockPrettierCleanup.hasPrettier.mockResolvedValue(true);
      mockMultiselect.mockResolvedValue(["prettier"]);

      mockPrettierCleanup.remove.mockResolvedValue({
        packagesRemoved: ["prettier"],
        filesRemoved: [".prettierrc"],
        vsCodeCleaned: true,
      });

      await initialize({
        pm: "npm",
        // removePrettier is undefined, should prompt
        editors: [],
        rules: [],
        integrations: [],
      });

      expect(mockPrettierCleanup.hasPrettier).toHaveBeenCalled();
      expect(mockMultiselect).toHaveBeenCalledWith(
        expect.objectContaining({
          message:
            "Remove existing formatters/linters (recommended for clean migration)?",
          options: expect.arrayContaining([
            expect.objectContaining({
              label:
                "Remove Prettier (dependencies, config files, VS Code settings)",
              value: "prettier",
            }),
          ]),
        })
      );
      expect(mockPrettierCleanup.remove).toHaveBeenCalledWith("npm");
    });

    it("should handle both Prettier and ESLint removal together", async () => {
      mockPrettierCleanup.hasPrettier.mockResolvedValue(true);
      mockEslintCleanup.hasEsLint.mockResolvedValue(true);
      mockMultiselect.mockResolvedValue(["prettier", "eslint"]);

      mockPrettierCleanup.remove.mockResolvedValue({
        packagesRemoved: ["prettier"],
        filesRemoved: [],
        vsCodeCleaned: false,
      });

      mockEslintCleanup.remove.mockResolvedValue({
        packagesRemoved: ["eslint"],
        filesRemoved: [],
        vsCodeCleaned: false,
      });

      await initialize({
        pm: "npm",
        // Both undefined, should prompt for both
        editors: [],
        rules: [],
        integrations: [],
      });

      expect(mockPrettierCleanup.remove).toHaveBeenCalledWith("npm");
      expect(mockEslintCleanup.remove).toHaveBeenCalledWith("npm");
    });

    it("should handle Prettier removal errors gracefully", async () => {
      mockPrettierCleanup.remove.mockRejectedValue(
        new Error("Failed to remove Prettier")
      );

      await initialize({
        pm: "yarn",
        removePrettier: true,
        removeEslint: false,
        editors: [],
        rules: [],
        integrations: [],
      });

      expect(mockPrettierCleanup.remove).toHaveBeenCalledWith("yarn");
      expect(mockSpinnerInstance.stop).toHaveBeenCalledWith(
        "Failed to remove Prettier completely, but continuing..."
      );
      // Should continue with initialization
      expect(mockLog.success).toHaveBeenCalledWith(
        "Successfully initialized Ultracite configuration!"
      );
    });
  });

  describe("Zed editor configuration", () => {
    it("should configure Zed when editors includes zed", async () => {
      mockZed.exists.mockResolvedValue(false);

      await initialize({
        pm: "npm",
        editors: ["zed"],
        rules: [],
        integrations: [],
        removeEslint: false,
        removePrettier: false,
      });

      expect(mockZed.exists).toHaveBeenCalled();
      expect(mockZed.create).toHaveBeenCalled();
      expect(mockSpinnerInstance.start).toHaveBeenCalledWith(
        "Checking for .zed/settings.json..."
      );
      // For Zed creation, it uses message() not stop()
      expect(mockSpinnerInstance.message).toHaveBeenCalledWith(
        "settings.json created. Install the Biome extension: https://biomejs.dev/reference/zed/"
      );
    });

    it("should update existing Zed configuration", async () => {
      mockZed.exists.mockResolvedValue(true);

      await initialize({
        pm: "pnpm",
        editors: ["zed"],
        rules: [],
        integrations: [],
        removeEslint: false,
        removePrettier: false,
      });

      expect(mockZed.exists).toHaveBeenCalled();
      expect(mockZed.update).toHaveBeenCalled();
      expect(mockZed.create).not.toHaveBeenCalled();
      // Find the specific call for Zed settings update
      const stopCalls = mockSpinnerInstance.stop.mock.calls;
      const zedSettingsCall = stopCalls.find(
        (call) => call[0] === "settings.json updated."
      );
      expect(zedSettingsCall).toBeDefined();
    });

    it("should configure both VSCode and Zed when both are selected", async () => {
      mockVscode.exists.mockResolvedValue(false);
      mockZed.exists.mockResolvedValue(false);

      await initialize({
        pm: "npm",
        editors: ["vscode", "zed"],
        rules: [],
        integrations: [],
        removeEslint: false,
        removePrettier: false,
      });

      expect(mockVscode.create).toHaveBeenCalled();
      expect(mockZed.create).toHaveBeenCalled();
    });

    it("should not configure Zed when not included in editors", async () => {
      await initialize({
        pm: "npm",
        editors: ["vscode"],
        rules: [],
        integrations: [],
        removeEslint: false,
        removePrettier: false,
      });

      expect(mockZed.exists).not.toHaveBeenCalled();
      expect(mockZed.create).not.toHaveBeenCalled();
      expect(mockZed.update).not.toHaveBeenCalled();
    });
  });
});
