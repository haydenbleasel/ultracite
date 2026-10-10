import type { EditorPageContent } from "./types";

export const devin: EditorPageContent = {
  afterInit: [
    "Trust the workspace when Devin Desktop asks. Until you do, Devin Local and hooks stay off.",
    "If `init` couldn’t run `devin-desktop` or `windsurf`, install the Oxc extension from the Extensions view, or Biome’s if you picked Biome.",
    "Save a file: Oxfmt formats it and Oxlint’s safe fixes apply.",
  ],
  agent: {
    body: "Devin Local runs the same architecture as Devin CLI: it loads `AGENTS.md` as an always-on rule and is fed the lint errors detected after its edits. `--hooks devin` adds a `PostToolUse` hook to `.devin/hooks.v1.json`, which runs `ultracite fix --hook` on each file it writes or edits and adds what’s left to its context.",
    lookup: [
      {
        note: "Your global rules, loaded in every project alongside the project’s own.",
        path: "~/.config/devin/AGENTS.md",
      },
      {
        note: "At the workspace root, loaded at session start as an always-on rule. This is where `init` writes Ultracite’s rules.",
        path: "AGENTS.md",
      },
      {
        note: "Treated the same as `AGENTS.md`: their contents load as always-on rules.",
        path: "CLAUDE.md, AGENT.md, .windsurfrules",
      },
      {
        note: "One rule per file, applied by its `trigger` frontmatter. Both folders load, and `.cursor/rules/*.mdc` is read too.",
        path: ".devin/rules/*.md, .windsurf/rules/*.md",
      },
      {
        note: "Read when the agent opens files in that directory, so only the relevant rules load.",
        path: "packages/*/AGENTS.md",
      },
    ],
    steps: [
      "Devin Local writes or edits a file, and the change shows as a diff zone you can accept or reject.",
      "With `--hooks devin`, `ultracite fix --hook` fixes and formats that file, and hands what it couldn’t fix back as `additionalContext`.",
      "The Oxc, Biome or ESLint extension lints the file too, and lint errors detected after the edit go back to the agent, with a cap so it doesn’t loop on one it can’t resolve.",
      "It fixes what’s left in its next step, or runs `npx ultracite check` as `AGENTS.md` says once you approve the command.",
    ],
    title: "Devin Local took over from Cascade",
  },
  checked: {
    date: "2026-10-10",
    version: "3.10.48",
  },
  faqs: [
    {
      answer:
        "Yes. Cognition renamed Windsurf to Devin Desktop on June 2, 2026, as a regular over-the-air update. `npx ultracite init --editors devin` sets it up, and the old `--editors windsurf` id still works.",
      question: "Is Windsurf now Devin Desktop?",
    },
    {
      answer:
        "No. Cascade was removed in 3.9.19, and Devin Local is the only agent in Devin Desktop. A Continue in Devin Local prompt moves existing Cascade conversations to it.",
      question: "Does Devin Desktop still have Cascade?",
    },
    {
      answer:
        "Yes. It writes a `PostToolUse` hook to `.devin/hooks.v1.json`, in Claude Code’s format, which Devin Local and Devin CLI read. Re-running `init` takes the `post_write_code` hook earlier versions wrote for Cascade out of `.devin/hooks.json` and `.windsurf/hooks.json`, and leaves your own hooks there.",
      question: "Does --hooks devin work with Devin Local?",
    },
    {
      answer:
        "Yes. Devin Local loads `AGENTS.md` at the workspace root as an always-on rule at session start, and picks up `AGENTS.md` files in subdirectories when it works on files there. It reads `CLAUDE.md`, `.windsurfrules` and `.devin/rules` too.",
      question: "Does Devin Desktop read AGENTS.md?",
    },
    {
      answer:
        "`init` installs it only when it creates `.vscode/settings.json`, and only if `devin-desktop` or the older `windsurf` command is on your PATH. Run `Shell Command: Install 'devin-desktop' command in PATH`, or install the extension from the Extensions view.",
      question: "Why didn’t the Biome extension install in Devin Desktop?",
    },
    {
      answer:
        "Yes. Lint errors detected after Devin Local’s edits are fed back to it to fix, with new errors marked apart from ones it has already seen and a cap so it doesn’t loop on one it can’t resolve.",
      question: "Does Devin Local fix lint errors on its own?",
    },
  ],
  headline: "Windsurf’s editor, with Devin Local as its agent",
  highlights: [
    {
      body: "Cascade was removed in 3.9.19, on September 8, 2026. The `Devin: Open Cascade Migration Wizard` command moves its hooks, workflows and memories across, and a separate command migrates Windsurf hooks into Devin hooks in every workspace folder.",
      title: "Cascade’s setup doesn’t carry over",
    },
    {
      body: "Devin Local loads project skills from `.agents/skills/`, `.devin/skills/` and `.windsurf/skills/`. `init` installs the Ultracite skill into `.agents/skills/`, so `/ultracite` runs it, and the agent can invoke it on its own.",
      title: "The Ultracite skill loads as is",
    },
    {
      body: "Devin Local can work in a git worktree, a separate checkout with no `node_modules`. A `post_setup_worktree` hook in `.devin/hooks.json` runs inside each new worktree, Devin Local’s included, so you can install dependencies there before the agent lints.",
      title: "Worktrees need their own install",
    },
  ],
  intro:
    "`ultracite init --editors devin` writes `.vscode/settings.json`, so Devin Desktop formats on save and applies your linter’s safe fixes, and installs the extension from its Open VSX mirror with the `devin-desktop` launcher. Since 3.9.19 its only agent is Devin Local, which loads `AGENTS.md`, and `--hooks devin` hands it what `ultracite fix` couldn’t fix after each edit.",
  metaDescription:
    "Ultracite sets up Devin Desktop, formerly Windsurf, to format and fix on save with Oxlint, Biome or ESLint. Devin Local reads AGENTS.md and fixes lint errors.",
  metaTitle: "Ultracite for Devin Desktop — formerly Windsurf, now Devin Local",
  related: ["cursor", "vscode", "zed"],
  setup: {
    facts: [
      {
        label: "Renamed",
        value:
          "Windsurf became Devin Desktop on June 2, 2026. Settings carry over automatically, and the first-run Migrate from Windsurf option copies your extensions.",
      },
      {
        label: "Extensions",
        value:
          "From an Open VSX mirror at `marketplace.windsurf.com`. `oxc.oxc-vscode`, `biomejs.biome`, `dbaeumer.vscode-eslint` and `esbenp.prettier-vscode` are all on it.",
      },
      {
        label: "Launcher",
        value:
          "`devin-desktop`, from `Shell Command: Install 'devin-desktop' command in PATH`. It takes `--install-extension`, and the old `windsurf` and `surf` commands still ship in `~/.codeium/windsurf/bin/`.",
      },
      {
        label: "Restricted Mode",
        value:
          "In an untrusted workspace, Devin Local and every other agent are off, and hooks neither load nor run. Trusting the workspace turns them back on.",
      },
      {
        label: "Project folder",
        value:
          "Rules, skills, workflows and hooks moved from `.windsurf/` to `.devin/`. Devin Desktop still reads `.windsurf/` as a fallback.",
      },
      {
        label: "Agent edits",
        value:
          "Shown as diff zones with accept and reject controls for each hunk. Turn them off under Editor → User interface → Agent diff zones to have edits applied straight to the file.",
      },
    ],
    summary:
      "Devin Desktop is Windsurf renamed, still built on Code OSS: it reads `.vscode/settings.json`, installs extensions from an Open VSX mirror, and keeps agents and hooks off until you trust the workspace.",
    title: "The Windsurf editor under a new name",
  },
  sources: [
    {
      title: "Devin Desktop FAQ",
      url: "https://docs.devin.ai/desktop/devin-desktop-faq",
    },
    {
      title: "Devin Desktop changelog",
      url: "https://docs.devin.ai/desktop/changelog",
    },
    {
      title: "Devin Desktop: Advanced configuration",
      url: "https://docs.devin.ai/desktop/advanced",
    },
    {
      title: "Devin Desktop: Cascade hooks",
      url: "https://docs.devin.ai/desktop/cascade/hooks",
    },
    {
      title: "Devin CLI: Hooks",
      url: "https://docs.devin.ai/cli/extensibility/hooks/overview",
    },
    {
      title: "Devin CLI: Rules and AGENTS.md",
      url: "https://docs.devin.ai/cli/extensibility/rules",
    },
    {
      title: "Devin CLI: Skills",
      url: "https://docs.devin.ai/cli/extensibility/skills/overview",
    },
    {
      title: "Devin CLI changelog",
      url: "https://docs.devin.ai/cli/changelog/stable",
    },
  ],
};
