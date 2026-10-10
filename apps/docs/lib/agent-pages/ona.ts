import type { AgentPageContent } from "./types";

export const ona: AgentPageContent = {
  checked: { date: "2026-10-10" },
  faqs: [
    {
      answer:
        "Yes. Ona’s agents load the root `AGENTS.md` at the start of every session, and in a monorepo they read the nearest `AGENTS.md` in the directory tree.",
      question: "Does Ona read AGENTS.md?",
    },
    {
      answer:
        "Ona announced in June 2026 that it was joining OpenAI as part of the Codex team, and the deal closed on August 10, 2026. Separately, Ona’s docs now point every new environment and Automation to Codex Agent; Ona Agent is deprecated.",
      question: "What changed when Ona joined OpenAI?",
    },
    {
      answer:
        "The rules in `AGENTS.md` tell it to run `npx ultracite fix` and `npx ultracite check`. For a check that doesn’t depend on the agent, put `npx ultracite check` in an Automation’s Command step or a task in `.ona/config.yaml`.",
      question: "How do I make Ona’s agent run the linter?",
    },
    {
      answer:
        "Ona’s docs don’t describe hooks that run after the agent edits a file. Command steps in Automations and tasks in `.ona/config.yaml` are where deterministic checks go.",
      question: "Does Ona support hooks?",
    },
    {
      answer:
        "In the Dev Container or a startup task, so the environment has `node_modules` before the agent runs `ultracite`. A task with the `postDevcontainerStart` trigger runs after the Dev Container starts.",
      question: "Where should dependencies get installed?",
    },
  ],
  headline: "Ona agents, with lint as a deterministic step",
  highlights: [
    {
      body: "Ona Agent, Ona’s own harness for Anthropic models, is deprecated and no longer available on Ona Cloud, where existing Automations moved to Codex Agent automatically. Enterprise organizations with their own Anthropic model access can keep Ona Agent for now.",
      title: "Codex is the agent now",
    },
    {
      body: "Automation steps run in sequence in one environment: Prompt for work that needs judgment, Command for deterministic operations like `npm test`, then Pull request and Report. Ona’s guidance is to use commands for validation and prompts for changes.",
      title: "Prompts and commands in one Automation",
    },
    {
      body: "Automations run manually, on a schedule, or on pull request events, which need the GitHub integration or a webhook. Run them on projects to reuse each project’s Dev Container and environment settings.",
      title: "Triggered by pull requests",
    },
  ],
  intro:
    "Ona’s agents load `AGENTS.md` at the start of every session, and a nested `AGENTS.md` applies to its own part of the tree. There’s no post-edit hook: the agent runs `ultracite` when the rules tell it to, and an Automation’s Command step or a task in `.ona/config.yaml` runs the check without relying on it.",
  loop: {
    body: "In a conversation, the agent runs Ultracite because `AGENTS.md` tells it to. In an Automation, a Command step makes the check deterministic: it runs `npx ultracite check` after the Prompt step and before the Pull request step, in the same environment. A task in `.ona/config.yaml` puts the same check one click away in the session sidebar.",
    snippets: [
      {
        code: "tasks:\n  lint:\n    name: Ultracite check\n    command: npx ultracite check\n    triggeredBy:\n      - manual",
        lang: "yaml",
        title: ".ona/config.yaml",
      },
    ],
    steps: [
      "The agent edits files in an isolated environment built from your Dev Container, with `AGENTS.md` loaded.",
      "It runs `npx ultracite fix` and `npx ultracite check` when the rules tell it to.",
      "In an Automation, a Command step runs `npx ultracite check` after the Prompt step.",
      "The Pull request step submits the changes for review, where your CI check runs as usual.",
    ],
    title: "Lint as a step, not a suggestion",
  },
  metaDescription:
    "Set up Ultracite for Ona, now part of OpenAI: rules in AGENTS.md for its Codex agent, and ultracite check as a Command step in Automations.",
  metaTitle: "Ultracite for Ona — AGENTS.md and lint steps in Automations",
  related: ["codex", "devin", "open-hands"],
  rules: {
    facts: [
      {
        label: "Length",
        value:
          "Ona recommends under 300 lines, and under 60 for most projects. Ultracite’s rules are about 120 lines.",
      },
      {
        label: "Nesting",
        value:
          "Agents read the nearest `AGENTS.md` in the directory tree, so `packages/web/AGENTS.md` covers that package.",
      },
      {
        label: "Emphasis",
        value:
          "Ona notes that agents pay attention to emphasis, such as “IMPORTANT” or “NEVER” on a rule that must not be broken.",
      },
      {
        label: "The agent",
        value:
          "Codex Agent, which runs the open-source Codex harness, for all new environments and Automations.",
      },
      {
        label: "Status",
        value:
          "Ona joined OpenAI’s Codex team; the deal closed on August 10, 2026.",
      },
      {
        label: "Environment",
        value:
          "Each agent works in an isolated environment built from your Dev Container, so Node and your dependencies need to be there for `ultracite` to run.",
      },
    ],
    lookup: [
      {
        note: "Loaded at the start of every session.",
        path: "AGENTS.md",
      },
      {
        note: "In a monorepo, agents read the nearest file in the directory tree, so each package can have its own.",
        path: "packages/*/AGENTS.md",
      },
      {
        note: "Repository skills, also read from `.claude/skills/` and `.agents/skills/`. They win over organization skills with the same name.",
        path: ".ona/skills/",
      },
      {
        note: "Set in Settings > Agents > Skills, for every repository in the organization.",
        path: "Organization skills",
      },
    ],
    summary:
      "Ona recommends a short `AGENTS.md` in the repository root, loaded at the start of every session, with nested files for packages that need their own instructions. Skills come from the repository, the organization and Ona itself.",
  },
  skills:
    "Ona discovers repository skills in `.ona/skills/`, `.claude/skills/` and `.agents/skills/`, so it finds the Ultracite skill `init` installs in `.agents/skills/` and uses it when a task matches its description.",
  sources: [
    {
      title: "Ona: Teach agents your codebase",
      url: "https://ona.com/docs/ona/agents-md",
    },
    {
      title: "Ona: Ona is joining OpenAI",
      url: "https://ona.com/stories/ona-joins-openai",
    },
    {
      title: "Ona: Ona Agent (deprecated)",
      url: "https://ona.com/docs/ona/agents/overview",
    },
    {
      title: "Ona: Skills",
      url: "https://ona.com/docs/ona/agents/skills",
    },
    {
      title: "Ona: Configure Automations",
      url: "https://ona.com/docs/ona/automations/configure-automations",
    },
    {
      title: "Ona: Startup tasks and services",
      url: "https://ona.com/docs/ona/configuration/tasks-and-services/overview",
    },
  ],
};
