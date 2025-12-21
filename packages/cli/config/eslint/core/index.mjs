// Ultracite ESLint Core Configuration
// Add your ESLint rules here

export default [
  {
    name: "ultracite/core/ignores",
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/.next/**",
      "**/.nuxt/**",
      "**/.output/**",
      "**/.svelte-kit/**",
      "**/coverage/**",
      "**/.turbo/**",
      "**/.vercel/**",
      "**/storybook-static/**",
    ],
  },
  {
    name: "ultracite/core/base",
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    rules: {
      // Add your core rules here
    },
  },
];
