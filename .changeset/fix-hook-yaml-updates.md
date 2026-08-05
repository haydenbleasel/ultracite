---
"ultracite": patch
---

Fix Lefthook and pre-commit YAML updates silently doing nothing on common config shapes: the Lefthook job is now inserted correctly when `jobs:` isn't the first key under `pre-commit:` (and no longer matches a `jobs:` key in a different hook), `repos: []` in `.pre-commit-config.yaml` is handled, and shapes that can't be safely edited produce a warning instead of writing the file back unchanged.
