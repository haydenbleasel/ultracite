import type { EditorPageContent } from "./types";

export const codebuddy: EditorPageContent = {
  afterInit: [
    "If `init` couldn’t run `buddy`, install `oxc.oxc-vscode` from the Extensions view, or Biome’s if you picked Biome. CodeBuddy installs extensions from Open VSX.",
    "Start a new chat, so the agent loads the rules and, with `--hooks codebuddy`, the hook in `.codebuddy/settings.json`.",
    "Save a file: Oxfmt formats it and Oxlint’s safe fixes apply.",
  ],
  agent: {
    body: "CodeBuddy’s hooks follow Claude Code’s format: `PostToolUse` runs after a tool finishes, `matcher` is a regex on the tool name, and exit code 2 passes stderr to the agent. The hook from `--hooks codebuddy` uses all three, so whatever `ultracite fix` can’t fix goes back to the agent. Rules come from `.codebuddy/rules/` and one root file: `CODEBUDDY.md`, or `AGENTS.md` when there isn’t one.",
    lookup: [
      {
        note: "Your own rules from the Rules tab in settings, applied in every project and kept out of version control.",
        path: "User rules",
      },
      {
        note: "Project rules, one folder per rule with a `RULE.mdc`. Always rules load in full, Agent Requested rules when the agent finds them relevant, and Manual rules when you @-mention them.",
        path: ".codebuddy/rules/",
      },
      {
        note: "The root file CodeBuddy checks first, loaded in full. Its `/init` command writes `CODEBUDDY.md`, and while either file exists `AGENTS.md` isn’t loaded.",
        path: "CODEBUDDY.md, .codebuddy/CODEBUDDY.md",
      },
      {
        note: "Loaded in full when the project has no `CODEBUDDY.md`. Where `init` writes Ultracite’s rules.",
        path: "AGENTS.md",
      },
    ],
    steps: [
      "The agent writes a file with `write_to_file` or `replace_in_file`, which the hook’s `Write|Edit` matcher covers.",
      "CodeBuddy runs `npx ultracite fix --hook` with the edit as JSON on stdin, and it fixes and formats that one file.",
      "If problems are left, the hook exits with 2 and CodeBuddy passes its stderr to the agent, which fixes them next.",
      "The agent can also call its `read_lints` tool to read the diagnostics the Oxc, Biome or ESLint extension reports.",
    ],
    title: "The hook’s leftovers go back to the agent",
  },
  checked: {
    date: "2026-10-10",
    version: "4.12.1",
  },
  faqs: [
    {
      answer:
        "Yes. `npx ultracite init --editors codebuddy` writes `.vscode/settings.json` for Oxlint and Oxfmt, Biome, or ESLint and Prettier, and `--hooks codebuddy` adds a `PostToolUse` hook to `.codebuddy/settings.json` that fixes each file the agent writes.",
      question: "Does Ultracite work with CodeBuddy?",
    },
    {
      answer:
        "Only when the project has no `CODEBUDDY.md`. CodeBuddy loads one root instruction file, and `CODEBUDDY.md` comes first, so running `/init` in CodeBuddy hides Ultracite’s `AGENTS.md`.",
      question: "Does CodeBuddy read AGENTS.md?",
    },
    {
      answer:
        "`init` installs it with the IDE’s own command, `buddy`, only when it creates `.vscode/settings.json` and only if `buddy` is on your `PATH`. (`codebuddy` is CodeBuddy Code, the agent CLI.) Otherwise, install it from the Extensions view.",
      question: "Why didn’t init install the Oxc extension in CodeBuddy?",
    },
    {
      answer:
        "Through the exit code. `ultracite fix --hook` exits with 2 when problems remain, and CodeBuddy treats 2 as a blocking error: it passes the hook’s stderr to the agent. Any other non-zero code only shows a warning.",
      question: "How does the CodeBuddy hook tell the agent about lint errors?",
    },
    {
      answer:
        "From `.codebuddy/settings.json` in the project and `~/.codebuddy/settings.json` in your home folder, and the project file takes priority. `init --hooks codebuddy` writes the project one.",
      question: "Where does CodeBuddy read hooks from?",
    },
  ],
  headline: "CodeBuddy, where lint errors go back to the agent",
  highlights: [
    {
      body: "CodeBuddy’s `/init` slash command generates a `CODEBUDDY.md`, and from then on the agent stops loading `AGENTS.md`. Move Ultracite’s rules into that file, or delete it.",
      title: "/init hides AGENTS.md",
    },
    {
      body: "CodeBuddy loads skills from `.codebuddy/skills/`. `--hooks codebuddy` creates the `.codebuddy` folder, so when `init` installs the Ultracite skill, it puts a copy there as well as in `.agents/skills/`.",
      title: "Skills from .codebuddy/skills",
    },
    {
      body: "When several hooks match a tool call, CodeBuddy runs them in parallel and drops identical commands, so a hook can’t count on another one finishing first.",
      title: "Hooks run in parallel",
    },
  ],
  intro:
    "`ultracite init --editors codebuddy` writes `.vscode/settings.json`, so CodeBuddy formats on save and applies safe fixes through the Oxc, Biome or ESLint extension from Open VSX. `--hooks codebuddy` adds a `PostToolUse` hook, and what `ultracite fix` leaves behind goes back to the agent. The agent reads `AGENTS.md` only when the project has no `CODEBUDDY.md`.",
  metaDescription:
    "Ultracite sets up CodeBuddy to format and fix on save with Oxlint, Biome or ESLint, and adds a PostToolUse hook that sends leftover lint errors to the agent.",
  metaTitle: "Ultracite for CodeBuddy — PostToolUse hook, Open VSX, AGENTS.md",
  related: ["trae", "cursor", "devin"],
  setup: {
    facts: [
      {
        label: "Extension gallery",
        value:
          "Open VSX. CodeBuddy’s build points its gallery at open-vsx.org, which has `oxc.oxc-vscode`, `biomejs.biome`, `dbaeumer.vscode-eslint` and `esbenp.prettier-vscode`.",
      },
      {
        label: "Launcher",
        value:
          "The IDE’s own launcher is `buddy`, built from VS Code’s command-line tool, and `init` installs the extension with `buddy --install-extension`. `codebuddy` on your `PATH` is CodeBuddy Code, the agent CLI.",
      },
      {
        label: "VS Code base",
        value:
          "CodeBuddy 4.12.1 is built on VS Code 1.106, which predates `js/ts.tsdk.path`, so for CodeBuddy `init` also writes `typescript.tsdk`.",
      },
      {
        label: "Two settings files",
        value:
          "`.codebuddy/settings.json` holds the agent’s hooks. Editor settings, including the ones `init` writes, stay in `.vscode/settings.json`.",
      },
      {
        label: "New sessions",
        value:
          "Rules are added when a chat session starts, so start a new chat after `init` or after editing a rule. CodeBuddy’s hook guide also starts a new session to test a hook.",
      },
      {
        label: "Hook timeout",
        value:
          "CodeBuddy stops a hook when its `timeout`, in seconds, runs out. The default is 60; the hook `init` writes sets 20.",
      },
    ],
    summary:
      "CodeBuddy is a VS Code build that installs extensions from Open VSX and applies the `.vscode/settings.json` that `init` writes. Its agent keeps its own settings, hooks included, under `.codebuddy/`.",
    title: "How CodeBuddy runs your linter",
  },
  sources: [
    {
      title: "CodeBuddy docs: Hooks",
      url: "https://www.codebuddy.ai/docs/ide/Features/hooks",
    },
    {
      title: "CodeBuddy docs: Rules",
      url: "https://www.codebuddy.ai/docs/ide/User-guide/Rules",
    },
    {
      title: "CodeBuddy docs: Skills",
      url: "https://www.codebuddy.ai/docs/ide/Features/Skills",
    },
    {
      title: "CodeBuddy docs: Slash commands",
      url: "https://www.codebuddy.ai/docs/ide/User-guide/Slash-Commands",
    },
    {
      title: "CodeBuddy IDE release notes",
      url: "https://www.codebuddy.ai/docs/ide/release-notes/release-notes",
    },
    {
      title: "Open VSX: Oxc extension",
      url: "https://open-vsx.org/extension/oxc/oxc-vscode",
    },
  ],
};
