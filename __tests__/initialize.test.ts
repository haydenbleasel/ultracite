import { mkdir, readFile, writeFile } from 'node:fs/promises';
import process from 'node:process';
import { intro, log, multiselect, spinner } from '@clack/prompts';
import * as nypm from 'nypm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import packageJson from '../package.json' with { type: 'json' };
import { initialize } from '../scripts/initialize';
import { exists, isMonorepo } from '../scripts/utils';

const schemaVersion = packageJson.devDependencies['@biomejs/biome'];
const ultraciteVersion = packageJson.version;

vi.mock('nypm');
vi.mock('node:fs/promises');
vi.mock('node:process', () => ({
  default: {
    exit: vi.fn(),
    cwd: vi.fn(() => '/test/path'),
  },
}));
vi.mock('@clack/prompts');
vi.mock('../scripts/utils', async () => {
  const actual = await vi.importActual('../scripts/utils');
  return {
    ...actual,
    exists: vi.fn(),
    isMonorepo: vi.fn(),
    updatePackageJson: vi.fn(async ({ dependencies, devDependencies }) => {
      const { readFile, writeFile } = await import('node:fs/promises');
      const packageJsonContent = await readFile('package.json', 'utf8');
      const packageJsonObject = JSON.parse(packageJsonContent);

      const newPackageJsonObject = {
        ...packageJsonObject,
        devDependencies: {
          ...packageJsonObject.devDependencies,
          ...devDependencies,
        },
        dependencies: { ...packageJsonObject.dependencies, ...dependencies },
      };

      await writeFile(
        'package.json',
        JSON.stringify(newPackageJsonObject, null, 2)
      );
    }),
  };
});
vi.mock('../scripts/biome');
vi.mock('../scripts/integrations/husky');
vi.mock('../scripts/integrations/lefthook');
vi.mock('../scripts/integrations/lint-staged');
vi.mock('../scripts/tsconfig');
vi.mock('../scripts/editor-config/vscode');
vi.mock('../scripts/editor-config/zed');
vi.mock('../scripts/editor-rules', () => ({
  createEditorRules: vi.fn(() => ({
    exists: vi.fn(() => Promise.resolve(false)),
    create: vi.fn(() => Promise.resolve()),
    update: vi.fn(() => Promise.resolve()),
  })),
}));
vi.mock('../scripts/migrations/eslint');
vi.mock('../scripts/migrations/prettier');

describe('initialize command', () => {
  const mockDetectPackageManager = vi.mocked(nypm.detectPackageManager);
  const mockAddDevDependency = vi.mocked(nypm.addDevDependency);
  const mockMkdir = vi.mocked(mkdir);
  const mockReadFile = vi.mocked(readFile);
  const mockWriteFile = vi.mocked(writeFile);
  const mockIntro = vi.mocked(intro);
  const mockMultiselect = vi.mocked(multiselect);
  const mockLog = vi.mocked(log);
  const mockSpinner = vi.mocked(spinner);
  const mockExists = vi.mocked(exists);
  const mockIsMonorepo = vi.mocked(isMonorepo);
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
    mockIsMonorepo.mockResolvedValue(false);
    mockAddDevDependency.mockResolvedValue();

    // Mock successful fs operations by default
    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);

    // Mock @clack/prompts log methods
    vi.mocked(log, true).info = mockLog.info;
    vi.mocked(log, true).success = mockLog.success;
    vi.mocked(log, true).error = mockLog.error;
    vi.mocked(log, true).warn = mockLog.warn;
  });

  it('should initialize with pnpm when pnpm-lock.yaml exists', async () => {
    mockDetectPackageManager.mockResolvedValue({
      name: 'pnpm',
      command: 'pnpm',
      lockFile: 'pnpm-lock.yaml',
      majorVersion: '8',
    });
    mockMultiselect.mockResolvedValue([]);

    await initialize();

    expect(mockIntro).toHaveBeenCalled();
    expect(mockLog.info).toHaveBeenCalledWith('Detected lockfile, using pnpm');
    expect(mockAddDevDependency).toHaveBeenCalledWith(
      `ultracite@${ultraciteVersion}`,
      {
        packageManager: 'pnpm',
        workspace: false,
      }
    );
    expect(mockAddDevDependency).toHaveBeenCalledWith(
      `@biomejs/biome@${schemaVersion}`,
      {
        packageManager: 'pnpm',
        workspace: false,
      }
    );
  });

  it('should detect yarn when yarn.lock exists', async () => {
    mockDetectPackageManager.mockResolvedValue({
      name: 'yarn',
      command: 'yarn',
      lockFile: 'yarn.lock',
      majorVersion: '1',
    });
    mockMultiselect.mockResolvedValue([]);

    await initialize();

    expect(mockLog.info).toHaveBeenCalledWith('Detected lockfile, using yarn');
    expect(mockAddDevDependency).toHaveBeenCalledWith(
      `ultracite@${ultraciteVersion}`,
      {
        packageManager: 'yarn',
        workspace: false,
      }
    );
  });

  it('should detect npm when package-lock.json exists', async () => {
    mockDetectPackageManager.mockResolvedValue({
      name: 'npm',
      command: 'npm',
      lockFile: 'package-lock.json',
      majorVersion: '9',
    });
    mockMultiselect.mockResolvedValue([]);

    await initialize();

    expect(mockLog.info).toHaveBeenCalledWith('Detected lockfile, using npm');
    expect(mockAddDevDependency).toHaveBeenCalledWith(
      `ultracite@${ultraciteVersion}`,
      {
        packageManager: 'npm',
        workspace: false,
      }
    );
  });

  it('should display warnings when package manager detection has warnings', async () => {
    mockDetectPackageManager.mockResolvedValue({
      name: 'npm',
      command: 'npm',
      lockFile: 'package-lock.json',
      majorVersion: '9',
      warnings: [
        'Multiple lock files detected',
        'Consider removing duplicate lock files',
      ],
    });
    mockMultiselect.mockResolvedValue([]);

    await initialize();

    expect(mockLog.warn).toHaveBeenCalledWith('Multiple lock files detected');
    expect(mockLog.warn).toHaveBeenCalledWith('Consider removing duplicate lock files');
    expect(mockLog.info).toHaveBeenCalledWith('Detected lockfile, using npm');
    expect(mockLog.success).toHaveBeenCalledWith(
      'Successfully initialized Ultracite configuration!'
    );
  });

  it('should detect bun when bun.lockb exists', async () => {
    mockDetectPackageManager.mockResolvedValue({
      name: 'bun',
      command: 'bun',
      lockFile: 'bun.lockb',
      majorVersion: '1',
    });
    mockMultiselect.mockResolvedValue([]);

    await initialize();

    expect(mockLog.info).toHaveBeenCalledWith('Detected lockfile, using bun');
    expect(mockAddDevDependency).toHaveBeenCalledWith(
      `ultracite@${ultraciteVersion}`,
      {
        packageManager: 'bun',
        workspace: false,
      }
    );
  });

  it('should prompt for package manager when no lockfile exists', async () => {
    mockDetectPackageManager.mockResolvedValue(null);
    mockMultiselect.mockResolvedValue([]);

    await initialize();

    expect(mockLog.error).toHaveBeenCalledWith(
      'Failed to initialize Ultracite configuration: No package manager specified or detected'
    );
    expect(mockProcessExit).toHaveBeenCalledWith(1);
  });

  it('should handle errors and exit with code 1', async () => {
    mockDetectPackageManager.mockRejectedValue(
      new Error('Initialization failed')
    );

    await initialize();

    expect(mockLog.error).toHaveBeenCalledWith(
      'Failed to initialize Ultracite configuration: Initialization failed'
    );
    expect(mockProcessExit).toHaveBeenCalledWith(1);
  });

  it('should handle non-Error exceptions', async () => {
    mockDetectPackageManager.mockImplementation(() => {
      throw 'String error';
    });

    await initialize();

    expect(mockLog.error).toHaveBeenCalledWith(
      'Failed to initialize Ultracite configuration: Unknown error'
    );
    expect(mockProcessExit).toHaveBeenCalledWith(1);
  });

  it('should throw error when no package manager is selected', async () => {
    mockDetectPackageManager.mockResolvedValue(null);

    await initialize();

    expect(mockLog.error).toHaveBeenCalledWith(
      'Failed to initialize Ultracite configuration: No package manager specified or detected'
    );
    expect(mockProcessExit).toHaveBeenCalledWith(1);
  });

  it('should initialize precommit hooks when selected', async () => {
    mockDetectPackageManager.mockResolvedValue({
      name: 'pnpm',
      command: 'pnpm',
      lockFile: 'pnpm-lock.yaml',
      majorVersion: '8',
    });
    mockMultiselect
      .mockResolvedValueOnce([]) // migrationOptions
      .mockResolvedValueOnce([]) // editorConfig
      .mockResolvedValueOnce([]) // editorRules
      .mockResolvedValueOnce(['husky']); // extraFeatures

    await initialize();

    // Should have run without errors - the actual function calls are mocked
    expect(mockLog.success).toHaveBeenCalledWith(
      'Successfully initialized Ultracite configuration!'
    );
  });

  it('should initialize lint-staged when selected', async () => {
    mockDetectPackageManager.mockResolvedValue({
      name: 'pnpm',
      command: 'pnpm',
      lockFile: 'pnpm-lock.yaml',
      majorVersion: '8',
    });
    mockMultiselect
      .mockResolvedValueOnce([]) // migrationOptions
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

    mockDetectPackageManager.mockResolvedValue({
      name: 'pnpm',
      command: 'pnpm',
      lockFile: 'pnpm-lock.yaml',
      majorVersion: '8',
    });
    mockMultiselect.mockResolvedValue([]);

    await initialize();

    expect(mockLog.success).toHaveBeenCalledWith(
      'Successfully initialized Ultracite configuration!'
    );
  });

  it('should test the upsert functions when files do not exist', async () => {
    // Mock files not existing so create paths are taken
    mockExists.mockResolvedValue(false);

    mockDetectPackageManager.mockResolvedValue({
      name: 'pnpm',
      command: 'pnpm',
      lockFile: 'pnpm-lock.yaml',
      majorVersion: '8',
    });
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

    mockDetectPackageManager.mockResolvedValue({
      name: 'pnpm',
      command: 'pnpm',
      lockFile: 'pnpm-lock.yaml',
      majorVersion: '8',
    });
    mockMultiselect
      .mockResolvedValueOnce([]) // editorConfig
      .mockResolvedValueOnce(['zed']) // editorRules
      .mockResolvedValueOnce([]); // extraFeatures

    await initialize();

    // Should not create .rules file since it exists
    expect(mockAddDevDependency).toHaveBeenCalled();
  });

  it('should not prompt for features when other CLI options are provided', async () => {
    mockExists.mockResolvedValue(false);
    mockDetectPackageManager.mockResolvedValue({
      name: 'pnpm',
      command: 'pnpm',
      lockFile: 'pnpm-lock.yaml',
      majorVersion: '8',
    });

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
    mockDetectPackageManager.mockResolvedValue({
      name: 'pnpm',
      command: 'pnpm',
      lockFile: 'pnpm-lock.yaml',
      majorVersion: '8',
    });
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

      // Should not run addDevDependency for installation
      expect(mockAddDevDependency).not.toHaveBeenCalled();

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
              ultracite: ultraciteVersion,
            },
            dependencies: {},
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
        integrations: ['husky'],
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
        integrations: ['lefthook'],
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
        integrations: ['lint-staged'],
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
        integrations: ['husky', 'lefthook', 'lint-staged'],
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
        integrations: ['husky'],
      });

      // Should run addDevDependency for main installation
      expect(mockAddDevDependency).toHaveBeenCalledWith(
        `ultracite@${ultraciteVersion}`,
        {
          packageManager: 'pnpm',
          workspace: false,
        }
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

      // Should run addDevDependency for main installation
      expect(mockAddDevDependency).toHaveBeenCalledWith(
        `ultracite@${ultraciteVersion}`,
        {
          packageManager: 'pnpm',
          workspace: false,
        }
      );

      expect(mockLog.success).toHaveBeenCalledWith(
        'Successfully initialized Ultracite configuration!'
      );
    });
  });
});
