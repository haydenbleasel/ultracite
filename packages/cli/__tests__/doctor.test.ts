import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { doctor } from "../scripts/commands/doctor";

// Mock the modules
vi.mock("node:child_process", () => ({
  spawnSync: vi.fn(),
}));

vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
}));

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
}));

// Regex for summary counts
const PASSED_SUMMARY_REGEX = /2 passed, 2 warnings, 0 failed/;

describe("doctor command", () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit called");
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  it("should pass all checks when everything is configured correctly", async () => {
    // Mock Biome installation check
    vi.mocked(spawnSync).mockReturnValue({
      status: 0,
      stdout: "Version: 2.2.2",
      stderr: "",
      pid: 1234,
      output: ["", "Version: 2.2.2", ""],
      signal: null,
    });

    // Mock file existence checks
    vi.mocked(existsSync).mockImplementation((path) => {
      const pathStr = path.toString();
      if (pathStr.includes("biome.json")) {
        return true;
      }
      if (pathStr.includes("package.json")) {
        return true;
      }
      // No prettier/eslint configs
      if (pathStr.includes(".prettierrc")) {
        return false;
      }
      if (pathStr.includes(".eslintrc")) {
        return false;
      }
      if (pathStr.includes("prettier.config")) {
        return false;
      }
      if (pathStr.includes("eslint.config")) {
        return false;
      }
      return false;
    });

    // Mock file reading
    vi.mocked(readFile).mockImplementation((path) => {
      const pathStr = path.toString();
      if (pathStr.includes("biome.json")) {
        return Promise.resolve(
          JSON.stringify({
            extends: ["ultracite"],
          })
        );
      }
      if (pathStr.includes("package.json")) {
        return Promise.resolve(
          JSON.stringify({
            devDependencies: {
              ultracite: "^5.0.0",
            },
          })
        );
      }
      return Promise.reject(new Error("File not found"));
    });

    await doctor();

    expect(consoleLogSpy).toHaveBeenCalledWith(
      "🩺 Running Ultracite doctor...\n"
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("✅ Biome installation:")
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("✅ Biome configuration:")
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("✅ Ultracite dependency:")
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("✅ Conflicting tools:")
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("4 passed, 0 warnings, 0 failed")
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("✨ Everything looks good!")
    );
    expect(processExitSpy).not.toHaveBeenCalled();
  });

  it("should fail when Biome is not installed", async () => {
    // Mock Biome installation check failure
    vi.mocked(spawnSync).mockReturnValue({
      status: 1,
      stdout: "",
      stderr: "command not found",
      pid: 1234,
      output: ["", "", "command not found"],
      signal: null,
    });

    // Mock other checks to pass
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFile).mockResolvedValue(
      JSON.stringify({
        extends: ["ultracite"],
        devDependencies: { ultracite: "^5.0.0" },
      })
    );

    await expect(doctor()).rejects.toThrow("process.exit called");

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("❌ Biome installation:")
    );
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });

  it("should warn when biome.json doesn't extend ultracite", async () => {
    // Mock Biome installation check
    vi.mocked(spawnSync).mockReturnValue({
      status: 0,
      stdout: "Version: 2.2.2",
      stderr: "",
      pid: 1234,
      output: ["", "Version: 2.2.2", ""],
      signal: null,
    });

    // Mock file existence
    vi.mocked(existsSync).mockImplementation((path) => {
      const pathStr = path.toString();
      if (pathStr.includes("biome.json")) {
        return true;
      }
      if (pathStr.includes("package.json")) {
        return true;
      }
      return false;
    });

    // Mock file reading - biome.json without extends
    vi.mocked(readFile).mockImplementation((path) => {
      const pathStr = path.toString();
      if (pathStr.includes("biome.json")) {
        return Promise.resolve(
          JSON.stringify({
            $schema: "./node_modules/@biomejs/biome/configuration_schema.json",
          })
        );
      }
      if (pathStr.includes("package.json")) {
        return Promise.resolve(
          JSON.stringify({
            devDependencies: {
              ultracite: "^5.0.0",
            },
          })
        );
      }
      return Promise.reject(new Error("File not found"));
    });

    await doctor();

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("⚠️ Biome configuration:")
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("doesn't extend ultracite")
    );
  });

  it("should warn when Ultracite is not in package.json", async () => {
    // Mock Biome installation check
    vi.mocked(spawnSync).mockReturnValue({
      status: 0,
      stdout: "Version: 2.2.2",
      stderr: "",
      pid: 1234,
      output: ["", "Version: 2.2.2", ""],
      signal: null,
    });

    // Mock file existence
    vi.mocked(existsSync).mockImplementation((path) => {
      const pathStr = path.toString();
      if (pathStr.includes("biome.json")) {
        return true;
      }
      if (pathStr.includes("package.json")) {
        return true;
      }
      return false;
    });

    // Mock file reading - package.json without ultracite
    vi.mocked(readFile).mockImplementation((path) => {
      const pathStr = path.toString();
      if (pathStr.includes("biome.json")) {
        return Promise.resolve(
          JSON.stringify({
            extends: ["ultracite"],
          })
        );
      }
      if (pathStr.includes("package.json")) {
        return Promise.resolve(
          JSON.stringify({
            devDependencies: {},
          })
        );
      }
      return Promise.reject(new Error("File not found"));
    });

    await doctor();

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("⚠️ Ultracite dependency:")
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("not found in package.json")
    );
  });

  it("should warn when conflicting tools are found", async () => {
    // Mock Biome installation check
    vi.mocked(spawnSync).mockReturnValue({
      status: 0,
      stdout: "Version: 2.2.2",
      stderr: "",
      pid: 1234,
      output: ["", "Version: 2.2.2", ""],
      signal: null,
    });

    // Mock file existence - include prettier and eslint configs
    vi.mocked(existsSync).mockImplementation((path) => {
      const pathStr = path.toString();
      if (pathStr.includes("biome.json")) {
        return true;
      }
      if (pathStr.includes("package.json")) {
        return true;
      }
      if (pathStr.includes(".prettierrc")) {
        return true;
      }
      if (pathStr.includes(".eslintrc")) {
        return true;
      }
      return false;
    });

    // Mock file reading
    vi.mocked(readFile).mockImplementation((path) => {
      const pathStr = path.toString();
      if (pathStr.includes("biome.json")) {
        return Promise.resolve(
          JSON.stringify({
            extends: ["ultracite"],
          })
        );
      }
      if (pathStr.includes("package.json")) {
        return Promise.resolve(
          JSON.stringify({
            devDependencies: {
              ultracite: "^5.0.0",
            },
          })
        );
      }
      return Promise.reject(new Error("File not found"));
    });

    await doctor();

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("⚠️ Conflicting tools:")
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("Prettier")
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("ESLint")
    );
  });

  it("should handle missing package.json gracefully", async () => {
    // Mock Biome installation check
    vi.mocked(spawnSync).mockReturnValue({
      status: 0,
      stdout: "Version: 2.2.2",
      stderr: "",
      pid: 1234,
      output: ["", "Version: 2.2.2", ""],
      signal: null,
    });

    // Mock file existence - no package.json
    vi.mocked(existsSync).mockImplementation((path) => {
      const pathStr = path.toString();
      if (pathStr.includes("biome.json")) {
        return true;
      }
      if (pathStr.includes("package.json")) {
        return false;
      }
      return false;
    });

    // Mock file reading
    vi.mocked(readFile).mockImplementation((path) => {
      const pathStr = path.toString();
      if (pathStr.includes("biome.json")) {
        return Promise.resolve(
          JSON.stringify({
            extends: ["ultracite"],
          })
        );
      }
      return Promise.reject(new Error("File not found"));
    });

    await doctor();

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("⚠️ Ultracite dependency:")
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("No package.json found")
    );
  });

  it("should handle unparseable biome.json gracefully", async () => {
    // Mock Biome installation check
    vi.mocked(spawnSync).mockReturnValue({
      status: 0,
      stdout: "Version: 2.2.2",
      stderr: "",
      pid: 1234,
      output: ["", "Version: 2.2.2", ""],
      signal: null,
    });

    // Mock file existence
    vi.mocked(existsSync).mockImplementation((path) => {
      const pathStr = path.toString();
      if (pathStr.includes("biome.json")) {
        return true;
      }
      if (pathStr.includes("package.json")) {
        return true;
      }
      return false;
    });

    // Mock file reading - throw error when reading biome.json
    vi.mocked(readFile).mockImplementation((path) => {
      const pathStr = path.toString();
      if (pathStr.includes("biome.json")) {
        return Promise.reject(new Error("Read error"));
      }
      if (pathStr.includes("package.json")) {
        return Promise.resolve(
          JSON.stringify({
            devDependencies: {
              ultracite: "^5.0.0",
            },
          })
        );
      }
      return Promise.reject(new Error("File not found"));
    });

    await expect(doctor()).rejects.toThrow("process.exit called");

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("❌ Biome configuration:")
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("Could not parse biome.json")
    );
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });

  it("should fail when biome.json is missing", async () => {
    // Mock Biome installation check
    vi.mocked(spawnSync).mockReturnValue({
      status: 0,
      stdout: "Version: 2.2.2",
      stderr: "",
      pid: 1234,
      output: ["", "Version: 2.2.2", ""],
      signal: null,
    });

    // Mock file existence - no biome.json
    vi.mocked(existsSync).mockImplementation((path) => {
      const pathStr = path.toString();
      if (pathStr.includes("biome.json")) {
        return false;
      }
      if (pathStr.includes("package.json")) {
        return true;
      }
      return false;
    });

    // Mock file reading
    vi.mocked(readFile).mockImplementation((path) => {
      const pathStr = path.toString();
      if (pathStr.includes("package.json")) {
        return Promise.resolve(
          JSON.stringify({
            devDependencies: {
              ultracite: "^5.0.0",
            },
          })
        );
      }
      return Promise.reject(new Error("File not found"));
    });

    await expect(doctor()).rejects.toThrow("process.exit called");

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("❌ Biome configuration:")
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("No biome.json or biome.jsonc file found")
    );
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });

  it("should check biome.jsonc when biome.json doesn't exist", async () => {
    // Mock Biome installation check
    vi.mocked(spawnSync).mockReturnValue({
      status: 0,
      stdout: "Version: 2.2.2",
      stderr: "",
      pid: 1234,
      output: ["", "Version: 2.2.2", ""],
      signal: null,
    });

    // Mock file existence - only biome.jsonc exists
    vi.mocked(existsSync).mockImplementation((path) => {
      const pathStr = path.toString();
      if (pathStr.includes("biome.jsonc")) {
        return true;
      }
      if (pathStr.includes("biome.json") && !pathStr.includes("biome.jsonc")) {
        return false;
      }
      if (pathStr.includes("package.json")) {
        return true;
      }
      return false;
    });

    // Mock file reading
    vi.mocked(readFile).mockImplementation((path) => {
      const pathStr = path.toString();
      if (pathStr.includes("biome.jsonc")) {
        return Promise.resolve(
          JSON.stringify({
            extends: ["ultracite"],
          })
        );
      }
      if (pathStr.includes("package.json")) {
        return Promise.resolve(
          JSON.stringify({
            devDependencies: {
              ultracite: "^5.0.0",
            },
          })
        );
      }
      return Promise.reject(new Error("File not found"));
    });

    await doctor();

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("✅ Biome configuration:")
    );
  });

  it("should warn when package.json cannot be parsed", async () => {
    // Mock Biome installation check
    vi.mocked(spawnSync).mockReturnValue({
      status: 0,
      stdout: "Version: 2.2.2",
      stderr: "",
      pid: 1234,
      output: ["", "Version: 2.2.2", ""],
      signal: null,
    });

    // Mock file existence
    vi.mocked(existsSync).mockImplementation((path) => {
      const pathStr = path.toString();
      if (pathStr.includes("biome.json")) {
        return true;
      }
      if (pathStr.includes("package.json")) {
        return true;
      }
      return false;
    });

    // Mock file reading - invalid JSON for package.json
    vi.mocked(readFile).mockImplementation((path) => {
      const pathStr = path.toString();
      if (pathStr.includes("biome.json")) {
        return Promise.resolve(
          JSON.stringify({
            extends: ["ultracite"],
          })
        );
      }
      if (pathStr.includes("package.json")) {
        return Promise.resolve("{ invalid json }");
      }
      return Promise.reject(new Error("File not found"));
    });

    await doctor();

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("⚠️ Ultracite dependency:")
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("Could not parse package.json")
    );
  });

  it("should display correct summary counts", async () => {
    // Mock mixed results
    vi.mocked(spawnSync).mockReturnValue({
      status: 0,
      stdout: "Version: 2.2.2",
      stderr: "",
      pid: 1234,
      output: ["", "Version: 2.2.2", ""],
      signal: null,
    });

    vi.mocked(existsSync).mockImplementation((path) => {
      const pathStr = path.toString();
      if (pathStr.includes("biome.json")) {
        return true;
      }
      if (pathStr.includes("package.json")) {
        return true;
      }
      if (pathStr.includes(".prettierrc")) {
        return true; // Will cause a warning
      }
      return false;
    });

    vi.mocked(readFile).mockImplementation((path) => {
      const pathStr = path.toString();
      if (pathStr.includes("biome.json")) {
        return Promise.resolve(
          JSON.stringify({
            extends: ["ultracite"],
          })
        );
      }
      if (pathStr.includes("package.json")) {
        return Promise.resolve(
          JSON.stringify({
            devDependencies: {}, // No ultracite - will cause a warning
          })
        );
      }
      return Promise.reject(new Error("File not found"));
    });

    await doctor();

    // Check summary output
    expect(consoleLogSpy).toHaveBeenCalledWith("\n📊 Summary:");
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringMatching(PASSED_SUMMARY_REGEX)
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("💡 Some optional improvements available")
    );
  });
});
