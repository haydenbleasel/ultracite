---
"ultracite": patch
---

Move `suspicious/useArraySortCompare` from the Biome core config to the opt-in type-aware config. The rule is in Biome's `types` domain — it type-infers the receiver of every method call before checking the method name, which made `ultracite check` up to ~260x slower on projects with expensive library types (zod, better-auth, Prisma). It now only runs when type-aware linting is explicitly enabled, alongside the other type/project-domain rules. Fixes #768.
