import type { AgentPageContent } from "./types";

export const antigravity: AgentPageContent = {
  checked: { date: "2026-10-10", version: "1.3.1" },
  faqs: [
    {
      answer:
        "Yes, with no setup. It reads `AGENTS.md` or `GEMINI.md` at the repository root and in subdirectories, plus `~/.gemini/AGENTS.md` for every project, and combines them, with the more specific directory winning on conflicts.",
      question: "Does Antigravity CLI read AGENTS.md?",
    },
    {
      answer:
        "Yes: `PreToolUse`, `PostToolUse`, `PreInvocation`, `PostInvocation` and `Stop`, in `.agents/hooks.json` or `~/.gemini/config/hooks.json`, and `/hooks` lists what’s loaded. Ultracite doesn’t configure them, because a `PostToolUse` hook has no documented way to hand lint results to the agent.",
      question: "Does Antigravity CLI support hooks?",
    },
    {
      answer:
        "In headless mode, a shell command that needs approval is soft-denied: the run carries on, exits 0 and prints a notice to stderr. Add `command(npx ultracite)` to `permissions.allow` in `~/.gemini/antigravity-cli/settings.json`.",
      question: "Why didn’t agy -p run the linter?",
    },
    {
      answer:
        "Nothing for the rules: Google’s migration guide says both CLIs read the same `GEMINI.md` and `AGENTS.md`, and Antigravity CLI doesn’t need a `context.fileName` setting to find `AGENTS.md`. Workspace skills are the exception; move them from `.gemini/skills/` to `.agents/skills/`.",
      question: "I used Ultracite with Gemini CLI. What changes?",
    },
    {
      answer:
        "No. Antigravity truncates a rule file past 24,000 bytes and gives global and always-on rules a shared 20,000-token budget; Ultracite’s rules are about 5 KB. Past the budget, the largest files turn into pointers the agent reads on demand.",
      question: "Is Ultracite’s AGENTS.md too big for Antigravity?",
    },
  ],
  headline: "Antigravity CLI reads AGENTS.md as it goes",
  highlights: [
    {
      body: "Antigravity CLI runs `PostToolUse` hooks from `.agents/hooks.json`, matched against tool names such as `write_to_file|replace_file_content|multi_replace_file_content`. The documented output is an empty object, so there’s no documented way for a post-edit hook to tell the agent what’s left. Ultracite doesn’t set one up.",
      title: "Hooks run, but can’t report back",
    },
    {
      body: "Files in `.agents/rules/` need a `trigger` in their frontmatter: `always_on`, `model_decision`, `glob` or `manual`. A missing or misspelled trigger drops the rule silently. Ultracite’s rules apply everywhere, so they stay in `AGENTS.md`.",
      title: "Modular rules need a trigger",
    },
    {
      body: "`agy -p` exits 0 when it produces a response and non-zero when it can’t, and `--output-format json` adds `status` and `error` fields for scripts. A denied tool doesn’t fail the run, so a CI job should read the stderr notices too.",
      title: "Headless runs for CI",
    },
  ],
  intro:
    "Antigravity CLI (`agy`) reads `AGENTS.md` at the repository root and in every folder between a file it touches and the root, so Ultracite’s rules need no extra setup. There’s no Ultracite hook for it: the agent runs `ultracite fix` and `ultracite check` because the rules say to, and a `command(npx ultracite)` allow rule lets it do that without asking.",
  loop: {
    body: "The rules tell the agent to run `ultracite fix` and `ultracite check` with its `run_command` tool, and your permission rules decide whether it asks first. In a headless run (`agy -p`), a shell command that needs approval is skipped and the run still exits 0, so allow `ultracite` ahead of time.",
    snippets: [
      {
        code: '{\n  "permissions": {\n    "allow": ["command(npx ultracite)"]\n  }\n}',
        lang: "json",
        title: "~/.gemini/antigravity-cli/settings.json",
      },
    ],
    steps: [
      "The agent writes a file with `write_to_file`, `replace_file_content` or `multi_replace_file_content`.",
      "Following `AGENTS.md`, it calls `run_command` with `npx ultracite fix` or `npx ultracite check`.",
      "A `command(npx ultracite)` allow rule lets it run without a prompt; without one, you’re asked, or a headless run skips it.",
      "The agent reads the linter’s output and fixes what’s left.",
    ],
    title: "Allow ultracite once in your settings",
  },
  metaDescription:
    "Set up Ultracite for Antigravity CLI: rules in AGENTS.md, loaded per folder as agy works, the skill in .agents/skills, and a permission to run ultracite.",
  metaTitle: "Ultracite for Antigravity CLI — Rules that load per folder",
  related: ["gemini", "codex", "jules"],
  rules: {
    facts: [
      {
        label: "Per-file limit",
        value:
          "24,000 bytes per rule file, after includes; anything past that is cut. Ultracite’s rules are about 5 KB.",
      },
      {
        label: "Total budget",
        value:
          "Global and always-on rules share 20,000 tokens. Over that, the largest files become pointers the agent reads on demand.",
      },
      {
        label: "Always on",
        value:
          "`AGENTS.md` and `GEMINI.md` take no frontmatter and stay active for their whole directory.",
      },
      {
        label: "Includes",
        value:
          "`@[label](path)` inlines another file before the size check; a bare `@path` only points the agent at it.",
      },
      {
        label: "Global",
        value:
          "`~/.gemini/AGENTS.md` or `GEMINI.md`, plus modular rules in `~/.gemini/config/rules/` and `~/.gemini/antigravity-cli/rules/`.",
      },
      {
        label: "Flat folder",
        value:
          "Only direct children of `.agents/rules/` load. Nested folders need an entry in `.agents/rules.json`.",
      },
    ],
    lookup: [
      {
        note: "Your rules for every project. `~/.gemini/GEMINI.md` and the modular global rules load too.",
        path: "~/.gemini/AGENTS.md",
      },
      {
        note: "At the repository root, where `init` writes Ultracite’s rules. A `GEMINI.md` there is read the same way.",
        path: "AGENTS.md",
      },
      {
        note: "Modular rules, each with a `trigger` in its frontmatter that decides when it loads.",
        path: ".agents/rules/*.md",
      },
      {
        note: "When the agent reads or edits a file, it loads the rules in each folder between that file and the workspace root.",
        path: "src/**/AGENTS.md",
      },
      {
        note: "Rules packaged with installed plugins activate automatically.",
        path: "~/.gemini/antigravity-cli/plugins/*/rules/",
      },
    ],
    summary:
      "Antigravity CLI combines every rule it finds, global and per directory, instead of picking one; when instructions conflict, the more specific directory wins. `AGENTS.md` needs no frontmatter and is always on for its directory.",
  },
  skills:
    "Antigravity CLI loads workspace skills from `.agents/skills/` and global ones from `~/.gemini/antigravity-cli/skills/`. `init` installs the Ultracite skill into `.agents/skills/`, so the CLI finds it.",
  sources: [
    {
      title: "Antigravity: Rules",
      url: "https://antigravity.google/docs/rules",
    },
    {
      title: "Antigravity: Hooks",
      url: "https://antigravity.google/docs/hooks",
    },
    {
      title: "Antigravity: Agent skills",
      url: "https://antigravity.google/docs/skills",
    },
    {
      title: "Antigravity CLI: Headless mode",
      url: "https://antigravity.google/docs/cli/headless",
    },
    {
      title: "Antigravity CLI: Migrating from Gemini CLI",
      url: "https://antigravity.google/docs/cli/gcli-migration",
    },
    {
      title: "Antigravity: Changelog",
      url: "https://antigravity.google/docs/changelog",
    },
  ],
};
