---
"ultracite": patch
---

Antigravity IDE, CodeBuddy, Trae and Void now use the project's TypeScript version. They're built on VS Code releases before 1.111, which read `typescript.tsdk` and `typescript.enablePromptUseWorkspaceTsdk` rather than the `js/ts.tsdk.path` and `js/ts.tsdk.promptToUseWorkspaceVersion` settings `init` writes, so for those editors `init` writes both. Other editors keep only the new settings, since VS Code marks the old ones deprecated.
