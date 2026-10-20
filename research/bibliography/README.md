# Bibliography

One file per topic, holding every source a blog post on that topic cites or might cite. Each entry was opened and checked against the claim it supports, and is tagged:

- **VERIFIED**: the primary source (PDF, publisher or arXiv record, official docs, or the tool's source code) was opened and the claim found in it.
- **VERIFIED (metadata + abstract)**: the bibliographic record and abstract were checked, but not the full text.
- **UNVERIFIED**: only secondary mentions were found. Don't cite these as fact.

Quotes are copied exactly and kept under 15 words.

When writing a post, cite from these files instead of re-verifying, and add to them when new research turns up. Many sources serve more than one post: the cognitive complexity file also covers cyclomatic complexity, code-understandability research, LLM-written code quality and agents gaming checks. A new topic gets its own `<topic>.md` in the same format, with a "Most useful for the post" list at the top and a section at the end for what turned out wrong or unverifiable.

| File | Topic |
| --- | --- |
| [`cognitive-complexity.md`](./cognitive-complexity.md) | Cyclomatic and cognitive complexity: history, the white paper's scoring rules, tool defaults, understandability research, working memory, complexity of AI-written code, and agents gaming metrics. |
| [`type-escape-hatches.md`](./type-escape-hatches.md) | `any`, `!`, `as` and `@ts-*` comments: TypeScript's deliberate unsoundness and gradual typing, release history, the lint rules and their history, migrations, whether types prevent bugs, LLMs and type errors, and agents adding `any`. |
| [`floating-promises.md`](./floating-promises.md) | Floating promises and async mistakes: the history from callbacks to `await`, unhandled rejections in browsers and Node.js, the rules and their lineage, promise-bug research, missing-`await` vulnerabilities, `await` in loops versus `Promise.all`, and LLMs and async code. |
| [`security-rules.md`](./security-rules.md) | Security lint rules: `eval` and code injection, DOM XSS and `dangerouslySetInnerHTML`, CSP and Trusted Types, eval and XSS in the wild, the security of AI-written code and coding agents, what static analysis can and can't see, feeding scanner output back to models, and agents evading checks. |
| [`dead-code.md`](./dead-code.md) | Dead code and duplication: lint's 1978 checks, the `_` convention, TypeScript's and Go's unused checks, Knight Capital and goto fail, dead-code and clone research, dead code removal at scale (SCARF, Sensenmann), duplication in AI-written code, and what single-file linters can't see. |
| [`import-cycles.md`](./import-cycles.md) | Import cycles and barrel files: Parnas, Martin and Lakos on acyclic dependencies, Go refusing cycles, how cycles behave in CommonJS and ES modules, research on cycles and defects, the measured cost of barrel files, agents and module structure, and why cycle detection needs a project graph. |
| [`accessibility.md`](./accessibility.md) | Accessibility lint rules: Section 508, WCAG and ARIA history, the first rule of ARIA, ADA and EAA legal pressure, jsx-a11y, axe and their ports, how much automated checking can catch, the WebAIM Million, developer studies, the accessibility of AI-written UI, checker feedback in the loop, agents gaming the rules, and what JSX rules can't see. |
| [`todo-comments.md`](./todo-comments.md) | TODO comments and self-admitted technical debt: where XXX, FIXME and TODO came from, IDE task lists and style-guide formats, technical debt from Cunningham on, the SATD research (prevalence, removal versus repayment, survival, trigger-action and on-hold TODOs), `no-warning-comments`, the SonarJS and unicorn rules and other ecosystems' equivalents, model "laziness", TODOs in agent-written code, and what vendors tell agents. |
| [`sort-keys.md`](./sort-keys.md) | Sorting object keys: JSCS, TSLint and ESLint's `sort-keys` and the autofix ESLint refused, perfectionist, Biome's `useSortedKeys` assist and Oxlint's fix (and their bugs), what popular configs and other ecosystems do, property order in ECMA-262 and JSON, where key order changes behaviour (TypeScript inference, TanStack, Node `exports`, MongoDB, styles, LLM structured outputs), menu-ordering and merge-conflict research, blame tools, what agent vendors tell agents, and Ultracite's own history with the rule. |
