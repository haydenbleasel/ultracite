import { Command } from 'commander';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock all the command modules
vi.mock('../scripts/format', () => ({
  format: vi.fn(),
}));

vi.mock('../scripts/initialize', () => ({
  initialize: vi.fn(),
}));

vi.mock('../scripts/lint', () => ({
  lint: vi.fn(),
}));

describe('CLI integration', () => {
  let program: Command;

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset the program for each test
    program = new Command();
    program
      .name('Ultracite')
      .description('Ship code faster and with more confidence.');
  });

  it('should have correct program name and description', () => {
    expect(program.name()).toBe('Ultracite');
    expect(program.description()).toBe(
      'Ship code faster and with more confidence.'
    );
  });

  it('should register init command', async () => {
    const { initialize } = await import('../scripts/initialize');

    program
      .command('init')
      .description('Initialize Ultracite in the current directory')
      .action(initialize);

    const initCommand = program.commands.find((cmd) => cmd.name() === 'init');

    expect(initCommand).toBeDefined();
    expect(initCommand?.description()).toBe(
      'Initialize Ultracite in the current directory'
    );
  });

  it('should register lint command with optional files argument', async () => {
    const { lint } = await import('../scripts/lint');

    program
      .command('lint')
      .description('Run Biome linter without fixing files')
      .argument('[files...]', 'specific files to lint (optional)')
      .action(lint);

    const lintCommand = program.commands.find((cmd) => cmd.name() === 'lint');

    expect(lintCommand).toBeDefined();
    expect(lintCommand?.description()).toBe(
      'Run Biome linter without fixing files'
    );
  });

  it('should register format command with optional files argument', async () => {
    const { format } = await import('../scripts/format');

    program
      .command('format')
      .description('Run Biome linter and fixes files')
      .argument('[files...]', 'specific files to format (optional)')
      .action(format);

    const formatCommand = program.commands.find(
      (cmd) => cmd.name() === 'format'
    );

    expect(formatCommand).toBeDefined();
    expect(formatCommand?.description()).toBe(
      'Run Biome linter and fixes files'
    );
  });

  it('should call initialize when init command is triggered', async () => {
    const { initialize } = await import('../scripts/initialize');
    const mockInitialize = vi.mocked(initialize);

    program
      .command('init')
      .description('Initialize Ultracite in the current directory')
      .action(initialize);

    // Simulate command execution
    await program.parseAsync(['node', 'ultracite', 'init']);

    expect(mockInitialize).toHaveBeenCalled();
  });

  it('should call lint with files when lint command is triggered with arguments', async () => {
    const { lint } = await import('../scripts/lint');
    const mockLint = vi.mocked(lint);

    program
      .command('lint')
      .description('Run Biome linter without fixing files')
      .argument('[files...]', 'specific files to lint (optional)')
      .action(lint);

    // Simulate command execution with file arguments
    await program.parseAsync([
      'node',
      'ultracite',
      'lint',
      'src/index.ts',
      'src/utils.ts',
    ]);

    expect(mockLint).toHaveBeenCalledWith(['src/index.ts', 'src/utils.ts'], expect.anything(), expect.anything());
  });

  it('should call format with files when format command is triggered with arguments', async () => {
    const { format } = await import('../scripts/format');
    const mockFormat = vi.mocked(format);

    program
      .command('format')
      .description('Run Biome linter and fixes files')
      .argument('[files...]', 'specific files to format (optional)')
      .action(format);

    // Simulate command execution with file arguments
    await program.parseAsync(['node', 'ultracite', 'format', 'src/index.ts']);

    expect(mockFormat).toHaveBeenCalledWith(['src/index.ts'], expect.anything(), expect.anything());
  });
});
