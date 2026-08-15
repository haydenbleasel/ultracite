---
"ultracite": patch
---

Offer the vendored `anti-slop` Oxlint preset during `ultracite init` — it now appears in the JS-plugins prompt when you pick Oxlint, and non-interactive setup accepts it via `--js-plugins anti-slop`. Selecting it adds `ultracite/oxlint/anti-slop` to the generated config's `extends`; since the preset is vendored inside Ultracite, nothing extra is installed.
