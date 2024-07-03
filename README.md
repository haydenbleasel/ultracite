# Ultracite

Ultracite is a robust linting preset for modern TypeScript apps. It's comprised of configuration files for [ESLint](https://eslint.org/), [Prettier](https://prettier.io/) and [Stylelint](https://stylelint.io/). It is incredibly opinionated and strict, enforcing the maximum amount of type safety and code quality through ESLint rules and TypeScript compiler options. It is designed for [Next.js](https://nextjs.org/) apps, but can be used with any TypeScript project, such as [React Native](https://reactnative.dev/) or [Node.js](https://nodejs.org/).

<img src="https://img.shields.io/github/actions/workflow/status/haydenbleasel/ultracite/push.yaml" alt="" />

<img src="https://img.shields.io/npm/dy/ultracite" alt="" />

<img src="https://img.shields.io/npm/v/ultracite" alt="" />

<img src="https://img.shields.io/github/license/haydenbleasel/ultracite" alt="" />

## Features

### ESLint

Ultracite uses [ESLint](https://eslint.org/) to enforce code quality and type safety. It includes a wide range of rules to ensure your code is consistent and error-free. Ultracite combines with pre-defined rulesets for ESLint, as well as the following plugins: [Import](https://www.npmjs.com/package/eslint-plugin-import), [jsx-a11y](https://www.npmjs.com/package/eslint-plugin-jsx-a11y), [React](https://www.npmjs.com/package/eslint-plugin-react), [React Hooks](https://www.npmjs.com/package/eslint-plugin-react-hooks), [jest](https://www.npmjs.com/package/eslint-plugin-jest), [promise](https://www.npmjs.com/package/eslint-plugin-promise), [n](https://www.npmjs.com/package/eslint-plugin-n), [Typescript](https://www.npmjs.com/package/@typescript-eslint/eslint-plugin), [Prettier](https://www.npmjs.com/package/eslint-plugin-prettier), [Next.js](https://nextjs.org/docs/basic-features/eslint#eslint-plugin), [Cypress](https://www.npmjs.com/package/eslint-plugin-cypress), [HTML](https://www.npmjs.com/package/eslint-plugin-html), [SonarJS](https://www.npmjs.com/package/eslint-plugin-sonarjs), [Compat](https://www.npmjs.com/package/eslint-plugin-compat), [Unicorn](https://www.npmjs.com/package/eslint-plugin-unicorn), [GitHub](https://www.npmjs.com/package/eslint-plugin-github) and [TanStack Query](https://www.npmjs.com/package/@tanstack/eslint-plugin-query).

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
  "eslint.useFlatConfig": true,
  "eslint.options": {
    "overrideConfigFile": "eslint.config.mjs"
  },
  "eslint.runtime": "node"
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

## Usage

Once Ultracite is set up, it will automatically format your code on save.

## Configuration

You can opt-out of certain rules by modifying your `eslint.config.mjs` file. For example, here's a common exception I use to avoid linting [shadcn/ui](https://ui.shadcn.com/) components:

```js
import ultracite from 'ultracite';

for (const config of ultracite) {
  if (config.ignores) {
    config.ignores.push('./components/ui/**/*');
  }
}

export { default } from 'ultracite';
```

Ultracite also lints the browser compatibility of your code. You can specify which polyfills exist in your project by modifying your `eslint.config.mjs` file. For example, here's how you can add polyfills for Next.js:

```ts
import ultracite from 'ultracite';

for (const config of ultracite) {
  config.settings ||= {};
  config.settings.polyfills ||= [];

  config.settings.polyfills.push(
    // These are from Next.js - https://nextjs.org/docs/architecture/supported-browsers#polyfills
    'fetch',
    'URL',
    'Object.assign',

    // This one is running on the server
    'URLSearchParams'
  );
}

export { default } from 'ultracite';
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

## Usage in Monorepos

If you're using Ultracite in a monorepo, you will need to do two things:

1. Place the files above in every package and application, as well as the root.
2. Add the following to your `.vscode/settings.json` file:

```json
{
  "eslint.workingDirectories": [
    {
      "mode": "auto"
    }
  ]
}
```

This will ensure ESLint works correctly in all packages and applications by automatically detecting the working directory based on the nearest `package.json` and `eslint.config.mjs`, thus limiting the scope of ESLint to the current package or application and improving performance.

## Roadmap

- https://github.com/ota-meshi/eslint-plugin-yml
- https://github.com/mdx-js/eslint-mdx/tree/master/packages/eslint-plugin-mdx
- https://github.com/eslint/eslint-plugin-markdown
