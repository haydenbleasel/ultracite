# Contributing to Ultracite

Thank you for your interest in contributing! Ultracite is an open-source project, and contributions are welcome! Whether you want to improve the documentation, adjust the configuration presets, or contribute code, here's how you can get involved.

## Source Code

Ultracite's source code is hosted on GitHub at [haydenbleasel/ultracite](https://github.com/haydenbleasel/ultracite). The repository contains all configuration presets, build scripts, the CLI implementation, and the documentation site. `AGENTS.md` at the repository root is a detailed map of the codebase and its conventions; it is written for coding agents but is just as useful for people.

## Monorepo Structure

Ultracite is a monorepo managed with bun workspaces and Turbo:

- `packages/cli` - The published `ultracite` package
  - `config/` - The presets for every supported linter: `oxlint/`, `biome/`, `eslint/`, `oxfmt/`, `prettier/`, `stylelint/`, plus `shared/ignores.mjs`, the ignore list every tool imports
  - `src/` - CLI implementation for `ultracite init`, `check`, `fix`, `doctor` and `upgrade`
  - `src/data/rules.ts` - The AI agent rules (AGENTS.md, CLAUDE.md, etc.) that `init` writes into user projects
  - `__tests__/` - The test suite
- `apps/docs` - Documentation and marketing site, built with [blume](https://github.com/haydenbleasel/blume) and deployed to Cloudflare Workers
- `skills/ultracite` - The Ultracite agent skill, copied into the npm package on publish
- `benchmark/` - Performance regression gate that runs on every pull request

## Getting Started

1. Fork the repository on GitHub
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/ultracite.git`
3. Install dependencies: `bun install`
4. Create a new branch for your feature or bug fix: `git checkout -b feature/your-feature-name`
5. Make your changes
6. Run the checks: `bun run fix`, `bun run check`, `bun run types`, `bun test`
7. If you touched anything under `packages/cli/config`, also run `bun run validate:configs`
8. Commit your changes with clear, descriptive commit messages
9. Push to your fork
10. Submit a Pull Request

The husky pre-commit hook runs the same checks, so a commit that goes through locally should pass CI.

### Testing Your Changes Locally

To test your local version of Ultracite on a sample project:

1. Build the CLI: `bun run build --filter ultracite`
2. Link it locally: `bun link --global` (from `packages/cli`)
3. In your test project: `bun link --global ultracite`
4. Run `ultracite init` or other commands to test your changes
5. Alternatively, use `npm pack` from `packages/cli` to create a tarball and install it in your test project

You can also run the CLI straight from source without building. From inside your test project:

```bash
bun /path/to/ultracite/packages/cli/src/index.ts init
```

### Editing Documentation

To work on the documentation site:

```bash
cd apps/docs
bun dev
```

Documentation content is in `apps/docs/docs/` as MDX files; the `meta.ts` file in each folder controls sidebar order. The changelog page is generated from GitHub releases at build time, so it is empty in local development unless `GITHUB_TOKEN` is set.

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
- Changes to which rules a preset enables, or their severity
- Breaking changes
- Performance improvements
- Documentation updates that affect usage

**Bumping a linter or formatter version:**

Every release is verified against the toolchain versions in `packages/cli/package.json`: the exact `@biomejs/biome` dev dependency and the plugin versions that `ultracite init` installs, plus the optional `peerDependencies` ranges for `@biomejs/biome`, `eslint`, `prettier`, `stylelint`, `oxlint` and `oxfmt`. Those ranges are what package managers warn against and what `ultracite doctor` checks, so they must reflect the oldest tool release the presets actually work with.

When a bump enables rules (or config options) that older tool releases don't know about:

1. Raise the matching `peerDependencies` range to the new minimum.
2. State the new minimum in the changeset, on its own line, e.g. `Requires oxlint >= 1.82.0` — users on an older tool get a hard "unknown key" crash rather than a warning, so it must be impossible to miss in the changelog.

If the bump adds no new rules, say so in the changeset ("the peer range stays at ...") so readers know no action is needed.

**When NOT to create a changeset:**

- Internal refactoring with no user-facing changes
- Test updates
- Build configuration changes
- README or contributing guide updates
- Changes to the docs site

## Testing Rule Changes

The presets live in `packages/cli/config/<linter>/<preset>/`. The Oxlint presets are the benchmark: decide a rule's severity in `config/oxlint` first, then mirror it in the ESLint and Biome presets. `bun run validate:configs` loads every preset and fails on any ESLint/Oxlint divergence that is not allowlisted with a reason in `packages/cli/scripts/compare-rule-parity.ts`.

If you modify a preset:

1. Test on various sample code to ensure no unexpected side effects
2. Run Ultracite on real projects to check for false positives
3. Consider backward compatibility - will this break existing users' workflows?
4. Run `bun run check` on the Ultracite codebase itself (it lints itself with the Oxlint presets)
5. Run `bun run validate:configs`
6. Update the AI agent rules in `packages/cli/src/data/rules.ts` and `skills/ultracite/references/code-standards.md` if the guidance changes

**Linter vs Ultracite Contributions:**

- To add or change how a rule works internally → Contribute to the linter itself ([Oxlint](https://github.com/oxc-project/oxc), [Biome](https://github.com/biomejs/biome), or the relevant ESLint plugin)
- To adjust which rules are enabled or their severity → Contribute to Ultracite
- Once a linter releases a new rule, Ultracite can bump the dependency and enable it

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
- `bun run check` - Run Ultracite linter on the codebase
- `bun run fix` - Auto-fix linting and formatting issues
- `bun run types` - Type check every package
- `bun run validate:configs` - Load every preset and check cross-linter rule parity

From a specific package (e.g., `packages/cli`):

- `bun test` - Run tests for that package only
- `bun run build` - Build that package only

### Package Dependencies

- Use `bun add <package>` to add dependencies to the root
- Use `bun add <package> --filter ultracite` to add to the CLI package
- Use `bun add <package> --filter docs` to add to the docs site

## Code Style

- Run `bun run fix` before committing to auto-format your code with Ultracite
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
