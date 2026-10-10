import type { AgentPageContent } from "./types";

export const junie: AgentPageContent = {
  checked: { date: "2026-10-10", product: "Junie CLI", version: "26.10.5" },
  faqs: [
    {
      answer:
        "Yes. With no custom guidelines path, Junie uses `.junie/AGENTS.md` if it exists; otherwise it reads the project-root `AGENTS.md` together with `.junie/playbook.md` and any `.junie/rules/*.md`. `ultracite init --agents junie` writes Ultracite’s rules to the root file.",
      question: "Does Junie read AGENTS.md?",
    },
    {
      answer:
        "Look for a `.junie/AGENTS.md`. In the IDE it’s used exclusively, so the root file is skipped; merge the two, or set the Guidelines path. In Junie CLI, also check that you trusted the project, since an untrusted project’s guidelines don’t load.",
      question: "Why isn’t Junie following my AGENTS.md?",
    },
    {
      answer:
        "Junie CLI does, in Early Access: `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PermissionRequest`, `Stop`, `StopFailure` and `SessionEnd`. There’s no event after a file edit, and Ultracite doesn’t configure Junie hooks.",
      question: "Does Junie support hooks?",
    },
    {
      answer:
        "Pick Always allow when Junie CLI asks, or add a `prefix` rule for `npx ultracite` under `executables` in `~/.junie/allowlist.json`. The IDE keeps its own list under Settings | Tools | Junie | Action Allowlist.",
      question: "How do I let Junie run ultracite without asking?",
    },
    {
      answer:
        "Yes. Set `guidelines-location` in `~/.junie/config.json`, or in the project’s `.junie/config.json` once you trust the project. A relative path resolves from the folder that holds that `config.json`.",
      question: "Can I point Junie CLI at a different guidelines file?",
    },
  ],
  headline: "Junie reads AGENTS.md unless .junie has its own",
  highlights: [
    {
      body: "Junie CLI’s `Stop` hook (Early Access) runs before a task is submitted. Exit with code 2 and Junie feeds your stderr back to the agent and retries, up to 8 times in a row unless `JUNIE_STOP_HOOK_BLOCK_CAP` says otherwise. Hooks load from `~/.junie/config.json` or a `--config-location` file, never from the project’s own `.junie/config.json`, and Ultracite doesn’t set one up.",
      title: "A Stop hook can hold the task open",
    },
    {
      body: "An allowlist rule approves a command only when every command in it is allowed: each side of `&&`, anything inside `$(…)` or backticks, and process substitutions. A command spread over several lines always asks. Rules run top to bottom and the first match wins.",
      title: "Allowlists check every part of a command",
    },
    {
      body: "In the IDE, Junie links each change to the diff viewer as it works. When the task is done, the Done panel lists every changed file, so you can revert files one by one before you accept or reject the result.",
      title: "Review each file before you keep it",
    },
  ],
  intro:
    "Junie reads Ultracite’s rules from the project-root `AGENTS.md`, along with `.junie/rules/`, as long as there’s no `.junie/AGENTS.md` to take its place. It has no hook that runs after an edit, so Junie runs `ultracite fix` and `ultracite check` when the rules tell it to, once you approve the command or allowlist it.",
  loop: {
    body: "Junie has no event that fires after it edits a file: Junie CLI’s hooks, still in Early Access, fire on session start and end, prompts, tool calls before they run, permission requests and task completion. So the loop is the one in `AGENTS.md`, and an allowlist rule saves you approving each `ultracite` run.",
    snippets: [
      {
        code: `{
  "defaultBehavior": "ask",
  "rules": {
    "executables": {
      "rules": [
        { "prefix": "npx ultracite", "action": "allow" }
      ]
    }
  }
}`,
        lang: "json",
        title: "~/.junie/allowlist.json",
      },
    ],
    steps: [
      "Junie edits files as it works through its plan.",
      "The rules in `AGENTS.md` tell it to run `npx ultracite fix`, which it does in the terminal.",
      "Junie asks before running the command unless it’s on the Action Allowlist or Brave mode is on.",
      "It reads the output and fixes what `ultracite fix` couldn’t before handing the task back.",
    ],
    title: "Junie runs the checks AGENTS.md lists",
  },
  metaDescription:
    "Set up Ultracite for JetBrains Junie: rules in AGENTS.md, why a .junie/AGENTS.md hides them, and an allowlist rule so Junie runs ultracite unprompted.",
  metaTitle: "Ultracite for Junie — AGENTS.md rules for JetBrains’ agent",
  related: ["firebender", "augmentcode", "zencoder"],
  rules: {
    facts: [
      {
        label: "One project file",
        value:
          "With no custom path, the IDE uses `.junie/AGENTS.md` exclusively when it exists, so the root `AGENTS.md` and `.junie/rules/` are skipped.",
      },
      {
        label: "Imports",
        value:
          "The first time Junie CLI opens a project, it looks for other agents’ instruction files and offers to import them into `.junie/AGENTS.md`, which then comes first.",
      },
      {
        label: "Global",
        value:
          "`~/.junie/AGENTS.md` (`%USERPROFILE%\\.junie\\AGENTS.md` on Windows) applies to every project in Junie CLI. Identical global and project content is used once.",
      },
      {
        label: "Precedence",
        value:
          "When global and project guidelines conflict, the project’s win. Both are included and marked so Junie can tell them apart.",
      },
      {
        label: "Trust",
        value:
          "Junie CLI doesn’t load an untrusted project’s guidelines, skills or hooks. Non-interactive runs are always trusted, since they can’t ask.",
      },
      {
        label: "Config files",
        value:
          "`guidelines-location` in `~/.junie/config.json`, or in a trusted project’s `.junie/config.json`, points Junie CLI at another file. Command-line flags override both.",
      },
    ],
    lookup: [
      {
        note: "A file set in Settings | Tools | Junie | Project Settings (IDE) or `guidelines-location` (CLI) replaces the defaults below.",
        path: "Guidelines path",
      },
      {
        note: "If `.junie/AGENTS.md` exists, Junie uses it on its own and combines nothing else with it.",
        path: ".junie/AGENTS.md",
      },
      {
        note: "The project-root file `init` writes, read when there’s no `.junie/AGENTS.md`, together with `.junie/playbook.md` and every `.junie/rules/*.md`.",
        path: "AGENTS.md",
      },
      {
        note: "The legacy location (or a `.junie/guidelines/` folder), still read as the last fallback.",
        path: ".junie/guidelines.md",
      },
      {
        note: "Junie CLI adds your global `AGENTS.md` from here to the project’s guidelines; the project wins on conflicts.",
        path: "~/.junie/AGENTS.md",
      },
    ],
    summary:
      "Junie takes one set of project guidelines, found in a fixed order, and Junie CLI adds your global file. The root `AGENTS.md` counts only when nothing ahead of it in that order exists.",
  },
  skills:
    "Junie loads skills from `.junie/skills/` and `~/.junie/skills/`, and Junie CLI also reads `.agents/skills/` in a trusted project. `init` installs the Ultracite skill into `.agents/skills/`, and into `.junie/skills/` as well when the project has a `.junie` folder.",
  sources: [
    {
      title: "Junie: Guidelines and memory",
      url: "https://junie.jetbrains.com/docs/guidelines-and-memory.html",
    },
    {
      title: "Junie: Junie IDE plugin",
      url: "https://junie.jetbrains.com/docs/junie-ide-plugin.html",
    },
    {
      title: "Junie: config.json",
      url: "https://junie.jetbrains.com/docs/junie-cli-configuration.html",
    },
    {
      title: "Junie: Hooks",
      url: "https://junie.jetbrains.com/docs/junie-cli-hooks.html",
    },
    {
      title: "Junie: Add commands to Action Allowlist",
      url: "https://junie.jetbrains.com/docs/action-allowlist-junie-cli.html",
    },
    {
      title: "Junie: Agent skills",
      url: "https://junie.jetbrains.com/docs/agent-skills.html",
    },
  ],
};
