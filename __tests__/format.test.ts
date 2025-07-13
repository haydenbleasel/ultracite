import { execSync } from 'node:child_process';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { format } from '../scripts/format';

vi.mock('node:child_process');

describe('format command', () => {
  const mockExecSync = vi.mocked(execSync);
  const mockProcessExit = vi.mocked(process.exit);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should run biome check with --write flag for all files when no files specified', () => {
    format([], { unsafe: false });

    expect(mockExecSync).toHaveBeenCalledWith(
      'npx @biomejs/biome check --write ./',
      {
        stdio: 'inherit',
      }
    );
  });

  it('should run biome check with --write flag for specific files when files are provided', () => {
    const files = ['src/index.ts', 'src/utils.ts'];
    format(files, { unsafe: false });

    expect(mockExecSync).toHaveBeenCalledWith(
      'npx @biomejs/biome check --write "src/index.ts" "src/utils.ts"',
      { stdio: 'inherit' }
    );
  });

  it('should handle single file', () => {
    const files = ['src/index.ts'];
    format(files, { unsafe: false });

    expect(mockExecSync).toHaveBeenCalledWith(
      'npx @biomejs/biome check --write "src/index.ts"',
      { stdio: 'inherit' }
    );
  });

  it('should handle unsafe flag when enabled', () => {
    const files = ['src/index.ts'];
    format(files, { unsafe: true });

    expect(mockExecSync).toHaveBeenCalledWith(
      'npx @biomejs/biome check --write --unsafe "src/index.ts"',
      { stdio: 'inherit' }
    );
  });

  it('should handle files with special characters by quoting them', () => {
    const files = [
      '/Users/dev/[locale]/[params]/(signedin)/@modal/(.)tickets/[ticketId]/page.tsx',
      'src/components/Button.tsx',
    ];
    format(files, { unsafe: false });

    expect(mockExecSync).toHaveBeenCalledWith(
      'npx @biomejs/biome check --write "/Users/dev/[locale]/[params]/(signedin)/@modal/(.)tickets/[ticketId]/page.tsx" "src/components/Button.tsx"',
      { stdio: 'inherit' }
    );
  });

  it('should escape dollar signs in file paths to prevent shell interpolation', () => {
    const files = [
      '/Users/epogue/Code/apps/team/app/routes/_app/appointments/$appointmentId.tsx',
      'src/components/$dynamic.tsx',
    ];
    format(files, { unsafe: false });

    expect(mockExecSync).toHaveBeenCalledWith(
      'npx @biomejs/biome check --write "/Users/epogue/Code/apps/team/app/routes/_app/appointments/\\$appointmentId.tsx" "src/components/\\$dynamic.tsx"',
      { stdio: 'inherit' }
    );
  });

  it('should escape other shell special characters in file paths', () => {
    const files = [
      '/path/with"quotes".txt',
      '/path/with`backticks`.txt',
      'C:\\Windows\\file.txt',
    ];
    format(files, { unsafe: false });

    expect(mockExecSync).toHaveBeenCalledWith(
      'npx @biomejs/biome check --write "/path/with\\"quotes\\".txt" "/path/with\\`backticks\\`.txt" "C:\\\\Windows\\\\file.txt"',
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

    format([], { unsafe: false });

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

    format([], { unsafe: false });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to run Ultracite:',
      'String error'
    );
    expect(mockProcessExit).toHaveBeenCalledWith(1);

    consoleErrorSpy.mockRestore();
  });
});
