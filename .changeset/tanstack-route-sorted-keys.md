---
"ultracite": patch
---

Stop sorting TanStack route option keys in route files. TanStack Router's route option types are order-sensitive (`head`/`component` infer `loaderData` from properties declared before them), so the Biome `useSortedKeys` source action rewrote `createFileRoute` literals into an order that breaks type inference (`loaderData` becomes `never`). The Biome TanStack preset now disables `useSortedKeys` for route files, and the oxlint TanStack preset disables `sort-keys` there so route files aren't caught between it and `react-doctor/tanstack-start-route-property-order`.
