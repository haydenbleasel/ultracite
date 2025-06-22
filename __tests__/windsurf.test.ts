import { mkdir, writeFile } from 'node:fs/promises';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exists } from '../scripts/utils';
import { windsurf } from '../scripts/windsurf';

vi.mock('node:fs/promises');
vi.mock('../scripts/utils', () => ({
  exists: vi.fn(),
}));
vi.mock('../docs/lib/rules', () => ({
  rulesFile: 'mock rules content',
}));

describe('windsurf configuration', () => {
  const mockWriteFile = vi.mocked(writeFile);
  const mockMkdir = vi.mocked(mkdir);
  const mockExists = vi.mocked(exists);

  beforeEach(() => {
    vi.clearAllMocks();
    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);
  });

  describe('exists', () => {
    it('should return true when .windsurf/rules/ultracite.md exists', async () => {
      mockExists.mockResolvedValue(true);

      const result = await windsurf.exists();

      expect(result).toBe(true);
      expect(mockExists).toHaveBeenCalledWith('./.windsurf/rules/ultracite.md');
    });

    it('should return false when .windsurf/rules/ultracite.md does not exist', async () => {
      mockExists.mockResolvedValue(false);

      const result = await windsurf.exists();

      expect(result).toBe(false);
      expect(mockExists).toHaveBeenCalledWith('./.windsurf/rules/ultracite.md');
    });
  });

  describe('create', () => {
    it('should create .windsurf/rules directory and ultracite.md with rules content', async () => {
      await windsurf.create();

      expect(mockMkdir).toHaveBeenCalledWith('.windsurf/rules', { recursive: true });
      expect(mockWriteFile).toHaveBeenCalledWith(
        './.windsurf/rules/ultracite.md',
        'mock rules content'
      );
    });

    it('should handle mkdir errors gracefully', async () => {
      mockMkdir.mockRejectedValueOnce(new Error('Permission denied'));

      await expect(windsurf.create()).rejects.toThrow('Permission denied');
      expect(mockMkdir).toHaveBeenCalledWith('.windsurf/rules', { recursive: true });
    });
  });

  describe('update', () => {
    it('should create .windsurf/rules directory and update ultracite.md with rules content', async () => {
      await windsurf.update();

      expect(mockMkdir).toHaveBeenCalledWith('.windsurf/rules', { recursive: true });
      expect(mockWriteFile).toHaveBeenCalledWith(
        './.windsurf/rules/ultracite.md',
        'mock rules content'
      );
    });

    it('should handle mkdir errors gracefully', async () => {
      mockMkdir.mockRejectedValueOnce(new Error('Permission denied'));

      await expect(windsurf.update()).rejects.toThrow('Permission denied');
      expect(mockMkdir).toHaveBeenCalledWith('.windsurf/rules', { recursive: true });
    });
  });
}); 