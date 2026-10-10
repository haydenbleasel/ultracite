import type { AgentPageContent } from "./types";

export const lovable: AgentPageContent = {
  checked: { date: "2026-10-10" },
  faqs: [
    {
      answer:
        "Yes. Lovable reads instruction files in your project’s Git repository, and its docs say a root-level `AGENTS.md` is always read, regardless of session length. `CLAUDE.md` can guide it too.",
      question: "Does Lovable read AGENTS.md?",
    },
    {
      answer:
        "Connect the project to GitHub, GitLab or Bitbucket with Git sync, clone the repository, and run `npx ultracite@latest init --agents lovable`. Commit, then push to the synced branch or merge into it; Lovable pulls the result, config and dev dependencies included.",
      question: "How do I add Ultracite to a Lovable project?",
    },
    {
      answer:
        "Not in a way its docs describe. Its verification tools are browser testing, Vitest frontend tests and Deno edge function tests, and the scripts it writes for data and file tasks run in an isolated environment that never touches your project’s source. Put `ultracite check` in CI on the synced repository.",
      question: "Can Lovable run Ultracite itself?",
    },
    {
      answer:
        "Keep them in `AGENTS.md`, where `init` can update them and they’re versioned with the code. Use workspace knowledge for team rules that aren’t in the repo and project knowledge for this app’s context; each holds 10,000 characters.",
      question: "Should Ultracite’s rules go in knowledge instead?",
    },
    {
      answer:
        "Lovable’s skills live in the workspace, not the repository. A workspace owner or admin can add it with Import from GitHub, using `https://github.com/haydenbleasel/ultracite/tree/main/skills/ultracite`.",
      question: "Can Lovable use the Ultracite skill?",
    },
  ],
  headline: "Lovable reads your rules from the synced repo",
  highlights: [
    {
      body: "If your `main` needs a pull request for every change, switch Lovable to a feature branch of its own. A protected branch rejects its pushes anyway (Lovable then falls back to a `lovable-sync` branch), and merging through a PR lets a required Ultracite check gate its work.",
      title: "Give Lovable its own branch",
    },
    {
      body: "Clone the synced repository, run `npx ultracite fix`, and push on a feature branch; when you merge it into the synced branch, Lovable pulls the result and carries on from there. Don’t force-push, rebase or squash commits already on the synced branch.",
      title: "Fix locally, push back",
    },
    {
      body: "Lovable can run browser tests, Vitest frontend tests and Deno edge function tests, and it sees build errors and test failures from those runs. Most of these run only when you ask, so name them in your prompt when a change needs them.",
      title: "Verification you ask for",
    },
  ],
  intro:
    "Lovable reads a root-level `AGENTS.md` from your project’s Git repository however long the session runs, so the rules arrive when you run `init` in a clone and push to the synced branch. Its docs describe no post-edit hook, and its verification tools don’t include your package scripts, so a CI check on the synced repository is where Ultracite is enforced.",
  loop: {
    body: "Lovable commits its edits to your Git repository, so a CI job that runs `npx ultracite check` on that repository sees every change it makes. Ultracite doesn’t configure CI for you; add the check to the workflow you already run on pushes and pull requests.",
    steps: [
      "Lovable edits your project with the root `AGENTS.md` and your knowledge in context.",
      "It commits each change and pushes it to the synced branch.",
      "Your CI runs `npx ultracite check` on the push, or on the pull request from Lovable’s branch.",
      "When it fails, run `npx ultracite fix` in a clone and push, or tell Lovable what the check reported.",
    ],
    title: "No hook, so the check lives in CI",
  },
  metaDescription:
    "Set up Ultracite for Lovable: a root AGENTS.md pushed through Git sync, which Lovable always reads, and ultracite check in CI on the synced repo.",
  metaTitle: "Ultracite for Lovable — Rules through Git sync, checks in CI",
  related: ["replit", "vercel", "jules"],
  rules: {
    facts: [
      {
        label: "Root file",
        value:
          "Lovable always reads a root-level `AGENTS.md`, which is where `init` writes it.",
      },
      {
        label: "Long sessions",
        value:
          "In very long conversations, knowledge may not be followed consistently. The root `AGENTS.md` is read regardless of session length.",
      },
      {
        label: "Knowledge limits",
        value:
          "10,000 characters each for workspace and project knowledge. Ultracite’s rules run about 5,000, so `AGENTS.md` is the better home.",
      },
      {
        label: "Conflicts",
        value:
          "When workspace and project knowledge disagree, Lovable is encouraged to follow project knowledge.",
      },
      {
        label: "Synced branch",
        value:
          "Lovable edits and syncs one branch at a time. Commits on other branches don’t reach it until you merge them.",
      },
      {
        label: "Dependencies",
        value:
          "Synced commits get the same checks as Lovable’s edits. When they change dependencies, as `init` does, Lovable runs its dependency audit.",
      },
    ],
    lookup: [
      {
        note: "Shared rules for every project in the workspace. Owners and admins edit it.",
        path: "Workspace knowledge",
      },
      {
        note: "Context for this project: purpose, schema, architecture, terms.",
        path: "Project knowledge",
      },
      {
        note: "Read from the root of the project’s Git repository, regardless of session length.",
        path: "AGENTS.md",
      },
      {
        note: "Other instruction files in the repository can guide Lovable too.",
        path: "CLAUDE.md",
      },
    ],
    summary:
      "When you send a message, Lovable reads your project and workspace knowledge, the project’s code, and instruction files in its Git repository. Knowledge lives in Lovable’s settings; `AGENTS.md` lives in the repo, so it reaches Lovable through Git sync.",
  },
  skills:
    "Lovable’s docs describe skills as workspace-level, added in Workspace settings, and don’t mention `.agents/skills/`, where `init` installs the Ultracite skill. A workspace owner or admin can import it from GitHub instead, using `https://github.com/haydenbleasel/ultracite/tree/main/skills/ultracite`.",
  sources: [
    {
      title: "Lovable: Workspace and project knowledge",
      url: "https://docs.lovable.dev/features/knowledge",
    },
    {
      title: "Lovable: Git sync overview",
      url: "https://docs.lovable.dev/integrations/git-sync-overview",
    },
    {
      title: "Lovable: Test and verify your app",
      url: "https://docs.lovable.dev/features/testing",
    },
    {
      title: "Lovable: Skills",
      url: "https://docs.lovable.dev/features/skills",
    },
    {
      title: "Lovable: Generate files and analyze data",
      url: "https://docs.lovable.dev/features/generate-files",
    },
  ],
};
