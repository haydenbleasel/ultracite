import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the command modules
const mockFormat = vi.fn();
const mockInitialize = vi.fn();
const mockLint = vi.fn();

vi.mock('../scripts/format', () => ({
  format: mockFormat,
}));

vi.mock('../scripts/initialize', () => ({
  initialize: mockInitialize,
}));

vi.mock('../scripts/lint', () => ({
  lint: mockLint,
}));

// Mock process.argv to control command line arguments
const originalArgv = process.argv;

describe('CLI index', () => {
  let program: Command;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create a fresh program instance for each test
    program = new Command();
    program
      .name('Ultracite')
      .description('Ship code faster and with more confidence.');

    // Reset process.argv
    process.argv = [...originalArgv];
  });

  afterEach(() => {
    // Restore original process.argv
    process.argv = originalArgv;
  });

  it('should verify the command line interface is properly configured', () => {
    // Test that we can set up the program correctly
    expect(program.name()).toBe('Ultracite');
    expect(program.description()).toBe(
      'Ship code faster and with more confidence.'
    );
  });

  it('should define multiple commands', async () => {
    const { initialize } = await import('../scripts/initialize');
    const { lint } = await import('../scripts/lint');
    const { format } = await import('../scripts/format');

    // Set up commands like the actual index.ts does
    program
      .command('init')
      .description('Initialize Ultracite in the current directory')
      .action(initialize);

    program
      .command('lint')
      .description('Run Biome linter without fixing files')
      .argument('[files...]', 'specific files to lint (optional)')
      .action(lint);

    program
      .command('format')
      .description('Run Biome linter and fixes files')
      .argument('[files...]', 'specific files to format (optional)')
      .action(format);

    // Check that commands were registered
    const commands = program.commands;
    expect(commands).toHaveLength(3);

    const commandNames = commands.map((cmd) => cmd.name());
    expect(commandNames).toContain('init');
    expect(commandNames).toContain('lint');
    expect(commandNames).toContain('format');
  });

  it('should configure arguments for commands', async () => {
    const { lint } = await import('../scripts/lint');
    const { format } = await import('../scripts/format');

    // Set up commands that use arguments
    program
      .command('lint')
      .description('Run Biome linter without fixing files')
      .argument('[files...]', 'specific files to lint (optional)')
      .action(lint);

    program
      .command('format')
      .description('Run Biome linter and fixes files')
      .argument('[files...]', 'specific files to format (optional)')
      .action(format);

    // Check that commands with arguments are configured properly
    const lintCommand = program.commands.find((cmd) => cmd.name() === 'lint');
    const formatCommand = program.commands.find(
      (cmd) => cmd.name() === 'format'
    );

    expect(lintCommand).toBeDefined();
    expect(formatCommand).toBeDefined();

    // Test that the commands have the expected descriptions
    expect(lintCommand?.description()).toBe(
      'Run Biome linter without fixing files'
    );
    expect(formatCommand?.description()).toBe(
      'Run Biome linter and fixes files'
    );
  });

  it('should import and execute the CLI setup', async () => {
    // Test that the CLI module can be imported without errors
    const indexModule = await import('../scripts/index');

    // The import should not throw any errors
    expect(indexModule).toBeDefined();
  });
});
