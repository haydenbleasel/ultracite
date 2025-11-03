# CLAUDE.md - Ultracite Development Guide

## Project Overview

Ultracite is a zero-config Biome preset that provides AI-ready formatting and linting for JavaScript/TypeScript projects. It wraps Biome with sensible defaults and extends it with AI/IDE integration capabilities.

**Key Features:**
- Lightning-fast formatting and linting (built on Rust-based Biome)
- Zero-config setup with `npx ultracite init`
- Hundreds of strict linting rules for type safety and code quality
- AI/IDE integration for consistent code generation
- Monorepo support

## Architecture

### Core Components

1. **CLI (`scripts/index.ts`)**
   - Entry point for the `ultracite` command
   - Three commands: `check`, `fix`, and `doctor`
   - Built with Commander.js

2. **Biome Configuration (`biome.jsonc`)**
   - The heart of Ultracite
   - Comprehensive rule set covering a11y, complexity, correctness, performance, security, style, and suspicious patterns
   - Formatting settings: 2 spaces, LF line endings, 80-char width

3. **AI/IDE Rules (`docs/lib/rules.ts`)**
   - 273 rules that guide AI assistants in code generation
   - Shared across all IDE integrations
   - Focus on JavaScript/TypeScript best practices

4. **IDE Integrations (`scripts/`)**
   - Each integration follows the same pattern:
     - `exists()`: Check if configuration exists
     - `create()`: Create initial configuration
     - `update()`: Update existing configuration
   - Current integrations: Cursor, GitHub Copilot, Windsurf, Zed
   - New integrations: Claude Code, OpenAI Codex (being added)

## Development Workflow

### Setup
```bash
bun install
```

### Testing
```bash
bun test              # Run all tests
bun test:coverage     # Run tests with coverage
```

### Building
```bash
bun build             # Build the CLI with tsup
```

### Adding New IDE Integrations

1. Create a new script in `scripts/` following the pattern:
```typescript
import { mkdir, writeFile } from 'node:fs/promises';
import { rulesFile } from '../docs/lib/rules';
import { exists } from './utils';

const path = './path/to/config';

export const integration = {
  exists: () => exists(path),
  create: async () => {
    await mkdir('./path/to', { recursive: true });
    await writeFile(path, rulesFile);
  },
  update: async () => {
    await mkdir('./path/to', { recursive: true });
    await writeFile(path, rulesFile);
  },
};
```

2. Add to `scripts/initialize.ts`:
   - Import the integration
   - Add to multiselect options
   - Add handler in the conditional logic

3. Create corresponding test in `__tests__/`

## Key Conventions

### Code Style
- Use single quotes for strings (enforced by Biome)
- 2-space indentation
- Semicolons required
- Arrow functions preferred
- Explicit type annotations avoided when TypeScript can infer

### Testing
- Tests use `bun:test`
- Mock file system operations with `vi.mock`
- Test both success and failure cases
- Follow existing test patterns

### Error Handling
- Use try-catch blocks for external operations
- Exit with code 1 on failures
- Provide clear error messages

### File Naming
- Use kebab-case for file names
- Match test files to source files (e.g., `foo.ts` → `foo.test.ts`)

## Important Commands

### Development
```bash
# Run Biome formatter on this project
npx @biomejs/biome check --write ./

# Run Biome linter without fixes
npx @biomejs/biome check ./

# Test the CLI locally
node ./dist/index.js init
```

### Git Workflow
- Main branch: `main`
- Version bumps are automated with `[skip ci]` commits
- Follow conventional commits when possible

## Working with the Documentation Site

The `docs/` directory contains a Next.js website:
- Documentation content in `docs/content/`
- Rules definition in `docs/lib/rules.ts`
- To run locally: `cd docs && bun dev`

## Notes for AI Assistants

1. **Always run tests** after making changes to ensure nothing breaks
2. **Follow existing patterns** - consistency is key in this codebase
3. **The rules in `docs/lib/rules.ts`** are the source of truth for AI/IDE integrations
4. **Biome configuration** should only be modified with careful consideration of downstream impacts
5. **When adding features**, update both the code and relevant tests

## Common Tasks

### Adding a New Linting Rule
1. Add to `biome.jsonc` in the appropriate category
2. Test the rule works as expected
3. Consider if it should be added to AI/IDE rules in `docs/lib/rules.ts`

### Updating AI/IDE Rules
1. Modify `docs/lib/rules.ts`
2. Run `bun test` to ensure all integrations still work
3. Users will get updated rules on next `ultracite init`

### Debugging Issues
1. Check if it's a Biome issue first: `npx @biomejs/biome check`
2. Enable verbose output in the scripts
3. Check test files for expected behavior

Remember: Ultracite is a developer tool focused on productivity and code quality. Every change should make developers' lives easier while maintaining high standards.