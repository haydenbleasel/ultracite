---
"ultracite": patch
---

Corrected the bundled Ultracite agent skill (`skills/ultracite/SKILL.md`):

- It said Oxlint has `github` and `sonarjs` presets that init includes by default. Neither exists. The GitHub, SonarJS and React Doctor rules live in the `ultracite/oxlint/js-plugins` preset (plus `next/js-plugins` and `tanstack/js-plugins`), next to the `anti-slop` and `shadcn` presets, and all of them are opt-in.
- The `--js-plugins` init flag is now documented.
- The skill now tells agents to run the project's installed CLI (`npx`, `pnpm exec`, `yarn`, `bunx`) rather than `pnpx` or `yarn dlx`.
