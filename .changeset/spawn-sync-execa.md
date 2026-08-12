---
"ultracite": patch
---

Drop the direct cross-spawn dependency: all synchronous process spawning (linter runs, tool version checks, editor extension installs, skill installs) now goes through a small adapter over execa's sync API, which owns the Windows spawn semantics cross-spawn provided. The adapter preserves the spawnSync result shape (`status`/`signal`/`error`/`stdout`), always disables shell interpretation, and always decodes output as UTF-8. execa was already a dependency for the agent fix runner, so this consolidates on one process-spawning library.
