import { spawnSync } from 'node:child_process';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { format } from '../scripts/commands/format';

vi.mock('node:child_process');

describe('format command', () => {
  const mockSpawnSync = vi.mocked(spawnSync);
  const mockProcessExit = vi.mocked(process.exit);

  beforeEach(() => {
    vi.clearAllMocks();
    mockSpawnSync.mockReturnValue({
      status: 0,
      signal: null,
      output: [],
      pid: 123,
      stdout: Buffer.from(''),
      stderr: Buffer.from(''),
    } as any);
  });

  it('should run biome check with --write flag for all files when no files specified', () => {
    format([], { unsafe: false });

    expect(mockSpawnSync).toHaveBeenCalledWith(
      'npx @biomejs/biome check --write ./',
      {
        stdio: 'inherit',
        shell: true,
      }
    );
  });

  it('should run biome check with --write flag for specific files when files are provided', () => {
    const files = ['src/index.ts', 'src/utils.ts'];
    format(files, { unsafe: false });

    expect(mockSpawnSync).toHaveBeenCalledWith(
      'npx @biomejs/biome check --write src/index.ts src/utils.ts',
      { stdio: 'inherit', shell: true }
    );
  });

  it('should handle single file', () => {
    const files = ['src/index.ts'];
    format(files, { unsafe: false });

    expect(mockSpawnSync).toHaveBeenCalledWith(
      'npx @biomejs/biome check --write src/index.ts',
      { stdio: 'inherit', shell: true }
    );
  });

  it('should handle unsafe flag when enabled', () => {
    const files = ['src/index.ts'];
    format(files, { unsafe: true });

    expect(mockSpawnSync).toHaveBeenCalledWith(
      'npx @biomejs/biome check --write --unsafe src/index.ts',
      { stdio: 'inherit', shell: true }
    );
  });

  it('should handle files with special characters by quoting them', () => {
    const files = [
      '/Users/dev/[locale]/[params]/(signedin)/@modal/(.)tickets/[ticketId]/page.tsx',
      'src/components/Button.tsx',
    ];
    format(files, { unsafe: false });

    expect(mockSpawnSync).toHaveBeenCalledWith(
      "npx @biomejs/biome check --write '/Users/dev/[locale]/[params]/(signedin)/@modal/(.)tickets/[ticketId]/page.tsx'  src/components/Button.tsx",
      { stdio: 'inherit', shell: true }
    );
  });

  it('should handle files with dollar signs by quoting them', () => {
    const files = ['$HOME/file.ts', 'file with spaces.ts'];
    format(files, { unsafe: false });

    expect(mockSpawnSync).toHaveBeenCalledWith(
      "npx @biomejs/biome check --write '$HOME/file.ts'  'file with spaces.ts' ",
      { stdio: 'inherit', shell: true }
    );
  });

  it('should handle files with single quotes by escaping them', () => {
    const files = ["file'with'quotes.ts", 'normal.ts'];
    format(files, { unsafe: false });

    expect(mockSpawnSync).toHaveBeenCalledWith(
      "npx @biomejs/biome check --write 'file'\\''with'\\''quotes.ts'  normal.ts",
      { stdio: 'inherit', shell: true }
    );
  });

  it('should handle errors and exit with code 1', () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {
        // Mock implementation
      });
    const error = new Error('Biome failed');
    mockSpawnSync.mockReturnValue({
      status: null,
      signal: null,
      output: [],
      pid: 123,
      stdout: Buffer.from(''),
      stderr: Buffer.from(''),
      error,
    } as any);

    format([], { unsafe: false });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to run Ultracite:',
      'Biome failed'
    );
    expect(mockProcessExit).toHaveBeenCalledWith(1);

    consoleErrorSpy.mockRestore();
  });

  it('should handle non-zero exit status', () => {
    mockSpawnSync.mockReturnValue({
      status: 2,
      signal: null,
      output: [],
      pid: 123,
      stdout: Buffer.from(''),
      stderr: Buffer.from(''),
    } as any);

    format([], { unsafe: false });

    expect(mockProcessExit).toHaveBeenCalledWith(2);
  });
});