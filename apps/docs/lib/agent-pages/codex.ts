import type { AgentPageContent } from "./types";

export const codex: AgentPageContent = {
  checked: { date: "2026-10-10", version: "0.162.1" },
  faqs: [
    {
      answer:
        "Yes, it’s Codex’s own instructions file. Codex reads `~/.codex/AGENTS.md`, then one file per directory from the project root down to your working directory, and joins them so the closer files come later and take precedence.",
      question: "Does Codex read AGENTS.md?",
    },
    {
      answer:
        "Look for an `AGENTS.override.md` in the same directory or in `~/.codex`: an override replaces `AGENTS.md` at its level. Codex also skips empty files and builds the chain once per run, so restart it after editing.",
      question: "Why is Codex ignoring my AGENTS.md?",
    },
    {
      answer:
        "Yes. `init --hooks codex` writes a `PostToolUse` hook to `.codex/hooks.json` that runs `ultracite fix --hook` after each `apply_patch` edit. Codex loads it once you trust the project and review the hook in `/hooks`. Hooks you haven’t reviewed don’t run, in `codex exec` either, unless you pass `--dangerously-bypass-hook-trust`.",
      question: "Does Codex support hooks?",
    },
    {
      answer:
        "Run `npx ultracite fix --codex`. After the safe fixes, it sends each file with problems left to `codex exec --sandbox workspace-write`, up to three tries per file, and lints the file again so the linter decides what counts as fixed.",
      question: "Can Codex fix what Ultracite can’t autofix?",
    },
    {
      answer:
        "Not in the `Auto` preset. `workspace-write` lets Codex run commands in your working directory without asking, and `ultracite` needs no network once it’s installed. Commands that have to leave the sandbox prompt unless a `prefix_rule` allows them.",
      question: "Do I have to approve every ultracite command in Codex?",
    },
  ],
  headline: "Codex gets lint feedback on every patch",
  highlights: [
    {
      body: "Codex code review on GitHub follows `## Code Review Rules` sections in the root `AGENTS.md` and in any nested one that covers a changed file. OpenAI’s advice is to leave formatting and lint checks out of those rules and in CI, which is where `ultracite check` belongs.",
      title: "Code review reads AGENTS.md too",
    },
    {
      body: "Codex loads `.codex/hooks.json` only in a project you’ve trusted, and runs each hook only after you review it in `/hooks`. Trust is tied to the hook’s content, so when re-running `init` changes the command, Codex asks again.",
      title: "Hooks wait for your review",
    },
    {
      body: "`codex exec` runs in a read-only sandbox unless you pass `--sandbox workspace-write`. That’s the flag `ultracite fix --codex` passes, along with `--skip-git-repo-check`, so Codex can edit the files it’s handed in any project.",
      title: "Headless runs start read-only",
    },
  ],
  intro:
    "Codex reads `AGENTS.md` from your project root down to the directory you start it in, so Ultracite’s rules are in its instructions from the first message. With `init --hooks codex`, a hook runs `ultracite fix` on every file Codex patches and hands back what’s left in the same turn, and `ultracite fix --codex` hands whatever’s left outside a session to `codex exec`.",
  loop: {
    body: "`init --hooks codex` adds a `PostToolUse` hook to `.codex/hooks.json`, matched on `apply_patch`, the tool Codex edits files with. Once you’ve reviewed it, Codex runs it from the session’s working directory after every patch. When problems remain, the hook exits with code 2, and Codex hands them to the model in place of the patch’s own result.",
    steps: [
      "Codex edits files with `apply_patch`, and the hook gets the patch in `tool_input.command`.",
      "The hook runs `ultracite fix` on just the files the patch adds, updates or moves. A patch that only deletes files fixes nothing.",
      "If nothing is left, it exits 0 and Codex carries on.",
      "If problems remain, it prints them and exits 2. The edit stays applied, and the model reads the problems as the tool’s result and fixes them next.",
    ],
    title: "A hook on every apply_patch",
  },
  metaDescription:
    "Set up Ultracite for Codex: rules in AGENTS.md, a hook that fixes every apply_patch edit, and fix --codex to hand leftovers to codex exec.",
  metaTitle: "Ultracite for Codex — AGENTS.md, hooks and code review",
  related: ["claude", "opencode", "cursor-cli"],
  rules: {
    facts: [
      {
        label: "Size limit",
        value:
          "Codex stops adding files once the combined size reaches `project_doc_max_bytes`, 32 KiB by default. Ultracite’s rules are about 5 KB.",
      },
      {
        label: "One per directory",
        value:
          "At most one file per directory: `AGENTS.override.md`, then `AGENTS.md`, then any fallback names. Empty files are skipped.",
      },
      {
        label: "Global",
        value:
          "`~/.codex/AGENTS.md`, or the same file in `CODEX_HOME` when you’ve set it.",
      },
      {
        label: "When it loads",
        value:
          "Once per run. Restart Codex in the project to pick up an edited `AGENTS.md`.",
      },
      {
        label: "Check it",
        value:
          '`codex --ask-for-approval never "Summarize the current instructions."` has Codex report what it loaded.',
      },
      {
        label: "Review rules",
        value:
          "GitHub code review follows a `## Code Review Rules` section, from the root `AGENTS.md` and any nested one covering a changed file.",
      },
    ],
    lookup: [
      {
        note: "Your instructions for every project. An `AGENTS.override.md` beside it replaces it.",
        path: "~/.codex/AGENTS.md",
      },
      {
        note: "Checked first in each directory, from the project root down to where you started. When one exists, that directory’s `AGENTS.md` is skipped.",
        path: "AGENTS.override.md",
      },
      {
        note: "Read at the root, where `init` writes Ultracite’s rules, and in each directory on the way to your working directory.",
        path: "AGENTS.md",
      },
      {
        note: "Other names you list in `~/.codex/config.toml`, tried after `AGENTS.md` in each directory.",
        path: "project_doc_fallback_filenames",
      },
      {
        note: "Closer files are joined later, so they take precedence. Directories below your working directory aren’t read.",
        path: "services/api/AGENTS.md",
      },
    ],
    summary:
      "Codex builds one instruction chain per run: a global file from `~/.codex`, then one file per directory from the project root down to where you started. An `AGENTS.override.md` beats `AGENTS.md` in the same directory, so a forgotten override can hide your rules.",
  },
  skills:
    "Codex scans `.agents/skills` in every directory from where you start it up to the repository root, plus `~/.agents/skills`. That’s where `init` installs the Ultracite skill by default, so Codex finds it with no extra setup.",
  sources: [
    {
      title: "Codex: Custom instructions with AGENTS.md",
      url: "https://learn.chatgpt.com/docs/agent-configuration/agents-md",
    },
    {
      title: "Codex: Hooks",
      url: "https://learn.chatgpt.com/docs/hooks",
    },
    {
      title: "Codex: Agent approvals & security",
      url: "https://learn.chatgpt.com/docs/agent-approvals-security",
    },
    {
      title: "Codex: Non-interactive mode",
      url: "https://learn.chatgpt.com/docs/non-interactive-mode",
    },
    {
      title: "Codex: Build skills",
      url: "https://learn.chatgpt.com/docs/build-skills",
    },
    {
      title: "Codex: Review GitHub pull requests with Codex",
      url: "https://learn.chatgpt.com/docs/third-party/github",
    },
  ],
};
