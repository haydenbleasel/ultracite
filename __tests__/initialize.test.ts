import { execSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import process from 'node:process';
import { intro, log, multiselect, select, spinner } from '@clack/prompts';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import packageJson from '../package.json' with { type: 'json' };
import { initialize } from '../scripts/initialize';
import { exists } from '../scripts/utils';

const schemaVersion = packageJson.devDependencies['@biomejs/biome'];

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
vi.mock('../scripts/lefthook');
vi.mock('../scripts/lint-staged');
vi.mock('../scripts/tsconfig');
vi.mock('../scripts/vscode-settings');

describe('initialize command', () => {
  const mockExecSync = vi.mocked(execSync);
  const mockMkdir = vi.mocked(mkdir);
  const mockReadFile = vi.mocked(readFile);
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
      `pnpm add -D -E ultracite @biomejs/biome@${schemaVersion}`
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
      `yarn add -D -E ultracite @biomejs/biome@${schemaVersion}`
    );
  });

  it('should detect npm when package-lock.json exists', async () => {
    mockExists.mockImplementation((path: string) => {
      return Promise.resolve(path === 'package-lock.json');
    });
    mockMultiselect.mockResolvedValue([]);

    await initialize();

    expect(mockLog.info).toHaveBeenCalledWith(
      'Detected lockfile, using npm install --legacy-peer-deps'
    );
    expect(mockExecSync).toHaveBeenCalledWith(
      `npm install --legacy-peer-deps -D -E ultracite @biomejs/biome@${schemaVersion}`
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
      `bun add -D -E ultracite @biomejs/biome@${schemaVersion}`
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
        { label: 'npm', value: 'npm install --legacy-peer-deps' },
      ],
    });
  });

  it('should initialize cursor rules when selected', async () => {
    mockExists.mockResolvedValue(false);
    mockSelect.mockResolvedValue('pnpm add');
    mockMultiselect
      .mockResolvedValueOnce([]) // editorConfig
      .mockResolvedValueOnce(['cursor']) // editorRules
      .mockResolvedValueOnce([]); // extraFeatures

    await initialize();

    expect(mockMkdir).toHaveBeenCalledWith('.cursor/rules', {
      recursive: true,
    });
    expect(mockWriteFile).toHaveBeenCalledWith(
      './.cursor/rules/ultracite.mdc',
      expect.any(String)
    );
  });

  it('should initialize windsurf rules when selected', async () => {
    mockExists.mockResolvedValue(false);
    mockSelect.mockResolvedValue('pnpm add');
    mockMultiselect
      .mockResolvedValueOnce([]) // editorConfig
      .mockResolvedValueOnce(['windsurf']) // editorRules
      .mockResolvedValueOnce([]); // extraFeatures

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
      .mockResolvedValueOnce([]) // editorConfig
      .mockResolvedValueOnce(['vscode-copilot']) // editorRules
      .mockResolvedValueOnce([]); // extraFeatures

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
    mockMultiselect
      .mockResolvedValueOnce(['zed']) // editorConfig - creates .zed/settings.json
      .mockResolvedValueOnce(['zed']) // editorRules - creates .rules
      .mockResolvedValueOnce([]); // extraFeatures

    await initialize();

    expect(mockWriteFile).toHaveBeenCalledWith(
      './.zed/settings.json',
      expect.any(String)
    );
    expect(mockWriteFile).toHaveBeenCalledWith('./.rules', expect.any(String));
  });

  it('should initialize precommit hooks when selected', async () => {
    mockExists.mockResolvedValue(false);
    mockSelect.mockResolvedValue('pnpm add');
    mockMultiselect
      .mockResolvedValueOnce([]) // editorConfig
      .mockResolvedValueOnce([]) // editorRules
      .mockResolvedValueOnce(['precommit-hooks']); // extraFeatures

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
      .mockResolvedValueOnce([]) // editorConfig
      .mockResolvedValueOnce([]) // editorRules
      .mockResolvedValueOnce(['lint-staged']); // extraFeatures

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
    mockMultiselect
      .mockResolvedValueOnce([]) // editorConfig
      .mockResolvedValueOnce(['zed']) // editorRules
      .mockResolvedValueOnce([]); // extraFeatures

    await initialize();

    // Should not create .rules file since it exists
    expect(mockExecSync).not.toHaveBeenCalledWith('touch .rules');
  });

  it('should not prompt for features when other CLI options are provided', async () => {
    mockExists.mockResolvedValue(false);
    mockSelect.mockResolvedValue('pnpm add');

    // When CLI options are provided but features is undefined, it should default to empty array
    await initialize({
      pm: 'pnpm',
      editors: ['vscode'],
      rules: ['cursor'],
      // features not provided (undefined) - should default to [] due to other CLI options
    });

    // multiselect should not be called for features since other CLI options are provided
    expect(mockMultiselect).not.toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Would you like any of the following (optional)?',
      })
    );

    expect(mockLog.success).toHaveBeenCalledWith(
      'Successfully initialized Ultracite configuration!'
    );
  });

  it('should still prompt for features when no CLI options are provided', async () => {
    mockExists.mockResolvedValue(false);
    mockSelect.mockResolvedValue('pnpm add');
    mockMultiselect.mockResolvedValue([]);

    // When no CLI options are provided, it should still prompt for features
    await initialize();

    // multiselect should be called for features in interactive mode
    expect(mockMultiselect).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Would you like any of the following (optional)?',
      })
    );

    expect(mockLog.success).toHaveBeenCalledWith(
      'Successfully initialized Ultracite configuration!'
    );
  });

  describe('skipInstall flag', () => {
    const mockPackageJsonContent = JSON.stringify({
      name: 'test-project',
      version: '1.0.0',
      devDependencies: {
        typescript: '^5.0.0',
      },
    });

    beforeEach(() => {
      mockReadFile.mockResolvedValue(mockPackageJsonContent);
    });

    it('should modify package.json instead of running install commands when skipInstall is true', async () => {
      mockExists.mockResolvedValue(false);

      await initialize({
        pm: 'pnpm',
        skipInstall: true,
      });

      // Should not run execSync for installation
      expect(mockExecSync).not.toHaveBeenCalledWith(
        `pnpm add -D -E ultracite @biomejs/biome@${schemaVersion}`
      );

      // Should read package.json
      expect(mockReadFile).toHaveBeenCalledWith('package.json', 'utf8');

      // Should write updated package.json with new dependencies
      expect(mockWriteFile).toHaveBeenCalledWith(
        'package.json',
        JSON.stringify(
          {
            name: 'test-project',
            version: '1.0.0',
            devDependencies: {
              typescript: '^5.0.0',
              '@biomejs/biome': schemaVersion,
              ultracite: `^${packageJson.version}`,
            },
          },
          null,
          2
        )
      );

      expect(mockLog.success).toHaveBeenCalledWith(
        'Successfully initialized Ultracite configuration!'
      );
    });

    it('should install husky in package.json when skipInstall is true and husky feature is selected', async () => {
      mockExists.mockResolvedValue(false);

      await initialize({
        pm: 'pnpm',
        skipInstall: true,
        features: ['husky'],
      });

      // Should read package.json for husky installation
      expect(mockReadFile).toHaveBeenCalledWith('package.json', 'utf8');

      // Should write package.json with husky dependency
      const huskyWriteCall = mockWriteFile.mock.calls.find(
        (call) =>
          call[0] === 'package.json' &&
          typeof call[1] === 'string' &&
          call[1].includes('"husky": "latest"')
      );
      expect(huskyWriteCall).toBeDefined();

      expect(mockLog.success).toHaveBeenCalledWith(
        'Successfully initialized Ultracite configuration!'
      );
    });

    it('should install lefthook in package.json when skipInstall is true and lefthook feature is selected', async () => {
      mockExists.mockResolvedValue(false);

      await initialize({
        pm: 'pnpm',
        skipInstall: true,
        features: ['lefthook'],
      });

      // Should read package.json for lefthook installation
      expect(mockReadFile).toHaveBeenCalledWith('package.json', 'utf8');

      // Should write package.json with lefthook dependency
      const lefthookWriteCall = mockWriteFile.mock.calls.find(
        (call) =>
          call[0] === 'package.json' &&
          typeof call[1] === 'string' &&
          call[1].includes('"lefthook": "latest"')
      );
      expect(lefthookWriteCall).toBeDefined();

      expect(mockLog.success).toHaveBeenCalledWith(
        'Successfully initialized Ultracite configuration!'
      );
    });

    it('should install lint-staged in package.json when skipInstall is true and lint-staged feature is selected', async () => {
      mockExists.mockResolvedValue(false);

      await initialize({
        pm: 'pnpm',
        skipInstall: true,
        features: ['lint-staged'],
      });

      // Should read package.json for lint-staged installation
      expect(mockReadFile).toHaveBeenCalledWith('package.json', 'utf8');

      // Should write package.json with lint-staged dependency
      const lintStagedWriteCall = mockWriteFile.mock.calls.find(
        (call) =>
          call[0] === 'package.json' &&
          typeof call[1] === 'string' &&
          call[1].includes('"lint-staged": "latest"')
      );
      expect(lintStagedWriteCall).toBeDefined();

      expect(mockLog.success).toHaveBeenCalledWith(
        'Successfully initialized Ultracite configuration!'
      );
    });

    it('should install all dependencies in package.json when skipInstall is true and multiple features are selected', async () => {
      mockExists.mockResolvedValue(false);

      await initialize({
        pm: 'pnpm',
        skipInstall: true,
        features: ['husky', 'lefthook', 'lint-staged'],
      });

      // Should read package.json multiple times for each feature
      expect(mockReadFile).toHaveBeenCalledWith('package.json', 'utf8');

      // Should write package.json with all feature dependencies
      const huskyWriteCall = mockWriteFile.mock.calls.find(
        (call) =>
          call[0] === 'package.json' &&
          typeof call[1] === 'string' &&
          call[1].includes('"husky": "latest"')
      );
      const lefthookWriteCall = mockWriteFile.mock.calls.find(
        (call) =>
          call[0] === 'package.json' &&
          typeof call[1] === 'string' &&
          call[1].includes('"lefthook": "latest"')
      );
      const lintStagedWriteCall = mockWriteFile.mock.calls.find(
        (call) =>
          call[0] === 'package.json' &&
          typeof call[1] === 'string' &&
          call[1].includes('"lint-staged": "latest"')
      );

      expect(huskyWriteCall).toBeDefined();
      expect(lefthookWriteCall).toBeDefined();
      expect(lintStagedWriteCall).toBeDefined();

      expect(mockLog.success).toHaveBeenCalledWith(
        'Successfully initialized Ultracite configuration!'
      );
    });

    it('should run normal install commands when skipInstall is false', async () => {
      mockExists.mockResolvedValue(false);

      await initialize({
        pm: 'pnpm',
        skipInstall: false,
        features: ['husky'],
      });

      // Should run execSync for main installation
      expect(mockExecSync).toHaveBeenCalledWith(
        `pnpm add -D -E ultracite @biomejs/biome@${schemaVersion}`
      );

      // The main installation shouldn't read package.json when skipInstall is false
      // but features might still read it depending on their implementation

      expect(mockLog.success).toHaveBeenCalledWith(
        'Successfully initialized Ultracite configuration!'
      );
    });

    it('should run normal install commands when skipInstall is undefined (default)', async () => {
      mockExists.mockResolvedValue(false);

      await initialize({
        pm: 'pnpm',
        // skipInstall not provided, should default to false
      });

      // Should run execSync for main installation
      expect(mockExecSync).toHaveBeenCalledWith(
        `pnpm add -D -E ultracite @biomejs/biome@${schemaVersion}`
      );

      expect(mockLog.success).toHaveBeenCalledWith(
        'Successfully initialized Ultracite configuration!'
      );
    });
  });
});
