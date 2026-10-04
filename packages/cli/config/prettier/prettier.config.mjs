/** @type {import('prettier').Config} */
const config = {
  arrowParens: "always",
  bracketSpacing: true,
  printWidth: 80,
  proseWrap: "never",
  semi: true,
  singleQuote: false,
  tabWidth: 2,
  // prettier-plugin-tailwindcss (added by `ultracite init`) also sorts class
  // strings passed to these helpers, matching the Oxfmt and Biome presets.
  tailwindFunctions: ["clsx", "cva", "tw", "twMerge", "cn", "twJoin", "tv"],
  trailingComma: "es5",
  useTabs: false,
};

export default config;
