# Ultracite

**A production-grade, zero-configuration preset for ESLint, Biome, and Oxlint.**

Ultracite helps you and your AI models write consistent, type-safe code without the hassle of configuration. Pick your preferred toolchain, run one command, and get hundreds of battle-tested rules wired up in seconds — across single repos and monorepos alike.

<div>
  <img src="https://img.shields.io/npm/dy/ultracite" alt="" />
  <img src="https://img.shields.io/npm/v/ultracite" alt="" />
  <img src="https://img.shields.io/github/license/haydenbleasel/ultracite" alt="" />
</div>

## Quick Start

```sh
npx ultracite init
```

The interactive setup guides you through choosing your formatter/linter, framework, editor, and AI agents, then installs and configures everything for you. Re-run it any time to adjust your setup.

> Prefer a different package manager? Ultracite detects yours automatically, or you can run it with `pnpm dlx`, `yarn dlx`, or `bunx`.

## Commands

| Command | Description |
| --- | --- |
| `ultracite init` | Initialize Ultracite in the current directory (interactive by default). |
| `ultracite check [files...]` | Lint without writing changes. Unknown flags are passed through to the underlying linter. |
| `ultracite fix [files...]` | Lint and auto-fix. Unknown flags are passed through to the underlying linter. |
| `ultracite doctor` | Verify your Ultracite setup and diagnose configuration issues. |

`check` and `fix` accept an optional list of files or globs; omit them to run against the whole project. Add `-v` / `--version` or `-h` / `--help` for CLI details.

Common `init` flags for non-interactive / CI use:

| Flag | Description |
| --- | --- |
| `--linter <linter>` | Toolchain to configure (Biome, ESLint, or Oxlint). |
| `--pm <pm>` | Package manager to use. |
| `--editors <editors...>` | Editors to configure (use `universal` for `.vscode/settings.json`). |
| `--agents <agents...>` | AI agents to enable (use `universal` for `AGENTS.md`). |
| `--frameworks <frameworks...>` | Frameworks in use, for framework-aware rules. |
| `--type-aware` | Enable type-aware linting. |
| `--install-skill` | Install the reusable Ultracite skill after setup. |
| `--skip-install` | Configure without installing dependencies. |
| `--quiet` | Suppress interactive prompts (auto-enabled in CI). |

See the [CLI reference](https://ultracite.ai/) for the full, current list of options.

## Supported Tools

- **Biome** — All-in-one formatting and linting in a single fast binary.
- **ESLint + Prettier + Stylelint** — The most mature ecosystem with the largest plugin support.
- **Oxlint + Oxfmt** — Rust-based tooling that runs dramatically faster than ESLint, part of the Oxc ecosystem.

## Key Features

### ⚡ Subsecond Performance

Built around Rust-based tooling for near-instant analysis. On-save checks feel seamless and stay out of your way.

### 🎯 Zero-Config by Design

Hundreds of preconfigured rules tuned for modern JavaScript and TypeScript. It works out of the box, and you can override anything when you need to.

### 🤖 AI-Ready

Generate ruleset and context files for a wide range of AI agents — Claude Code, GitHub Copilot, Cursor, Gemini, and many more — so humans and models share one consistent style.

### 🏗️ Monorepo Ready

One unified toolchain configuration across every package and app, eliminating duplicate config files while keeping standards consistent.

## Using the presets directly

Beyond the CLI, Ultracite publishes ready-made config presets you can extend in your own setup (Biome, ESLint, Oxlint, Oxfmt, Prettier, and Stylelint). `ultracite init` wires these up for you; if you'd rather reference them by hand, the [configuration docs](https://ultracite.ai/) list the exact import paths and extension points for each toolchain.

## Documentation

Full setup guides, configuration options, rule references, framework and editor integrations, and examples live in the docs:

- **Website:** https://www.ultracite.ai/
- **Issues & discussions:** https://github.com/haydenbleasel/ultracite

## License

MIT © [Hayden Bleasel](https://github.com/haydenbleasel)
