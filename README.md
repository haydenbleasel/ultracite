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

export default harmony;
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
  "eslint.experimental": {
    "useFlatConfig": true
  },
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

## Upgrading from V1

Harmony v2 is a complete rewrite of the original Harmony package. It uses the new ESLint Flat Config, which means that you need a lot less peer dependencies and that you can use the new `eslint.config.mjs` format. If you're upgrading from v1, you'll need to do the following:

1. Swap out the `eslintConfig` in your `package.json` for the new `eslint.config.mjs` as above.
2. Remove all old peer deps: `yarn remove @next/eslint-plugin-next @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint-plugin-import eslint-plugin-jest eslint-plugin-jsx-a11y eslint-plugin-n eslint-plugin-promise eslint-plugin-react eslint-plugin-react-hooks prettier-plugin-tailwindcss stylelint-prettier`
3. Add the new deps: `yarn add -D @haydenbleasel/harmony eslint prettier stylelint typescript jest`
4. Upgrade your `.vscode/settings.json` file (see above).
5. Ensure your `tsconfig.json` includes your new ESLint config and that `strictNullChecks` is enabled.

Also, as of writing this README, you need to be on the pre-release version of the ESLint extension for VSCode.
