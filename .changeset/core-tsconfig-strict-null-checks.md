---
"ultracite": patch
---

`ultracite init` no longer overrides a tsconfig that turns `strictNullChecks` off. It leaves an explicit `"strictNullChecks": false`, whether set in the file or in a config it extends, as it is and prints a warning. It also follows `extends`, whether a relative path or a package such as `@tsconfig/strictest`, so a tsconfig that already inherits `strict` or `strictNullChecks` is no longer given a redundant `"strictNullChecks": true`.
