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

    test('handles YAML config files', async () => {
      const mockWriteFile = mock(() => Promise.resolve());
      mock.module('node:fs/promises', () => ({
        access: mock((path: string) => {
          if (path === './.lintstagedrc.yaml') {
            return Promise.resolve();
          }
          return Promise.reject(new Error('ENOENT'));
        }),
        readFile: mock(() => Promise.resolve('*.js:\n  - eslint --fix')),
        writeFile: mockWriteFile,
      }));

      await lintStaged.update('npm');

      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = mockWriteFile.mock.calls[0];
      // YAML format should be written
      expect(typeof writeCall[1]).toBe('string');
      expect(writeCall[1]).toContain('*.js');
    });

    test('handles .lintstagedrc file (JSON without extension)', async () => {
      const mockWriteFile = mock(() => Promise.resolve());
      mock.module('node:fs/promises', () => ({
        access: mock((path: string) => {
          if (path === './.lintstagedrc') {
            return Promise.resolve();
          }
          return Promise.reject(new Error('ENOENT'));
        }),
        readFile: mock(() => Promise.resolve('{"*.js": ["eslint"]}')),
        writeFile: mockWriteFile,
      }));

      await lintStaged.update('npm');

      expect(mockWriteFile).toHaveBeenCalled();
    });

    test('handles ESM config files (.mjs)', async () => {
      const mockWriteFile = mock(() => Promise.resolve());
      mock.module('node:fs/promises', () => ({
        access: mock((path: string) => {
          if (path === './lint-staged.config.mjs') {
            return Promise.resolve();
          }
          if (path === './package.json') {
            return Promise.resolve();
          }
          return Promise.reject(new Error('ENOENT'));
        }),
        readFile: mock((path: string) => {
          if (path === './package.json') {
            return Promise.resolve('{"type": "module"}');
          }
          return Promise.resolve('{}');
        }),
        writeFile: mockWriteFile,
      }));

      // This will try to import the .mjs file, which will fail
      // It should fall back to creating a .lintstagedrc.json
      await lintStaged.update('npm');

      expect(mockWriteFile).toHaveBeenCalled();
    });

    test('handles CommonJS config files (.cjs)', async () => {
      const mockWriteFile = mock(() => Promise.resolve());
      mock.module('node:fs/promises', () => ({
        access: mock((path: string) => {
          if (path === './lint-staged.config.cjs') {
            return Promise.resolve();
          }
          return Promise.reject(new Error('ENOENT'));
        }),
        readFile: mock(() => Promise.resolve('{}')),
        writeFile: mockWriteFile,
      }));

      // This will try to require the .cjs file, which will fail
      // It should fall back to creating a .lintstagedrc.json
      await lintStaged.update('npm');

      expect(mockWriteFile).toHaveBeenCalled();
    });

    test('handles .js files in ESM projects', async () => {
      const mockWriteFile = mock(() => Promise.resolve());
      mock.module('node:fs/promises', () => ({
        access: mock((path: string) => {
          if (path === './lint-staged.config.js') {
            return Promise.resolve();
          }
          if (path === './package.json') {
            return Promise.resolve();
          }
          return Promise.reject(new Error('ENOENT'));
        }),
        readFile: mock((path: string) => {
          if (path === './package.json') {
            return Promise.resolve('{"type": "module"}');
          }
          return Promise.resolve('{}');
        }),
        writeFile: mockWriteFile,
      }));

      await lintStaged.update('npm');

      expect(mockWriteFile).toHaveBeenCalled();
    });

    test('handles .js files in CommonJS projects', async () => {
      const mockWriteFile = mock(() => Promise.resolve());
      mock.module('node:fs/promises', () => ({
        access: mock((path: string) => {
          if (path === './.lintstagedrc.js') {
            return Promise.resolve();
          }
          return Promise.reject(new Error('ENOENT'));
        }),
        readFile: mock(() => Promise.resolve('{}')),
        writeFile: mockWriteFile,
      }));

      await lintStaged.update('npm');

      expect(mockWriteFile).toHaveBeenCalled();
    });

    test('handles YAML with inline arrays', async () => {
      const mockWriteFile = mock(() => Promise.resolve());
      mock.module('node:fs/promises', () => ({
        access: mock((path: string) => {
          if (path === './.lintstagedrc.yaml') {
            return Promise.resolve();
          }
          return Promise.reject(new Error('ENOENT'));
        }),
        readFile: mock(() => Promise.resolve('*.js: [eslint, prettier]')),
        writeFile: mockWriteFile,
      }));

      await lintStaged.update('npm');

      expect(mockWriteFile).toHaveBeenCalled();
    });

    test('handles YAML with string values', async () => {
      const mockWriteFile = mock(() => Promise.resolve());
      mock.module('node:fs/promises', () => ({
        access: mock((path: string) => {
          if (path === './.lintstagedrc.yml') {
            return Promise.resolve();
          }
          return Promise.reject(new Error('ENOENT'));
        }),
        readFile: mock(() => Promise.resolve('*.js: eslint --fix')),
        writeFile: mockWriteFile,
      }));

      await lintStaged.update('npm');

      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = mockWriteFile.mock.calls[0];
      expect(typeof writeCall[1]).toBe('string');
    });

    test('handles invalid JSON in .lintstagedrc', async () => {
      const mockWriteFile = mock(() => Promise.resolve());
      mock.module('node:fs/promises', () => ({
        access: mock((path: string) => {
          if (path === './.lintstagedrc') {
            return Promise.resolve();
          }
          return Promise.reject(new Error('ENOENT'));
        }),
        readFile: mock(() => Promise.resolve('invalid json {')),
        writeFile: mockWriteFile,
      }));

      await lintStaged.update('npm');

      // Should create fallback config when JSON is invalid
      expect(mockWriteFile).toHaveBeenCalled();
    });

    test('handles invalid YAML in .lintstagedrc.yaml', async () => {
      const mockWriteFile = mock(() => Promise.resolve());
      mock.module('node:fs/promises', () => ({
        access: mock((path: string) => {
          if (path === './.lintstagedrc.yaml') {
            return Promise.resolve();
          }
          return Promise.reject(new Error('ENOENT'));
        }),
        readFile: mock(() => Promise.resolve('invalid:\n  yaml:\n    - - -')),
        writeFile: mockWriteFile,
      }));

      await lintStaged.update('npm');

      // Should create fallback config when YAML is invalid
      expect(mockWriteFile).toHaveBeenCalled();
    });

    test('handles package.json without lint-staged key', async () => {
      const mockWriteFile = mock(() => Promise.resolve());
      mock.module('node:fs/promises', () => ({
        access: mock((path: string) => {
          if (path === './package.json') {
            return Promise.resolve();
          }
          return Promise.reject(new Error('ENOENT'));
        }),
        readFile: mock(() => Promise.resolve('{"name": "test", "version": "1.0.0"}')),
        writeFile: mockWriteFile,
      }));

      await lintStaged.update('npm');

      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = mockWriteFile.mock.calls[0];
      const writtenContent = JSON.parse(writeCall[1] as string);
      expect(writtenContent['lint-staged']).toBeDefined();
    });

    test('handles package.json type module for ESM detection', async () => {
      const mockWriteFile = mock(() => Promise.resolve());
      mock.module('node:fs/promises', () => ({
        access: mock((path: string) => {
          if (path === './package.json') {
            return Promise.resolve();
          }
          return Promise.reject(new Error('ENOENT'));
        }),
        readFile: mock((path: string) => {
          if (path === './package.json') {
            return Promise.resolve('{"name": "test", "type": "module"}');
          }
          return Promise.resolve('{}');
        }),
        writeFile: mockWriteFile,
      }));

      await lintStaged.update('npm');

      expect(mockWriteFile).toHaveBeenCalled();
    });
  });
});
