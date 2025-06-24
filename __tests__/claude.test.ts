import { mkdir, writeFile } from 'node:fs/promises';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { claude } from '../scripts/claude';
import { exists } from '../scripts/utils';

vi.mock('node:fs/promises');
vi.mock('../scripts/utils', () => ({
  exists: vi.fn(),
}));
vi.mock('../docs/lib/rules', () => ({
  rulesFile: 'mock rules content',
}));

describe('claude configuration', () => {
  const mockWriteFile = vi.mocked(writeFile);
  const mockMkdir = vi.mocked(mkdir);
  const mockExists = vi.mocked(exists);

  beforeEach(() => {
    vi.clearAllMocks();
    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);
  });

  describe('exists', () => {
    it('should return true when .claude/CLAUDE.md exists', async () => {
      mockExists.mockResolvedValue(true);

      const result = await claude.exists();

      expect(result).toBe(true);
      expect(mockExists).toHaveBeenCalledWith('./.claude/CLAUDE.md');
    });

    it('should return false when .claude/CLAUDE.md does not exist', async () => {
      mockExists.mockResolvedValue(false);

      const result = await claude.exists();

      expect(result).toBe(false);
      expect(mockExists).toHaveBeenCalledWith('./.claude/CLAUDE.md');
    });
  });

  describe('create', () => {
    it('should create .claude directory and CLAUDE.md with rules content', async () => {
      await claude.create();

      expect(mockMkdir).toHaveBeenCalledWith('.claude', { recursive: true });
      expect(mockWriteFile).toHaveBeenCalledWith(
        './.claude/CLAUDE.md',
        'mock rules content'
      );
    });

    it('should handle mkdir errors gracefully', async () => {
      mockMkdir.mockRejectedValueOnce(new Error('Permission denied'));

      await expect(claude.create()).rejects.toThrow('Permission denied');
      expect(mockMkdir).toHaveBeenCalledWith('.claude', { recursive: true });
    });
  });

  describe('update', () => {
    it('should create .claude directory and update CLAUDE.md with rules content', async () => {
      await claude.update();

      expect(mockMkdir).toHaveBeenCalledWith('.claude', { recursive: true });
      expect(mockWriteFile).toHaveBeenCalledWith(
        './.claude/CLAUDE.md',
        'mock rules content'
      );
    });

    it('should handle mkdir errors gracefully', async () => {
      mockMkdir.mockRejectedValueOnce(new Error('Permission denied'));

      await expect(claude.update()).rejects.toThrow('Permission denied');
      expect(mockMkdir).toHaveBeenCalledWith('.claude', { recursive: true });
    });
  });
});
