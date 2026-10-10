import type { AgentPageContent } from "./types";

export const droid: AgentPageContent = {
  checked: { date: "2026-10-10", version: "0.238.0" },
  faqs: [
    {
      answer:
        "Yes. At startup Droid searches from your working directory up to the git root, checking each folder and its `.factory/`, `.agents/` and `.agent/` directories. `ultracite init --agents droid` writes Ultracite’s rules to the root `AGENTS.md`, which that search finds.",
      question: "Does Droid read AGENTS.md?",
    },
    {
      answer:
        "Yes, as a compatible name, along with `agents.md`, `Agents.md` and `Claude.md`. Factory recommends `AGENTS.md` for new guidance and warns that repeating rules under several names spends context without adding anything.",
      question: "Does Droid read CLAUDE.md?",
    },
    {
      answer:
        "Yes. Hooks live in `.factory/hooks.json` or `~/.factory/hooks.json`, and a `PostToolUse` hook matching `Create|Edit|ApplyPatch` runs after each edit; exit code 2 feeds its stderr back to Droid. Ultracite doesn’t set one up for Droid yet.",
      question: "Does Droid support hooks?",
    },
    {
      answer:
        "Add an `allow` permission rule for `npx ultracite` to `.factory/settings.json`, as above, and preview it with `droid rules check --command 'npx ultracite fix'`. Project rules need workspace trust, and permission rules have to be enabled for your organization.",
      question: "How do I stop Droid asking before it runs Ultracite?",
    },
    {
      answer:
        "Yes, with `droid exec` and an `--auto` level; without one, a run is read-only. If a step needs more than the level you gave, the run stops with a non-zero exit code and no partial changes, so pick the lowest level that lets the job finish.",
      question: "Can Droid fix lint errors in CI?",
    },
  ],
  headline: "Droid loads your lint rules up to the git root",
  highlights: [
    {
      body: "At Low, Droid edits files and runs low-risk commands without asking; Medium adds installs, builds and local commits; High adds riskier steps such as `git push` and migrations. An `ask` rule prompts even at High, and a `block` rule can’t be approved at all.",
      title: "Autonomy decides what runs unasked",
    },
    {
      body: "`droid exec` can only read until you pass `--auto low`, `medium` or `high`. A run that needs more than its level stops with a non-zero exit code and makes no partial changes, so CI fails clearly instead of half-fixing.",
      title: "Headless runs start read-only",
    },
    {
      body: "Each permission rule lists commands it must and mustn’t match, and a rule whose examples fail is skipped, never turned into a block-all. `droid rules check` validates them without running anything.",
      title: "Permission rules carry their own tests",
    },
  ],
  intro:
    "Droid loads Ultracite’s rules from `AGENTS.md` at startup, searching from your working directory up to the git root. After an edit it runs the checks the rules list, as far as its autonomy level allows, and a permission rule lets `npx ultracite` run without a command prompt.",
  loop: {
    body: "Ultracite doesn’t install a Droid hook, so after an edit Droid runs the commands in `AGENTS.md`. Droid’s own `PostToolUse` hooks in `.factory/hooks.json` can match `Create|Edit|ApplyPatch` and send stderr back to Droid on exit code 2, but Ultracite doesn’t configure one yet.",
    snippets: [
      {
        code: `{
  "permissionRules": {
    "version": 1,
    "rules": [
      {
        "id": "project/ultracite",
        "decision": "allow",
        "reason": "Lint and format without a prompt.",
        "match": { "prefix": ["npx", "ultracite", ["check", "fix"]] },
        "tests": {
          "match": ["npx ultracite check", "npx ultracite fix src/index.ts"],
          "noMatch": ["npx ultracite init", "npx eslint ."]
        }
      }
    ]
  }
}`,
        lang: "json",
        title: ".factory/settings.json",
      },
    ],
    steps: [
      "Droid edits a file with `Edit`, `Create` or `ApplyPatch`; at Low autonomy or above it doesn’t ask first.",
      "Following `AGENTS.md`, it runs `npx ultracite fix` through `Execute`.",
      "An `allow` rule skips the command prompt; without one, Droid weighs the command’s risk against your autonomy level.",
      "Droid reads what `ultracite fix` couldn’t settle and edits again.",
    ],
    title: "Droid runs the checks, within its autonomy",
  },
  metaDescription:
    "Set up Ultracite for Factory’s Droid: rules in AGENTS.md up to the git root, a permission rule so ultracite runs unprompted, and what Droid’s hooks can do.",
  metaTitle: "Ultracite for Droid — Lint rules, autonomy and hooks",
  related: ["amp", "codex", "grok"],
  rules: {
    facts: [
      {
        label: "Startup cap",
        value:
          "80,000 characters for the instructions Droid loads when a session starts.",
      },
      {
        label: "Read-path cap",
        value:
          "40,000 characters for files found later, as Droid reads deeper paths.",
      },
      {
        label: "Precedence",
        value:
          "Your current request beats standing instructions, nested files refine the root, and project files override personal ones.",
      },
      {
        label: "Other names",
        value:
          "`agents.md`, `Agents.md`, `CLAUDE.md` and `Claude.md` are read too. Keep one copy; duplicates cost context.",
      },
      {
        label: "Design rules",
        value:
          "`DESIGN.md` loads separately, as design guidelines, so UI conventions don’t need to crowd `AGENTS.md`.",
      },
      {
        label: "Late discovery",
        value:
          "Start a session higher in the repo and a nested `AGENTS.md` loads only once Droid reads files in its tree.",
      },
    ],
    lookup: [
      {
        note: "In each folder from the working directory up to the git root, loaded at startup.",
        path: "AGENTS.md",
      },
      {
        note: "Each of those folders’ `.factory/`, `.agents/` and `.agent/` directories is checked too.",
        path: ".factory/AGENTS.md",
      },
      {
        note: "A nested file, found when Droid reads files in that tree; it refines the root file there.",
        path: "apps/web/AGENTS.md",
      },
      {
        note: "Personal instructions, also from `~/.agents/` or `~/.agent/`. Project files should override them.",
        path: "~/.factory/",
      },
    ],
    summary:
      "Droid walks from your working directory to the git root, checking each folder and its `.factory/`, `.agents/` and `.agent/` directories for `AGENTS.md` or a compatible name. Nested files join later, when Droid reads files under them.",
  },
  skills:
    "Droid discovers skills in `.factory/skills/` and in `.agents/skills/`, so it finds the Ultracite skill that `init` installs there. Run `/skills` and check the Effective tab to see it.",
  sources: [
    {
      title: "Factory: AGENTS.md",
      url: "https://docs.factory.com/harness/agents-md",
    },
    {
      title: "Factory: Hooks",
      url: "https://docs.factory.com/harness/hooks",
    },
    {
      title: "Factory: Permission rules",
      url: "https://docs.factory.com/autonomy-and-safety/permission-rules",
    },
    {
      title: "Factory: Autonomy Level",
      url: "https://docs.factory.com/autonomy-and-safety/auto-run",
    },
    {
      title: "Factory: Droid Exec",
      url: "https://docs.factory.com/droid-exec/overview",
    },
    {
      title: "Factory: Skills",
      url: "https://docs.factory.com/harness/skills",
    },
  ],
};
