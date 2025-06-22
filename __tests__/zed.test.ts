import { readFile, writeFile } from 'node:fs/promises';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exists } from '../scripts/utils';
import { zed } from '../scripts/zed';

vi.mock('node:fs/promises');
vi.mock('../scripts/utils', () => ({
  exists: vi.fn(),
}));
vi.mock('../docs/lib/rules', () => ({
  rulesFile: 'mock rules content',
}));

describe('zed configuration', () => {
  const mockReadFile = vi.mocked(readFile);
  const mockWriteFile = vi.mocked(writeFile);
  const mockExists = vi.mocked(exists);

  beforeEach(() => {
    vi.clearAllMocks();
    mockWriteFile.mockResolvedValue(undefined);
  });

  describe('exists', () => {
    it('should return true when .rules exists', async () => {
      mockExists.mockResolvedValue(true);

      const result = await zed.exists();

      expect(result).toBe(true);
      expect(mockExists).toHaveBeenCalledWith('.rules');
    });

    it('should return false when .rules does not exist', async () => {
      mockExists.mockResolvedValue(false);

      const result = await zed.exists();

      expect(result).toBe(false);
      expect(mockExists).toHaveBeenCalledWith('.rules');
    });
  });

  describe('create', () => {
    it('should create .rules with rules content', async () => {
      await zed.create();

      expect(mockWriteFile).toHaveBeenCalledWith(
        '.rules',
        'mock rules content'
      );
    });
  });

  describe('update', () => {
    it('should create .rules with rules content when file does not exist', async () => {
      mockExists.mockResolvedValue(false);

      await zed.update();

      expect(mockExists).toHaveBeenCalledWith('.rules');
      expect(mockReadFile).not.toHaveBeenCalled();
      expect(mockWriteFile).toHaveBeenCalledWith(
        '.rules',
        'mock rules content'
      );
    });

    it('should append rules to existing file when file exists and rules not present', async () => {
      const existingContent = 'existing content';
      mockExists.mockResolvedValue(true);
      mockReadFile.mockResolvedValue(existingContent);

      await zed.update();

      expect(mockExists).toHaveBeenCalledWith('.rules');
      expect(mockReadFile).toHaveBeenCalledWith('.rules', 'utf-8');
      expect(mockWriteFile).toHaveBeenCalledWith(
        '.rules',
        `${existingContent}\n\nmock rules content`
      );
    });

    it('should not append rules when they already exist in the file', async () => {
      const existingContent = 'existing content\nmock rules content\nmore content';
      mockExists.mockResolvedValue(true);
      mockReadFile.mockResolvedValue(existingContent);

      await zed.update();

      expect(mockExists).toHaveBeenCalledWith('.rules');
      expect(mockReadFile).toHaveBeenCalledWith('.rules', 'utf-8');
      expect(mockWriteFile).not.toHaveBeenCalled();
    });

    it('should handle file read errors gracefully', async () => {
      mockExists.mockResolvedValue(true);
      mockReadFile.mockRejectedValue(new Error('Permission denied'));

      await expect(zed.update()).rejects.toThrow('Permission denied');
      expect(mockExists).toHaveBeenCalledWith('.rules');
      expect(mockReadFile).toHaveBeenCalledWith('.rules', 'utf-8');
    });

    it('should handle exists check errors gracefully', async () => {
      mockExists.mockRejectedValue(new Error('Permission denied'));

      await expect(zed.update()).rejects.toThrow('Permission denied');
      expect(mockExists).toHaveBeenCalledWith('.rules');
    });
  });
}); 