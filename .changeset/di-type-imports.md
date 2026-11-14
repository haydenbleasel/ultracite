---
"ultracite": patch
---

`ultracite fix` no longer breaks dependency injection in NestJS and Angular projects. With the `nestjs` or `angular` preset, a class a constructor injects, as in `constructor(private readonly cats: CatsService) {}`, is only ever named as a type, so `typescript/consistent-type-imports` (Oxlint and ESLint) and `useImportType` (Biome) rewrote its import to `import type { CatsService }`. The code still compiled, but the class was gone at runtime: `emitDecoratorMetadata` recorded the parameter as `Function`, and the framework could no longer resolve the dependency. Both presets now turn the rule off on all three linters. If a previous `fix` already rewrote these imports, change them back to plain imports.
