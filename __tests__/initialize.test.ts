import { execSync } from 'node:child_process';
import { intro, log, multiselect, select, spinner } from '@clack/prompts';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initialize } from '../scripts/initialize';
import { exists } from '../scripts/utils';

vi.mock('node:child_process');
vi.mock('@clack/prompts');
vi.mock('../scripts/utils');
vi.mock('../scripts/biome');
vi.mock('../scripts/husky');
vi.mock('../scripts/lint-staged');
vi.mock('../scripts/tsconfig');
vi.mock('../scripts/vscode-settings');

describe('initialize command', () => {
  const mockExecSync = vi.mocked(execSync);
  const mockIntro = vi.mocked(intro);
  const mockSelect = vi.mocked(select);
  const mockMultiselect = vi.mocked(multiselect);
  const mockLog = vi.mocked(log);
  const mockSpinner = vi.mocked(spinner);
  const mockExists = vi.mocked(exists);
  const mockProcessExit = vi.mocked(process.exit);

  const mockSpinnerInstance = {
    start: vi.fn(),
    stop: vi.fn(),
    message: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSpinner.mockReturnValue(mockSpinnerInstance);
    mockExists.mockResolvedValue(false);
  });

  it('should initialize with pnpm when pnpm-lock.yaml exists', async () => {
    mockExists.mockImplementation((path: string) => {
      return Promise.resolve(path === 'pnpm-lock.yaml');
    });
    mockMultiselect.mockResolvedValue([]);

    await initialize();

    expect(mockIntro).toHaveBeenCalled();
    expect(mockLog.info).toHaveBeenCalledWith(
      'Detected pnpm lockfile, using pnpm add'
    );
    expect(mockExecSync).toHaveBeenCalledWith(
      'pnpm add -D --save-exact ultracite @biomejs/biome@2.0.0'
    );
  });

  it('should detect yarn when yarn.lock exists', async () => {
    mockExists.mockImplementation((path: string) => {
      return Promise.resolve(path === 'yarn.lock');
    });
    mockMultiselect.mockResolvedValue([]);

    await initialize();

    expect(mockLog.info).toHaveBeenCalledWith(
      'Detected yarn lockfile, using yarn add'
    );
    expect(mockExecSync).toHaveBeenCalledWith(
      'yarn add -D --save-exact ultracite @biomejs/biome@2.0.0'
    );
  });

  it('should detect npm when package-lock.json exists', async () => {
    mockExists.mockImplementation((path: string) => {
      return Promise.resolve(path === 'package-lock.json');
    });
    mockMultiselect.mockResolvedValue([]);

    await initialize();

    expect(mockLog.info).toHaveBeenCalledWith(
      'Detected npm lockfile, using npm install'
    );
    expect(mockExecSync).toHaveBeenCalledWith(
      'npm install -D --save-exact ultracite @biomejs/biome@2.0.0'
    );
  });

  it('should detect bun when bun.lockb exists', async () => {
    mockExists.mockImplementation((path: string) => {
      return Promise.resolve(path === 'bun.lockb');
    });
    mockMultiselect.mockResolvedValue([]);

    await initialize();

    expect(mockLog.info).toHaveBeenCalledWith(
      'Detected bun lockfile, using bun add'
    );
    expect(mockExecSync).toHaveBeenCalledWith(
      'bun add -D --save-exact ultracite @biomejs/biome@2.0.0'
    );
  });

  it('should prompt for package manager when no lockfile exists', async () => {
    mockExists.mockResolvedValue(false);
    mockSelect.mockResolvedValue('npm install');
    mockMultiselect.mockResolvedValue([]);

    await initialize();

    expect(mockSelect).toHaveBeenCalledWith({
      initialValue: 'pnpm',
      message: 'Which package manager do you use?',
      options: [
        { label: 'pnpm', value: 'pnpm add' },
        { label: 'bun', value: 'bun add' },
        { label: 'yarn', value: 'yarn add' },
        { label: 'npm', value: 'npm install' },
      ],
    });
  });

  it('should initialize cursor rules when selected', async () => {
    mockExists.mockResolvedValue(false);
    mockSelect.mockResolvedValue('pnpm add');
    mockMultiselect.mockResolvedValueOnce(['cursor']).mockResolvedValueOnce([]);

    await initialize();

    expect(mockExecSync).toHaveBeenCalledWith(
      expect.stringContaining("echo '") &&
        expect.stringContaining("' > .cursor/rules/ultracite.mdc")
    );
  });

  it('should initialize windsurf rules when selected', async () => {
    mockExists.mockResolvedValue(false);
    mockSelect.mockResolvedValue('pnpm add');
    mockMultiselect
      .mockResolvedValueOnce(['windsurf'])
      .mockResolvedValueOnce([]);

    await initialize();

    expect(mockExecSync).toHaveBeenCalledWith(
      expect.stringContaining("echo '") &&
        expect.stringContaining("' > .windsurf/rules/ultracite.md")
    );
  });

  it('should initialize vscode copilot rules when selected', async () => {
    mockExists.mockResolvedValue(false);
    mockSelect.mockResolvedValue('pnpm add');
    mockMultiselect
      .mockResolvedValueOnce(['vscode-copilot'])
      .mockResolvedValueOnce([]);

    await initialize();

    expect(mockExecSync).toHaveBeenCalledWith(
      expect.stringContaining("echo '") &&
        expect.stringContaining("' > .github/copilot-instructions.md")
    );
  });

  it('should handle errors and exit with code 1', async () => {
    const error = new Error('Initialization failed');
    mockExists.mockRejectedValue(error);

    await initialize();

    expect(mockLog.error).toHaveBeenCalledWith(
      'Failed to initialize Ultracite configuration: Initialization failed'
    );
    expect(mockProcessExit).toHaveBeenCalledWith(1);
  });

  it('should handle non-Error exceptions', async () => {
    mockExists.mockImplementation(() => {
      throw new Error('String error');
    });

    await initialize();

    expect(mockLog.error).toHaveBeenCalledWith(
      'Failed to initialize Ultracite configuration: String error'
    );
    expect(mockProcessExit).toHaveBeenCalledWith(1);
  });

  it('should throw error when no package manager is selected', async () => {
    mockExists.mockResolvedValue(false);
    mockSelect.mockResolvedValue(Symbol('cancelled'));

    await initialize();

    expect(mockLog.error).toHaveBeenCalledWith(
      'Failed to initialize Ultracite configuration: No package manager selected'
    );
    expect(mockProcessExit).toHaveBeenCalledWith(1);
  });
});
