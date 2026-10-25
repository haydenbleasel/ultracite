---
"ultracite": minor
---

Ultracite now requires Node.js 22.22.2 or later on Node 22, or 24.15 or later; Bun is unchanged. `eslint-plugin-jsdoc`, which every ESLint setup installs, has declared that range since version 64, so on older Node versions npm and pnpm warned when installing it and Yarn 1 refused to install it. Two ESLint framework plugins declare more: `@darraghor/eslint-plugin-nestjs-typed` (the `nestjs` preset) asks for Node.js 24 and `eslint-plugin-astro` (the `astro` preset) for 22.22.3 or 24.16. Both run on older versions, but Yarn 1 enforces what they declare.
