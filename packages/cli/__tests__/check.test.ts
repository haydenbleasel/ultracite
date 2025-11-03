import { beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import process from 'node:process';
import { check } from '../src/commands/check';

mock.module('node:child_process', () => ({
  spawnSync: mock(() => ({ status: 0 })),
  execSync: mock(() => ''),
}));

describe('check', () => {
  beforeEach(() => {
    mock.restore();
  });

  test('runs biome check with default options', () => {
    const mockSpawn = mock(() => ({ status: 0 }));
    mock.module('node:child_process', () => ({
      spawnSync: mockSpawn,
      execSync: mock(() => ''),
    }));

    check(undefined);

    expect(mockSpawn).toHaveBeenCalled();
    const callArgs = mockSpawn.mock.calls[0];
    expect(callArgs[0]).toContain('npx @biomejs/biome check');
    expect(callArgs[0]).toContain('--no-errors-on-unmatched');
    expect(callArgs[0]).toContain('./');
  });

  test('runs biome check with specific files', () => {
    const mockSpawn = mock(() => ({ status: 0 }));
    mock.module('node:child_process', () => ({
      spawnSync: mockSpawn,
      execSync: mock(() => ''),
    }));

    check([['src/index.ts', 'src/test.ts'], {}]);

    expect(mockSpawn).toHaveBeenCalled();
    const callArgs = mockSpawn.mock.calls[0];
    expect(callArgs[0]).toContain('src/index.ts');
    expect(callArgs[0]).toContain('src/test.ts');
  });

  test('runs biome check with diagnostic-level option', () => {
    const mockSpawn = mock(() => ({ status: 0 }));
    mock.module('node:child_process', () => ({
      spawnSync: mockSpawn,
      execSync: mock(() => ''),
    }));

    check([[], { 'diagnostic-level': 'error' }]);

    expect(mockSpawn).toHaveBeenCalled();
    const callArgs = mockSpawn.mock.calls[0];
    expect(callArgs[0]).toContain('--diagnostic-level=error');
  });

  test('handles files with special characters', () => {
    const mockSpawn = mock(() => ({ status: 0 }));
    mock.module('node:child_process', () => ({
      spawnSync: mockSpawn,
      execSync: mock(() => ''),
    }));

    check([['src/my file.ts'], {}]);

    expect(mockSpawn).toHaveBeenCalled();
    const callArgs = mockSpawn.mock.calls[0];
    expect(callArgs[0]).toContain("'src/my file.ts'");
  });

  test('exits with error code when biome check fails', () => {
    const mockSpawn = mock(() => ({ status: 1 }));
    const mockExit = spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    mock.module('node:child_process', () => ({
      spawnSync: mockSpawn,
      execSync: mock(() => ''),
    }));

    expect(() => check(undefined)).toThrow('process.exit called');
    expect(mockExit).toHaveBeenCalledWith(1);

    mockExit.mockRestore();
  });

  test('exits when spawn returns error', () => {
    const consoleErrorSpy = spyOn(console, 'error').mockImplementation(() => {});
    const mockSpawn = mock(() => ({ error: new Error('spawn failed'), status: null }));
    const mockExit = spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    mock.module('node:child_process', () => ({
      spawnSync: mockSpawn,
      execSync: mock(() => ''),
    }));

    expect(() => check(undefined)).toThrow('process.exit called');
    expect(mockExit).toHaveBeenCalledWith(1);

    mockExit.mockRestore();
    consoleErrorSpy.mockRestore();
  });
});
