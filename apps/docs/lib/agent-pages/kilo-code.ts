import type { AgentPageContent } from "./types";

export const kiloCode: AgentPageContent = {
  checked: { date: "2026-10-10", version: "7.8.8" },
  faqs: [
    {
      answer:
        "Yes. Every `AGENTS.md` from your working directory up to the repository root goes into context at session start, and a subdirectory’s file joins when Kilo reads a file there. `ultracite init --agents kilo-code` writes Ultracite’s rules to the root file.",
      question: "Does Kilo Code read AGENTS.md?",
    },
    {
      answer:
        "Only as a fallback. A project `CLAUDE.md` is used when no `AGENTS.md` turns up, and `~/.claude/CLAUDE.md` stands in for a missing `~/.config/kilo/AGENTS.md` until you’ve run the Claude Code migration.",
      question: "Does Kilo Code read CLAUDE.md?",
    },
    {
      answer:
        "Through plugins: TypeScript or JavaScript files in `.kilo/plugin/`, or packages listed under `plugin` in your config, that can handle `tool.execute.after` and rewrite a tool’s output. They work in the CLI and the VS Code extension. Ultracite doesn’t ship a Kilo plugin yet.",
      question: "Does Kilo Code support hooks?",
    },
    {
      answer:
        "Shell commands ask by default unless they’re on Kilo’s short read-only list, such as `cat`, `grep` and `ls`. Allow `npx ultracite *` under `permission.bash`, then reload the VS Code window or start a new CLI session, since Kilo caches project config.",
      question: "Why does Kilo Code ask before running Ultracite?",
    },
    {
      answer:
        "The Kilo CLI is a fork of OpenCode and takes the same configuration options, but it reads `kilo.json` and `.kilo/`, not `.opencode/`. Move any OpenCode project config into `.kilo/` to keep it.",
      question: "Is the Kilo CLI the same as OpenCode?",
    },
  ],
  headline: "Kilo Code reads every AGENTS.md up to the root",
  highlights: [
    {
      body: "Kilo won’t let the agent change `AGENTS.md` without your approval and asks you to confirm every edit to it, so Ultracite’s rules can’t change without your say.",
      title: "AGENTS.md is write-protected",
    },
    {
      body: "Turn on the Use REVIEW.md setting and Kilo’s Code Reviews read `REVIEW.md` from the pull request’s base branch, so a branch can’t rewrite the policy that reviews it. Files over 10,000 characters are truncated.",
      title: "REVIEW.md steers pull request reviews",
    },
    {
      body: 'Permission rules are read in order and the last match wins, so a catch-all `"*": "ask"` placed after your Ultracite rule overrides it. Reads of `.env` files keep asking even under a broad allow.',
      title: "Order matters in permissions",
    },
  ],
  intro:
    "Kilo Code puts every `AGENTS.md` from your working directory up to the repository root into context, in the VS Code extension and the CLI alike. Ultracite doesn’t add a Kilo plugin, so after an edit Kilo runs the `ultracite fix` the rules ask for; shell commands outside a short read-only list ask first unless you allow them.",
  loop: {
    body: "Ultracite doesn’t install a Kilo plugin, so after an edit Kilo runs the commands in `AGENTS.md`. Kilo asks before shell commands that aren’t on its read-only list, so allow `npx ultracite` once in `kilo.jsonc`. Kilo plugins can handle `tool.execute.after` and rewrite a tool’s output, but Ultracite doesn’t ship one for Kilo yet.",
    snippets: [
      {
        code: `{
  "permission": {
    "bash": {
      "npx ultracite *": "allow"
    }
  }
}`,
        lang: "jsonc",
        title: "kilo.jsonc",
      },
    ],
    steps: [
      "Kilo edits a file with its `edit` or `write` tool.",
      "Following `AGENTS.md`, it runs `npx ultracite fix` through `bash`.",
      "Your `permission.bash` rules decide: the last matching pattern wins, and with no allow rule Kilo asks.",
      "Kilo reads what’s left and fixes it before moving on.",
    ],
    title: "Kilo runs the fix; permissions decide when",
  },
  metaDescription:
    "Set up Ultracite for Kilo Code: rules in AGENTS.md from your folder up to the repo root, a bash permission for ultracite, and how plugins and reviews fit.",
  metaTitle: "Ultracite for Kilo Code — AGENTS.md, permissions and REVIEW.md",
  related: ["opencode", "cline", "copilot"],
  rules: {
    facts: [
      {
        label: "Precedence",
        value:
          "An agent’s `prompt`, then project `instructions`, then `AGENTS.md`, then global `instructions`.",
      },
      {
        label: "Always on",
        value:
          "`AGENTS.md` can’t be disabled on its own; override it with `instructions` or an agent’s `prompt`.",
      },
      {
        label: "Edits",
        value:
          "Changes to `AGENTS.md` apply to new tasks, not the current one.",
      },
      {
        label: "Extra files",
        value:
          "`instructions` in `kilo.jsonc` takes more paths, globs or URLs to load alongside `AGENTS.md`.",
      },
      {
        label: "Memory bank",
        value:
          "Deprecated in favor of `AGENTS.md`; move `.kilo/rules/memory-bank/` content into it.",
      },
      {
        label: "Last fallback",
        value:
          "A project `CONTEXT.md` still loads, deprecated, when there’s neither `AGENTS.md` nor `CLAUDE.md`.",
      },
    ],
    lookup: [
      {
        note: "Your global instructions. Without it, Kilo falls back to `~/.claude/CLAUDE.md` until you’ve run the Claude Code migration.",
        path: "~/.config/kilo/AGENTS.md",
      },
      {
        note: "Every one from the working directory up to the repository root, loaded at session start.",
        path: "AGENTS.md",
      },
      {
        note: "Used only when no `AGENTS.md` turns up anywhere in that chain.",
        path: "CLAUDE.md",
      },
      {
        note: "Extra files, globs or URLs you list under `instructions`.",
        path: "kilo.jsonc",
      },
      {
        note: "Loaded when Kilo reads a file in that folder, and added to the conversation as a `<system-reminder>`.",
        path: "src/backend/AGENTS.md",
      },
    ],
    summary:
      "Kilo Code builds its instructions from one global file, the project’s chain of `AGENTS.md` files and any `instructions` you list in `kilo.jsonc`. A subdirectory’s file arrives later, when Kilo reads a file under it.",
  },
  skills:
    "Kilo Code loads skills from `.agents/skills/` by default, alongside `.kilo/skills/`, so it finds the Ultracite skill that `init` installs. Setting `KILO_DISABLE_EXTERNAL_SKILLS=true` turns off `.agents/skills/` and `.claude/skills/`.",
  sources: [
    {
      title: "Kilo Code: agents.md",
      url: "https://kilo.ai/docs/customize/agents-md",
    },
    {
      title: "Kilo Code source: default agent permissions",
      url: "https://github.com/Kilo-Org/kilocode/blob/main/packages/opencode/src/kilocode/agent/index.ts",
    },
    {
      title: "Kilo Code: Auto-Approving Actions",
      url: "https://kilo.ai/docs/getting-started/settings/auto-approving-actions",
    },
    {
      title: "Kilo Code: Plugins",
      url: "https://kilo.ai/docs/automate/extending/plugins",
    },
    {
      title: "Kilo Code: Code Reviews",
      url: "https://kilo.ai/docs/automate/code-reviews/overview",
    },
    {
      title: "Kilo Code source: session instructions",
      url: "https://github.com/Kilo-Org/kilocode/blob/main/packages/opencode/src/session/instruction.ts",
    },
  ],
};
