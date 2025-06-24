# Ultracite

**The AI-ready formatter that helps you write and generate code _faster_.**

Ultracite is a zero-config [Biome](https://biomejs.dev) preset that provides a robust linting and formatting experience for your team and your AI integrations. Built in Rust for lightning-fast performance, it automatically formats your code and fixes lint issues on save without interrupting your workflow.

<div>
  <img src="https://img.shields.io/github/actions/workflow/status/haydenbleasel/ultracite/push.yaml" alt="" />
  <img src="https://img.shields.io/npm/dy/ultracite" alt="" />
  <img src="https://img.shields.io/npm/v/ultracite" alt="" />
  <img src="https://img.shields.io/github/license/haydenbleasel/ultracite" alt="" />
</div>

![Ultracite](./docs/app/opengraph-image.jpg)

## Quick Start

Install and initialize Ultracite in your project:

```sh
npx ultracite init
```

That's it! Ultracite will automatically format your code and fix lint issues every time you save. No configuration required.

## Key Features

### ⚡ **Subsecond Performance**
Built in Rust for instant code analysis and processing. On-save checks feel seamless without interrupting your workflow.

### 🎯 **Zero-Config by Design**
Preconfigured rules optimized for Next.js, React, and TypeScript projects with sensible defaults. Customize when needed, but it works perfectly out of the box.

### 🛡️ **Maximum Type Safety**
Enforces strict type checking and best practices by default, catching type errors and preventing unsafe code patterns before they become problems.

### 🏗️ **Monorepo Ready**
Unified toolchain configuration across all packages and apps, eliminating thousands of lines of duplicate config files while maintaining consistency.

### 🤖 **AI-Friendly**
Ensures consistent code style and quality across all team members and AI models, eliminating debates over formatting and reducing code review friction. Supports GitHub Copilot, Cursor, Windsurf, Zed, Claude Code, and OpenAI Codex.

### 🔧 **Intuitive and Robust**
Automatically reformats code and fixes lint issues on save, with clear error reporting for issues that need manual attention.

## How It Works

Once set up, Ultracite runs mostly in the background:

- **Automatic formatting** on every save
- **Lint fixes** applied automatically when possible
- **Type safety** enforced with strict rules
- **Import organization** and cleanup
- **Accessibility improvements** built-in

Because Biome is extremely fast, even on large projects, running Ultracite's checks is instantaneous and can comfortably run on every save without lag.

## Command Line Usage

```sh
# Format your code
npx ultracite format

# Check for lint issues
npx ultracite lint
```

## Why Ultracite?

Finally — a lightning-fast formatter that ensures you, your team, and your AI agents are writing code in harmony. Stop spending time on code style debates and formatting fixes. Let Ultracite handle the mundane so you can focus on building and shipping.

Used by over [500 developers](https://github.com/haydenbleasel/ultracite/network/dependents)

## Tests

Tests are written in [Vitest](https://vitest.dev). You can run them with:

```bash
pnpm test
```

Check the coverage of the CLI with:

```bash
pnpm test:coverage
```

---

Read the [docs](https://www.ultracite.ai/) for detailed setup instructions, configuration options, and examples.