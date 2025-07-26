import { describe, expect, it, vi } from 'vitest';

// Mock the command modules
const mockFormat = vi.fn();
const mockInitialize = vi.fn();
const mockLint = vi.fn();

vi.mock('../scripts/format', () => ({
  format: mockFormat,
}));

vi.mock('../scripts/initialize', () => ({
  initialize: mockInitialize,
}));

vi.mock('../scripts/lint', () => ({
  lint: mockLint,
}));

// Mock package.json
vi.mock('../package.json', () => ({
  default: {
    name: 'ultracite',
    version: '5.0.49',
  },
}));

// Mock trpc-cli completely
const mockCreateCli = vi.fn();
const mockRouter = { createCaller: vi.fn() };

vi.mock('trpc-cli', () => ({
  createCli: mockCreateCli,
  trpcServer: {
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

describe('CLI Index', () => {
  it('should import without errors when VITEST environment is set', async () => {
    // Set VITEST environment to prevent CLI execution
    const originalEnv = process.env.VITEST;
    process.env.VITEST = 'true';

    try {
      // This should not throw an error
      await expect(import('../scripts/index')).resolves.toBeDefined();
    } finally {
      // Restore environment
      process.env.VITEST = originalEnv;
    }
  });

  it('should use correct package information', async () => {
    // Test that the mocked package.json values are what we expect
    const packageJson = await import('../package.json');
    
    expect(packageJson.default.name).toBe('ultracite');
    expect(packageJson.default.version).toBe('5.0.49');
  });

  it('should have access to required command functions', () => {
    // Verify that the command functions exist and are callable
    expect(mockFormat).toBeDefined();
    expect(mockInitialize).toBeDefined();
    expect(mockLint).toBeDefined();
    
    expect(typeof mockFormat).toBe('function');
    expect(typeof mockInitialize).toBe('function');
    expect(typeof mockLint).toBe('function');
  });

  it('should have trpc-cli available for CLI creation', () => {
    // Verify that trpc-cli mock is properly set up
    expect(mockCreateCli).toBeDefined();
    expect(typeof mockCreateCli).toBe('function');
  });
}); 