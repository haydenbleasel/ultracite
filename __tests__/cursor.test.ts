import { mkdir, writeFile } from 'node:fs/promises';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cursor } from '../scripts/cursor';
import { exists } from '../scripts/utils';

vi.mock('node:fs/promises');
vi.mock('../scripts/utils', () => ({
  exists: vi.fn(),
}));
vi.mock('../docs/lib/rules', () => ({
  rulesFile: 'mock rules content',
}));

describe('cursor configuration', () => {
  const mockWriteFile = vi.mocked(writeFile);
  const mockMkdir = vi.mocked(mkdir);
  const mockExists = vi.mocked(exists);

  beforeEach(() => {
    vi.clearAllMocks();
    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);
  });

  describe('exists', () => {
    it('should return true when .cursor/rules/ultracite.mdc exists', async () => {
      mockExists.mockResolvedValue(true);

      const result = await cursor.exists();

      expect(result).toBe(true);
      expect(mockExists).toHaveBeenCalledWith('./cursor/rules/ultracite.mdc');
    });

    it('should return false when .cursor/rules/ultracite.mdc does not exist', async () => {
      mockExists.mockResolvedValue(false);

      const result = await cursor.exists();

      expect(result).toBe(false);
      expect(mockExists).toHaveBeenCalledWith('./cursor/rules/ultracite.mdc');
    });
  });

  describe('create', () => {
    it('should create .cursor/rules directory and ultracite.mdc with rules content', async () => {
      await cursor.create();

      expect(mockMkdir).toHaveBeenCalledWith('.cursor/rules', { recursive: true });
      expect(mockWriteFile).toHaveBeenCalledWith(
        './cursor/rules/ultracite.mdc',
        'mock rules content'
      );
    });

    it('should handle mkdir errors gracefully', async () => {
      mockMkdir.mockRejectedValueOnce(new Error('Permission denied'));

      await expect(cursor.create()).rejects.toThrow('Permission denied');
      expect(mockMkdir).toHaveBeenCalledWith('.cursor/rules', { recursive: true });
    });
  });

  describe('update', () => {
    it('should create .cursor/rules directory and update ultracite.mdc with rules content', async () => {
      await cursor.update();

      expect(mockMkdir).toHaveBeenCalledWith('.cursor/rules', { recursive: true });
      expect(mockWriteFile).toHaveBeenCalledWith(
        './cursor/rules/ultracite.mdc',
        'mock rules content'
      );
    });

    it('should handle mkdir errors gracefully', async () => {
      mockMkdir.mockRejectedValueOnce(new Error('Permission denied'));

      await expect(cursor.update()).rejects.toThrow('Permission denied');
      expect(mockMkdir).toHaveBeenCalledWith('.cursor/rules', { recursive: true });
    });
  });
}); 