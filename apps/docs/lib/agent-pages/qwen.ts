import type { AgentPageContent } from "./types";

export const qwen: AgentPageContent = {
  checked: { date: "2026-10-10", version: "0.25.0" },
  faqs: [
    {
      answer:
        "Yes, by default. Qwen Code looks for `QWEN.md` and `AGENTS.md` in `~/.qwen/` and in every folder from the project root to where you start it, and loads all of them, `QWEN.md` files first.",
      question: "Does Qwen Code read AGENTS.md?",
    },
    {
      answer:
        "Keep both if you like; Qwen loads both. Qwen-only notes fit in `QWEN.md` and shared rules, Ultracite’s included, in `AGENTS.md`. If you ever set `context.fileName`, list both names, because it replaces the default pair.",
      question: "Should I move my QWEN.md into AGENTS.md?",
    },
    {
      answer:
        "Only on the way up. Qwen loads the ones between the project root and the folder you start in; one deeper than that loads only when you start Qwen in its folder.",
      question: "Does Qwen Code read AGENTS.md files in subfolders?",
    },
    {
      answer:
        "Yes. `PostToolUse` hooks in `.qwen/settings.json` run after a tool succeeds, and a hook that exits with code 2 passes its stderr to the model. Project hooks load only in a trusted folder. Ultracite doesn’t write one for Qwen Code yet.",
      question: "Does Qwen Code support hooks?",
    },
    {
      answer:
        "The rules in `AGENTS.md` tell it to run `npx ultracite fix` and `npx ultracite check`. Add `Bash(npx ultracite *)` to `permissions.allow` so it can run them without a confirmation each time.",
      question: "How do I make Qwen Code run the linter?",
    },
  ],
  headline: "Qwen Code loads AGENTS.md beside QWEN.md",
  highlights: [
    {
      body: "`/review` takes project rules from `.qwen/review-rules.md`, the Copilot instructions file, and only the `## Code Review` section of `AGENTS.md` or `QWEN.md`. Ultracite’s rules have no such section, so add one, or a `review-rules.md`, if reviews should check against them.",
      title: "/review reads one section of AGENTS.md",
    },
    {
      body: "Qwen Code’s hooks take Claude Code’s shape: the same event names, `CLAUDE_PROJECT_DIR` in the environment, and stderr sent to the model on exit 2. Matchers accept Claude Code’s tool names, so `Write|Edit` copied from a Claude Code config works unchanged.",
      title: "Hooks in Claude Code’s format",
    },
    {
      body: "`--yolo` only approves tool calls; shell commands still run with your permissions. Sandboxing is a separate opt-in (`--sandbox`, `QWEN_SANDBOX` or `tools.sandbox`), and `.qwen/sandbox.Dockerfile` extends the default Docker image for your project.",
      title: "YOLO isn’t a sandbox",
    },
  ],
  intro:
    "Qwen Code loads `AGENTS.md` by default, after any `QWEN.md`, from the project root down to the folder you start in. Ultracite doesn’t set up a hook for it yet, so after an edit Qwen runs `ultracite fix` and `check` because the rules tell it to.",
  loop: {
    body: "Qwen Code has `PostToolUse` hooks, but Ultracite doesn’t configure one for it yet. Until then the commands in `AGENTS.md` are the check, and a `permissions.allow` rule lets Qwen run them without stopping to ask.",
    snippets: [
      {
        code: '{\n  "permissions": {\n    "allow": ["Bash(npx ultracite *)"]\n  }\n}',
        lang: "json",
        title: ".qwen/settings.json",
      },
    ],
    steps: [
      "Qwen edits a file with its `edit` or `write_file` tool.",
      "Following `AGENTS.md`, it runs `npx ultracite fix` or `npx ultracite check` with `run_shell_command`.",
      "The `allow` rule matches any shell command that starts with `npx ultracite`, so it runs without a prompt.",
      "Qwen reads the output and fixes what `fix` couldn’t.",
    ],
    title: "Let Qwen run Ultracite without asking",
  },
  metaDescription:
    "Set up Ultracite for Qwen Code: it loads AGENTS.md after QWEN.md from the project root to your folder, and finds the Ultracite skill in .agents/skills.",
  metaTitle: "Ultracite for Qwen Code — AGENTS.md beside QWEN.md",
  related: ["gemini", "kimi-cli", "mistral-vibe"],
  rules: {
    facts: [
      {
        label: "Both names",
        value:
          "`QWEN.md` and `AGENTS.md` both load. Every `QWEN.md` comes first, then every `AGENTS.md`.",
      },
      {
        label: "Your own list",
        value:
          "`context.fileName` replaces the default pair, so keep `AGENTS.md` in it if you set it.",
      },
      {
        label: "Subfolders",
        value:
          "Qwen walks up from where you start, not down, so a deeper folder’s `AGENTS.md` loads only when you start there.",
      },
      {
        label: "Imports",
        value:
          "`@path/to/file` in a context file pulls that file in, resolved from the file it’s in.",
      },
      {
        label: "/init",
        value:
          "`/init` writes `QWEN.md`, the first name on the list, and suggests additions if it exists.",
      },
      {
        label: "Check it",
        value:
          "`/memory` shows which files loaded, and the footer counts the context files in use.",
      },
    ],
    lookup: [
      {
        note: "Your instructions for every project.",
        path: "~/.qwen/QWEN.md",
      },
      {
        note: "Each one from the project root (the folder with `.git`) down to where you started.",
        path: "QWEN.md, root to working folder",
      },
      {
        note: "Your cross-tool instructions, after all the `QWEN.md` files.",
        path: "~/.qwen/AGENTS.md",
      },
      {
        note: "The same walk from the project root down, after every `QWEN.md`.",
        path: "AGENTS.md, root to working folder",
      },
      {
        note: "Your personal notes for this project, loaded last so they can override the rest. Keep it out of git.",
        path: ".qwen/QWEN.local.md",
      },
    ],
    summary:
      "Qwen Code looks for two names, `QWEN.md` and then `AGENTS.md`, in your home folder and in every directory from the project root to where you started. It joins everything it finds into the system prompt, each file labeled with its path.",
  },
  skills:
    "Qwen Code loads skills from `.qwen/skills/` and `.agents/skills/` at the project root, and the same folders in your home directory, so it finds the Ultracite skill `init` installs. Type `/ultracite` to load it yourself.",
  sources: [
    {
      title: "Qwen Code: Memory",
      url: "https://qwenlm.github.io/qwen-code-docs/en/users/features/memory/",
    },
    {
      title: "Qwen Code: Settings",
      url: "https://qwenlm.github.io/qwen-code-docs/en/users/configuration/settings/",
    },
    {
      title: "Qwen Code: Hooks",
      url: "https://qwenlm.github.io/qwen-code-docs/en/users/features/hooks/",
    },
    {
      title: "Qwen Code: Code Review",
      url: "https://qwenlm.github.io/qwen-code-docs/en/users/features/code-review/",
    },
    {
      title: "Qwen Code source: context file discovery",
      url: "https://github.com/QwenLM/qwen-code/blob/main/packages/core/src/memory/memoryDiscovery.ts",
    },
    {
      title: "Qwen Code source: skill directories",
      url: "https://github.com/QwenLM/qwen-code/blob/main/packages/core/src/config/storage.ts",
    },
  ],
};
