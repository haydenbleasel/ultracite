---
"ultracite": patch
---

Update `eslint-plugin-react-doctor` and `oxlint-plugin-react-doctor` to 0.9.23. The release adds, removes and renames no rule, so the React Doctor lists in the ESLint React preset and in `ultracite/oxlint/js-plugins` are unchanged. It fixes false positives, among them a `type="Submit"` button, a listener whose cleanup releases a renamed handle, `useFocusEffect` callbacks whose cleanup the hook owns, and TanStack Table v9 `useTable` options under the React Compiler. `no-reset-all-state-on-prop-change` no longer crashes on a BigInt literal. One check reports more: a timer that an async function started by `useEffect` creates after an `await` is reported when nothing checks that the effect is still live. See the [release notes](https://github.com/millionco/react-doctor/releases/tag/eslint-plugin-react-doctor%400.9.23).
