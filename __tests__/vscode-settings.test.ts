import { readFile, writeFile } from 'node:fs/promises';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exists } from '../scripts/utils';
import { vscode } from '../scripts/vscode-settings';

vi.mock('node:fs/promises');
vi.mock('../scripts/utils', () => ({
  exists: vi.fn(),
}));

describe('vscode configuration', () => {
  const mockReadFile = vi.mocked(readFile);
  const mockWriteFile = vi.mocked(writeFile);
  const mockExists = vi.mocked(exists);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('exists', () => {
    it('should return true when .vscode/settings.json exists', async () => {
      mockExists.mockResolvedValue(true);

      const result = await vscode.exists();

      expect(result).toBe(true);
      expect(mockExists).toHaveBeenCalledWith('./.vscode/settings.json');
    });

    it('should return false when .vscode/settings.json does not exist', async () => {
      mockExists.mockResolvedValue(false);

      const result = await vscode.exists();

      expect(result).toBe(false);
      expect(mockExists).toHaveBeenCalledWith('./.vscode/settings.json');
    });
  });

  describe('create', () => {
    it('should create .vscode/settings.json with default configuration', async () => {
      await vscode.create();

      const expectedConfig = {
        'editor.defaultFormatter': 'esbenp.prettier-vscode',
        '[javascript][typescript][javascriptreact][typescriptreact][json][jsonc][css][graphql]':
          {
            'editor.defaultFormatter': 'biomejs.biome',
          },
        'typescript.tsdk': 'node_modules/typescript/lib',
        'editor.formatOnSave': true,
        'editor.formatOnPaste': true,
        'emmet.showExpandedAbbreviation': 'never',
        'editor.codeActionsOnSave': {
          'source.fixAll.biome': 'explicit',
          'source.organizeImports.biome': 'explicit',
        },
      };

      expect(mockWriteFile).toHaveBeenCalledWith(
        './.vscode/settings.json',
        JSON.stringify(expectedConfig, null, 2)
      );
    });
  });

  describe('update', () => {
    it('should merge existing configuration with default configuration', async () => {
      const existingConfig = {
        'editor.tabSize': 2,
        'files.autoSave': 'afterDelay',
        'editor.defaultFormatter': 'some-other-formatter',
      };

      mockReadFile.mockResolvedValue(JSON.stringify(existingConfig));

      await vscode.update();

      expect(mockReadFile).toHaveBeenCalledWith('./.vscode/settings.json', 'utf-8');

      // Verify that writeFile was called with merged configuration
      expect(mockWriteFile).toHaveBeenCalledWith(
        './.vscode/settings.json',
        expect.stringContaining('"editor.tabSize": 2')
      );
      expect(mockWriteFile).toHaveBeenCalledWith(
        './.vscode/settings.json',
        expect.stringContaining('"files.autoSave": "afterDelay"')
      );
      expect(mockWriteFile).toHaveBeenCalledWith(
        './.vscode/settings.json',
        expect.stringContaining(
          '"editor.defaultFormatter": "esbenp.prettier-vscode"'
        )
      );
      expect(mockWriteFile).toHaveBeenCalledWith(
        './.vscode/settings.json',
        expect.stringContaining('"editor.formatOnSave": true')
      );
    });

    it('should preserve existing biome configuration while adding missing parts', async () => {
      const existingConfig = {
        '[javascript][typescript][javascriptreact][typescriptreact][json][jsonc][css][graphql]':
          {
            'editor.defaultFormatter': 'biomejs.biome',
            'editor.codeActionsOnSave': {
              'source.fixAll.biome': 'explicit',
            },
          },
        'editor.tabSize': 4,
      };

      mockReadFile.mockResolvedValue(JSON.stringify(existingConfig));

      await vscode.update();

      // Should merge the nested configuration properly
      expect(mockWriteFile).toHaveBeenCalledWith(
        './.vscode/settings.json',
        expect.stringContaining('"source.organizeImports.biome": "explicit"')
      );
      expect(mockWriteFile).toHaveBeenCalledWith(
        './.vscode/settings.json',
        expect.stringContaining('"editor.tabSize": 4')
      );
    });

    it('should handle invalid JSON by treating it as empty config', async () => {
      mockReadFile.mockResolvedValue('invalid json');

      await vscode.update();

      expect(mockReadFile).toHaveBeenCalledWith(
        './.vscode/settings.json',
        'utf-8'
      );
      
      // When parsing fails, jsonc-parser returns undefined, 
      // so deepmerge treats it as merging with undefined (effectively just using defaultConfig)
      expect(mockWriteFile).toHaveBeenCalledWith(
        './.vscode/settings.json',
        JSON.stringify({
          'editor.defaultFormatter': 'esbenp.prettier-vscode',
          '[javascript][typescript][javascriptreact][typescriptreact][json][jsonc][css][graphql]':
            {
              'editor.defaultFormatter': 'biomejs.biome',
            },
          'typescript.tsdk': 'node_modules/typescript/lib',
          'editor.formatOnSave': true,
          'editor.formatOnPaste': true,
          'emmet.showExpandedAbbreviation': 'never',
          'editor.codeActionsOnSave': {
            'source.fixAll.biome': 'explicit',
            'source.organizeImports.biome': 'explicit',
          },
        }, null, 2)
      );
    });

    it('should handle .jsonc files with comments', async () => {
      const existingConfigWithComments = `{
  // Default formatter for most files
  "editor.defaultFormatter": "some-other-formatter",
  
  /* Tab configuration */
  "editor.tabSize": 2,
  
  // Auto save configuration
  "files.autoSave": "afterDelay"
}`;

      mockReadFile.mockResolvedValue(existingConfigWithComments);

      await vscode.update();

      expect(mockReadFile).toHaveBeenCalledWith('./.vscode/settings.json', 'utf-8');

      // Verify that the JSONC content was properly parsed and merged
      // Note: Comments are not preserved in the output (limitation of JSON.stringify)
      expect(mockWriteFile).toHaveBeenCalledWith(
        './.vscode/settings.json',
        expect.stringContaining('"editor.tabSize": 2')
      );
      expect(mockWriteFile).toHaveBeenCalledWith(
        './.vscode/settings.json',
        expect.stringContaining('"files.autoSave": "afterDelay"')
      );
      expect(mockWriteFile).toHaveBeenCalledWith(
        './.vscode/settings.json',
        expect.stringContaining(
          '"editor.defaultFormatter": "esbenp.prettier-vscode"'
        )
      );
      expect(mockWriteFile).toHaveBeenCalledWith(
        './.vscode/settings.json',
        expect.stringContaining('"editor.formatOnSave": true')
      );
    });
  });
});
