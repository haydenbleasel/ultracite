import type { AgentPageContent } from "./types";

export const zencoder: AgentPageContent = {
  checked: { date: "2026-10-10" },
  faqs: [
    {
      answer:
        "Yes. Since February 2026 Zencoder resolves agent instructions from `AGENTS.md`, and since May 2026 it’s the way to set project conventions, because custom rules are gone. `ultracite init --agents zencoder` writes Ultracite’s rules there.",
      question: "Does Zencoder read AGENTS.md?",
    },
    {
      answer:
        "Zencoder began phasing them out in March 2026 and removed them in May 2026, pointing to `AGENTS.md` instead. Move anything still in `.zencoder/rules/` into `AGENTS.md`.",
      question: "What happened to Zencoder’s custom rules?",
    },
    {
      answer:
        "Set `verification_script` to `npx ultracite check` in `.zenflow/settings.json`, or under Scripts & Automation in the repository’s settings. Zenflow runs it after every agent turn and shows you the output when it fails.",
      question: "How do I make Zenflow run the linter?",
    },
    {
      answer:
        "Zencoder’s changelog says `zencli` gained a hooks system in May 2026 for running commands at points in an agent’s lifecycle. Its docs don’t describe the configuration yet, and Ultracite doesn’t set one up.",
      question: "Does Zencoder support hooks?",
    },
    {
      answer:
        "Zenflow can run Claude Code, Codex or Gemini, and each loads instructions its own way. Add `AGENTS.md` to the repository’s Always Included Rules so it’s in the agent’s context whichever you choose.",
      question: "Does Zenflow’s Claude Code agent see the rules?",
    },
  ],
  headline: "Zencoder dropped custom rules for AGENTS.md",
  highlights: [
    {
      body: "Zenflow runs every Code task in its own Git worktree at `.zenflow/worktrees/{task_id}`, on its own branch, and `setup_script` runs when that worktree is created. Install dependencies there so `ultracite` is ready for the verification script.",
      title: "Each task gets its own worktree",
    },
    {
      body: "Auto-approve mode, generally available in VS Code and JetBrains since May 2026, lets the agent run end to end without pausing to confirm each action, including the `ultracite` commands the rules ask for.",
      title: "Auto-approve for trusted work",
    },
    {
      body: "Zenflow’s Multi-model workflow assigns different models to planning, implementation and review, so a second model reviews what the first one wrote.",
      title: "A different model can review",
    },
  ],
  intro:
    "Zencoder’s agent takes its project instructions from `AGENTS.md`, which replaced custom rules in May 2026, so Ultracite’s rules reach it in VS Code and JetBrains IDEs. Ultracite doesn’t set up a hook for it; in Zenflow, a `verification_script` can run `ultracite check` after every agent turn.",
  loop: {
    body: "In Zenflow, `verification_script` in `.zenflow/settings.json` runs after each agent turn, which makes `npx ultracite check` a quality gate on every change. When it fails, you see the output and tell the agent to fix it: handing failures to the agent automatically is planned, not shipped. In the IDE plugins, the agent runs `ultracite fix` when `AGENTS.md` tells it to.",
    snippets: [
      {
        code: `{
  "setup_script": "npm install",
  "verification_script": "npx ultracite check"
}`,
        lang: "json",
        title: ".zenflow/settings.json",
      },
    ],
    steps: [
      "The agent finishes a turn in the task’s worktree.",
      "Zenflow runs `verification_script`, here `npx ultracite check`.",
      "If it exits with code 0, the task carries on.",
      "Any other exit code and Zenflow shows you the output, so you can ask the agent to fix it.",
    ],
    title: "A verification script after every turn",
  },
  metaDescription:
    "Set up Ultracite for Zencoder: rules in AGENTS.md now that custom rules are gone, and a Zenflow verification script that runs ultracite check after each turn.",
  metaTitle: "Ultracite for Zencoder — AGENTS.md and Zenflow verification",
  related: ["augmentcode", "junie", "kilo-code"],
  rules: {
    facts: [
      {
        label: "Timeline",
        value:
          "`AGENTS.md` support arrived in February 2026. Custom rules were deprecated in March and fully removed in May 2026.",
      },
      {
        label: "Other agents",
        value:
          "Zenflow can run Claude Code, Codex or Gemini as the agent. List `AGENTS.md` under Always Included Rules to put it in front of whichever you pick.",
      },
      {
        label: "Skills",
        value:
          "`.agents/skills/` is the current location. The legacy `.zencoder/skills/` still works but is deprecated.",
      },
    ],
    lookup: [
      {
        note: "The project’s instructions for Zencoder’s agent, and where `init` writes Ultracite’s rules.",
        path: "AGENTS.md",
      },
      {
        note: "A Zenflow repository setting: files you list, one per line (such as `CLAUDE.md`), are always added to the agent’s context.",
        path: "Always Included Rules",
      },
      {
        note: "Skills, loaded when one’s description matches the task. `.claude/skills/` and `~/.agents/skills/` work too.",
        path: ".agents/skills/",
      },
      {
        note: "Where custom rules lived. Zencoder removed them in May 2026, so move anything left here into `AGENTS.md`.",
        path: ".zencoder/rules/",
      },
    ],
    summary:
      "Zencoder resolves agent instructions from `AGENTS.md` (since February 2026), and it’s now the place for project conventions: custom rules were deprecated in March 2026 and removed in May.",
  },
  skills:
    "Zencoder loads skills from `.agents/skills/`, plus `~/.agents/skills/` and `.claude/skills/`, in both the IDE plugins and Zenflow, so it finds the Ultracite skill `init` installs in `.agents/skills/`.",
  sources: [
    {
      title: "Zencoder: IDE Agent Changelog",
      url: "https://docs.zencoder.ai/changelog/home",
    },
    {
      title: "Zencoder: May 2026 changelog",
      url: "https://docs.zencoder.ai/changelog/may-2026",
    },
    {
      title: "Zencoder: Projects & Tasks (Zenflow)",
      url: "https://docs.zencoder.ai/zenflow/projects-and-tasks",
    },
    {
      title: "Zencoder: Skills",
      url: "https://docs.zencoder.ai/features/skills",
    },
    {
      title: "Zencoder: CLIs overview",
      url: "https://docs.zencoder.ai/clis/overview",
    },
    {
      title: "Zencoder: Module 3, Custom Workflows",
      url: "https://docs.zencoder.ai/learn/10x-engineer/module-03",
    },
  ],
};
