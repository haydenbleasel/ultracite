---
"ultracite": patch
---

The Biome `nestjs` and `angular` presets now parse parameter decorators. Biome rejects them unless `javascript.parser.unsafeParameterDecoratorsEnabled` is on, so every `create(@Body() cat: Cat)` in a NestJS controller, and every `constructor(@Inject(TOKEN) value)` in Angular, was reported as "Decorators are not valid here", and `ultracite fix` applied no lint fixes to those files. Both presets now turn the option on.
