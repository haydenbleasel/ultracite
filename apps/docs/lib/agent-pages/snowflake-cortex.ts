import type { AgentPageContent } from "./types";

export const snowflakeCortex: AgentPageContent = {
  checked: { date: "2026-10-10" },
  faqs: [
    {
      answer:
        "Yes. Snowflake lists `AGENTS.md` support among the CLI’s agent customization features, and CoCo Desktop treats `AGENTS.md` as the primary project instructions file.",
      question: "Does Snowflake CoCo read AGENTS.md?",
    },
    {
      answer:
        "Yes. Snowflake’s docs now call Cortex Code “Snowflake CoCo”, and the CLI command is still `cortex`. `ultracite init --agents snowflake-cortex` sets it up.",
      question: "Is Snowflake CoCo the same as Cortex Code?",
    },
    {
      answer:
        "Not as written. The CLI reads hooks from `.claude/settings.json`, but its matchers are case-sensitive and its built-in tool names are lowercase, so the `Write|Edit` matcher in Ultracite’s Claude Code hook doesn’t match `edit` or `write`. Ultracite doesn’t configure CoCo hooks.",
      question: "Will CoCo run Ultracite’s Claude Code hook?",
    },
    {
      answer:
        'Use batch mode and pre-approve the command: `cortex -p "…" --allowed-tools "Bash(npx ultracite *)"`. `cortex exec` rejects interactive prompts automatically, so a command that isn’t pre-approved won’t run there.',
      question: "How do I run Ultracite through CoCo in CI?",
    },
    {
      answer:
        "In `~/.snowflake/cortex/AGENTS.md`. CoCo Desktop’s Custom instructions editor reads and writes the same file.",
      question: "Where do I put personal instructions for CoCo?",
    },
  ],
  headline: "Snowflake CoCo reads AGENTS.md as its main rules",
  highlights: [
    {
      body: "The CLI reads hooks from `.cortex/settings.json`, `.claude/settings.json`, their `.local` variants, `~/.claude/settings.json` and `~/.snowflake/cortex/hooks.json`. Matchers are case-sensitive and built-in tool names are lowercase: `bash` matches, `Bash` doesn’t.",
      title: "Hooks come from Claude Code’s files too",
    },
    {
      body: "When CoCo asks before a command, “Always allow (persist)” saves the answer to `~/.snowflake/cortex/permissions.json`, scoped to the project and the command pattern. Delete a project’s entry to reset it.",
      title: "Approvals you give once",
    },
    {
      body: "CoCo CLI and CoCo Desktop read the same configuration in `~/.snowflake/cortex/`, so a skill or hook you set up in one is available in the other.",
      title: "One setup for the CLI and desktop",
    },
  ],
  intro:
    "Snowflake CoCo, formerly Cortex Code, reads `AGENTS.md` in its CLI (still run as `cortex`) and its desktop app. Ultracite doesn’t set up hooks for it, so CoCo runs `ultracite fix` when the rules tell it to, after you approve the command or pre-approve it.",
  loop: {
    body: "CoCo runs `ultracite fix` with its `bash` tool because `AGENTS.md` tells it to. In the default Confirm mode, CoCo may ask before it runs a shell command; a remembered approval or `--allowed-tools` lets it through.",
    snippets: [
      {
        code: 'cortex -p "Run npx ultracite fix, then fix what it reports" --allowed-tools "Bash(npx ultracite *)"',
        lang: "bash",
        title: "Batch run in CI",
      },
    ],
    steps: [
      "CoCo changes a file with its `edit` or `write` tool.",
      "Following `AGENTS.md`, it runs `npx ultracite fix` with `bash`.",
      "Confirm mode may ask first; a saved “Always allow” or `--allowed-tools` skips the prompt.",
      "CoCo reads the output and fixes what’s left.",
    ],
    title: "Approve the command once, or up front",
  },
  metaDescription:
    "Set up Ultracite for Snowflake CoCo (formerly Cortex Code): rules in AGENTS.md, approvals for npx ultracite, and why Claude Code hooks need care there.",
  metaTitle: "Ultracite for Snowflake CoCo — Rules in AGENTS.md",
  related: ["kiro-cli", "codex", "droid"],
  rules: {
    facts: [
      {
        label: "Size",
        value:
          "About 100,000 characters in total in CoCo Desktop. A file that would pass the cap is skipped.",
      },
      {
        label: "Same name",
        value:
          "When a workspace file and a user file share a name, the workspace one is used and the other is skipped.",
      },
      {
        label: "When it loads",
        value:
          "Instruction files go into the first message of the session, joined into one block of context.",
      },
      {
        label: "Patterns",
        value:
          "`chat.instructionFilePatterns` changes which file names CoCo Desktop discovers.",
      },
      {
        label: "Scoped files",
        value:
          "`.github/instructions/*.instructions.md` with an `applyTo` glob attach only when matching files are in the conversation.",
      },
      {
        label: "Order",
        value:
          "Workspace files first, then your user files, then the active profile’s.",
      },
    ],
    lookup: [
      {
        note: "The primary project instructions file, at the workspace root.",
        path: "AGENTS.md",
      },
      {
        note: "CoCo Desktop also checks every directory from the workspace root up to the git root, for monorepos.",
        path: "Folders up to the git root",
      },
      {
        note: "Also recognized by CoCo Desktop, with names matched case-insensitively.",
        path: "CLAUDE.md, CORTEX.md, SNOWFLAKE.md, RULES.md",
      },
      {
        note: "Read relative to the git root by CoCo Desktop.",
        path: ".cursor/rules/*.mdc, .claude/rules/*.md",
      },
      {
        note: "Your instructions for every project. CoCo Desktop’s Custom instructions editor writes this file.",
        path: "~/.snowflake/cortex/AGENTS.md",
      },
    ],
    summary:
      "CoCo treats `AGENTS.md` as the project’s main instructions file. Snowflake documents the search in detail for CoCo Desktop: workspace files first, then yours, then the active profile’s, all concatenated into one block of context.",
  },
  skills:
    "CoCo CLI loads project skills from `.cortex/skills/` and `.claude/skills/`, and since 1.0.77 from `.agents/skills/`, so it finds the Ultracite skill `init` installs there. `/skill list` shows what loaded.",
  sources: [
    {
      title: "Snowflake: Overview of Snowflake CoCo",
      url: "https://docs.snowflake.com/en/user-guide/cortex-code/cortex-code",
    },
    {
      title: "CoCo Desktop: Instruction files",
      url: "https://docs.snowflake.com/en/user-guide/cortex-code/cortex-code-desktop/instruction-files",
    },
    {
      title: "CoCo CLI: Extensibility",
      url: "https://docs.snowflake.com/en/user-guide/cortex-code/extensibility",
    },
    {
      title: "CoCo CLI: Reference",
      url: "https://docs.snowflake.com/en/user-guide/cortex-code/cli-reference",
    },
    {
      title: "CoCo CLI: Security",
      url: "https://docs.snowflake.com/en/user-guide/cortex-code/security",
    },
    {
      title: "Cortex Code changelog",
      url: "https://docs.snowflake.com/en/user-guide/cortex-code/changelog",
    },
  ],
};
