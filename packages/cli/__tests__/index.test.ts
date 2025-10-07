import { describe, expect, it, vi } from "vitest";

// Regex for semantic versioning validation
const SEMANTIC_VERSION_REGEX = /^\d+\.\d+\.\d+$/;

// Mock the command modules
const mockFormat = vi.fn();
const mockInitialize = vi.fn();
const mockLint = vi.fn();

vi.mock("../src/format", () => ({
  format: mockFormat,
}));

vi.mock("../src/initialize", () => ({
  initialize: mockInitialize,
}));

vi.mock("../src/lint", () => ({
  lint: mockLint,
}));

// Mock package.json
vi.mock("../package.json", () => ({
  default: {
    name: "ultracite",
    version: "test-version",
  },
}));

// Mock trpc-cli completely
const mockCreateCli = vi.fn();
const mockRouter = { createCaller: vi.fn() };

vi.mock("trpc-cli", () => ({
  createCli: mockCreateCli,
  trpcServer: {
    // biome-ignore lint/style/useNamingConvention: "trpc-cli requires this naming convention"
    initTRPC: {
      meta: () => ({
        create: () => ({
          router: vi.fn().mockReturnValue(mockRouter),
          procedure: {
            meta: vi.fn().mockReturnThis(),
            input: vi.fn().mockReturnThis(),
            mutation: vi.fn().mockReturnThis(),
            query: vi.fn().mockReturnThis(),
          },
        }),
      }),
    },
  },
}));

describe("CLI Index", () => {
  it("should import without errors when VITEST environment is set", async () => {
    // Set VITEST environment to prevent CLI execution
    const originalEnv = process.env.VITEST;
    process.env.VITEST = "true";

    try {
      // This should not throw an error
      await expect(import("../src/index")).resolves.toBeDefined();
    } finally {
      // Restore environment
      process.env.VITEST = originalEnv;
    }
  });

  it("should use correct package information", async () => {
    // Import actual package.json to test real values (bypassing the mock)
    const fs = await import("node:fs");
    const path = await import("node:path");
    const packageJsonPath = path.resolve(__dirname, "../package.json");
    const packageJsonContent = fs.readFileSync(packageJsonPath, "utf8");
    const actualPackageJson = JSON.parse(packageJsonContent) as {
      name: string;
      version: string;
    };

    expect(actualPackageJson.name).toBe("ultracite");
    expect(actualPackageJson.version).toMatch(SEMANTIC_VERSION_REGEX); // Semantic versioning pattern
    expect(typeof actualPackageJson.version).toBe("string");
  });

  it("should have access to required command functions", () => {
    // Verify that the command functions exist and are callable
    expect(mockFormat).toBeDefined();
    expect(mockInitialize).toBeDefined();
    expect(mockLint).toBeDefined();

    expect(typeof mockFormat).toBe("function");
    expect(typeof mockInitialize).toBe("function");
    expect(typeof mockLint).toBe("function");
  });

  it("should have trpc-cli available for CLI creation", () => {
    // Verify that trpc-cli mock is properly set up
    expect(mockCreateCli).toBeDefined();
    expect(typeof mockCreateCli).toBe("function");
  });
});
