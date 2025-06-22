import { mkdir, writeFile } from 'node:fs/promises';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exists } from '../scripts/utils';
import { vscodeCopilot } from '../scripts/vscode-copilot';

vi.mock('node:fs/promises');
vi.mock('../scripts/utils', () => ({
  exists: vi.fn(),
}));
vi.mock('../docs/lib/rules', () => ({
  rulesFile: 'mock rules content',
}));

describe('vscodeCopilot configuration', () => {
  const mockWriteFile = vi.mocked(writeFile);
  const mockMkdir = vi.mocked(mkdir);
  const mockExists = vi.mocked(exists);

  beforeEach(() => {
    vi.clearAllMocks();
    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);
  });

  describe('exists', () => {
    it('should return true when .github/copilot-instructions.md exists', async () => {
      mockExists.mockResolvedValue(true);

      const result = await vscodeCopilot.exists();

      expect(result).toBe(true);
      expect(mockExists).toHaveBeenCalledWith('./.github/copilot-instructions.md');
    });

    it('should return false when .github/copilot-instructions.md does not exist', async () => {
      mockExists.mockResolvedValue(false);

      const result = await vscodeCopilot.exists();

      expect(result).toBe(false);
      expect(mockExists).toHaveBeenCalledWith('./.github/copilot-instructions.md');
    });
  });

  describe('create', () => {
    it('should create .github directory and copilot-instructions.md with rules content', async () => {
      await vscodeCopilot.create();

      expect(mockMkdir).toHaveBeenCalledWith('.github', { recursive: true });
      expect(mockWriteFile).toHaveBeenCalledWith(
        './.github/copilot-instructions.md',
        'mock rules content'
      );
    });

    it('should handle mkdir errors gracefully', async () => {
      mockMkdir.mockRejectedValueOnce(new Error('Permission denied'));

      await expect(vscodeCopilot.create()).rejects.toThrow('Permission denied');
      expect(mockMkdir).toHaveBeenCalledWith('.github', { recursive: true });
    });
  });

  describe('update', () => {
    it('should create .github directory and update copilot-instructions.md with rules content', async () => {
      await vscodeCopilot.update();

      expect(mockMkdir).toHaveBeenCalledWith('.github', { recursive: true });
      expect(mockWriteFile).toHaveBeenCalledWith(
        './.github/copilot-instructions.md',
        'mock rules content'
      );
    });

    it('should handle mkdir errors gracefully', async () => {
      mockMkdir.mockRejectedValueOnce(new Error('Permission denied'));

      await expect(vscodeCopilot.update()).rejects.toThrow('Permission denied');
      expect(mockMkdir).toHaveBeenCalledWith('.github', { recursive: true });
    });
  });
}); 