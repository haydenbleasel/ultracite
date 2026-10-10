---
"ultracite": major
---

Update the agents `ultracite init` sets up to match what's still shipping.

- Remove Roo Code (shut down in May 2026), Continue (no longer maintained since Cursor acquired it), Firebase Studio (closing in March 2027) and MCPJam (an MCP testing tool rather than a coding agent). `--agents roo-code`, `continue`, `firebase-studio` and `mcpjam` now write the rules to `AGENTS.md`, as `universal` does, with a warning, and the skill installer no longer targets `.roo` or `.continue`. Files earlier versions wrote for them, such as `.roo/rules/ultracite.md`, are left in place.
- Amazon Q CLI is now Kiro CLI, with the ID `kiro-cli` instead of `amazon-q-cli`, which init still accepts with a note to switch. Kiro reads `AGENTS.md` in both its CLI and IDE and ignores `.amazonq/rules` once a project has a `.kiro` folder, so init writes the rules to `AGENTS.md` (and `universal` covers it) instead of `.amazonq/rules/ultracite.md`.
- Mux is now Xum, with the ID `xum` instead of `mux`, which init still accepts with a note to switch.
- Kimi CLI is now Kimi Code CLI, with the ID `kimi-code` instead of `kimi-cli`, and Snowflake Cortex Code is now Snowflake CoCo, with the ID `snowflake-coco` instead of `snowflake-cortex`. The old IDs still work, with a note to switch. AMP is now Amp; its ID doesn't change.
