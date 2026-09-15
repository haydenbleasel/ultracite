---
"ultracite": minor
---

Add an opt-in `ultracite/oxlint/shadcn` preset for [`@shadcn/lint`](https://github.com/shadcn-ui/lint), shadcn's agent-first linter for Tailwind v4 design systems. All six rules (`no-restyle`, `no-raw-colors`, `no-arbitrary-values`, `no-inline-styles`, `no-unknown-classes`, `require-static-classes`) run at `error` with the upstream `allow: ["layout"]` policy, and the component-authoring rules are relaxed inside `**/components/ui/**`. Enable it with `ultracite init --linter oxlint --js-plugins @shadcn/lint`, or extend it alongside `ultracite/oxlint/core` after installing `@shadcn/lint`.
