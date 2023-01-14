# Harmony

_Unified, strict editor configuration for modern web apps._

Harmony is a unified, strict editor configuration for modern React apps, designed to work seamlessly together and enforce hyper-strict syntax rules as you type to help you write bulletproof code. By default it supports React and Typescript, but also contains support for Tailwind as well as particular frameworks, such as Next.js and React Native / Expo.

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

## Installation

Run the command below to install Harmony with peer dependencies:

```sh
yarn add -D @haydenbleasel/harmony eslint prettier stylelint typescript jest
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
import harmony from '@haydenbleasel/harmony';

const config = [harmony];

export default config;
```

Additionally, add the following to your `package.json`. If you don't use a particular tool (say, [Stylelint](https://stylelint.io/)) then you can simply not include the field.

```json
{
  "prettier": "@haydenbleasel/harmony/prettier",
  "stylelint": {
    "extends": "@haydenbleasel/harmony/stylelint"
  }
}
```

Lastly, create the following `.vscode/settings.json`. This will enable full formatting on save.

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
  "eslint.experimental": {
    "useFlatConfig": true
  },
  "eslint.options": {
    "overrideConfigFile": "eslint.config.mjs"
  }
}
```
