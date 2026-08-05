---
"ultracite": patch
---

Fix the CLI becoming a silent no-op (exiting 0 without linting anything) when a generic `TEST` environment variable is set, as is common in CI matrices. The internal test guard now uses `ULTRACITE_TEST`.
