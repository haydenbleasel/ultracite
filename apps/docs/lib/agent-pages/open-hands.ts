import type { AgentPageContent } from "./types";

export const openHands: AgentPageContent = {
  checked: { date: "2026-10-10", version: "1.26.0" },
  faqs: [
    {
      answer:
        "Yes. The root `AGENTS.md` is always loaded, in full, into the agent’s initial system prompt. OpenHands also recognizes `AGENT.md`, `CLAUDE.md`, `GEMINI.md` and `.cursorrules` as repository context.",
      question: "Does OpenHands read AGENTS.md?",
    },
    {
      answer:
        "The rules tell it to run `npx ultracite fix` and `npx ultracite check`. To enforce that, add a Stop hook that runs `ultracite check` and exits 2 when it fails, so OpenHands can’t finish until the check passes.",
      question: "How do I make OpenHands run the linter?",
    },
    {
      answer:
        "No. OpenHands reads hooks from `.openhands/hooks.json`, not `.claude/settings.json`. Its format accepts Claude Code’s, but its tools have different names, such as `terminal` rather than `Bash`.",
      question: "Will Ultracite’s Claude Code hook run in OpenHands?",
    },
    {
      answer:
        "In OpenHands, `PostToolUse` hooks can’t block, so they can’t send the agent back to work. A `Stop` hook can: exit code 2, or a `deny` decision, keeps the agent going.",
      question: "Why a Stop hook instead of PostToolUse?",
    },
    {
      answer:
        "Microagents are now skills. `.openhands/microagents/` still loads, but OpenHands recommends `AGENTS.md` for repository-wide guidance and `.agents/skills/` for skills.",
      question: "What happened to microagents and repo.md?",
    },
    {
      answer:
        "OpenHands suggests moving checks from `.openhands/pre-commit.sh` into a Stop hook, so the quality gate applies to its current agent-server-backed flows.",
      question: "I use .openhands/pre-commit.sh. Should I keep it?",
    },
  ],
  headline: "Keep OpenHands working until Ultracite passes",
  highlights: [
    {
      body: "A `packages/api/AGENTS.md` isn’t loaded up front. OpenHands turns it into a path rule and injects it once, the first time the agent reads, edits or creates a file under `packages/api/`, so a package’s notes cost nothing until they’re needed.",
      title: "Nested files become path rules",
    },
    {
      body: '`openhands --headless -t "…"` runs without the terminal UI, for scripts and CI. It always runs in `always-approve` mode, which can’t be changed, and `--json` streams every event as JSON Lines you can parse.',
      title: "Headless runs approve everything",
    },
    {
      body: "With OpenHands Cloud installed on a repository, label an issue `openhands` or start a comment with `@openhands`, and it opens a pull request when it’s done. Mention `@openhands` on a pull request to ask for updates.",
      title: "Issues and pull requests on GitHub",
    },
  ],
  intro:
    "OpenHands puts the full root `AGENTS.md` into the agent’s initial system prompt. Ultracite doesn’t write an OpenHands hook, but OpenHands documents a Stop hook for this job: when the agent tries to finish, the hook runs your linter and keeps the agent working until it passes.",
  loop: {
    body: "OpenHands hooks live in `.openhands/hooks.json` and work in the Cloud, the CLI and the local GUI. A `PostToolUse` hook can’t block there, so OpenHands’ own lint example uses a `Stop` hook; the snippets are that example with `ultracite check` swapped in. Ultracite doesn’t write them for you.",
    snippets: [
      {
        code: '#!/bin/bash\n# Stop hook: Don\'t let the agent stop if Ultracite finds problems\ncd "$OPENHANDS_PROJECT_DIR"\n\nif ! npx ultracite check 2>&1; then\n    echo \'{"decision": "deny", "reason": "Ultracite found problems. Please fix them before finishing."}\'\n    exit 2\nfi\nexit 0',
        lang: "bash",
        title: ".openhands/hooks/lint_check.sh",
      },
      {
        code: '{\n  "stop": [\n    {\n      "matcher": "*",\n      "hooks": [\n        {\n          "command": ".openhands/hooks/lint_check.sh",\n          "timeout": 120\n        }\n      ]\n    }\n  ]\n}',
        lang: "json",
        title: ".openhands/hooks.json",
      },
    ],
    steps: [
      "The agent edits files in its sandbox, with `AGENTS.md` in its system prompt.",
      "When it tries to finish, OpenHands runs the Stop hook, which runs `npx ultracite check`.",
      "If the check fails, the hook prints a `deny` decision and exits 2, and the agent keeps working.",
      "Once the check passes, the hook exits 0 and the agent finishes. Make the script executable with `chmod +x`.",
    ],
    title: "A Stop hook that waits for a clean check",
  },
  metaDescription:
    "Set up Ultracite for OpenHands: rules in AGENTS.md, loaded into every conversation, and a Stop hook that holds the agent until ultracite check passes.",
  metaTitle: "Ultracite for OpenHands — AGENTS.md and a lint Stop hook",
  related: ["devin", "jules", "ona"],
  rules: {
    facts: [
      {
        label: "Working directory first",
        value:
          "Started in a subdirectory, OpenHands also checks the Git repo root, but a file in the working directory wins over the root’s file of the same kind.",
      },
      {
        label: "Keep it short",
        value:
          "Always-on content takes up context from the first message, so OpenHands suggests a concise `AGENTS.md`. Ultracite’s rules are about 120 lines.",
      },
      {
        label: "Setup script",
        value:
          "`.openhands/setup.sh` runs every time OpenHands starts work on the repo. Install dependencies there so `ultracite` is ready.",
      },
      {
        label: "Hooks file",
        value:
          "`.openhands/hooks.json`, committed to the repo. Hooks are active the next time OpenHands works on it.",
      },
      {
        label: "Check it",
        value:
          "In the CLI, `/skills` lists the loaded skills, hooks and MCP servers. In the Cloud, hook events show in the conversation log.",
      },
      {
        label: "Symlinks",
        value:
          "A `CLAUDE.md` symlinked to `AGENTS.md` is loaded once, not twice.",
      },
    ],
    lookup: [
      {
        note: "From the working directory, and from the Git repo root if that’s different. Its full content goes into the initial system prompt.",
        path: "AGENTS.md",
      },
      {
        note: "Also loaded as repository context, along with `AGENT.md` and `.cursorrules`.",
        path: "CLAUDE.md, GEMINI.md",
      },
      {
        note: "A nested file becomes a path rule, injected the first time the agent reads, edits or creates a file under that directory.",
        path: "packages/*/AGENTS.md",
      },
      {
        note: "Project skills. They win over the legacy `.openhands/skills/` and `.openhands/microagents/` when names clash.",
        path: ".agents/skills/",
      },
    ],
    summary:
      "OpenHands treats the root `AGENTS.md` as always-on repository context and nested `AGENTS.md` files as rules for their own directory. Skills come on top, from `.agents/skills/` and the legacy `.openhands/` folders.",
  },
  skills:
    "OpenHands loads project skills from `.agents/skills/`, where `init` installs the Ultracite skill, and from the legacy `.openhands/skills/`, where it also goes when the project has an `.openhands` folder. When both copies exist, the `.agents/skills/` one wins. Start a new conversation after adding it.",
  sources: [
    {
      title: "OpenHands: Skills overview",
      url: "https://docs.openhands.dev/overview/skills",
    },
    {
      title: "OpenHands: Hooks",
      url: "https://docs.openhands.dev/openhands/usage/customization/hooks",
    },
    {
      title: "OpenHands: Repository customization",
      url: "https://docs.openhands.dev/openhands/usage/customization/repository",
    },
    {
      title: "OpenHands: Headless mode",
      url: "https://docs.openhands.dev/openhands/usage/cli/headless",
    },
    {
      title: "OpenHands Cloud: GitHub integration",
      url: "https://docs.openhands.dev/openhands/usage/cloud/github-installation",
    },
    {
      title: "OpenHands SDK: skill loading (source)",
      url: "https://github.com/OpenHands/software-agent-sdk/blob/main/openhands-sdk/openhands/sdk/skills/skill.py",
    },
  ],
};
