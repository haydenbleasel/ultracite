---
"ultracite": patch
---

Update `prettier-plugin-astro` to 1.1.0 (the version `ultracite init` installs for Astro projects with Prettier) and refresh the transitive Prettier lock to 3.9.9. Prettier 3.9.7 through 3.9.9 are formatting fixes with no option changes, so the Prettier preset is unchanged. prettier-plugin-astro 1.1 makes `astroAllowShorthand` tri-state. When it is unset, which is how Ultracite's generated config leaves it, attributes now stay as written instead of `{value}` being expanded to `value={value}`. Set `astroAllowShorthand: false` in your Prettier config to keep the 1.0 behaviour.
