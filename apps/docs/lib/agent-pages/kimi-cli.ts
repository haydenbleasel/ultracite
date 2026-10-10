import type { AgentPageContent } from "./types";

export const kimiCli: AgentPageContent = {
  checked: { date: "2026-10-10", version: "2.1.1" },
  faqs: [
    {
      answer:
        "Yes. It loads `~/.kimi-code/AGENTS.md`, `~/.agents/AGENTS.md`, and every `AGENTS.md` (with any `.kimi-code/AGENTS.md`) from the git root down to the folder you start in, each marked with the path it came from.",
      question: "Does Kimi Code CLI read AGENTS.md?",
    },
    {
      answer:
        "Yes, as `[[hooks]]` in `~/.kimi-code/config.toml`. Only `PreToolUse`, `Stop` and `UserPromptSubmit` can block or reply; `PostToolUse` is observation-only, so a lint hook there couldn’t tell the model anything. Ultracite doesn’t set one up.",
      question: "Does Kimi Code CLI support hooks?",
    },
    {
      answer:
        "It’s the successor. Kimi Code CLI (command `kimi`) replaces the legacy Python `kimi-cli`, and `kimi migrate` brings your configuration and session history across. Ultracite still calls the agent `kimi-cli`, so that’s the id to pass to `init`.",
      question: "Is Kimi Code CLI the same as kimi-cli?",
    },
    {
      answer:
        'Add a `[[permission.rules]]` entry with `decision = "allow"` and `pattern = "Bash(npx ultracite*)"` to `~/.kimi-code/config.toml`, or start Kimi with `--yolo` (Ask When Needed mode).',
      question: "How do I let Kimi run Ultracite without asking?",
    },
    {
      answer:
        "No. Past 32 KiB in total it warns that the files are large, but it still loads everything. Ultracite’s rules are about 5 KB.",
      question: "Does Kimi Code CLI truncate long AGENTS.md files?",
    },
  ],
  headline: "Kimi Code CLI notices AGENTS.md files as it goes",
  highlights: [
    {
      body: "When a `Read`, `Edit`, `Write`, `Glob`, `Grep` or `Bash` call touches a folder whose `AGENTS.md` isn’t in the prompt, Kimi adds a reminder naming the file and telling the model to read it before changing anything there.",
      title: "Deeper AGENTS.md files get flagged",
    },
    {
      body: "Kimi watches its instruction files while a session runs. Edit `AGENTS.md` and the model is told its copy is stale and to read the current file, so new rules apply without a restart.",
      title: "Rule changes reach a running session",
    },
    {
      body: "`kimi -p` runs one prompt without the interface in Never Ask mode, so every tool call, `ultracite` included, runs without approval. `--yolo` and `--auto` can’t be combined with `--prompt`.",
      title: "kimi -p never asks",
    },
  ],
  intro:
    "Kimi Code CLI loads every `AGENTS.md` from the git root down to the folder you start in, and points the model at deeper ones when it works near them. Its hooks can’t report back after an edit, so it runs `ultracite fix` and `check` because the rules tell it to.",
  loop: {
    body: "Kimi’s `PostToolUse` hook is observation-only: it fires after a tool succeeds, but nothing it returns reaches the model, and hooks are set in `~/.kimi-code/config.toml`, not per project. So Ultracite doesn’t set one up. The commands in `AGENTS.md` are the check, and a permission rule lets Kimi run them without asking.",
    snippets: [
      {
        code: '[[permission.rules]]\ndecision = "allow"\npattern = "Bash(npx ultracite*)"',
        lang: "toml",
        title: "~/.kimi-code/config.toml",
      },
    ],
    steps: [
      "Kimi changes a file with its `Edit` or `Write` tool.",
      "Following `AGENTS.md`, it runs `npx ultracite fix` or `npx ultracite check` with its `Bash` tool.",
      "The `allow` rule matches that command, so it runs without a prompt even in Always Ask mode.",
      "Kimi reads the output and fixes what’s left.",
    ],
    title: "Allow Ultracite once, then it runs",
  },
  metaDescription:
    "Set up Ultracite for Kimi Code CLI: rules in AGENTS.md, loaded from the git root to your folder, with deeper AGENTS.md files flagged as Kimi reaches them.",
  metaTitle: "Ultracite for Kimi Code CLI — Rules from every AGENTS.md",
  related: ["qwen", "mistral-vibe", "crush"],
  rules: {
    facts: [
      {
        label: "Size",
        value:
          "Past 32 KiB in total, Kimi warns that the files are large. It doesn’t truncate them.",
      },
      {
        label: "Labeled",
        value:
          "Each file arrives under a `<!-- From: path -->` line, so the model knows which folder a rule came from.",
      },
      {
        label: "No git",
        value:
          "Outside a git repository, only the working folder’s files load, plus your global ones.",
      },
      {
        label: "Live reload",
        value:
          "Changes to these files are picked up mid-session. `[watch] enabled = false` turns watching off.",
      },
      {
        label: "Relocating",
        value:
          "`KIMI_CODE_HOME` moves `~/.kimi-code/AGENTS.md`; `~/.agents/AGENTS.md` stays in your real home.",
      },
      {
        label: "Custom prompts",
        value:
          "A custom `SYSTEM.md` or agent file includes `AGENTS.md` only where its template uses the `agents_md` variable.",
      },
    ],
    lookup: [
      {
        note: "Your Kimi-only instructions for every project.",
        path: "~/.kimi-code/AGENTS.md",
      },
      {
        note: "Your cross-tool instructions, shared with other agents.",
        path: "~/.agents/AGENTS.md",
      },
      {
        note: "In each directory from the git root down, after that directory’s `.kimi-code/AGENTS.md`. A lowercase `agents.md` stands in when there’s no `AGENTS.md`.",
        path: "AGENTS.md, root to working folder",
      },
      {
        note: "Not loaded at start. When a tool call touches a folder that has one, Kimi tells the model to read it first.",
        path: "Deeper AGENTS.md files",
      },
    ],
    summary:
      "Kimi builds one instructions block from your global files and every `AGENTS.md` between the git root and your working folder, then keeps an eye out for the ones further down.",
  },
  skills:
    "Kimi Code CLI loads skills from `.kimi-code/skills/` and `.agents/skills/` at the project root, plus `~/.kimi-code/skills/` and `~/.agents/skills/`, so it finds the Ultracite skill `init` installs in `.agents/skills/`. Run `/skill:ultracite` to load it yourself.",
  sources: [
    {
      title: "Kimi Code CLI: Agents and sub-agents",
      url: "https://moonshotai.github.io/kimi-code/en/customization/agents.html",
    },
    {
      title: "Kimi Code CLI: Hooks",
      url: "https://moonshotai.github.io/kimi-code/en/customization/hooks.html",
    },
    {
      title: "Kimi Code CLI: Configuration files",
      url: "https://moonshotai.github.io/kimi-code/en/configuration/config-files.html",
    },
    {
      title: "Kimi Code CLI: Agent Skills",
      url: "https://moonshotai.github.io/kimi-code/en/customization/skills.html",
    },
    {
      title: "Kimi Code CLI: kimi command",
      url: "https://moonshotai.github.io/kimi-code/en/reference/kimi-command.html",
    },
    {
      title: "Kimi Code CLI source: AGENTS.md loading and reminders",
      url: "https://github.com/MoonshotAI/kimi-code/tree/main/packages/agent-core-v2/src/agent",
    },
  ],
};
