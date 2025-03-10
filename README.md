# Ultracite

Ultracite is a robust linting configuration for modern TypeScript apps, built on [Biome](https://biomejs.dev/). It is incredibly opinionated and strict, enforcing the maximum amount of type safety and code quality. Once Ultracite is set up, it will automatically lint, fix and format your code on save.

<div>
  <img src="https://img.shields.io/github/actions/workflow/status/haydenbleasel/ultracite/push.yaml" alt="" />
  <img src="https://img.shields.io/npm/dy/ultracite" alt="" />
  <img src="https://img.shields.io/npm/v/ultracite" alt="" />
  <img src="https://img.shields.io/github/license/haydenbleasel/ultracite" alt="" />
</div>

## Installation

### Automatic Installation

Run the command below to install and initialize Ultracite in the current directory:

```sh
npx ultracite init
```

### Manual Installation

Run the command below to install Ultracite:

```sh
pnpm add -D --save-exact ultracite @biomejs/biome
```

If you're running [VS Code](https://code.visualstudio.com/), ensure you have the following extensions installed:

```sh
code --install-extension biomejs.biome
code --install-extension bradlc.vscode-tailwindcss
```

## Setup

Create a `biome.json` with the following contents:

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "extends": ["ultracite"]
}
```

Ultracite is designed to be used with [VS Code](https://code.visualstudio.com/). Create a `.vscode/settings.json` file with the following contents to enable full formatting and fixing on save:

```json
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "editor.defaultFormatter": "biomejs.biome",
  "editor.formatOnSave": true,
  "editor.formatOnPaste": true,
  "emmet.showExpandedAbbreviation": "never",
  "editor.codeActionsOnSave": {
    "source.fixAll.biome": "explicit",
    "source.organizeImports.biome": "explicit"
  },
  "[typescript]": {
    "editor.defaultFormatter": "biomejs.biome"
  },
  "[json]": {
    "editor.defaultFormatter": "biomejs.biome"
  },
  "[javascript]": {
    "editor.defaultFormatter": "biomejs.biome"
  },
  "[jsonc]": {
    "editor.defaultFormatter": "biomejs.biome"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "biomejs.biome"
  }
}
```

Lastly, ensure your `tsconfig.json` (if it exists) has `strictNullChecks` enabled.

```json
{
  "compilerOptions": {
    "strictNullChecks": true
  }
}
```

## Usage

Ultracite will automatically lint, fix and format your code on save. If you'd like to run Ultracite manually, you can do so with the following command:

```sh
npx ultracite
```

## Configuration

While Ultracite is designed to be zero-config, you can modify anything you'd like in your `biome.json` file. For example, to enable the `noAutofocus` rule, you can do the following:

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "extends": ["ultracite"],
  "linter": {
    "rules": {
      "a11y": {
        "noAutofocus": "off"
      }
    }
  }
}
```

You can also disable rules on a per-line basis by adding a comment to the end of the line:

```tsx
// biome-ignore lint/security/noDangerouslySetInnerHtml: I do what I want mate.
<div dangerouslySetInnerHTML={{ ... }} />
```

## Notes

Ultracite was previously built on [ESLint](https://eslint.org/), [Prettier](https://prettier.io/) and [Stylelint](https://stylelint.io/). If you'd like to use that stack, you can install a compatible version of Ultracite with the following command:

```sh
pnpm add -D ultracite@3 eslint@8 prettier stylelint typescript jest
```
