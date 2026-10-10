---
"ultracite": major
---

`ultracite init --type-aware` now turns on type-aware linting for Oxlint. It used to install `oxlint-tsgolint` without telling Oxlint to use it, so rules that need type information, such as `typescript/no-floating-promises`, only ran when you passed `--type-aware` to `ultracite check` yourself. Init now also sets `options: { typeAware: true }` in `oxlint.config.ts`, so `check`, `fix` and the editor extension run them. A config with an `options` object of its own is left as written, with a note to add `typeAware: true` to it. Re-running `init` on a project that has `oxlint-tsgolint` installed turns it on, which can report new problems.
