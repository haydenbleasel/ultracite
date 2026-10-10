import type { EditorPageContent } from "./types";

export const cursor: EditorPageContent = {
  afterInit: [
    "If `init` couldn’t run `cursor`, install the Oxc extension from the Extensions view (Cmd+Shift+X), or Biome’s if you picked Biome.",
    "With `--hooks cursor`, open Customize → Hooks and check that `afterFileEdit` is listed.",
    "Save a file: Oxfmt formats it and Oxlint’s safe fixes apply.",
  ],
  agent: {
    body: "Cursor merges every rule that applies, team rules first, then project rules, then user rules, and `AGENTS.md` counts as a project rule with no frontmatter. Since 0.44 the agent reads linter errors to fix issues. The `afterFileEdit` hook from `--hooks cursor` fixes and formats each file the agent edits, but Cursor defines no output for that event, so the agent never sees what the hook printed.",
    lookup: [
      {
        note: "Set in the dashboard on Team and Enterprise plans. They take precedence, and enforced ones can’t be turned off.",
        path: "Team rules",
      },
      {
        note: "Project rules, applied by their `alwaysApply`, `globs` or `description` frontmatter. A plain `.md` file here is ignored.",
        path: ".cursor/rules/*.mdc",
      },
      {
        note: "Plain Markdown at the project root, applied as a rule without frontmatter. This is where `init` writes Ultracite’s rules.",
        path: "AGENTS.md",
      },
      {
        note: "Read the same way as `AGENTS.md`, and applied to every conversation.",
        path: "CLAUDE.md",
      },
      {
        note: "Applied when the agent works on files in that folder, combined with the parent files; the more specific one wins.",
        path: "frontend/AGENTS.md",
      },
      {
        note: "Your own rules from Customize → Rules, or files in `~/.cursor/rules`. Lowest precedence.",
        path: "User rules",
      },
    ],
    steps: [
      "The agent edits a file and writes it to disk, and Cursor fires `afterFileEdit` with the file’s path.",
      "`npx ultracite fix --hook` fixes and formats that one file. If problems remain, the hook fails; Cursor logs it in the Hooks output channel and the agent carries on.",
      "The Oxc, Biome or ESLint extension reports what’s left as linter errors, as it does for your own edits.",
      "The agent reads those linter errors and fixes what it can, so the lint loop runs through the editor, not the hook.",
    ],
    title: "The hook fixes, the agent reads the lints",
  },
  checked: {
    date: "2026-10-10",
    version: "3.24",
  },
  faqs: [
    {
      answer:
        "Run `npx ultracite init --editors cursor`. It writes `.vscode/settings.json` with Oxfmt (`oxc.oxc-vscode`) as the formatter and `source.fixAll.oxc` on save, and installs the Oxc extension with `cursor --install-extension` when it creates the file.",
      question: "How do I format on save with Oxlint in Cursor?",
    },
    {
      answer:
        "No. Cursor installs extensions from Open VSX, through its own proxy that scans them first. The Oxc, Biome, ESLint and Prettier extensions Ultracite uses are on Open VSX under the same IDs.",
      question: "Does Cursor use the VS Code Marketplace?",
    },
    {
      answer:
        "`init` installs it only when it creates `.vscode/settings.json`, and only if `cursor` is on your PATH (on macOS, run `Shell Command: Install 'cursor' command`). On a team plan, an allowed extensions list or install cooldown can block or delay it. Install it from the Extensions view instead.",
      question: "Why didn’t the Biome extension install in Cursor?",
    },
    {
      answer:
        "Yes. Cursor applies `AGENTS.md` at the project root as plain-Markdown rules alongside `.cursor/rules`, and nested `AGENTS.md` files apply to their folder. It reads `CLAUDE.md` the same way.",
      question: "Does Cursor read AGENTS.md?",
    },
    {
      answer:
        "No. Cursor defines no output for `afterFileEdit`, so the hook fixes and formats the file and stops there. The agent finds what’s left through the linter errors it reads in the editor.",
      question: "Does the Cursor hook tell the agent what’s left to fix?",
    },
    {
      answer:
        "Project hooks only run in a trusted workspace. Workspace trust is off by default in Cursor, so this only matters if you’ve set `security.workspace.trust.enabled`; then trust the folder.",
      question: "Why isn’t my Cursor hook running?",
    },
  ],
  headline: "Oxlint in Cursor, on save and after agent edits",
  highlights: [
    {
      body: "Cursor fires `afterTabFileEdit` for Tab completions and `afterFileEdit` only for the agent, so Ultracite’s hook doesn’t touch what you accept from Tab. Format on save covers those edits when you save the file.",
      title: "Tab edits skip the hook",
    },
    {
      body: "With Third-Party Imports on, the default, Cursor also loads hooks from `.claude/settings.json` and runs every matching hook from every source. A project set up with `--hooks claude` as well as `--hooks cursor` can run Ultracite twice after one edit.",
      title: "Claude Code hooks run too",
    },
    {
      body: "Cloud agents run the command hooks in your repository’s `.cursor/hooks.json`, `afterFileEdit` included. They skip hooks during early read-only turns and start running them once the agent has a writable environment.",
      title: "Cloud agents keep the hook",
    },
  ],
  intro:
    "`ultracite init --editors cursor` writes `.vscode/settings.json`, so Cursor formats on save and applies your linter’s safe fixes, and installs the extension from Open VSX with the `cursor` launcher. Cursor’s agent applies `AGENTS.md` as a rule and reads linter errors to fix issues. `--hooks cursor` adds an `afterFileEdit` hook that fixes each file the agent edits, but nothing the hook prints reaches the agent.",
  metaDescription:
    "Ultracite writes .vscode/settings.json for Cursor, installs the Oxc, Biome or ESLint extension from Open VSX, and adds an afterFileEdit hook for agent edits.",
  metaTitle: "Ultracite for Cursor — Open VSX, AGENTS.md and afterFileEdit",
  related: ["vscode", "devin", "zed"],
  setup: {
    facts: [
      {
        label: "Extensions",
        value:
          "From Open VSX, through Cursor’s own proxy (`marketplace.cursorapi.com`), which scans each extension before offering it. `oxc.oxc-vscode`, `biomejs.biome`, `dbaeumer.vscode-eslint` and `esbenp.prettier-vscode` are all there.",
      },
      {
        label: "Launcher",
        value:
          "`cursor`, which takes `--install-extension` like VS Code’s `code`. On macOS, `Shell Command: Install 'cursor' command` puts it on your PATH.",
      },
      {
        label: "Workspace settings",
        value:
          "Cursor is built on VS Code and reads `.vscode/settings.json`. The agent asks for your approval before it edits workspace settings.",
      },
      {
        label: "Workspace trust",
        value:
          "Off by default, so the settings apply as soon as you open a folder. If you turn it on with `security.workspace.trust.enabled`, Restricted Mode breaks AI features and project hooks wait for trust.",
      },
      {
        label: "Team controls",
        value:
          "Admins can limit installs to approved publishers or extension IDs (`AllowedExtensions`) and set an install cooldown for new versions. Either can block or delay the extension `init` installs.",
      },
      {
        label: "Hooks",
        value:
          "Cursor reloads `.cursor/hooks.json` when it changes. The Hooks tab in Customize and the Hooks output channel show what ran and any errors.",
      },
    ],
    summary:
      "Cursor reads `.vscode/settings.json` as VS Code does, but installs extensions from Open VSX through its own proxy, and team admins can restrict which ones install.",
    title: "Where Cursor gets its extensions",
  },
  sources: [
    {
      title: "Cursor Help: Extensions",
      url: "https://cursor.com/help/customization/extensions",
    },
    { title: "Cursor: Rules", url: "https://cursor.com/docs/rules" },
    {
      title: "Cursor Help: Rules and CLAUDE.md",
      url: "https://cursor.com/help/customization/rules",
    },
    { title: "Cursor: Hooks", url: "https://cursor.com/docs/hooks" },
    {
      title: "Cursor: Third Party Hooks",
      url: "https://cursor.com/docs/reference/third-party-hooks",
    },
    {
      title: "Cursor: Agent Security",
      url: "https://cursor.com/docs/agent/security",
    },
    {
      title: "Cursor 0.44 changelog",
      url: "https://cursor.com/changelog/0-44-x",
    },
  ],
};
