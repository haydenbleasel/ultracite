---
"ultracite": patch
---

Fix `ultracite init` destroying user files it couldn't parse or merge: unparseable `tsconfig.json` files are no longer replaced with a minimal config, unparseable `.vscode`/`.zed` settings are no longer overwritten wholesale, and lint-staged configs with function-valued entries are left untouched — all now warn and skip instead.
