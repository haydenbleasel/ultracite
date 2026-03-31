/** @type {import('prettier').Config & import('prettier-plugin-tailwindcss').PluginOptions & import('prettier-plugin-svelte').PluginConfig} */
const config = {
  arrowParens: "always",
  bracketSpacing: true,
  plugins: ["prettier-plugin-svelte", "prettier-plugin-tailwindcss"],
  printWidth: 80,
  proseWrap: "never",
  semi: true,
  singleQuote: false,
  tabWidth: 2,
  trailingComma: "es5",
  useTabs: false,
};

export default config;
