# Harmony

Unified, strict editor configuration for modern Next.js apps

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
  "eslint": {
    "extends": [
      "plugin:@haydenbleasel/harmony/eslint"
    ]
  },
  "prettier": {
    "extends": [
      "plugin:@haydenbleasel/harmony/prettier"
    ]
  },
  "stylelint": {
    "extends": [
      "plugin:@haydenbleasel/harmony/stylelint"
    ]
  },
}
```