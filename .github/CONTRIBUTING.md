# Contributing to Ultracite

Thank you for your interest in contributing! Ultracite is an open-source project, and contributions are welcome! Whether you want to improve the documentation, adjust the configuration presets, or contribute code, here's how you can get involved.

## Source Code

Ultracite's source code is hosted on GitHub at [haydenbleasel/ultracite](https://github.com/haydenbleasel/ultracite). The repository contains all configuration files, build scripts, CLI implementation, and documentation.

## Monorepo Structure

Ultracite is a monorepo managed with bun workspaces and Turbo:

- `packages/cli` - The main Ultracite CLI package and Biome configuration
  - `biome.jsonc` - The core Biome configuration with all rules
  - `src/` - CLI implementation for `ultracite init`, `check`, `fix`, etc.
  - `src/agents/` - AI/IDE agents rules
- `apps/docs` - Documentation website built with [Fumadocs](https://fumadocs.dev/)

## Getting Started

1. Fork the repository on GitHub
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/ultracite.git`
3. Install dependencies: `bun install`
4. Create a new branch for your feature or bug fix: `git checkout -b feature/your-feature-name`
5. Make your changes
6. Run tests: `bun test`
7. Build packages: `bun run build`
8. Commit your changes with clear, descriptive commit messages
9. Push to your fork
10. Submit a Pull Request

### Testing Your Changes Locally

To test your local version of Ultracite on a sample project:

1. Build the CLI: `cd packages/cli && bun run build`
2. Link it locally: `bun link --global` (from `packages/cli`)
3. In your test project: `bun link --global ultracite`
4. Run `npx ultracite init` or other commands to test your changes
5. Alternatively, use `npm pack` to create a tarball and install it in your test project

### Editing Documentation

To work on the documentation site:

```bash
cd apps/docs
bun install
bun dev
```

This will start the Fumadocs app on [http://localhost:3000](http://localhost:3000). Documentation content is in `apps/docs/content/`.

## Changesets

We use [Changesets](https://github.com/changesets/changesets) to manage versions and changelogs. When you make changes that should be released, you need to create a changeset:

1. Run `bun changeset` in the root directory
2. Select the packages you've changed (use space to select, enter to confirm)
3. Choose the appropriate version bump:
   - `patch` - Bug fixes and minor changes
   - `minor` - New features that don't break existing functionality
   - `major` - Breaking changes
4. Write a clear description of your changes (this will appear in the changelog)
5. Commit the generated changeset file in `.changeset/` with your changes

**When to create a changeset:**
- Bug fixes
- New features
- Breaking changes
- Performance improvements
- Documentation updates that affect usage

**When NOT to create a changeset:**
- Internal refactoring with no user-facing changes
- Test updates
- Build configuration changes
- README or contributing guide updates

## Testing Rule Changes

If you modify Biome rules in `packages/cli/biome.jsonc`:

1. Test on various sample code to ensure no unexpected side effects
2. Run Ultracite on real projects to check for false positives
3. Consider backward compatibility - will this break existing users' workflows?
4. Run `bun check` on the Ultracite codebase itself
5. Update AI/IDE rules in `packages/cli/src/agents/rules.ts` if needed

**Biome vs Ultracite Contributions:**
- To add or change how a rule works internally → Contribute to [Biome's repository](https://github.com/biomejs/biome)
- To adjust which rules are enabled or their severity → Contribute to Ultracite
- Once Biome releases a new rule version, Ultracite can bump the dependency and enable it

## Pull Request Guidelines

- Ensure your PR addresses a specific issue or adds value to the project
- Include a clear description of the changes and rationale
  - Example: "Rule X causes too many false positives, turning it off by default"
  - Example: "Adding support for Y framework"
- Keep changes focused and atomic
- Follow existing code style and conventions
- Include tests if applicable
- **Add a changeset if your changes affect the published package**
- Update documentation as needed
- Ensure all tests pass: `bun test`
- Write clear commit messages
- Keep consistency with the project's coding style

## Working in the Monorepo

### Running Commands

From the root directory:
- `bun test` - Run all tests across all packages
- `bun run build` - Build all packages
- `bun check` - Run Ultracite linter on the codebase
- `bun fix` - Auto-fix linting issues

From a specific package (e.g., `packages/cli`):
- `bun test` - Run tests for that package only
- `bun run build` - Build that package only

### Package Dependencies

- Use `bun add <package>` to add dependencies to the root
- Use `bun add <package> --filter ultracite` to add to the CLI package
- Use `bun add <package> --filter docs` to add to the docs site

## Code Style

- Run `bun fix` before committing to auto-format your code with Ultracite
- Write clear, self-documenting code
- Add comments only when necessary to explain complex logic
- Use meaningful variable and function names
- Follow TypeScript best practices (the linter will guide you)

## Reporting Issues and Discussions

### Bugs and Issues

Use the GitHub [issue tracker](https://github.com/haydenbleasel/ultracite/issues) to report bugs:

- Check if the issue already exists before creating a new one
- Provide a clear description with examples
- Include steps to reproduce if applicable
- Add relevant labels

### Feature Requests and Discussions

For potential changes, feature requests, or general discussions (e.g., "Ultracite should have an option to...", or "Rule X is too strict..."), please open a [discussion](https://github.com/haydenbleasel/ultracite/discussions).

### Questions or Need Help?

Feel free to open an issue for questions or join our discussions. We're here to help!

## Code of Conduct

Please note that this project follows a Code of Conduct. By participating, you are expected to uphold this code.

Thank you for contributing!
