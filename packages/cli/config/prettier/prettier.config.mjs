/** @type {import('prettier').Config & import('prettier-plugin-tailwindcss').PluginOptions} */
const config = {
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: false,
  trailingComma: "es5",
  bracketSpacing: true,
  arrowParens: "always",
  proseWrap: "never",
  printWidth: 80,
  plugins: ["prettier-plugin-svelte", "prettier-plugin-tailwindcss"],
};

export default config;
