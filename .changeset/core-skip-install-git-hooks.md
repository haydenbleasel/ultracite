---
"ultracite": patch
---

`ultracite init --integrations husky --skip-install` no longer replaces an existing `prepare` script in `package.json`. It adds `husky` to the script, as the installing path already did (for example `"prepare": "svelte-kit sync && husky"`). The Lefthook setup messages now name the config file init actually updates or creates, such as `.lefthook.yaml`, instead of always saying `lefthook.yml`.
