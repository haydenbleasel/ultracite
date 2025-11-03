import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { readFile, writeFile } from 'node:fs/promises';
import { lintStaged } from '../src/integrations/lint-staged';

mock.module('node:fs/promises', () => ({
  access: mock(() => Promise.reject(new Error('ENOENT'))),
  readFile: mock(() => Promise.resolve('{}')),
  writeFile: mock(() => Promise.resolve()),
}));

mock.module('nypm', () => ({
  addDevDependency: mock(() => Promise.resolve()),
  dlxCommand: mock(() => 'npx ultracite fix'),
  detectPackageManager: mock(() => Promise.resolve({ name: 'npm' })),
  removeDependency: mock(() => Promise.resolve()),
}));

describe('lintStaged', () => {
  beforeEach(() => {
    mock.restore();
  });

  describe('exists', () => {
    test('returns true when .lintstagedrc.json exists', async () => {
      mock.module('node:fs/promises', () => ({
        access: mock((path: string) => {
          if (path === './.lintstagedrc.json') {
            return Promise.resolve();
          }
          return Promise.reject(new Error('ENOENT'));
        }),
        readFile: mock(() => Promise.resolve('{}')),
        writeFile: mock(() => Promise.resolve()),
      }));

      const result = await lintStaged.exists();
      expect(result).toBe(true);
    });

    test('returns true when package.json has lint-staged config', async () => {
      mock.module('node:fs/promises', () => ({
        access: mock((path: string) => {
          if (path === './package.json') {
            return Promise.resolve();
          }
          return Promise.reject(new Error('ENOENT'));
        }),
        readFile: mock(() => Promise.resolve('{"lint-staged": {}}')),
        writeFile: mock(() => Promise.resolve()),
      }));

      const result = await lintStaged.exists();
      expect(result).toBe(true);
    });

    test('returns false when no lint-staged config exists', async () => {
      mock.module('node:fs/promises', () => ({
        access: mock(() => Promise.reject(new Error('ENOENT'))),
        readFile: mock(() => Promise.resolve('{}')),
        writeFile: mock(() => Promise.resolve()),
      }));

      const result = await lintStaged.exists();
      expect(result).toBe(false);
    });
  });

  describe('install', () => {
    test('installs lint-staged dependency', async () => {
      const mockAddDep = mock(() => Promise.resolve());
      mock.module('nypm', () => ({
        addDevDependency: mockAddDep,
        dlxCommand: mock(() => 'npx ultracite fix'),
        detectPackageManager: mock(() => Promise.resolve({ name: 'npm' })),
        removeDependency: mock(() => Promise.resolve()),
      }));

      await lintStaged.install('npm');

      expect(mockAddDep).toHaveBeenCalledWith('lint-staged', expect.any(Object));
    });
  });

  describe('create', () => {
    test('creates .lintstagedrc.json with correct content', async () => {
      const mockWriteFile = mock(() => Promise.resolve());
      mock.module('node:fs/promises', () => ({
        access: mock(() => Promise.reject(new Error('ENOENT'))),
        readFile: mock(() => Promise.resolve('{}')),
        writeFile: mockWriteFile,
      }));

      await lintStaged.create('npm');

      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = mockWriteFile.mock.calls[0];
      expect(writeCall[0]).toBe('.lintstagedrc.json');
      const writtenContent = JSON.parse(writeCall[1] as string);
      // Check for the actual key pattern that lint-staged uses
      const keys = Object.keys(writtenContent);
      expect(keys.length).toBeGreaterThan(0);
      expect(keys[0]).toContain('js');
    });
  });

  describe('update', () => {
    test('updates package.json lint-staged config', async () => {
      const mockWriteFile = mock(() => Promise.resolve());
      mock.module('node:fs/promises', () => ({
        access: mock((path: string) => {
          if (path === './package.json') {
            return Promise.resolve();
          }
          return Promise.reject(new Error('ENOENT'));
        }),
        readFile: mock(() => Promise.resolve('{"name": "test", "lint-staged": {"*.js": ["echo test"]}}')),
        writeFile: mockWriteFile,
      }));

      await lintStaged.update('npm');

      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = mockWriteFile.mock.calls[0];
      const writtenContent = JSON.parse(writeCall[1] as string);
      // Verify lint-staged section exists and has been updated
      expect(writtenContent['lint-staged']).toBeDefined();
      expect(Object.keys(writtenContent['lint-staged']).length).toBeGreaterThan(0);
    });

    test('updates JSON config file', async () => {
      const mockWriteFile = mock(() => Promise.resolve());
      mock.module('node:fs/promises', () => ({
        access: mock((path: string) => {
          if (path === './.lintstagedrc.json') {
            return Promise.resolve();
          }
          return Promise.reject(new Error('ENOENT'));
        }),
        readFile: mock(() => Promise.resolve('{"*.js": ["echo test"]}')),
        writeFile: mockWriteFile,
      }));

      await lintStaged.update('npm');

      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = mockWriteFile.mock.calls[0];
      const writtenContent = JSON.parse(writeCall[1] as string);
      // Verify config has been updated with new patterns
      const keys = Object.keys(writtenContent);
      expect(keys.length).toBeGreaterThan(0);
    });

    test('creates fallback config when no config file exists', async () => {
      const mockWriteFile = mock(() => Promise.resolve());
      mock.module('node:fs/promises', () => ({
        access: mock(() => Promise.reject(new Error('ENOENT'))),
        readFile: mock(() => Promise.resolve('{}')),
        writeFile: mockWriteFile,
      }));

      await lintStaged.update('npm');

      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = mockWriteFile.mock.calls[0];
      expect(writeCall[0]).toBe('.lintstagedrc.json');
    });
  });
});
