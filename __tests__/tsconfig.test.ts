import { readFile, writeFile } from 'node:fs/promises';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { tsconfig } from '../scripts/tsconfig';
import { exists } from '../scripts/utils';

vi.mock('node:fs/promises');
vi.mock('../scripts/utils', () => ({
  exists: vi.fn(),
}));

describe('tsconfig configuration', () => {
  const mockReadFile = vi.mocked(readFile);
  const mockWriteFile = vi.mocked(writeFile);
  const mockExists = vi.mocked(exists);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('exists', () => {
    it('should return true when tsconfig.json exists', async () => {
      mockExists.mockResolvedValue(true);

      const result = await tsconfig.exists();

      expect(result).toBe(true);
      expect(mockExists).toHaveBeenCalledWith('./tsconfig.json');
    });

    it('should return false when tsconfig.json does not exist', async () => {
      mockExists.mockResolvedValue(false);

      const result = await tsconfig.exists();

      expect(result).toBe(false);
      expect(mockExists).toHaveBeenCalledWith('./tsconfig.json');
    });
  });

  describe('create', () => {
    it('should create tsconfig.json with default configuration', async () => {
      await tsconfig.create();

      const expectedConfig = {
        compilerOptions: {
          strictNullChecks: true,
        },
      };

      expect(mockWriteFile).toHaveBeenCalledWith(
        './tsconfig.json',
        JSON.stringify(expectedConfig, null, 2)
      );
    });
  });

  describe('update', () => {
    it('should merge existing configuration with default configuration', async () => {
      const existingConfig = {
        compilerOptions: {
          target: 'ES2020',
          module: 'commonjs',
        },
        include: ['src/**/*'],
      };

      mockReadFile.mockResolvedValue(JSON.stringify(existingConfig));

      await tsconfig.update();

      expect(mockReadFile).toHaveBeenCalledWith('./tsconfig.json', 'utf-8');

      // Verify that writeFile was called with merged configuration
      expect(mockWriteFile).toHaveBeenCalledWith(
        './tsconfig.json',
        expect.stringContaining('"target": "ES2020"')
      );
      expect(mockWriteFile).toHaveBeenCalledWith(
        './tsconfig.json',
        expect.stringContaining('"strictNullChecks": true')
      );
      expect(mockWriteFile).toHaveBeenCalledWith(
        './tsconfig.json',
        expect.stringContaining('"include"')
      );
    });

    it('should handle configuration without compilerOptions', async () => {
      const existingConfig = {
        include: ['src/**/*'],
        exclude: ['node_modules'],
      };

      mockReadFile.mockResolvedValue(JSON.stringify(existingConfig));

      await tsconfig.update();

      expect(mockWriteFile).toHaveBeenCalledWith(
        './tsconfig.json',
        expect.stringContaining('"strictNullChecks": true')
      );
      expect(mockWriteFile).toHaveBeenCalledWith(
        './tsconfig.json',
        expect.stringContaining('"include"')
      );
      expect(mockWriteFile).toHaveBeenCalledWith(
        './tsconfig.json',
        expect.stringContaining('"exclude"')
      );
    });

    it('should handle JSON parsing errors gracefully', async () => {
      mockReadFile.mockResolvedValue('invalid json');

      await expect(tsconfig.update()).rejects.toThrow();
      expect(mockReadFile).toHaveBeenCalledWith('./tsconfig.json', 'utf-8');
    });
  });
}); 