# Ultracite

Ultracite is a robust linting preset for modern TypeScript apps. It's comprised of configuration files for [ESLint](https://eslint.org/), [Prettier](https://prettier.io/) and [Stylelint](https://stylelint.io/). It is incredibly opinionated and strict, enforcing the maximum amount of type safety and code quality through ESLint rules and TypeScript compiler options. It is designed for [Next.js](https://nextjs.org/) apps, but can be used with any TypeScript project, such as [React Native](https://reactnative.dev/) or [Node.js](https://nodejs.org/).

<img src="https://img.shields.io/github/actions/workflow/status/haydenbleasel/ultracite/push.yaml" alt="" />

<img src="https://img.shields.io/npm/dy/ultracite" alt="" />

<img src="https://img.shields.io/npm/v/ultracite" alt="" />

<img src="https://img.shields.io/github/license/haydenbleasel/ultracite" alt="" />

## Features

### ESLint

Ultracite uses [ESLint](https://eslint.org/) to enforce code quality and type safety. It includes a wide range of rules to ensure your code is consistent and error-free. Ultracite combines with pre-defined rulesets for ESLint, as well as the following plugins: [Import](https://www.npmjs.com/package/eslint-plugin-import), [jsx-a11y](https://www.npmjs.com/package/eslint-plugin-jsx-a11y), [React](https://www.npmjs.com/package/eslint-plugin-react), [React Hooks](https://www.npmjs.com/package/eslint-plugin-react-hooks), [jest](https://www.npmjs.com/package/eslint-plugin-jest), [promise](https://www.npmjs.com/package/eslint-plugin-promise), [n](https://www.npmjs.com/package/eslint-plugin-n), [Typescript](https://www.npmjs.com/package/@typescript-eslint/eslint-plugin), [Prettier](https://www.npmjs.com/package/eslint-plugin-prettier), [Next.js](https://nextjs.org/docs/basic-features/eslint#eslint-plugin), [Cypress](https://www.npmjs.com/package/eslint-plugin-cypress), [HTML](https://www.npmjs.com/package/eslint-plugin-html) and [SonarJS](https://www.npmjs.com/package/eslint-plugin-sonarjs).

### Prettier

Ultracite uses [Prettier](https://prettier.io/) to format your code. It's configured to work with ESLint, so you can use both tools together without conflicts. Ultracite includes a pre-defined Prettier configuration that ensures your code is formatted consistently, as well as the [Tailwind](https://github.com/tailwindlabs/prettier-plugin-tailwindcss) plugin for automatic class sorting.

### Stylelint

Ultracite uses [Stylelint](https://stylelint.io/) to enforce CSS code quality. Ultracite combines with pre-defined rules for Stylelint, as well as the [Stylelint-Prettier](https://www.npmjs.com/package/stylelint-prettier) plugin to ensure Stylelint and Prettier work together without conflicts.

## Installation

Run the command below to install Ultracite with peer dependencies:

```sh
pnpm add -D ultracite eslint@8 prettier stylelint typescript jest
```

If you're running [VS Code](https://code.visualstudio.com/), ensure you have the following extensions installed:

```sh
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension bradlc.vscode-tailwindcss
code --install-extension stylelint.vscode-stylelint
```

## Setup

Create an `eslint.config.mjs` with the following contents:

```js
export { default } from 'ultracite';
```

Create a `prettier.config.mjs` with the following contents:

```js
export { default } from 'ultracite/prettier';
```

Create a `stylelint.config.mjs` with the following contents:

```js
export { default } from 'ultracite/stylelint';
```

Ultracite is designed to be used with [VS Code](https://code.visualstudio.com/), and includes a `.vscode/settings.json` file that enables full formatting on save. Create a `.vscode/settings.json` file with the following contents:

```json
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.formatOnPaste": true,
  "emmet.showExpandedAbbreviation": "never",
  "editor.codeActionsOnSave": {
    "source.fixAll.esbenp.prettier-vscode": "explicit",
    "source.fixAll.eslint": "explicit",
    "source.fixAll.stylelint": "explicit"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "eslint.experimental.useFlatConfig": true,
  "eslint.options": {
    "overrideConfigFile": "eslint.config.mjs"
  }
}
```

<!-- prettier-ignore -->
> [!NOTE]
> If you are using the pre-release version of the ESLint extension, you may need to use `eslint.useFlatConfig` instead of `eslint.experimental.useFlatConfig`.

Lastly, ensure your `tsconfig.json` (if it exists) includes your new ESLint config and that `strictNullChecks` is enabled.

```json
{
  "compilerOptions": {
    "strictNullChecks": true
  },
  "include": ["eslint.config.mjs"]
}
```

## Usage

Once Ultracite is set up, it will automatically format your code on save.

## Configuration

You can opt-out of certain rules by modifying your `eslint.config.mjs` file. For example, here's a common exception I use to avoid linting [shadcn/ui](https://ui.shadcn.com/) components:

```js
import ultracite from 'ultracite';

ultracite.forEach((config) => {
  config.ignores = config.ignores || [];
  config.ignores.push('./components/ui/**/*');
});

export default ultracite;
```

## Debugging

If you're having issues with Ultracite, you can open the ESLint Output panel in VS Code to see what's going on. Optimally, it should look something like this:

```
[Info  - 10:42:49 PM] ESLint server is starting.
[Info  - 10:42:49 PM] ESLint server running in node v18.15.0
[Info  - 10:42:49 PM] ESLint server is running.
[Info  - 10:42:50 PM] ESLint library loaded from: /Users/haydenbleasel/GitHub/ultracite/node_modules/.pnpm/eslint@8.51.0/node_modules/eslint/lib/unsupported-api.js
```

If you see any errors, it could be related to peer dependencies or changes in dependency versions. Feel free to report these as issues.

## Roadmap

- https://github.com/ota-meshi/eslint-plugin-yml
- https://github.com/mdx-js/eslint-mdx/tree/master/packages/eslint-plugin-mdx
- https://github.com/eslint/eslint-plugin-markdown
- https://github.com/amilajack/eslint-plugin-compat
- https://github.com/sindresorhus/eslint-plugin-unicorn
