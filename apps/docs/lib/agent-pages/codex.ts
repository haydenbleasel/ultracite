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
        "Yes. Codex runs `PostToolUse` hooks after `apply_patch` edits, from `.codex/hooks.json` or `.codex/config.toml`, once you’ve trusted them in `/hooks`. Ultracite doesn’t configure a Codex hook yet, so Codex lints because the rules in `AGENTS.md` tell it to.",
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
  headline: "Codex runs your lint checks in its sandbox",
  highlights: [
    {
      body: "Codex code review on GitHub follows `## Code Review Rules` sections in the root `AGENTS.md` and in any nested one that covers a changed file. OpenAI’s advice is to leave formatting and lint checks out of those rules and in CI, which is where `ultracite check` belongs.",
      title: "Code review reads AGENTS.md too",
    },
    {
      body: "Codex runs `PostToolUse` hooks from `.codex/hooks.json` or a `[hooks]` table in `.codex/config.toml`, and a matcher of `Edit` or `Write` catches `apply_patch` edits. Project hooks load only in a trusted project, and each one waits until you review it in `/hooks`. Ultracite doesn’t set one up for Codex yet.",
      title: "Hooks exist, but need trust",
    },
    {
      body: "`codex exec` runs in a read-only sandbox unless you pass `--sandbox workspace-write`. That’s the flag `ultracite fix --codex` passes, along with `--skip-git-repo-check`, so Codex can edit the files it’s handed in any project.",
      title: "Headless runs start read-only",
    },
  ],
  intro:
    "Codex reads `AGENTS.md` from your project root down to the directory you start it in, so Ultracite’s rules are in its instructions from the first message. It runs `ultracite fix` and `ultracite check` because the rules tell it to, inside the same `workspace-write` sandbox it edits in, and `ultracite fix --codex` hands whatever’s left back to `codex exec`.",
  loop: {
    body: "There’s no Codex hook in Ultracite yet. In the `Auto` preset (`workspace-write` with `on-request` approvals), Codex can run commands in your working directory without asking, so it runs the commands in `AGENTS.md` as it works. Network access is off in that sandbox by default, which is fine: `init` installs `ultracite` into the project.",
    steps: [
      "Codex edits files with its `apply_patch` tool.",
      "Following `AGENTS.md`, it runs `npx ultracite fix` and `npx ultracite check` in the sandbox, with no approval prompt.",
      "It reads the linter’s output like any other command result and works on what’s left.",
      "Outside a session, `npx ultracite fix --codex` hands each file with problems left to `codex exec`, then lints it again.",
    ],
    title: "Codex runs the checks in its sandbox",
  },
  metaDescription:
    "Set up Ultracite for Codex: rules in AGENTS.md, lint runs inside the workspace-write sandbox, and fix --codex to hand leftovers to codex exec.",
  metaTitle: "Ultracite for Codex — AGENTS.md, sandbox and code review",
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
