---
"ultracite": patch
---

Add `allowForLoopAfterthoughts` to oxlint `no-plusplus` for parity with the biome `noIncrementDecrement` config (#371). `i++` in `for` loop afterthoughts is now allowed; `++`/`--` elsewhere remains an error.
