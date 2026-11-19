---
"ultracite": patch
---

`ultracite init` now sets `"javascript": { "jsxRuntime": "reactClassic" }` in the Biome config of a project whose `tsconfig.json` or `jsconfig.json` compiles JSX with the classic runtime (`"jsx": "react"`, set there or inherited through `extends`). Biome otherwise treats `import React from "react"` as unused in a file that only uses JSX, and since the core preset marks the `noUnusedImports` fix safe, `ultracite fix` deleted an import that JSX needs (and `useImportType` turned it into `import type React` where React was also used as a type). An existing config gets the setting added beside its other `javascript` settings, and a `jsxRuntime` you've set yourself is left alone. `ultracite doctor` warns about a Biome config that is missing it, and `ultracite upgrade` adds it.
