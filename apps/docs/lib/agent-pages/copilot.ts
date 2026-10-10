import type { AgentPageContent } from "./types";

export const copilot: AgentPageContent = {
  checked: { date: "2026-10-10" },
  faqs: [
    {
      answer:
        "Yes. The cloud agent, code review and the Copilot CLI all read it. The nearest `AGENTS.md` in the tree takes precedence, and it’s combined with `.github/copilot-instructions.md` rather than replacing it.",
      question: "Does GitHub Copilot read AGENTS.md?",
    },
    {
      answer:
        "For `postToolUse`, the Copilot CLI and cloud agent treat exit code 2 as a warning shown to you, not feedback for the model; only JSON output such as `additionalContext` reaches it. VS Code’s Local agent passes a hook’s stderr to the model on exit code 2, so there the agent sees what’s left.",
      question: "Why doesn’t the Copilot CLI see what the hook couldn’t fix?",
    },
    {
      answer:
        "Check that `.github/hooks/ultracite.json` is on the default branch, is valid JSON and has `version: 1`. Hooks also time out after 30 seconds by default; raise `timeoutSec` if a fix takes longer.",
      question: "Why isn’t my hook running in the Copilot cloud agent?",
    },
    {
      answer:
        "In the Copilot CLI, run `/instructions` to list the files it found and turn any of them off. The CLI reads instruction files when a session starts, so exit and resume (`copilot --continue`) or start a new session after editing them.",
      question: "How do I check which instructions Copilot loaded?",
    },
    {
      answer:
        "Yes. Besides `.github/hooks/*.json`, it reads hooks from `.claude/settings.json` and `.claude/settings.local.json` in the repository and combines every source. The cloud agent reads only `.github/hooks/*.json`.",
      question: "Does the Copilot CLI read Claude Code hooks?",
    },
  ],
  headline: "One Copilot hook, three places it runs",
  highlights: [
    {
      body: "Copilot cloud agent only uses a hooks file that’s on your default branch, and in its Linux sandbox `.github/hooks/*.json` is the only hook config there is. Merge `ultracite.json` before you assign Copilot an issue.",
      title: "The cloud agent needs the hook merged",
    },
    {
      body: "Copilot code review reads `AGENTS.md`, path-specific instructions and skills from the pull request’s head branch, not the base branch, so you can test a change to the rules in the same pull request.",
      title: "Code review reads the same rules",
    },
    {
      body: "In VS Code, the Local agent maps the Copilot hook format onto its own and passes stderr to the model on exit code 2. A Copilot session on the Agent Host follows GitHub’s hooks reference instead, where that output only reaches you.",
      title: "VS Code depends on the session target",
    },
  ],
  intro:
    "Copilot’s cloud agent, code review and CLI all read `AGENTS.md`, so Ultracite’s rules reach each of them from one file. `init --hooks copilot` adds a `postToolUse` hook that runs `ultracite fix` on the file Copilot just edited. In VS Code’s Local agent, what the fix leaves goes back to the model; in the CLI and cloud agent, the fixes land and the rest is left to the commands in the rules.",
  loop: {
    body: "`init --hooks copilot` writes `.github/hooks/ultracite.json` in the Copilot format (`version: 1`, camelCase events), which the Copilot CLI and cloud agent read and VS Code maps onto its own. The hook has no matcher, so it runs after every tool, and `ultracite fix --hook` skips the tools that don’t edit files.",
    steps: [
      "Copilot creates or edits a file, in VS Code, the CLI or a cloud agent session.",
      "The hook runs `ultracite fix --hook`, which reads the edited path from the payload and fixes just that file.",
      "In VS Code’s Local agent, problems left go to stderr with exit code 2, and the model reads them before its next step.",
      "In the CLI and cloud agent, the hook’s output isn’t passed to the model, so Copilot finds anything left by running `ultracite check`.",
    ],
    title: "A postToolUse hook on every edit",
  },
  metaDescription:
    "Set up Ultracite for GitHub Copilot: rules in AGENTS.md for the cloud agent, CLI and code review, and a postToolUse hook that fixes each file Copilot edits.",
  metaTitle: "Ultracite for GitHub Copilot — AGENTS.md and a post-edit hook",
  related: ["claude", "codex", "cursor-cli"],
  rules: {
    facts: [
      {
        label: "Combined",
        value:
          "Every file that applies goes into the prompt. The CLI drops identical duplicates but sets no order between different files, so avoid conflicting instructions.",
      },
      {
        label: "Nearest wins",
        value:
          "With several `AGENTS.md` files, the one nearest the code Copilot is working on takes precedence.",
      },
      {
        label: "Path-specific",
        value:
          "`.github/instructions/*.instructions.md` files apply only when their `applyTo` glob matches. `excludeAgent` keeps one from code review or the cloud agent.",
      },
      {
        label: "Code review",
        value:
          "Reads `AGENTS.md`, repository and path-specific instructions, and skills from the pull request’s head branch.",
      },
      {
        label: "Imports",
        value:
          "In `AGENTS.md`, `CLAUDE.md` and `.github/copilot-instructions.md`, the CLI expands `@path` references to files inside the repository.",
      },
      {
        label: "Check it",
        value:
          "`/instructions` in the Copilot CLI lists every file it found. Edits take effect in the next session.",
      },
    ],
    lookup: [
      {
        note: "Your instructions for every repository, in the Copilot CLI.",
        path: "~/.copilot/copilot-instructions.md",
      },
      {
        note: "Repository-wide instructions, applied to every request made in the repository.",
        path: ".github/copilot-instructions.md",
      },
      {
        note: "Path-specific: included only when the `applyTo` glob matches a file Copilot is working on.",
        path: ".github/instructions/*.instructions.md",
      },
      {
        note: "Agent instructions for the cloud agent, code review and the CLI. With several in the tree, the nearest one takes precedence.",
        path: "AGENTS.md",
      },
      {
        note: "Also read as agent instructions: at the repository root by the cloud agent, and wherever the CLI looks for `AGENTS.md`.",
        path: "CLAUDE.md or GEMINI.md",
      },
    ],
    summary:
      "Copilot combines every instructions file that applies instead of picking one. `AGENTS.md` sits alongside `.github/copilot-instructions.md` and path-specific `.instructions.md` files, and when there are several, the nearest `AGENTS.md` takes precedence.",
  },
  skills:
    "Copilot loads project skills from `.github/skills`, `.claude/skills` or `.agents/skills` in the cloud agent, code review, the CLI and agent mode in VS Code. `init` installs the Ultracite skill into `.agents/skills/`, so Copilot finds it.",
  sources: [
    {
      title: "GitHub Docs: Adding repository custom instructions",
      url: "https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions",
    },
    {
      title: "GitHub Docs: Adding custom instructions for Copilot CLI",
      url: "https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-custom-instructions",
    },
    {
      title: "GitHub Docs: Copilot hooks reference",
      url: "https://docs.github.com/en/copilot/reference/hooks-reference",
    },
    {
      title: "GitHub Docs: Customize agent workflows with hooks",
      url: "https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/use-hooks",
    },
    {
      title: "VS Code: Local hooks reference",
      url: "https://code.visualstudio.com/docs/agents/reference/hooks-reference",
    },
    {
      title: "GitHub Docs: About agent skills",
      url: "https://docs.github.com/en/copilot/concepts/agents/about-agent-skills",
    },
  ],
};
