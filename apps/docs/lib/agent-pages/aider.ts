import type { AgentPageContent } from "./types";

export const aider: AgentPageContent = {
  checked: { date: "2026-10-10", version: "0.86.2" },
  faqs: [
    {
      answer:
        "Not on its own. Aider only loads files you add to the chat or list under `read` in `.aider.conf.yml`, so `ultracite init --agents aider` adds `AGENTS.md` to `read`. From then on it loads as a read-only file in every session in that repo.",
      question: "Does Aider read AGENTS.md?",
    },
    {
      answer:
        "Set `lint-cmd`, which `init` points at `npx ultracite fix`. Aider runs it on each file it edits (auto-lint is on by default; `--no-auto-lint` turns it off), and `/lint` runs it on demand.",
      question: "How do I make Aider run the linter?",
    },
    {
      answer:
        "Not agent hooks. Aider’s post-edit checks are `lint-cmd` and `test-cmd`, which it runs itself after every edit, so the model can’t skip them. The only hooks it deals with are your git hooks, and it skips those by default.",
      question: "Does Aider support hooks?",
    },
    {
      answer:
        "Only if it already runs Ultracite. `init` updates an older Ultracite command but leaves another linter’s `lint-cmd` alone, because a `lint-cmd` without a language prefix replaces Aider’s per-language linters.",
      question: "I already have a lint-cmd. Will init replace it?",
    },
    {
      answer:
        "Yes. With `--yes-always` (or `yes-always: true` in `.aider.conf.yml`), Aider answers yes to “Attempt to fix lint errors?” and its other prompts, so the lint, fix and commit cycle runs unattended.",
      question: "Can Aider fix lint errors without asking?",
    },
    {
      answer:
        "Run `init` again. Earlier versions wrote the rules to an `ultracite.md` that nothing loaded; `init` takes Ultracite’s block out of it, deletes it if nothing else is left, and lists `AGENTS.md` under `read` instead.",
      question:
        "I set Ultracite up for Aider before. Do I need to do anything?",
    },
  ],
  headline: "Aider runs Ultracite on every file it edits",
  highlights: [
    {
      body: "Aider commits with `--no-verify` by default, so a pre-commit hook that runs `ultracite check` never sees its commits. Set `git-commit-verify: true` in `.aider.conf.yml` if you want your git hooks to run on them too.",
      title: "Its commits skip your git hooks",
    },
    {
      body: "`/lint`, or `aider --lint` from the shell, runs `lint-cmd` on the files in the chat, or on every dirty file when there are none, and has the model fix each file with problems in a fresh context. Add `--yes-always` to run it without prompts.",
      title: "/lint cleans up files already changed",
    },
    {
      body: "The model’s edit and the linter’s fixes land as separate commits, so the history shows what Ultracite changed. `/undo` reverts the last commit, and only if Aider made it.",
      title: "Every step is a commit",
    },
  ],
  intro:
    "Aider doesn’t look for an instructions file, so `init` lists `AGENTS.md` under `read` in `.aider.conf.yml` and sets `lint-cmd` to `ultracite fix`. After each edit Aider commits, lints every file it changed, and offers to send what’s left back to the model.",
  loop: {
    body: "Aider runs `lint-cmd` itself, so it doesn’t depend on the model remembering to. When the command exits non-zero, Aider treats its output as errors, offers to hand it back, and lints again after the fix. `auto-test` and `test-cmd` do the same for your tests.",
    snippets: [
      {
        code: "# Run your tests after every edit, too\nauto-test: true\ntest-cmd: npm test",
        lang: "yaml",
        title: ".aider.conf.yml",
      },
    ],
    steps: [
      "Aider applies the edit and commits it.",
      "It runs `npx ultracite fix <file>` on each file it changed, then commits whatever the fix rewrote.",
      "If the command exits non-zero, Aider shows the output and asks “Attempt to fix lint errors?”.",
      "On yes, the model gets the output under “# Fix any errors below, if possible.”, with the code around the reported lines.",
    ],
    title: "Commit, lint, then fix what’s left",
  },
  metaDescription:
    "Set up Ultracite for Aider: AGENTS.md loads as a read-only file, and lint-cmd runs ultracite fix on every file Aider edits, then hands leftovers to the model.",
  metaTitle: "Ultracite for Aider — Every edit linted, fixed and committed",
  related: ["codex", "crush", "pi"],
  rules: {
    facts: [
      {
        label: "Loaded as",
        value:
          "A read-only file: reference material the model reads but that Aider won’t edit.",
      },
      {
        label: "Lint command",
        value:
          "Aider appends the edited file’s path to `lint-cmd` and treats a non-zero exit as problems to fix.",
      },
      {
        label: "One for every language",
        value:
          "A `lint-cmd` without a `language:` prefix runs for every file and replaces Aider’s built-in linters, Python’s included.",
      },
      {
        label: "File types",
        value:
          "Aider lints only files it maps to a language by extension. `.ts`, `.tsx`, `.js`, `.jsx`, `.json` and `.css` are covered; `.mts`, `.cts` and `.cjs` skip the linter.",
      },
      {
        label: "Retries",
        value:
          "Lint, test and edit-format retries share a limit of three per message. After that Aider stops with “Only 3 reflections allowed”.",
      },
      {
        label: "Check it",
        value:
          "Aider prints “Added AGENTS.md to the chat (read-only).” at launch, and `/ls` lists it under read-only files.",
      },
    ],
    lookup: [
      {
        note: "Your settings for every repo. Loaded first.",
        path: "~/.aider.conf.yml",
      },
      {
        note: "The repo’s settings. Loaded next, and wins over your home file.",
        path: ".aider.conf.yml at the git root",
      },
      {
        note: "Loaded last, so it wins when you start Aider below the root. `--config <file>` loads one file instead of all three.",
        path: ".aider.conf.yml in the current directory",
      },
      {
        note: "Added to the chat as a read-only file because `read` lists it. Nothing else is loaded as instructions.",
        path: "AGENTS.md",
      },
    ],
    summary:
      "Aider has no instructions file of its own. It loads whatever `read` lists in `.aider.conf.yml` as read-only chat files, so with `AGENTS.md` there, Ultracite’s rules are in context from the first message.",
  },
  skills:
    "Aider doesn’t support skills. `init` still installs the Ultracite skill into `.agents/skills/` for your other agents, but Aider gets the rules from `AGENTS.md` and the checks from `lint-cmd`.",
  sources: [
    {
      title: "Aider: Linting and testing",
      url: "https://aider.chat/docs/usage/lint-test.html",
    },
    {
      title: "Aider: YAML config file",
      url: "https://aider.chat/docs/config/aider_conf.html",
    },
    {
      title: "Aider: Git integration",
      url: "https://aider.chat/docs/git.html",
    },
    {
      title: "Aider: In-chat commands",
      url: "https://aider.chat/docs/usage/commands.html",
    },
    {
      title: "Aider source: linter and coder",
      url: "https://github.com/Aider-AI/aider/tree/main/aider",
    },
    {
      title: "grep-ast (Aider): file extensions it maps to languages",
      url: "https://github.com/Aider-AI/grep-ast/blob/main/grep_ast/parsers.py",
    },
  ],
};
