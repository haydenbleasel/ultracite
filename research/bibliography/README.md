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
