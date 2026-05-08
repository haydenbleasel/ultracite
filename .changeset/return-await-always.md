---
"ultracite": patch
---

Set `typescript/return-await` to `["error", "always"]` to resolve a circular conflict between `eslint/require-await`, `typescript/promise-function-async`, and `typescript/return-await` on Promise-returning functions outside try/catch. With the default `in-try-catch` mode, autofixers chase each other: `promise-function-async` adds `async`, `require-await` then demands an `await`, and `return-await` removes any `return await` outside a try/catch — leaving no resolvable state. The `"always"` mode keeps `return await` everywhere, breaking the cycle while preserving consistent stack traces.
