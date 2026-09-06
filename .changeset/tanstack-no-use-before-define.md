---
"ultracite": patch
---

Disable `no-use-before-define` in TanStack Router route files for the oxlint tanstack preset. File routes are mutually recursive (`Route` references the component, and the component calls `Route.useParams()`), so no declaration order could satisfy the rule.
