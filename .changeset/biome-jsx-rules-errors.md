---
"ultracite": major
---

Make every rule in the Biome core preset an error. `noSuspiciousSemicolonInJsx` came from Biome's recommended set at warning level, so `ultracite check` passed with it unless the React preset was on. It and the two other rules core inherited from that set, `noDuplicateJsxProps` and `noVoidElementsWithChildren`, are now set to `error` explicitly.
