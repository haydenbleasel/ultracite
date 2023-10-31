<img src="./logo.svg" width="96" height="96" style="width: 96px; height: 96px;" alt="">

<br />

# Harmony

**Strict, opinionated ESLint config for modern TypeScript apps.**

<img src="https://img.shields.io/github/actions/workflow/status/haydenbleasel/eslint-config-harmony/push.yaml" alt="" />

<img src="https://img.shields.io/npm/dy/eslint-config-harmony" alt="" />

<img src="https://img.shields.io/npm/v/eslint-config-harmony" alt="" />

<img src="https://img.shields.io/github/license/haydenbleasel/eslint-config-harmony" alt="" />

<hr />

Harmony is an ESLint config for modern TypeScript apps. It's designed to be used with [Prettier](https://prettier.io/) and [Stylelint](https://stylelint.io/). It is incredibly opinionated and strict, enforcing the maximum amount of type safety and code quality through ESLint rules and TypeScript compiler options. It is designed for [Next.js](https://nextjs.org/) apps, but can be used with any TypeScript project, such as [React Native](https://reactnative.dev/) or [Node.js](https://nodejs.org/).

By default, Harmony combines with pre-defined rulesets for [ESLint](https://eslint.org/), as well as:

- [Import](https://www.npmjs.com/package/eslint-plugin-import)
- [jsx-a11y](https://www.npmjs.com/package/eslint-plugin-jsx-a11y)
- [React](https://www.npmjs.com/package/eslint-plugin-react)
- [React Hooks](https://www.npmjs.com/package/eslint-plugin-react-hooks)
- [jest](https://www.npmjs.com/package/eslint-plugin-jest)
- [promise](https://www.npmjs.com/package/eslint-plugin-promise)
- [n](https://www.npmjs.com/package/eslint-plugin-n)
- [Typescript](https://www.npmjs.com/package/@typescript-eslint/eslint-plugin)
- [Prettier](https://www.npmjs.com/package/eslint-plugin-prettier)
- [Tailwind](https://github.com/tailwindlabs/prettier-plugin-tailwindcss)
- [Stylelint](https://stylelint.io/)
- [Stylelint-Prettier](https://www.npmjs.com/package/stylelint-prettier)
- [Next.js](https://nextjs.org/docs/basic-features/eslint#eslint-plugin)
- [Cypress](https://www.npmjs.com/package/eslint-plugin-cypress)

## Installation

Run the command below to install Harmony with peer dependencies:

```sh
yarn add -D eslint-config-harmony eslint prettier stylelint typescript jest
```

If you're running [VS Code](https://code.visualstudio.com/), ensure you have the following extensions installed:

```sh
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension bradlc.vscode-tailwindcss
code --install-extension stylelint.vscode-stylelint
```

## Usage

Simply create an `eslint.config.mjs` that looks like this.

```js
import harmony from 'eslint-config-harmony';

export default harmony;
```

Additionally, add the following to your `package.json`. If you don't use a particular tool (say, [Stylelint](https://stylelint.io/)) then you can simply not include the field.

```json
{
  "prettier": "eslint-config-harmony/prettier",
  "stylelint": {
    "extends": "eslint-config-harmony/stylelint"
  }
}
```

Create the following `.vscode/settings.json`. This will enable full formatting on save.

```json
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.formatOnPaste": true,
  "emmet.showExpandedAbbreviation": "never",
  "editor.codeActionsOnSave": {
    "source.fixAll.esbenp.prettier-vscode": true,
    "source.fixAll.eslint": true,
    "source.fixAll.stylelint": true
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

Lastly, ensure your `tsconfig.json` (if it exists) includes your new ESLint config and that `strictNullChecks` is enabled.

```json
{
  "compilerOptions": {
    "strictNullChecks": true
  },
  "include": ["eslint.config.mjs"]
}
```
