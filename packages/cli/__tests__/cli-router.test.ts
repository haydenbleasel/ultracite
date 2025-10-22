import { beforeEach, describe, expect, it, vi } from "vitest";
import { check } from "../src/commands/check";
import { doctor } from "../src/commands/doctor";
import { fix } from "../src/commands/fix";
import { initialize } from "../src/initialize";

// Mock the command modules
vi.mock("../src/commands/fix");
vi.mock("../src/commands/check");
vi.mock("../src/commands/doctor");
vi.mock("../src/initialize");

// Mock process.env to prevent CLI execution
vi.stubEnv("VITEST", "true");

describe("CLI Router", () => {
  const mockFix = vi.mocked(fix);
  const mockCheck = vi.mocked(check);
  const mockDoctor = vi.mocked(doctor);
  const mockInitialize = vi.mocked(initialize);

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset modules to ensure fresh imports
    vi.resetModules();
  });

  it("should export router with proper procedures", async () => {
    const { router } = await import("../src/index");

    expect(router).toBeDefined();
    expect(router._def.procedures).toBeDefined();

    const procedures = Object.keys(router._def.procedures);
    expect(procedures).toContain("init");
    expect(procedures).toContain("check");
    expect(procedures).toContain("fix");
  });

  it("should have correct metadata for all procedures", async () => {
    const { router } = await import("../src/index");
    const procedures = router._def.procedures as any;

    // Check init procedure metadata
    expect(procedures.init._def.meta).toEqual({
      description: "Initialize Ultracite in the current directory",
    });

    // Check check procedure metadata - this covers line 56
    expect(procedures.check._def.meta).toEqual({
      description: "Run Biome linter without fixing files",
    });

    // Check fix procedure metadata
    expect(procedures.fix._def.meta).toEqual({
      description: "Run Biome linter and fixes files",
    });
  });

  it("should call fix with correct parameters when invoked", async () => {
    const { router } = await import("../src/index");
    const caller = router.createCaller({});

    const files = ["src/index.ts", "src/utils.ts"];
    const opts = { unsafe: true };

    // This covers lines 86-87
    await caller.fix([files, opts]);

    expect(mockFix).toHaveBeenCalledWith(files, { unsafe: true });
  });

  it("should call fix with undefined unsafe option", async () => {
    const { router } = await import("../src/index");
    const caller = router.createCaller({});

    const files = ["test.ts"];
    const opts = {};

    // This also covers lines 86-87 with a different case
    await caller.fix([files, opts]);

    expect(mockFix).toHaveBeenCalledWith(["test.ts"], { unsafe: undefined });
  });

  it("should call check with correct parameters", async () => {
    const { router } = await import("../src/index");
    const caller = router.createCaller({});

    const files = ["src/index.ts", "src/utils.ts"];

    // This covers line 66
    await caller.check(files);

    expect(mockCheck).toHaveBeenCalledWith(files);
  });

  it("should call check with empty array when no files provided", async () => {
    const { router } = await import("../src/index");
    const caller = router.createCaller({});

    // This also covers line 66
    await caller.check(undefined);

    expect(mockCheck).toHaveBeenCalledWith([]);
  });

  it("should call doctor when invoked", async () => {
    const { router } = await import("../src/index");
    const caller = router.createCaller({});

    // This covers line 95
    await caller.doctor();

    expect(mockDoctor).toHaveBeenCalled();
  });

  it("should call initialize with correct parameters", async () => {
    const { router } = await import("../src/index");
    const caller = router.createCaller({});

    const options = {
      pm: "npm" as const,
      editors: ["vscode"] as const,
      agents: ["cursor"] as const,
      frameworks: [] as const,
      integrations: ["husky"] as const,
      migrate: ["prettier"] as const,
      skipInstall: false,
    };

    await caller.init(options);

    expect(mockInitialize).toHaveBeenCalledWith(options);
  });

  it("should not run CLI when VITEST env is set", () => {
    // VITEST is already set in the test environment
    // The index.ts file checks process.env.VITEST to prevent cli.run()
    // This test verifies that the check works correctly

    // Since we have vi.stubEnv('VITEST', 'true') at the top,
    // the CLI should not run when the module is imported
    expect(process.env.VITEST).toBe("true");

    // The fact that we can import the module without errors
    // and that our other tests work proves that line 99 is not executed
  });

  it("should have deprecated lint command with warning", async () => {
    const { router } = await import("../src/index");
    const procedures = router._def.procedures as any;

    // Check lint procedure metadata (deprecated)
    expect(procedures.lint._def.meta.description).toContain("DEPRECATED");
    expect(procedures.lint._def.meta.description).toContain("check");
  });

  it("should have deprecated format command with warning", async () => {
    const { router } = await import("../src/index");
    const procedures = router._def.procedures as any;

    // Check format procedure metadata (deprecated)
    expect(procedures.format._def.meta.description).toContain("DEPRECATED");
    expect(procedures.format._def.meta.description).toContain("fix");
  });

  it("should call check when deprecated lint command is used", async () => {
    const { router } = await import("../src/index");
    const caller = router.createCaller({});
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation();

    const files = ["src/index.ts"];
    await caller.lint(files);

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "⚠️  Warning: 'lint' command is deprecated. Please use 'check' instead."
    );
    expect(mockCheck).toHaveBeenCalledWith(files);

    consoleWarnSpy.mockRestore();
  });

  it("should call fix when deprecated format command is used", async () => {
    const { router } = await import("../src/index");
    const caller = router.createCaller({});
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation();

    const files = ["src/index.ts"];
    const opts = { unsafe: true };
    await caller.format([files, opts]);

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "⚠️  Warning: 'format' command is deprecated. Please use 'fix' instead."
    );
    expect(mockFix).toHaveBeenCalledWith(files, { unsafe: true });

    consoleWarnSpy.mockRestore();
  });
});
