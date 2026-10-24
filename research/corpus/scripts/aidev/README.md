# AIDev: agent pull requests that suppress `exhaustive-deps`

These scripts count the `exhaustive-deps` suppression comments that coding agents added in the [AIDev](https://huggingface.co/datasets/hao-li/AIDev) dataset of agent pull requests, for the React effects post. The method, numbers and caveats are in `research/bibliography/react-effects.md` §5.5, and the outputs the post quotes are in `research/corpus/results/react-effects/aidev/`.

- **Data:** AIDev v5 (revision `b8dc67df`, cutoff 31 Mar 2026), the AIDev-pop tables (repositories with more than 100 stars), read through the public Hugging Face datasets-server `/filter` endpoint. No login and no token.
- **Run on:** 23–24 Oct 2026, with Python 3 standard library only, and `gh` (read-only) for the two validation scripts.
- **Not committed:** the pulled rows (`*-compact.jsonl`, `prs.jsonl`, `classified-lines.jsonl`). They're copies of dataset rows and PR metadata, about 9 MB.

## Running

The scripts write to an `aidev/` folder next to the folder they're in, so copy them somewhere outside the repo first:

```sh
mkdir -p "$WORK/scripts" "$WORK/aidev" && cp research/corpus/scripts/aidev/*.py research/corpus/scripts/aidev/*.sh "$WORK/scripts/"
cd "$WORK" && bash scripts/aidev_driver.sh                    # resumable; the datasets-server can take hours to answer
python3 -I scripts/validate_pr_diff.py eslint,oxlint pr-diff-validation-eslint.json
python3 -I scripts/validate_lintfix_prs.py
```

| Script | What it does | Output |
| --- | --- | --- |
| `aidev_pull.py` | pages through `pr_commit_details` rows whose patch matches a `LIKE` pattern, keeping only the added and removed lines that name the rule | `<tag>-compact.jsonl` |
| `aidev_classify.py` | first pass over the pulled rows; lists the pull requests to fetch | `<tag>-prids.json` |
| `aidev_prs.py` | fetches the `pull_request` rows (agent label, state, URL) for those ids | `prs.jsonl` |
| `aidev_agent_counts.py` | counts each agent's pull requests in AIDev-pop | `agent-counts.json` |
| `aidev_classify2.py` | drops carried-over lines (the same text removed in the commit, or a renamed file), then attributes each line to an agent account, an agent's commit signature, a Codex PR's author, a merge commit or nobody | `classified-lines.jsonl`, `classify2-full.json` |
| `aidev_summary.py` | the ESLint and Oxlint comments only, by agent | `summary-eslint-oxlint.json` |
| `validate_pr_diff.py` | checks a seeded sample (one line per PR) against each PR's final diff | `pr-diff-validation-eslint.json` |
| `validate_lintfix_prs.py` | counts suppressions in the final diff of the lint-fix PRs read by hand | `lintfix-prs.json` |

- **The Biome pull is incomplete:** the datasets-server stopped answering at 900 of 1,158 rows. So `classify2-full.json` includes a partial count of `biome-ignore` comments, and the post uses `summary-eslint-oxlint.json`, which leaves them out.
- **The driver was edited after the run:** its last three steps were run by hand during the pull, and were added to `aidev_driver.sh` afterwards.
