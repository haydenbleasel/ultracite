import { beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import process from 'node:process';
import { doctor } from '../src/commands/doctor';

mock.module('node:child_process', () => ({
  spawnSync: mock(() => ({ status: 0, stdout: 'v1.0.0' })),
  execSync: mock(() => ''),
}));

mock.module('node:fs', () => ({
  existsSync: mock(() => false),
}));

mock.module('node:fs/promises', () => ({
  access: mock(() => Promise.resolve()),
  readFile: mock(() => Promise.resolve('{}')),
  writeFile: mock(() => Promise.resolve()),
}));

describe('doctor', () => {
  beforeEach(() => {
    mock.restore();
  });

  test('passes when everything is configured correctly', async () => {
    const consoleLogSpy = spyOn(console, 'log').mockImplementation(() => {});

    mock.module('node:child_process', () => ({
      spawnSync: mock(() => ({ status: 0, stdout: '1.0.0' })),
      execSync: mock(() => ''),
    }));

    mock.module('node:fs', () => ({
      existsSync: mock((path: string) => {
        const pathStr = String(path);
        return pathStr.includes('biome.json') || pathStr.includes('package.json');
      }),
    }));

    mock.module('node:fs/promises', () => ({
      access: mock(() => Promise.resolve()),
      readFile: mock((path: string) => {
        const pathStr = String(path);
        if (pathStr.includes('biome.json')) {
          return Promise.resolve('{"extends": ["ultracite/core"]}');
        }
        if (pathStr.includes('package.json')) {
          return Promise.resolve('{"devDependencies": {"ultracite": "1.0.0"}}');
        }
        return Promise.resolve('{}');
      }),
      writeFile: mock(() => Promise.resolve()),
    }));

    await doctor();

    // Doctor should complete without calling process.exit if successful
    consoleLogSpy.mockRestore();
  });

  test('fails when Biome is not installed', async () => {
    const mockExit = spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    mock.module('node:child_process', () => ({
      spawnSync: mock(() => ({ status: 1, stdout: '' })),
      execSync: mock(() => ''),
    }));

    mock.module('node:fs', () => ({
      existsSync: mock(() => false),
    }));

    mock.module('node:fs/promises', () => ({
      access: mock(() => Promise.resolve()),
      readFile: mock(() => Promise.resolve('{}')),
      writeFile: mock(() => Promise.resolve()),
    }));

    expect(async () => await doctor()).toThrow('process.exit called');
    expect(mockExit).toHaveBeenCalledWith(1);

    mockExit.mockRestore();
  });

  test('warns when conflicting tools are present', async () => {
    const consoleLogSpy = spyOn(console, 'log').mockImplementation(() => {});

    mock.module('node:child_process', () => ({
      spawnSync: mock(() => ({ status: 0, stdout: '1.0.0' })),
      execSync: mock(() => ''),
    }));

    mock.module('node:fs', () => ({
      existsSync: mock((path: string) => {
        const pathStr = String(path);
        return pathStr.includes('.prettierrc') || pathStr.includes('biome.json') || pathStr.includes('package.json');
      }),
    }));

    mock.module('node:fs/promises', () => ({
      access: mock(() => Promise.resolve()),
      readFile: mock((path: string) => {
        const pathStr = String(path);
        if (pathStr.includes('biome.json')) {
          return Promise.resolve('{"extends": ["ultracite/core"]}');
        }
        return Promise.resolve('{"devDependencies": {"ultracite": "1.0.0"}}');
      }),
      writeFile: mock(() => Promise.resolve()),
    }));

    await doctor();

    // Doctor should complete without error exit even with warnings
    consoleLogSpy.mockRestore();
  });

  test('fails when biome config is missing', async () => {
    const mockExit = spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    mock.module('node:child_process', () => ({
      spawnSync: mock(() => ({ status: 0, stdout: '1.0.0' })),
      execSync: mock(() => ''),
    }));

    mock.module('node:fs', () => ({
      existsSync: mock(() => false),
    }));

    mock.module('node:fs/promises', () => ({
      access: mock(() => Promise.resolve()),
      readFile: mock(() => Promise.resolve('{}')),
      writeFile: mock(() => Promise.resolve()),
    }));

    expect(async () => await doctor()).toThrow('process.exit called');
    expect(mockExit).toHaveBeenCalledWith(1);

    mockExit.mockRestore();
  });
});
