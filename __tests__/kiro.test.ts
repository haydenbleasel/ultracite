import { mkdir, writeFile } from 'node:fs/promises';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { kiro } from '../scripts/editor-rules/kiro';
import { exists } from '../scripts/utils';

vi.mock('node:fs/promises');
vi.mock('../scripts/utils', () => ({
  exists: vi.fn(),
}));
vi.mock('../docs/lib/rules', () => ({
  rulesFile: 'mock rules content',
}));

describe('kiro configuration', () => {
  const mockWriteFile = vi.mocked(writeFile);
  const mockMkdir = vi.mocked(mkdir);
  const mockExists = vi.mocked(exists);

  beforeEach(() => {
    vi.clearAllMocks();
    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);
  });

  describe('exists', () => {
    it('should return true when .kiro/steering/linting-and-formatting.md exists', async () => {
      mockExists.mockResolvedValue(true);

      const result = await kiro.exists();

      expect(result).toBe(true);
      expect(mockExists).toHaveBeenCalledWith(
        './.kiro/steering/linting-and-formatting.md'
      );
    });

    it('should return false when .kiro/steering/linting-and-formatting.md does not exist', async () => {
      mockExists.mockResolvedValue(false);

      const result = await kiro.exists();

      expect(result).toBe(false);
      expect(mockExists).toHaveBeenCalledWith(
        './.kiro/steering/linting-and-formatting.md'
      );
    });
  });

  describe('create', () => {
    it('should create .kiro/steering directory and linting-and-formatting.md with rules content', async () => {
      await kiro.create();

      expect(mockMkdir).toHaveBeenCalledWith('.kiro/steering', {
        recursive: true,
      });
      expect(mockWriteFile).toHaveBeenCalledWith(
        './.kiro/steering/linting-and-formatting.md',
        'mock rules content'
      );
    });

    it('should handle mkdir errors gracefully', async () => {
      mockMkdir.mockRejectedValueOnce(new Error('Permission denied'));

      await expect(kiro.create()).rejects.toThrow('Permission denied');
      expect(mockMkdir).toHaveBeenCalledWith('.kiro/steering', {
        recursive: true,
      });
    });
  });

  describe('update', () => {
    it('should create .kiro/steering directory and update linting-and-formatting.md with rules content', async () => {
      await kiro.update();

      expect(mockMkdir).toHaveBeenCalledWith('.kiro/steering', {
        recursive: true,
      });
      expect(mockWriteFile).toHaveBeenCalledWith(
        './.kiro/steering/linting-and-formatting.md',
        'mock rules content'
      );
    });

    it('should handle mkdir errors gracefully', async () => {
      mockMkdir.mockRejectedValueOnce(new Error('Permission denied'));

      await expect(kiro.update()).rejects.toThrow('Permission denied');
      expect(mockMkdir).toHaveBeenCalledWith('.kiro/steering', {
        recursive: true,
      });
    });
  });
});
