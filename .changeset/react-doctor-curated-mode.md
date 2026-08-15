---
"ultracite": patch
---

Pin React Doctor's ported rules to their framework-aware "curated" mode (#771). react-doctor 0.9.x rewrote its ported oxc/react-refresh rules — notably `only-export-components` — with a stripped-down default mode: no framework detection, no route-file skipping, and `allowConstantExport` off, so Next.js route-segment exports like `export const dynamic = "force-static"` or `metadata` were flagged as non-component exports in every route file. The ESLint react preset now sets `settings["react-doctor"].portedRuleMode: "curated"`, and generated oxlint configs apply a new `jsPluginSettings` export from `ultracite/oxlint/js-plugins` on the root config (oxlint does not merge `settings` from extended configs, so the setting cannot ride along inside the preset). If you extend the js-plugins preset manually, add `settings: jsPluginSettings` to your root oxlint config.
