import type { AgentPageContent } from "./types";

export const replit: AgentPageContent = {
  checked: { date: "2026-10-10" },
  faqs: [
    {
      answer:
        "Not according to Replit’s docs: Agent reads `replit.md` from the project root. `init --agents replit` writes the rules to `AGENTS.md` for your other agents and copies them into `replit.md`, after anything already in it.",
      question: "Does Replit Agent read AGENTS.md?",
    },
    {
      answer:
        "Agent can edit `replit.md` as it learns about your project. If Ultracite’s section changes or disappears, run `npx ultracite@latest init --agents replit` again: it rewrites its own section and leaves Agent’s notes alone.",
      question: "Will Replit Agent overwrite the rules in replit.md?",
    },
    {
      answer:
        "The rules already tell it to run `npx ultracite fix` and `npx ultracite check`. To be sure, ask in your prompt, for example before it commits, or add a Workflow that runs the check.",
      question: "How do I make Replit Agent run the linter?",
    },
    {
      answer:
        "Workspace custom instructions apply to every project, on Pro and Enterprise. Replit says shorter instructions are followed more reliably, so keep the full rules in each project’s `replit.md` and use custom instructions for a one-line reminder at most.",
      question: "Can I set Ultracite’s rules for every Replit project?",
    },
    {
      answer:
        "Replit’s docs don’t describe hooks that run after Agent edits a file. A Workflow and a CI check are the places to run `ultracite check` without relying on Agent.",
      question: "Does Replit Agent support hooks?",
    },
  ],
  headline: "Replit Agent reads the rules from replit.md",
  highlights: [
    {
      body: "Replit’s guide to contributing to a GitHub project suggests a follow-up prompt: “Before you commit, run the project’s linter and test suite and show me anything that fails.” Agent then commits to a branch, pushes it and opens the pull request.",
      title: "Ask for the linter before the commit",
    },
    {
      body: "A Workflow in sequential mode runs its tasks in order and stops when one fails, so an Execute Shell Command task for `npx ultracite check` ahead of your tests makes a one-click gate in the Workflows pane.",
      title: "Workflows stop at the first failure",
    },
    {
      body: "As you build, Replit reviews the files Agent changes for common insecure patterns and hardcoded secrets. It’s a lightweight security check, not a lint, so it sits alongside `ultracite check` rather than replacing it.",
      title: "A security pass on Agent’s changes",
    },
  ],
  intro:
    "Replit Agent reads `replit.md` from the project root, not `AGENTS.md`, so `init --agents replit` writes the rules to both and rewrites only its own section of `replit.md` when you run it again. There’s no post-edit hook: Agent runs `ultracite fix` and `check` when the rules tell it to, and a Workflow or CI check runs them on demand.",
  loop: {
    body: "Replit’s docs describe no hook that runs after Agent edits a file. Agent follows `replit.md`, which tells it to run `npx ultracite fix` and `npx ultracite check`; for a check that doesn’t depend on Agent, add a Workflow or a CI job.",
    steps: [
      "Agent edits files in your Replit App with `replit.md` in context.",
      "Replit reviews the changed files for insecure patterns and hardcoded secrets, a security check rather than a lint.",
      "Agent runs `npx ultracite fix` and `npx ultracite check` when it follows the rules, or when you ask it to before it commits.",
      "A Workflow that runs `npx ultracite check` gives you the check on demand, and CI covers what reaches GitHub.",
    ],
    title: "Checks run when the rules ask for them",
  },
  metaDescription:
    "Set up Ultracite for Replit Agent: the rules copied into replit.md, the project file Agent reads, plus the Ultracite skill in .agents/skills.",
  metaTitle: "Ultracite for Replit Agent — Rules in replit.md",
  related: ["lovable", "devin", "jules"],
  rules: {
    facts: [
      {
        label: "Root only",
        value:
          "`replit.md` must sit in the project root. Agent doesn’t look for it in subdirectories.",
      },
      {
        label: "Agent edits it",
        value:
          "Agent creates `replit.md` in new projects and updates it as it learns. `init` rewrites only its own section, from `# Ultracite Code Standards` on.",
      },
      {
        label: "Size",
        value:
          "No strict limit, but very large files may not be fully processed. Ultracite’s section is about 120 lines.",
      },
      {
        label: "Starting over",
        value:
          "Delete `replit.md` and start a new conversation, and Agent writes a fresh one from your project. Run `init` again afterwards to put the rules back.",
      },
      {
        label: "Workspace-wide",
        value:
          "Custom instructions load on every message in every project of the workspace. Replit warns that strict requirements in them aren’t guaranteed.",
      },
      {
        label: "Other tools",
        value:
          "`replit.md` gives context to Agent conversations only, not to other AI tools, which is why `init` writes `AGENTS.md` as well.",
      },
    ],
    lookup: [
      {
        note: "Always-on guidance for every project in the workspace, set in Workspace Settings. Pro and Enterprise.",
        path: "Workspace custom instructions",
      },
      {
        note: "Read automatically when Agent processes a request. It must be in the project root.",
        path: "replit.md",
      },
      {
        note: "Not in Replit’s docs. `init` writes it for your other agents and copies the same rules into `replit.md`.",
        path: "AGENTS.md",
      },
      {
        note: "Installed skills: Agent sees each one’s name and description and loads the rest when a task needs it.",
        path: ".agents/skills/",
      },
    ],
    summary:
      "Agent’s project instructions come from one file, `replit.md` in the root, on top of any workspace-wide custom instructions. Agent also writes and updates `replit.md` itself, so Ultracite’s section shares the file with Agent’s own notes.",
  },
  skills:
    "Replit Agent loads skills from the project’s `/.agents/skills` folder, which is where `init` installs the Ultracite skill, so Agent finds it. It sees every installed skill’s name and description and loads the full skill when a task calls for it.",
  sources: [
    {
      title: "Replit: replit.md",
      url: "https://docs.replit.com/features/project-setup/replit-dot-md",
    },
    {
      title: "Replit: Agent Customization",
      url: "https://docs.replit.com/features/agent/agent-customization",
    },
    {
      title: "Replit: Agent Skills",
      url: "https://docs.replit.com/features/agent/skills",
    },
    {
      title: "Replit: Contribute to a GitHub project",
      url: "https://docs.replit.com/use-cases/ship-github-change",
    },
    {
      title: "Replit: Workflows",
      url: "https://docs.replit.com/features/workspace-tools/workflows",
    },
    {
      title: "Replit: Project Security Center",
      url: "https://docs.replit.com/features/security/project-security-center",
    },
  ],
};
