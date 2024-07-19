# Ultracite

Ultracite is a robust linting preset for modern TypeScript apps, built on [Biome](https://biomejs.dev/) It is incredibly opinionated and strict, enforcing the maximum amount of type safety and code quality through ESLint rules and TypeScript compiler options. It can be used for any TypeScript-based project including [Next.js](https://nextjs.org/) apps, [React Native](https://reactnative.dev/) apps or [Node.js](https://nodejs.org/) servers.

<img src="https://img.shields.io/github/actions/workflow/status/haydenbleasel/ultracite/push.yaml" alt="" />

<img src="https://img.shields.io/npm/dy/ultracite" alt="" />

<img src="https://img.shields.io/npm/v/ultracite" alt="" />

<img src="https://img.shields.io/github/license/haydenbleasel/ultracite" alt="" />

## Installation

Run the command below to install Ultracite with peer dependencies:

```sh
pnpm add -D --save-exact ultracite @biomejs/biome
```

If you're running [VS Code](https://code.visualstudio.com/), ensure you have the following extensions installed:

```sh
code --install-extension biomejs.biome
code --install-extension bradlc.vscode-tailwindcss
```

## Setup

Create an `biome.json` with the following contents:

```json
{ "extends": ["ultracite"] }
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
    "quickfix.biome": "explicit",
    "source.organizeImports.biome": "explicit"
  }
}
```

Lastly, ensure your `tsconfig.json` (if it exists) includes your new ESLint config and that `strictNullChecks` is enabled.

```json
{
  "compilerOptions": {
    "strictNullChecks": true
  }
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
