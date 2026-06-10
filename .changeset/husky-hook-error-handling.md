---
"ultracite": patch
---

Fix the generated Husky pre-commit hook's error handling and section
replacement.

The standalone hook script set `set -e` and then tried to capture the
formatter's exit code, re-stage files, and print a failure message — but a
non-zero formatter exit terminated the script immediately, so none of that
ever ran. The script now captures the exit code with `|| FORMAT_EXIT_CODE=$?`
so files are re-staged and failures are reported with the right exit code.

Re-running `ultracite init` also deleted everything from the `# ultracite`
marker to the end of the hook, including commands the user added after the
ultracite section. The section is now terminated with an explicit
`# ultracite end` marker and updates replace only the section between the
markers (legacy sections without an end marker are detected by their closing
echo line).
