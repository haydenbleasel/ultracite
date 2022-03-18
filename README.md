# Harmony

Unified, strict editor configuration for modern Next.js + Tailwind apps.

# Installation

Run the command below to install Harmony:

```sh
yarn add -D @haydenbleasel/harmony
```

Install peer dependencies:

```sh
yarn add -D prettier-plugin-tailwindcss prettier eslint eslint-plugin-import eslint-plugin-jsx-a11y eslint-plugin-react eslint-plugin-react-hooks @typescript-eslint/eslint-plugin @typescript-eslint/parser stylelint stylelint-prettier
```

# Usage

Simply add these to your `package.json`:

```json
{
  "eslintConfig": {
    "extends": "./node_modules/@haydenbleasel/harmony/src/eslint.js"
  },
  "prettier": {
    "extends": "./node_modules/@haydenbleasel/harmony/src/prettier.js"
  },
  "stylelint": {
    "extends": "./node_modules/@haydenbleasel/harmony/src/stylelint.js"
  }
}
```

or create seperate files e.g.

**eslint.rc**

```json
{
  "extends": "./node_modules/@haydenbleasel/harmony/src/eslint.js"
}
```

**.prettierrc.js**

```js
module.exports = {
  ...require("./node_modules/@haydenbleasel/harmony/src/prettier.js"),
};
```

**stylelint.config.js**

```js
module.exports = {
  extends: "./node_modules/@haydenbleasel/harmony/src/stylelint.js",
};
```
