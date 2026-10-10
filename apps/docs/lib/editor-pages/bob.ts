import type { EditorPageContent } from "./types";

export const bob: EditorPageContent = {
  afterInit: [
    "Trust the folder when Bob asks. Until you do, it runs the folder in safe mode, with workspace rules, skills and MCP servers suspended.",
    "If `init` couldn’t run `bobide`, install `oxc.oxc-vscode` from the Extensions view, or Biome’s if you picked Biome. Bob installs extensions from Open VSX.",
    "Save a file: Oxfmt formats it and Oxlint’s safe fixes apply.",
  ],
  agent: {
    body: "Bob loads `AGENTS.md` from the workspace root by default, after the current mode’s rules and before the general rules in `.bob/rules/`. Its edit tools compare the editor’s diagnostics before and after each write and pass the new ones to the model, and `@problems` hands it the whole Problems panel. Its `PostToolUse` hook ignores output and exit codes, so Ultracite sets up no hook for Bob.",
    lookup: [
      {
        note: "Your global rules for every project, loaded first.",
        path: "~/.bob/rules/",
      },
      {
        note: "Workspace rules for the current mode, such as `rules-agent/` or `rules-plan/`.",
        path: ".bob/rules-{mode}/",
      },
      {
        note: 'Loaded by default after the mode’s rules. Where `init` writes Ultracite’s rules; `"bob-code.useAgentRules": false` turns it off.',
        path: "AGENTS.md",
      },
      {
        note: "General workspace rules, loaded last. They can override global rules.",
        path: ".bob/rules/",
      },
    ],
    steps: [
      "Bob edits a file with `write_file`, `apply_diff`, `insert_content` or `search_and_replace`.",
      "The Oxc, Biome or ESLint extension lints the change, as it does for your own edits.",
      "Bob compares the diagnostics from before and after the write and adds the new ones to the tool result the model reads.",
      "No hook reports back, since Bob ignores a `PostToolUse` hook’s stdout and exit code 2. In Agent mode, Bob runs `npx ultracite fix` when `AGENTS.md` tells it to.",
    ],
    title: "Bob reads new diagnostics after each edit",
  },
  checked: {
    date: "2026-10-10",
    version: "2.2.1",
  },
  faqs: [
    {
      answer:
        "Yes. `npx ultracite init --editors bob` writes `.vscode/settings.json` for Oxlint and Oxfmt, Biome, or ESLint and Prettier. It installs the matching extension from Open VSX with Bob’s `bobide` command.",
      question: "Does Ultracite work with IBM Bob?",
    },
    {
      answer:
        "`init` installs it with `bobide --install-extension` only when it creates `.vscode/settings.json`, and only if `bobide` is on your `PATH`. Otherwise, install it from the Extensions view.",
      question: "Why didn’t init install the Oxc extension in IBM Bob?",
    },
    {
      answer:
        "Yes, from the workspace root, unless `bob-code.useAgentRules` is `false`. It loads after the current mode’s rules and before `.bob/rules/`, and only once you trust the folder.",
      question: "Does IBM Bob read AGENTS.md?",
    },
    {
      answer:
        "Yes. After each edit, Bob’s tools pass the model any diagnostics that are new since before the write. Mention `@problems` to give it every error and warning in the Problems panel, with file paths and line numbers.",
      question: "Can IBM Bob see Oxlint or ESLint errors?",
    },
    {
      answer:
        "No. Bob runs hooks from `.bob/settings.json` and `~/.bob/settings/settings.json`, but a `PostToolUse` hook’s stdout is ignored and exit code 2 has no effect, so a lint hook couldn’t tell Bob what failed.",
      question: "Does Ultracite set up a hook for IBM Bob?",
    },
  ],
  headline: "IBM Bob formats on save; its agent reads AGENTS.md",
  highlights: [
    {
      body: "Put the cursor on a line with a diagnostic and the lightbulb (Cmd+. or Ctrl+.) offers Add to Bob Context, Explain with Bob and Improve with Bob, which send the code with its file path and line numbers.",
      title: "Bob in the lightbulb menu",
    },
    {
      body: "Of Bob’s three built-in modes, only Agent mode has the Execute tool. Plan mode can edit files but not run commands, and Ask mode can do neither, so `npx ultracite fix` runs from Agent mode.",
      title: "Only Agent mode runs commands",
    },
    {
      body: "Bob loads skills from `.bob/skills/` and `~/.bob/skills/`, not `.agents/skills/`, and asks before activating one unless Skills is auto-approved. `init --agents bob` installs the Ultracite skill into `.bob/skills/`.",
      title: "Skills come from .bob/skills",
    },
  ],
  intro:
    "`ultracite init --editors bob` writes `.vscode/settings.json`, so IBM Bob formats on save and applies safe fixes through the Oxc, Biome or ESLint extension from Open VSX. Bob’s agent follows `AGENTS.md` by default, and after each write it sees the new errors and warnings the editor reports.",
  metaDescription:
    "Ultracite writes .vscode/settings.json so IBM Bob formats and fixes on save with Oxlint, Biome or ESLint from Open VSX, and Bob’s agent follows AGENTS.md.",
  metaTitle: "Ultracite for IBM Bob — Open VSX, workspace trust and @problems",
  related: ["kiro", "cursor", "vscode"],
  setup: {
    facts: [
      {
        label: "Extension gallery",
        value:
          "Open VSX. Bob’s build points its gallery at open-vsx.org, which has `oxc.oxc-vscode`, `biomejs.biome`, `dbaeumer.vscode-eslint` and `esbenp.prettier-vscode`.",
      },
      {
        label: "Launcher",
        value:
          "Bob’s own launcher is `bobide`, built from VS Code’s command-line tool, and `init` installs the extension with `bobide --install-extension`. The Linux packages link it to `/usr/bin/bobide`.",
      },
      {
        label: "VS Code base",
        value:
          "Bob 2.2.1 is built on VS Code 1.126 and applies `.vscode/settings.json` as VS Code does.",
      },
      {
        label: "Workspace trust",
        value:
          "Since 2.0.2, Bob asks for a trust decision the first time you open a folder. Untrusted folders run in safe mode, with workspace rules, skills, MCP servers and hooks suspended.",
      },
      {
        label: "Two settings files",
        value:
          "`.bob/settings.json` holds Bob’s hooks. Editor settings, including the ones `init` writes, stay in `.vscode/settings.json`.",
      },
      {
        label: "Required extensions",
        value:
          "Since 2.2.0, admins can set a `RequiredExtensions` group policy that installs extensions silently when Bob starts, which suits rolling out the Oxc or Biome extension.",
      },
    ],
    summary:
      "Bob is a VS Code build that installs extensions from Open VSX and applies the `.vscode/settings.json` that `init` writes. Its agent waits for you to trust the folder before it reads workspace rules.",
    title: "Open VSX, a launcher and a trust prompt",
  },
  sources: [
    {
      title: "IBM Bob: Custom rules",
      url: "https://bob.ibm.com/docs/ide/configuration/rules",
    },
    {
      title: "IBM Bob: Lifecycle hooks",
      url: "https://bob.ibm.com/docs/ide/configuration/lifecycle-hooks",
    },
    {
      title: "IBM Bob: Context mentions",
      url: "https://bob.ibm.com/docs/ide/features/context-mentions",
    },
    {
      title: "IBM Bob: Code actions",
      url: "https://bob.ibm.com/docs/ide/features/code-actions",
    },
    {
      title: "IBM Bob: Modes",
      url: "https://bob.ibm.com/docs/ide/features/modes",
    },
    {
      title: "IBM Bob: Skills",
      url: "https://bob.ibm.com/docs/ide/features/skills",
    },
    {
      title: "IBM Bob changelog",
      url: "https://bob.ibm.com/docs/ide/changelog",
    },
  ],
};
