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

Also, if you're running VS Code, ensure you have the following extensions installed. Some are required to make this config work, others enhance your experience.

```sh
code --install-extension dbaeumer.vscode-eslint \
code --install-extension wix.vscode-import-cost \
code --install-extension MS-vsliveshare.vsliveshare \
code --install-extension csstools.postcss \
code --install-extension VisualStudioExptTeam.vscodeintellicode \
code --install-extension esbenp.prettier-vscode \
code --install-extension sainoba.px-to-rem \
code --install-extension bradlc.vscode-tailwindcss \
code --install-extension silvenon.mdx \
code --install-extension KnisterPeter.vscode-commitizen \
code --install-extension ms-vscode.atom-keybindings \
code --install-extension aaron-bond.better-comments \
code --install-extension stylelint.vscode-stylelint \
code --install-extension github.copilot
```

# Usage

Simply add these to your `package.json`:

```json
{
  "eslintConfig": {
    "extends": "./node_modules/@haydenbleasel/harmony/src/eslint.js",
    "parserOptions": {
      "project": "./tsconfig.json"
    }
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
