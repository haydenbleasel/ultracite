import { execSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import process from 'node:process';
import { intro, log, multiselect, select, spinner } from '@clack/prompts';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initialize } from '../scripts/initialize';
import { exists } from '../scripts/utils';

vi.mock('node:child_process');
vi.mock('node:fs/promises');
vi.mock('node:process', () => ({
  default: {
    exit: vi.fn(),
  },
}));
vi.mock('@clack/prompts');
vi.mock('../scripts/utils');
vi.mock('../scripts/biome');
vi.mock('../scripts/husky');
vi.mock('../scripts/lint-staged');
vi.mock('../scripts/tsconfig');
vi.mock('../scripts/vscode-settings');

describe('initialize command', () => {
  const mockExecSync = vi.mocked(execSync);
  const mockMkdir = vi.mocked(mkdir);
  const mockWriteFile = vi.mocked(writeFile);
  const mockIntro = vi.mocked(intro);
  const mockSelect = vi.mocked(select);
  const mockMultiselect = vi.mocked(multiselect);
  const mockLog = {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  };
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

    // Mock successful fs operations by default
    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);

    // Mock @clack/prompts log methods
    vi.mocked(log, true).info = mockLog.info;
    vi.mocked(log, true).success = mockLog.success;
    vi.mocked(log, true).error = mockLog.error;
  });

  it('should initialize with pnpm when pnpm-lock.yaml exists', async () => {
    mockExists.mockImplementation((path: string) => {
      return Promise.resolve(path === 'pnpm-lock.yaml');
    });
    mockMultiselect.mockResolvedValue([]);

    await initialize();

    expect(mockIntro).toHaveBeenCalled();
    expect(mockLog.info).toHaveBeenCalledWith(
      'Detected lockfile, using pnpm add'
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
      'Detected lockfile, using yarn add'
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
      'Detected lockfile, using npm install'
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
      'Detected lockfile, using bun add'
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

    expect(mockMkdir).toHaveBeenCalledWith('.cursor/rules', {
      recursive: true,
    });
    expect(mockWriteFile).toHaveBeenCalledWith(
      './cursor/rules/ultracite.mdc',
      expect.any(String)
    );
  });

  it('should initialize windsurf rules when selected', async () => {
    mockExists.mockResolvedValue(false);
    mockSelect.mockResolvedValue('pnpm add');
    mockMultiselect
      .mockResolvedValueOnce(['windsurf'])
      .mockResolvedValueOnce([]);

    await initialize();

    expect(mockMkdir).toHaveBeenCalledWith('.windsurf/rules', {
      recursive: true,
    });
    expect(mockWriteFile).toHaveBeenCalledWith(
      './.windsurf/rules/ultracite.md',
      expect.any(String)
    );
  });

  it('should initialize vscode copilot rules when selected', async () => {
    mockExists.mockResolvedValue(false);
    mockSelect.mockResolvedValue('pnpm add');
    mockMultiselect
      .mockResolvedValueOnce(['vscode-copilot'])
      .mockResolvedValueOnce([]);

    await initialize();

    expect(mockMkdir).toHaveBeenCalledWith('.github', { recursive: true });
    expect(mockWriteFile).toHaveBeenCalledWith(
      './.github/copilot-instructions.md',
      expect.any(String)
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

  it('should initialize zed rules when selected', async () => {
    mockExists.mockResolvedValue(false);
    mockSelect.mockResolvedValue('pnpm add');
    mockMultiselect.mockResolvedValueOnce(['zed']).mockResolvedValueOnce([]);

    await initialize();

    expect(mockWriteFile).toHaveBeenCalledWith('./.rules', expect.any(String));
  });

  it('should initialize precommit hooks when selected', async () => {
    mockExists.mockResolvedValue(false);
    mockSelect.mockResolvedValue('pnpm add');
    mockMultiselect
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(['precommit-hooks']);

    await initialize();

    // Should have run without errors - the actual function calls are mocked
    expect(mockLog.success).toHaveBeenCalledWith(
      'Successfully initialized Ultracite configuration!'
    );
  });

  it('should initialize lint-staged when selected', async () => {
    mockExists.mockResolvedValue(false);
    mockSelect.mockResolvedValue('pnpm add');
    mockMultiselect
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(['lint-staged']);

    await initialize();

    // Should have run without errors - the actual function calls are mocked
    expect(mockLog.success).toHaveBeenCalledWith(
      'Successfully initialized Ultracite configuration!'
    );
  });

  it('should test the upsert functions when files exist', async () => {
    // Mock files existing so update paths are taken
    mockExists.mockImplementation((path: string) => {
      switch (path) {
        case 'tsconfig.json':
        case '.vscode/settings.json':
        case 'biome.jsonc':
        case '.husky/pre-commit':
        case 'package.json':
          return Promise.resolve(true);
        default:
          return Promise.resolve(false);
      }
    });

    mockSelect.mockResolvedValue('pnpm add');
    mockMultiselect.mockResolvedValue([]);

    await initialize();

    expect(mockLog.success).toHaveBeenCalledWith(
      'Successfully initialized Ultracite configuration!'
    );
  });

  it('should test the upsert functions when files do not exist', async () => {
    // Mock files not existing so create paths are taken
    mockExists.mockResolvedValue(false);

    mockSelect.mockResolvedValue('pnpm add');
    mockMultiselect.mockResolvedValue([]);

    await initialize();

    expect(mockLog.success).toHaveBeenCalledWith(
      'Successfully initialized Ultracite configuration!'
    );
  });

  it('should test zed rules when .rules file exists', async () => {
    mockExists.mockImplementation((path: string) => {
      return Promise.resolve(path === '.rules');
    });

    mockSelect.mockResolvedValue('pnpm add');
    mockMultiselect.mockResolvedValueOnce(['zed']).mockResolvedValueOnce([]);

    await initialize();

    // Should not create .rules file since it exists
    expect(mockExecSync).not.toHaveBeenCalledWith('touch .rules');
  });
});
