import type { AgentPageContent } from "./types";

export const devin: AgentPageContent = {
  checked: { date: "2026-10-10" },
  faqs: [
    {
      answer:
        "Yes. Devin looks for `AGENTS.md` before it starts coding, in the repo root or anywhere else in it, and includes the first 16 KiB of each file in its context. Past that it gets a truncation notice and can read the rest on demand.",
      question: "Does Devin read AGENTS.md?",
    },
    {
      answer:
        "The rules already name `npx ultracite fix` and `npx ultracite check`. To put them in front of Devin every time, add a `lint` entry to the repository’s blueprint `knowledge`, which loads into Devin’s context at the start of each session.",
      question: "How do I make Devin run the linter?",
    },
    {
      answer:
        "Comment `/devin fix the failing lint check and push a commit` on the pull request; that’s the example in Devin’s own docs. Devin starts a session with the PR as context, or passes the comment to the session already working on it.",
      question: "Can Devin fix a failing lint check on a PR?",
    },
    {
      answer:
        "Yes. Devin Review uses every `AGENTS.md` in the repo as context when it analyzes a pull request, along with `REVIEW.md`, `CLAUDE.md`, `CONTRIBUTING.md` and other rules files. Put review-only guidance in `REVIEW.md`.",
      question: "Does Devin Review follow the Ultracite rules?",
    },
    {
      answer:
        "Devin CLI does: `PostToolUse` and other events in `.devin/hooks.v1.json`, where exit code 2 blocks the action. It also loads Claude Code hooks from `.claude/settings.json`. `npx ultracite init --hooks devin` adds Ultracite’s to `.devin/hooks.v1.json`: it fixes each file Devin writes or edits and adds what’s left to its context.",
      question: "Does Devin support hooks?",
    },
  ],
  headline: "Devin knows your lint command before it codes",
  highlights: [
    {
      body: "A blueprint’s `knowledge` section isn’t executed: it’s how you tell Devin the right lint, test and build commands, and it loads at session start. It’s per repository, so with five repos configured, Devin sees only the entries for the one it’s working on.",
      title: "Lint commands in the blueprint",
    },
    {
      body: "Devin answers comments on pull requests its sessions are working on, and `/devin <prompt>` starts a session from any open PR. Its GitHub App can read check results and rerun workflows, so a failing `ultracite check` is something it can see and act on.",
      title: "Fixes from the pull request",
    },
    {
      body: "Devin Review scopes files in `.agents/`, `.devin/`, `.cursor/` and `.github/` to their parent directory, so `src/.agents/REVIEW.md` applies only under `src/`. Admins can add more files to its context with glob patterns under Review Rules.",
      title: "Review instructions by directory",
    },
  ],
  intro:
    "Devin reads `AGENTS.md` before it starts coding, taking the first 16 KiB of each file, and Devin Review reads it again for every pull request. Cloud sessions have no post-edit hook, so Devin runs `ultracite` in its VM when the rules or your blueprint say to, and a CI check catches the rest.",
  loop: {
    body: "`AGENTS.md` names `ultracite fix` and `ultracite check`, and a blueprint `knowledge` entry puts the same commands in Devin’s context at the start of every session. The blueprint’s `maintenance` step installs dependencies when the environment builds, so the commands work in the VM. Your CI check is the gate, and Devin can pick its failures up from the PR.",
    snippets: [
      {
        code: 'maintenance:\n  - name: "Install npm dependencies"\n    run: npm install\n\nknowledge:\n  - name: lint\n    contents: |\n      Run linting with:\n      npx ultracite check\n\n      For auto-fix:\n      npx ultracite fix',
        lang: "yaml",
        title: ".devin/blueprint.yaml",
      },
    ],
    steps: [
      "Devin edits files in its cloud VM, with `AGENTS.md` and the blueprint’s `lint` entry in context.",
      "It runs `npx ultracite fix` and `npx ultracite check` in the VM’s shell when its instructions call for them.",
      "It opens a pull request, and your CI runs `ultracite check` on it.",
      "If the check fails, a `/devin` comment sends it back to Devin, which pushes a fix to the same branch.",
    ],
    title: "Checked in the VM, enforced in CI",
  },
  metaDescription:
    "Set up Ultracite for Devin: rules in AGENTS.md, lint commands in the blueprint, and CI failures Devin fixes from the pull request.",
  metaTitle: "Ultracite for Devin — Lint commands Devin knows up front",
  related: ["jules", "open-hands", "codex"],
  rules: {
    facts: [
      {
        label: "Location",
        value:
          "`AGENTS.md` in the repo root, or anywhere else in it. Devin looks for it before it starts coding.",
      },
      {
        label: "Size",
        value:
          "The first 16 KiB of each `AGENTS.md` loads automatically; past that, Devin gets a truncation notice. Ultracite’s rules take about 5 KB.",
      },
      {
        label: "Blueprints",
        value:
          "Write them in Settings > Environment > Blueprints, or keep them in the repo as `.devin/blueprint.yaml` and sync after merging.",
      },
      {
        label: "Builds",
        value:
          "`maintenance` runs during builds. At session start it’s shown to Devin, not run, so Devin can rerun it if dependencies have changed.",
      },
      {
        label: "Review files",
        value:
          "Devin Review reads `**/REVIEW.md`, `**/AGENTS.md`, `**/CLAUDE.md`, `**/CONTRIBUTING.md`, Cursor and Windsurf rules, and `.coderabbit.yaml`.",
      },
      {
        label: "Auto-fix",
        value:
          "With Auto-Fix on, Devin Review proposes code changes alongside its bug findings, which you can apply from the diff view.",
      },
    ],
    lookup: [
      {
        note: "The repository’s `knowledge` entries, such as `lint` and `test`, load into context at session start.",
        path: ".devin/blueprint.yaml",
      },
      {
        note: "Found before Devin starts coding. The first 16 KiB is included automatically.",
        path: "AGENTS.md",
      },
      {
        note: "An `AGENTS.md` can sit anywhere in the repo, and Devin includes the first 16 KiB of each one.",
        path: "packages/*/AGENTS.md",
      },
      {
        note: "Devin Review only: read with every `AGENTS.md` and `CLAUDE.md` when it analyzes a pull request.",
        path: "REVIEW.md",
      },
    ],
    summary:
      "A Devin session starts with the repository’s blueprint `knowledge` and its `AGENTS.md` files. Devin Review reads `AGENTS.md` too, plus `REVIEW.md` for anything that only matters in review.",
  },
  skills:
    "Devin scans `.agents/skills/`, its recommended location, along with `.devin/skills/`, `.claude/skills/` and three other folders in every connected repo, so it finds the Ultracite skill `init` installs in `.agents/skills/`. It invokes a skill when it judges it relevant, or when you write `@skills:ultracite`.",
  sources: [
    {
      title: "Devin: AGENTS.md files",
      url: "https://docs.devin.ai/onboard-devin/agents-md",
    },
    {
      title: "Devin: Environment blueprints",
      url: "https://docs.devin.ai/onboard-devin/environment/blueprints",
    },
    {
      title: "Devin: Devin Review",
      url: "https://docs.devin.ai/work-with-devin/devin-review",
    },
    {
      title: "Devin: GitHub integration",
      url: "https://docs.devin.ai/integrations/gh",
    },
    {
      title: "Devin: Skills",
      url: "https://docs.devin.ai/product-guides/skills",
    },
    {
      title: "Devin CLI: Hooks",
      url: "https://docs.devin.ai/cli/extensibility/hooks/overview",
    },
  ],
};
