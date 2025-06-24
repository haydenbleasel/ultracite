import { readFile, writeFile } from 'node:fs/promises';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { biome } from '../scripts/biome';
import { exists } from '../scripts/utils';

vi.mock('node:fs/promises');
vi.mock('../scripts/utils', () => ({
  exists: vi.fn(),
}));

describe('biome configuration', () => {
  const mockReadFile = vi.mocked(readFile);
  const mockWriteFile = vi.mocked(writeFile);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('exists', () => {
    it('should return true when biome.jsonc exists', async () => {
      vi.mocked(exists).mockResolvedValue(true);

      const result = await biome.exists();

      expect(result).toBe(true);
    });

    it('should return false when biome.jsonc does not exist', async () => {
      vi.mocked(exists).mockResolvedValue(false);

      const result = await biome.exists();

      expect(result).toBe(false);
    });
  });

  describe('create', () => {
    it('should create biome.jsonc with default configuration', async () => {
      await biome.create();

      const expectedConfig = {
        $schema: 'https://biomejs.dev/schemas/2.0.5/schema.json',
        extends: ['ultracite'],
      };

      expect(mockWriteFile).toHaveBeenCalledWith(
        './biome.jsonc',
        JSON.stringify(expectedConfig, null, 2)
      );
    });
  });

  describe('update', () => {
    it('should merge existing configuration with default configuration', async () => {
      const existingConfig = {
        customProperty: 'value',
        extends: ['other-config'],
      };

      mockReadFile.mockResolvedValue(JSON.stringify(existingConfig));

      await biome.update();

      expect(mockReadFile).toHaveBeenCalledWith('./biome.jsonc', 'utf-8');

      // Verify that writeFile was called with merged configuration
      expect(mockWriteFile).toHaveBeenCalledWith(
        './biome.jsonc',
        expect.stringContaining('"customProperty": "value"')
      );
      expect(mockWriteFile).toHaveBeenCalledWith(
        './biome.jsonc',
        expect.stringContaining(
          '"$schema": "https://biomejs.dev/schemas/2.0.5/schema.json"'
        )
      );
      expect(mockWriteFile).toHaveBeenCalledWith(
        './biome.jsonc',
        expect.stringContaining(
          '"extends": [\n    "other-config",\n    "ultracite"\n  ]'
        )
      );
    });

    it('should handle JSON parsing errors gracefully', async () => {
      mockReadFile.mockResolvedValue('invalid json');

      // Should not throw, but handle gracefully by treating as empty config
      await expect(biome.update()).resolves.not.toThrow();
      expect(mockReadFile).toHaveBeenCalledWith('./biome.jsonc', 'utf-8');
      
      // Should write the default config when parsing fails
      expect(mockWriteFile).toHaveBeenCalledWith(
        './biome.jsonc',
        expect.stringContaining('"extends": [\n    "ultracite"\n  ]')
      );
    });

    it('should handle JSONC files with comments', async () => {
      const existingConfigWithComments = `{
  // Biome configuration with comments
  "$schema": "https://biomejs.dev/schemas/2.0.5/schema.json",
  
  /* Custom property */
  "customProperty": "value",
  
  // Existing extends array
  "extends": ["other-config"]
}`;

      mockReadFile.mockResolvedValue(existingConfigWithComments);

      await biome.update();

      expect(mockReadFile).toHaveBeenCalledWith('./biome.jsonc', 'utf-8');

      // Verify that the JSONC content was properly parsed and merged
      // Note: Comments are not preserved in the output (limitation of JSON.stringify)
      expect(mockWriteFile).toHaveBeenCalledWith(
        './biome.jsonc',
        expect.stringContaining('"customProperty": "value"')
      );
      expect(mockWriteFile).toHaveBeenCalledWith(
        './biome.jsonc',
        expect.stringContaining(
          '"$schema": "https://biomejs.dev/schemas/2.0.5/schema.json"'
        )
      );
      expect(mockWriteFile).toHaveBeenCalledWith(
        './biome.jsonc',
        expect.stringContaining(
          '"extends": [\n    "other-config",\n    "ultracite"\n  ]'
        )
      );
    });
  });
});
