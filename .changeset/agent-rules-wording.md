---
"ultracite": patch
---

The rules `ultracite init` writes for agents (`AGENTS.md`, `CLAUDE.md` and the other rules files) and the skill's code standards now match what the presets enforce, and replace advice that led agents to the cheapest edit instead of the right one:

- Accessibility has its own section instead of sitting under "React & JSX", since it applies to every framework. It now leads with "Use semantic HTML first; add ARIA only when no native element fits", and says to make anything clickable a `<button>` or a link rather than adding key handlers to a `<div>`.
- Hooks: "When a hook dependency rule fires, first check whether the effect is needed, and whether adding the dependency changes when it runs" replaces "Specify all dependencies in hook dependency arrays correctly".
- Functions: "Write functions as arrow functions assigned to `const`, and define them above where they're used", which is what `func-style` and `no-use-before-define` ask for.
- TODOs: a new line says not to leave TODO or FIXME comments in new code, and never to reword an existing one to get past the linter.
- Imports: "Prefer specific imports over namespace imports" is gone, and the barrel file line now says a package's entry point is fine.

Existing projects get the new rules by re-running `ultracite init`.
