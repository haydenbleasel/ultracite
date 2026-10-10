import type { AgentPageContent } from "./types";

export const crush: AgentPageContent = {
  checked: { date: "2026-10-10", version: "0.98.1" },
  faqs: [
    {
      answer:
        "Yes. `AGENTS.md` is on Crush’s default list of context files, with `CLAUDE.md`, `CRUSH.md`, `GEMINI.md`, `.cursorrules` and `.github/copilot-instructions.md`. Every one that exists in the working directory is loaded, so Ultracite’s rules sit beside your other files rather than replacing them.",
      question: "Does Crush read AGENTS.md?",
    },
    {
      answer:
        "Crush reads context files from the directory you start it in, not from its parents. Start it at the repo root, or pass `--cwd` with the root’s path.",
      question: "Why doesn’t Crush see my root AGENTS.md in a monorepo?",
    },
    {
      answer:
        "Only before a tool runs. Crush supports `PreToolUse` hooks, which can block a call, rewrite its input or add context. There’s no event after an edit yet, so Ultracite doesn’t set up a hook for Crush.",
      question: "Does Crush support hooks?",
    },
    {
      answer:
        "No. Crush reads hooks from its own config (`crushrc` or the older `crush.json`), not `.claude/settings.json`, and the Claude Code hook runs on `PostToolUse`, an event Crush doesn’t have.",
      question: "Does Crush run the hook Ultracite sets up for Claude Code?",
    },
    {
      answer:
        "`AGENTS.md` tells it to run `npx ultracite fix` and `npx ultracite check`, and Crush runs them through its `bash` tool. Approve the command when Crush asks, or use `crush run`, which approves everything in its session.",
      question: "How do I make Crush run the linter?",
    },
  ],
  headline: "Crush loads AGENTS.md from the folder you start in",
  highlights: [
    {
      body: "Crush starts the language servers it knows for the files you touch when they’re on your `PATH` (`option auto-lsp false` turns that off), and `lsp add` in `crushrc` adds others. Whatever they report lands in the result of the next edit, with no extra command.",
      title: "Language servers report on every edit",
    },
    {
      body: '`crush run "…"` runs one prompt without the interface and approves every permission request in that session, so it can run `ultracite fix` in a script or CI job without stopping. Use it only where that’s safe.',
      title: "crush run approves everything",
    },
    {
      body: '`permissions allow` skips prompts for a whole tool, so allowing `bash` allows every command. To approve only some commands, Crush’s hook docs show a `PreToolUse` hook that checks `CRUSH_TOOL_INPUT_COMMAND` and prints `{"decision":"allow"}`.',
      title: "Allow tools, not commands",
    },
  ],
  intro:
    "Crush puts `AGENTS.md` in its system prompt along with every other instructions file it recognizes in the folder you start it in. It has no post-edit hook yet, so it runs `ultracite fix` and `check` when the rules say to, and any language server it’s running reports problems in each edit’s result.",
  loop: {
    body: "Crush’s hooks run only before a tool call, so nothing runs `ultracite` after an edit on its own, and Ultracite has nothing to hook into yet. What reaches the model is what Crush runs itself: the commands in `AGENTS.md`, and the diagnostics Crush adds to every edit result.",
    steps: [
      "Crush changes a file with its `edit`, `multiedit` or `write` tool.",
      "It tells the language servers it’s running about the change and adds their diagnostics to the tool’s result: the first 10 for that file and 10 for the rest of the project.",
      "Following `AGENTS.md`, it runs `npx ultracite fix` or `check` through its `bash` tool, which asks for permission unless you’ve allowed it.",
      "It reads the output and fixes what’s left.",
    ],
    title: "Diagnostics in every edit result",
  },
  metaDescription:
    "Set up Ultracite for Crush: rules in AGENTS.md, loaded with your other context files from the folder Crush starts in, plus LSP diagnostics after every edit.",
  metaTitle: "Ultracite for Crush — Rules and diagnostics in every edit",
  related: ["pi", "aider", "mistral-vibe"],
  rules: {
    facts: [
      {
        label: "Working directory",
        value:
          "Crush looks for these files only in the folder it starts in (or `--cwd`), not in parent folders.",
      },
      {
        label: "No precedence",
        value:
          "Every file on the list that exists is loaded; none replaces another.",
      },
      {
        label: "Case variants",
        value:
          "Crush checks `AGENTS.md` first and treats `Agents.md` and `agents.md` as the same entry, so keep the name in capitals.",
      },
      {
        label: "Your own paths",
        value:
          "`option context-path` in `crushrc` adds a file or folder to the list. The defaults stay.",
      },
      {
        label: "Global files",
        value:
          "`~/.config/crush/CRUSH.md` and `~/.config/AGENTS.md`. `option global-context-path` sets your own.",
      },
      {
        label: "Initialization",
        value:
          "When Crush initializes a project it writes `AGENTS.md`, unless `option initialize-as` names another file.",
      },
    ],
    lookup: [
      {
        note: "In the working directory. Loaded alongside the files below, not instead of them.",
        path: "AGENTS.md",
      },
      {
        note: "Also loaded when present, as are `CLAUDE.local.md` and `CRUSH.local.md`.",
        path: "CLAUDE.md, CRUSH.md, GEMINI.md",
      },
      {
        note: "Other tools’ files, loaded too. A folder on the list loads every file in it.",
        path: ".cursor/rules/, .cursorrules, .github/copilot-instructions.md",
      },
      {
        note: "Your Crush-only instructions, added after the project’s files as personal preferences.",
        path: "~/.config/crush/CRUSH.md",
      },
      {
        note: "Your cross-tool instructions, added with the file above.",
        path: "~/.config/AGENTS.md",
      },
    ],
    summary:
      "Crush doesn’t choose one file. It loads every instructions file on its list that exists in the working directory, `AGENTS.md` among them, plus two global files of yours.",
  },
  skills:
    "Crush loads skills from `.agents/skills/`, `.crush/skills/`, `.claude/skills/` and `.cursor/skills/` in the working directory and at the git root. It finds the Ultracite skill `init` installs in `.agents/skills/`, and in `.crush/skills/` when the project has the `.crush` folder Crush keeps its data in.",
  sources: [
    {
      title: "Crush: README",
      url: "https://github.com/charmbracelet/crush#readme",
    },
    {
      title: "Crush: Hooks",
      url: "https://github.com/charmbracelet/crush/tree/main/docs/hooks",
    },
    {
      title: "Crush: Config",
      url: "https://github.com/charmbracelet/crush/tree/main/docs/config",
    },
    {
      title: "Crush source: default context paths",
      url: "https://github.com/charmbracelet/crush/blob/main/internal/config/config.go",
    },
    {
      title: "Crush source: diagnostics after edits",
      url: "https://github.com/charmbracelet/crush/blob/main/internal/agent/tools/diagnostics.go",
    },
    {
      title: "Crush source: non-interactive runs",
      url: "https://github.com/charmbracelet/crush/blob/main/internal/app/app.go",
    },
  ],
};
