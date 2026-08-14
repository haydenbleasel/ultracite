---
"ultracite": patch
---

Add an opt-in `ultracite/oxlint/anti-slop` preset that ships a vendored, self-contained build of the [anti-slop](https://github.com/dmmulroy/anti-slop) Oxlint plugin — fifteen rules that reject low-evidence TypeScript and JavaScript patterns (unjustified type assertions, `unknown` leaking through signatures, `Reflect`-based access, module mocking, and more). Extend it alongside `ultracite/oxlint/core`; nothing extra to install.
