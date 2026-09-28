---
"ultracite": patch
---

Update `@shadcn/lint` to 0.2.0 (the version `ultracite init` installs for the opt-in `ultracite/oxlint/shadcn` preset). The release adds Vue and Svelte support and fixes theme, barrel and class-site discovery; the rules and their options are unchanged, so the preset is too. Under Oxlint the plugin reads only the `<script>` blocks of `.vue` and `.svelte` files, not their templates.
