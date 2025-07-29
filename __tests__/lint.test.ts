import { execSync } from 'node:child_process';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { lint } from '../scripts/commands/lint';

vi.mock('node:child_process');

describe('lint command', () => {
  const mockExecSync = vi.mocked(execSync);
  const mockProcessExit = vi.mocked(process.exit);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should run biome check without --write flag for all files when no files specified', () => {
    lint([]);

    expect(mockExecSync).toHaveBeenCalledWith('npx @biomejs/biome check ./', {
      stdio: 'inherit',
    });
  });

  it('should run biome check without --write flag for specific files when files are provided', () => {
    const files = ['src/index.ts', 'src/utils.ts'];
    lint(files);

    expect(mockExecSync).toHaveBeenCalledWith(
      'npx @biomejs/biome check "src/index.ts" "src/utils.ts"',
      { stdio: 'inherit' }
    );
  });

  it('should handle single file', () => {
    const files = ['src/index.ts'];
    lint(files);

    expect(mockExecSync).toHaveBeenCalledWith(
      'npx @biomejs/biome check "src/index.ts"',
      {
        stdio: 'inherit',
      }
    );
  });

  it('should handle files with special characters by quoting them', () => {
    const files = [
      '/Users/dev/[locale]/[params]/(signedin)/@modal/(.)tickets/[ticketId]/page.tsx',
      'src/components/Button.tsx',
    ];
    lint(files);

    expect(mockExecSync).toHaveBeenCalledWith(
      'npx @biomejs/biome check "/Users/dev/[locale]/[params]/(signedin)/@modal/(.)tickets/[ticketId]/page.tsx" "src/components/Button.tsx"',
      { stdio: 'inherit' }
    );
  });

  it('should handle errors and exit with code 1', () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {
        // Mock implementation
      });
    const error = new Error('Biome failed');
    mockExecSync.mockImplementation(() => {
      throw error;
    });

    lint([]);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to run Ultracite:',
      'Biome failed'
    );
    expect(mockProcessExit).toHaveBeenCalledWith(1);

    consoleErrorSpy.mockRestore();
  });

  it('should handle non-Error exceptions', () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {
        // Mock implementation
      });
    mockExecSync.mockImplementation(() => {
      throw new Error('String error');
    });

    lint([]);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to run Ultracite:',
      'String error'
    );
    expect(mockProcessExit).toHaveBeenCalledWith(1);

    consoleErrorSpy.mockRestore();
  });
});
