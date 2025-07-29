import { execSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { parse } from 'jsonc-parser';
import type { PackageManagerName } from 'nypm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { lintStaged } from '../scripts/lint-staged';
import { exists } from '../scripts/utils';

vi.mock('node:child_process');
vi.mock('node:fs/promises');
vi.mock('../scripts/utils', () => ({
  exists: vi.fn(),
}));

describe('lint-staged configuration', () => {
  const mockExecSync = vi.mocked(execSync);
  const mockReadFile = vi.mocked(readFile);
  const mockWriteFile = vi.mocked(writeFile);
  const mockExists = vi.mocked(exists);

  const defaultConfig = {
    '*.{js,jsx,ts,tsx,json,jsonc,css,scss,md,mdx}': ['npx ultracite format'],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('exists', () => {
    it('should return true when package.json exists', async () => {
      mockExists.mockResolvedValueOnce(true); // package.json

      const result = await lintStaged.exists();

      expect(result).toBe(true);
      expect(mockExists).toHaveBeenCalledWith('./package.json');
    });

    it('should return true when .lintstagedrc.json exists', async () => {
      mockExists
        .mockResolvedValueOnce(false) // package.json
        .mockResolvedValueOnce(true); // .lintstagedrc.json

      const result = await lintStaged.exists();

      expect(result).toBe(true);
      expect(mockExists).toHaveBeenCalledWith('./.lintstagedrc.json');
    });

    it('should return false when no config files exist', async () => {
      mockExists.mockResolvedValue(false); // All files

      const result = await lintStaged.exists();

      expect(result).toBe(false);
    });

    it('should check all config files in order', async () => {
      mockExists.mockResolvedValue(false); // All files

      await lintStaged.exists();

      expect(mockExists).toHaveBeenCalledWith('./package.json');
      expect(mockExists).toHaveBeenCalledWith('./.lintstagedrc.json');
      expect(mockExists).toHaveBeenCalledWith('./.lintstagedrc.js');
      expect(mockExists).toHaveBeenCalledWith('./.lintstagedrc.cjs');
      expect(mockExists).toHaveBeenCalledWith('./.lintstagedrc.mjs');
      expect(mockExists).toHaveBeenCalledWith('./lint-staged.config.js');
      expect(mockExists).toHaveBeenCalledWith('./lint-staged.config.cjs');
      expect(mockExists).toHaveBeenCalledWith('./lint-staged.config.mjs');
      expect(mockExists).toHaveBeenCalledWith('./.lintstagedrc.yaml');
      expect(mockExists).toHaveBeenCalledWith('./.lintstagedrc.yml');
      expect(mockExists).toHaveBeenCalledWith('./.lintstagedrc');
    });
  });

  describe('install', () => {
    it('should install lint-staged as dev dependency', () => {
      const packageManager: PackageManagerName = 'npm';

      lintStaged.install(packageManager);

      expect(mockExecSync).toHaveBeenCalledWith('npm install -D lint-staged');
    });

    it('should work with different package managers', () => {
      const packageManager: PackageManagerName = 'pnpm';

      lintStaged.install(packageManager);

      expect(mockExecSync).toHaveBeenCalledWith('pnpm add -D lint-staged');
    });
  });

  describe('create', () => {
    it('should create .lintstagedrc.json with default configuration', async () => {
      await lintStaged.create();

      expect(mockWriteFile).toHaveBeenCalledWith(
        '.lintstagedrc.json',
        JSON.stringify(defaultConfig, null, 2)
      );
    });
  });

  describe('update', () => {
    it('should update package.json configuration', async () => {
      const existingPackageJson = {
        name: 'test-project',
        version: '1.0.0',
        'lint-staged': {
          '*.js': ['eslint --fix'],
        },
      };

      mockExists.mockResolvedValueOnce(true); // package.json exists

      mockReadFile.mockResolvedValue(JSON.stringify(existingPackageJson));

      await lintStaged.update();

      expect(mockReadFile).toHaveBeenCalledWith('./package.json', 'utf-8');
      // Verify the merged configuration is written
      const writtenContent = mockWriteFile.mock.calls[0][1] as string;
      const parsedContent = parse(writtenContent);

      expect(parsedContent['lint-staged']['*.js']).toEqual(['eslint --fix']);
      expect(
        parsedContent['lint-staged'][
          '*.{js,jsx,ts,tsx,json,jsonc,css,scss,md,mdx}'
        ]
      ).toEqual(['npx ultracite format']);
    });

    it('should update JSON configuration file', async () => {
      const existingConfig = {
        '*.js': ['eslint --fix'],
      };

      mockExists
        .mockResolvedValueOnce(false) // package.json
        .mockResolvedValueOnce(true); // .lintstagedrc.json

      mockReadFile.mockResolvedValue(JSON.stringify(existingConfig));

      await lintStaged.update();

      expect(mockReadFile).toHaveBeenCalledWith(
        './.lintstagedrc.json',
        'utf-8'
      );
      // Verify the merged configuration is written
      const writtenContent = mockWriteFile.mock.calls[0][1] as string;
      const parsedContent = parse(writtenContent);

      expect(parsedContent['*.js']).toEqual(['eslint --fix']);
      expect(
        parsedContent['*.{js,jsx,ts,tsx,json,jsonc,css,scss,md,mdx}']
      ).toEqual(['npx ultracite format']);
    });

    it('should handle YAML configuration file', async () => {
      const yamlContent = `'*.js':
  - 'eslint --fix'
'*.css':
  - 'prettier --write'`;

      mockExists
        .mockResolvedValueOnce(false) // package.json
        .mockResolvedValueOnce(false) // .lintstagedrc.json
        .mockResolvedValueOnce(false) // .lintstagedrc.js
        .mockResolvedValueOnce(false) // .lintstagedrc.cjs
        .mockResolvedValueOnce(false) // .lintstagedrc.mjs
        .mockResolvedValueOnce(false) // lint-staged.config.js
        .mockResolvedValueOnce(false) // lint-staged.config.cjs
        .mockResolvedValueOnce(false) // lint-staged.config.mjs
        .mockResolvedValueOnce(true); // .lintstagedrc.yaml

      mockReadFile.mockResolvedValue(yamlContent);

      await lintStaged.update();

      expect(mockReadFile).toHaveBeenCalledWith(
        './.lintstagedrc.yaml',
        'utf-8'
      );
      // Verify the YAML configuration is written correctly
      const writtenContent = mockWriteFile.mock.calls[0][1] as string;

      expect(writtenContent).toContain('*.js:');
      expect(writtenContent).toContain(
        '*.{js,jsx,ts,tsx,json,jsonc,css,scss,md,mdx}:'
      );
      expect(writtenContent).toContain('npx ultracite format');
    });

    it('should create fallback config when ESM update fails', async () => {
      // Mock project as ESM
      const packageJsonContent = JSON.stringify({ type: 'module' });

      mockExists
        .mockResolvedValueOnce(false) // package.json (for config check)
        .mockResolvedValueOnce(false) // .lintstagedrc.json
        .mockResolvedValueOnce(false) // .lintstagedrc.js
        .mockResolvedValueOnce(false) // .lintstagedrc.cjs
        .mockResolvedValueOnce(true); // .lintstagedrc.mjs

      mockReadFile
        .mockResolvedValueOnce(packageJsonContent) // For ESM check
        .mockRejectedValueOnce(new Error('Import failed')); // ESM config import fails

      await lintStaged.update();

      expect(mockWriteFile).toHaveBeenCalledWith(
        '.lintstagedrc.json',
        JSON.stringify(defaultConfig, null, 2)
      );
    });

    it('should create fallback config when CommonJS update fails', async () => {
      // Mock project as CommonJS
      const packageJsonContent = JSON.stringify({ type: 'commonjs' });

      mockExists
        .mockResolvedValueOnce(false) // package.json (for config check)
        .mockResolvedValueOnce(false) // .lintstagedrc.json
        .mockResolvedValueOnce(true); // .lintstagedrc.js

      mockReadFile.mockResolvedValueOnce(packageJsonContent); // For ESM check

      // Mock require to throw error
      const originalRequire = require;
      vi.doMock('./.lintstagedrc.js', () => {
        throw new Error('Require failed');
      });

      await lintStaged.update();

      expect(mockWriteFile).toHaveBeenCalledWith(
        '.lintstagedrc.json',
        JSON.stringify(defaultConfig, null, 2)
      );

      // Restore require
      global.require = originalRequire;
    });

    it('should create fallback config when no config file exists', async () => {
      mockExists.mockResolvedValue(false); // All files

      // Should not throw, but create fallback config gracefully
      await expect(lintStaged.update()).resolves.not.toThrow();

      // Should create fallback config
      expect(mockWriteFile).toHaveBeenCalledWith(
        '.lintstagedrc.json',
        JSON.stringify(defaultConfig, null, 2)
      );
    });

    it('should handle package.json without existing lint-staged config', async () => {
      const existingPackageJson = {
        name: 'test-project',
        version: '1.0.0',
      };

      mockExists.mockResolvedValueOnce(true); // package.json exists
      mockReadFile.mockResolvedValue(JSON.stringify(existingPackageJson));

      await lintStaged.update();

      // Verify the lint-staged configuration is added
      const writtenContent = mockWriteFile.mock.calls[0][1] as string;
      const parsedContent = parse(writtenContent);

      expect(parsedContent['lint-staged']).toBeDefined();
      expect(
        parsedContent['lint-staged'][
          '*.{js,jsx,ts,tsx,json,jsonc,css,scss,md,mdx}'
        ]
      ).toEqual(['npx ultracite format']);
    });

    it('should create fallback config when no config file exists for update', async () => {
      mockExists.mockResolvedValue(false); // All files don't exist

      // Should not throw, but create fallback config gracefully
      await expect(lintStaged.update()).resolves.not.toThrow();

      // Should create fallback config
      expect(mockWriteFile).toHaveBeenCalledWith(
        '.lintstagedrc.json',
        JSON.stringify(defaultConfig, null, 2)
      );
    });

    it('should handle .lintstagedrc file (no extension)', async () => {
      const existingConfig = {
        '*.js': ['eslint --fix'],
      };

      mockExists
        .mockResolvedValueOnce(false) // package.json
        .mockResolvedValueOnce(false) // .lintstagedrc.json
        .mockResolvedValueOnce(false) // .lintstagedrc.js
        .mockResolvedValueOnce(false) // .lintstagedrc.cjs
        .mockResolvedValueOnce(false) // .lintstagedrc.mjs
        .mockResolvedValueOnce(false) // lint-staged.config.js
        .mockResolvedValueOnce(false) // lint-staged.config.cjs
        .mockResolvedValueOnce(false) // lint-staged.config.mjs
        .mockResolvedValueOnce(false) // .lintstagedrc.yaml
        .mockResolvedValueOnce(false) // .lintstagedrc.yml
        .mockResolvedValueOnce(true); // .lintstagedrc

      mockReadFile.mockResolvedValue(JSON.stringify(existingConfig));

      await lintStaged.update();

      expect(mockReadFile).toHaveBeenCalledWith('./.lintstagedrc', 'utf-8');
    });

    it('should handle processing complex YAML with inline arrays', async () => {
      const yamlContent = `'*.js': ['eslint --fix', 'prettier --write']
'*.css':
  - 'prettier --write'`;

      mockExists
        .mockResolvedValueOnce(false) // package.json
        .mockResolvedValueOnce(false) // .lintstagedrc.json
        .mockResolvedValueOnce(false) // .lintstagedrc.js
        .mockResolvedValueOnce(false) // .lintstagedrc.cjs
        .mockResolvedValueOnce(false) // .lintstagedrc.mjs
        .mockResolvedValueOnce(false) // lint-staged.config.js
        .mockResolvedValueOnce(false) // lint-staged.config.cjs
        .mockResolvedValueOnce(false) // lint-staged.config.mjs
        .mockResolvedValueOnce(true); // .lintstagedrc.yaml

      mockReadFile.mockResolvedValue(yamlContent);

      await lintStaged.update();

      const writtenContent = mockWriteFile.mock.calls[0][1] as string;
      expect(writtenContent).toContain('*.js:');
      expect(writtenContent).toContain(
        '*.{js,jsx,ts,tsx,json,jsonc,css,scss,md,mdx}:'
      );
    });

    it('should handle JSONC files with comments in JSON config', async () => {
      const existingConfigWithComments = `{
  // Lint-staged configuration with comments
  "*.js": [
    /* ESLint and prettier for JS files */
    "eslint --fix"
  ],
  
  // CSS formatting
  "*.css": ["prettier --write"]
}`;

      mockExists
        .mockResolvedValueOnce(false) // package.json
        .mockResolvedValueOnce(true); // .lintstagedrc.json

      mockReadFile.mockResolvedValue(existingConfigWithComments);

      await lintStaged.update();

      expect(mockReadFile).toHaveBeenCalledWith(
        './.lintstagedrc.json',
        'utf-8'
      );

      // Verify the JSONC content was properly parsed and merged
      const writtenContent = mockWriteFile.mock.calls[0][1] as string;
      const parsedContent = parse(writtenContent);

      expect(parsedContent['*.js']).toEqual(['eslint --fix']);
      expect(parsedContent['*.css']).toEqual(['prettier --write']);
      expect(
        parsedContent['*.{js,jsx,ts,tsx,json,jsonc,css,scss,md,mdx}']
      ).toEqual(['npx ultracite format']);
    });

    it('should handle JSONC files with comments in package.json', async () => {
      const existingPackageJsonWithComments = `{
  // Package configuration
  "name": "test-project",
  "version": "1.0.0",
  
  /* Lint-staged configuration */
  "lint-staged": {
    // JavaScript files
    "*.js": ["eslint --fix"]
  }
}`;

      mockExists.mockResolvedValueOnce(true); // package.json exists
      mockReadFile.mockResolvedValue(existingPackageJsonWithComments);

      await lintStaged.update();

      // Verify the JSONC content was properly parsed and merged
      const writtenContent = mockWriteFile.mock.calls[0][1] as string;
      const parsedContent = parse(writtenContent);

      expect(parsedContent.name).toBe('test-project');
      expect(parsedContent.version).toBe('1.0.0');
      expect(parsedContent['lint-staged']).toBeDefined();
      expect(parsedContent['lint-staged']['*.js']).toEqual(['eslint --fix']);
      expect(
        parsedContent['lint-staged'][
          '*.{js,jsx,ts,tsx,json,jsonc,css,scss,md,mdx}'
        ]
      ).toEqual(['npx ultracite format']);
    });
  });
});
