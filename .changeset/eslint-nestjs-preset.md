---
"ultracite": minor
---

Wire up the `nestjs` ESLint preset to actually enforce rules. Previously the preset exported an empty `const config = []`, meaning users who imported `ultracite/eslint/nestjs` got nothing. It now layers `@darraghor/eslint-plugin-nestjs-typed` (22 rules covering NestJS conventions, dependency injection correctness, and class-validator/Swagger usage) using the same dynamic-enable pattern as the other framework presets.

Consumers who already had the empty preset in their config may see new violations on first run.
