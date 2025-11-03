import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { readFile, writeFile } from 'node:fs/promises';
import { lefthook } from '../src/integrations/lefthook';

mock.module('node:child_process', () => ({
  spawnSync: mock(() => ({ status: 0 })),
  execSync: mock(() => ''),
}));

mock.module('node:fs/promises', () => ({
  access: mock(() => Promise.reject(new Error('ENOENT'))),
  readFile: mock(() => Promise.resolve('')),
  writeFile: mock(() => Promise.resolve()),
}));

mock.module('nypm', () => ({
  addDevDependency: mock(() => Promise.resolve()),
  dlxCommand: mock((pm: string, name: string) => {
    if (name === 'ultracite') {
      return 'npx ultracite fix';
    }
    return `npx ${name} install`;
  }),
  detectPackageManager: mock(() => Promise.resolve({ name: 'npm' })),
  removeDependency: mock(() => Promise.resolve()),
}));

describe('lefthook', () => {
  beforeEach(() => {
    mock.restore();
  });

  describe('exists', () => {
    test('returns true when lefthook.yml exists', async () => {
      mock.module('node:fs/promises', () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve('')),
        writeFile: mock(() => Promise.resolve()),
      }));

      const result = await lefthook.exists();
      expect(result).toBe(true);
    });

    test('returns false when lefthook.yml does not exist', async () => {
      mock.module('node:fs/promises', () => ({
        access: mock(() => Promise.reject(new Error('ENOENT'))),
        readFile: mock(() => Promise.resolve('')),
        writeFile: mock(() => Promise.resolve()),
      }));

      const result = await lefthook.exists();
      expect(result).toBe(false);
    });
  });

  describe('install', () => {
    test('installs lefthook dependency', async () => {
      const mockAddDep = mock(() => Promise.resolve());
      const mockExecSync = mock(() => '');

      mock.module('node:child_process', () => ({
        spawnSync: mock(() => ({ status: 0 })),
        execSync: mockExecSync,
      }));

      mock.module('nypm', () => ({
        addDevDependency: mockAddDep,
        dlxCommand: mock((pm: string, name: string) => {
          if (name === 'lefthook') {
            return 'npx lefthook install';
          }
          return 'npx ultracite fix';
        }),
        detectPackageManager: mock(() => Promise.resolve({ name: 'npm' })),
        removeDependency: mock(() => Promise.resolve()),
      }));

      await lefthook.install('npm');

      expect(mockAddDep).toHaveBeenCalledWith('lefthook', expect.any(Object));
    });

    test('runs lefthook install command', async () => {
      const mockExecSync = mock(() => '');
      mock.module('node:child_process', () => ({
        spawnSync: mock(() => ({ status: 0 })),
        execSync: mockExecSync,
      }));

      mock.module('nypm', () => ({
        addDevDependency: mock(() => Promise.resolve()),
        dlxCommand: mock((pm: string, name: string) => {
          if (name === 'lefthook') {
            return 'npx lefthook install';
          }
          return 'npx ultracite fix';
        }),
        detectPackageManager: mock(() => Promise.resolve({ name: 'npm' })),
        removeDependency: mock(() => Promise.resolve()),
      }));

      await lefthook.install('npm');

      expect(mockExecSync).toHaveBeenCalled();
    });
  });

  describe('create', () => {
    test('creates lefthook.yml with correct content', async () => {
      const mockWriteFile = mock(() => Promise.resolve());
      mock.module('node:fs/promises', () => ({
        access: mock(() => Promise.reject(new Error('ENOENT'))),
        readFile: mock(() => Promise.resolve('')),
        writeFile: mockWriteFile,
      }));

      mock.module('nypm', () => ({
        addDevDependency: mock(() => Promise.resolve()),
        dlxCommand: mock((pm: string, name: string) => {
          if (name === 'ultracite') {
            return 'npx ultracite fix';
          }
          return `npx ${name} install`;
        }),
        detectPackageManager: mock(() => Promise.resolve({ name: 'npm' })),
        removeDependency: mock(() => Promise.resolve()),
      }));

      await lefthook.create('npm');

      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = mockWriteFile.mock.calls[0];
      expect(writeCall[0]).toBe('./lefthook.yml');
      expect(writeCall[1]).toContain('pre-commit:');
      expect(writeCall[1]).toContain('jobs:');
      expect(writeCall[1]).toContain('npx ultracite fix');
    });
  });

  describe('update', () => {
    test('skips update if ultracite command already present', async () => {
      const existingContent = 'pre-commit:\n  jobs:\n    - run: npx ultracite fix';
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module('node:fs/promises', () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve(existingContent)),
        writeFile: mockWriteFile,
      }));

      mock.module('nypm', () => ({
        addDevDependency: mock(() => Promise.resolve()),
        dlxCommand: mock((pm: string, name: string) => {
          if (name === 'ultracite') {
            return 'npx ultracite fix';
          }
          return `npx ${name} install`;
        }),
        detectPackageManager: mock(() => Promise.resolve({ name: 'npm' })),
        removeDependency: mock(() => Promise.resolve()),
      }));

      await lefthook.update('npm');

      expect(mockWriteFile).not.toHaveBeenCalled();
    });

    test('replaces default template with ultracite config', async () => {
      const existingContent = '# EXAMPLE USAGE:\n# pre-commit:\n#   commands:';
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module('node:fs/promises', () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve(existingContent)),
        writeFile: mockWriteFile,
      }));

      mock.module('nypm', () => ({
        addDevDependency: mock(() => Promise.resolve()),
        dlxCommand: mock((pm: string, name: string) => {
          if (name === 'ultracite') {
            return 'npx ultracite fix';
          }
          return `npx ${name} install`;
        }),
        detectPackageManager: mock(() => Promise.resolve({ name: 'npm' })),
        removeDependency: mock(() => Promise.resolve()),
      }));

      await lefthook.update('npm');

      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = mockWriteFile.mock.calls[0];
      expect(writeCall[1]).toContain('pre-commit:');
      expect(writeCall[1]).not.toContain('# EXAMPLE USAGE:');
    });

    test('adds ultracite job to existing jobs section', async () => {
      const existingContent = 'pre-commit:\n  jobs:\n    - run: echo "test"';
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module('node:fs/promises', () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve(existingContent)),
        writeFile: mockWriteFile,
      }));

      mock.module('nypm', () => ({
        addDevDependency: mock(() => Promise.resolve()),
        dlxCommand: mock((pm: string, name: string) => {
          if (name === 'ultracite') {
            return 'npx ultracite fix';
          }
          return `npx ${name} install`;
        }),
        detectPackageManager: mock(() => Promise.resolve({ name: 'npm' })),
        removeDependency: mock(() => Promise.resolve()),
      }));

      await lefthook.update('npm');

      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = mockWriteFile.mock.calls[0];
      expect(writeCall[1]).toContain('npx ultracite fix');
      expect(writeCall[1]).toContain('echo "test"');
    });

    test('adds jobs section to pre-commit without jobs', async () => {
      const existingContent = 'pre-commit:\n  parallel: true';
      const mockWriteFile = mock(() => Promise.resolve());

      mock.module('node:fs/promises', () => ({
        access: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve(existingContent)),
        writeFile: mockWriteFile,
      }));

      mock.module('nypm', () => ({
        addDevDependency: mock(() => Promise.resolve()),
        dlxCommand: mock((pm: string, name: string) => {
          if (name === 'ultracite') {
            return 'npx ultracite fix';
          }
          return `npx ${name} install`;
        }),
        detectPackageManager: mock(() => Promise.resolve({ name: 'npm' })),
        removeDependency: mock(() => Promise.resolve()),
      }));

      await lefthook.update('npm');

      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = mockWriteFile.mock.calls[0];
      expect(writeCall[1]).toContain('jobs:');
      expect(writeCall[1]).toContain('npx ultracite fix');
    });
  });
});
