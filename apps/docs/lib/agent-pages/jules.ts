import type { AgentPageContent } from "./types";

export const jules: AgentPageContent = {
  checked: { date: "2026-10-10" },
  faqs: [
    {
      answer:
        "Yes. Jules looks for `AGENTS.md` in the root of your repository automatically and uses it to plan and write code. `ultracite init --agents jules` puts the rules there.",
      question: "Does Jules read AGENTS.md?",
    },
    {
      answer:
        "Not that its docs describe. Jules runs `ultracite fix` and `ultracite check` in its VM because the rules in `AGENTS.md` tell it to, and CI Fixer brings back any lint check that fails on its pull request.",
      question: "Does Jules support hooks?",
    },
    {
      answer:
        "Add your install command, such as `npm install`, as the setup script under the repository’s Configuration and click Run and Snapshot. Later tasks start from the saved snapshot, with `ultracite` already in `node_modules`.",
      question: "How do I make sure Jules can run the linter?",
    },
    {
      answer:
        "Yes, on pull requests it created. When a GitHub Actions check fails, Jules receives the error, commits a fix and resubmits, so a job that runs `npx ultracite check` feeds lint failures straight back.",
      question: "Will Jules fix lint failures in CI?",
    },
  ],
  headline: "Jules follows AGENTS.md and fixes its own CI",
  highlights: [
    {
      body: "When a GitHub Actions check fails on a pull request Jules created, it receives the error, works out a fix, commits and resubmits. A CI job that runs `npx ultracite check` makes lint failures part of that loop.",
      title: "CI Fixer closes the loop",
    },
    {
      body: "Jules reads review comments on its pull requests and pushes a commit with the changes you asked for. In Reactive Mode, it acts only on comments that mention `@Jules`.",
      title: "It acts on review comments",
    },
    {
      body: "Add install commands under Configuration and use Run and Snapshot: Jules saves the environment and starts later tasks from it, so your linter is already installed. Setup scripts can’t run long-lived commands like `npm run dev`.",
      title: "Snapshots keep the linter ready",
    },
  ],
  intro:
    "Jules looks for `AGENTS.md` at the root of your repository and uses it to plan and write code, so Ultracite’s rules reach it with no extra step. It works in a short-lived cloud VM and runs `ultracite fix` and `ultracite check` there because the rules tell it to. Put `ultracite check` in your GitHub Actions and Jules’s CI Fixer handles failures on the pull requests it opens.",
  loop: {
    body: "Each task runs in a fresh Ubuntu VM where Jules clones your repository, installs dependencies and runs commands as it works, including the `ultracite` commands in `AGENTS.md`. Once its work is on a pull request, a failing GitHub Actions check comes back to it through CI Fixer.",
    steps: [
      "Your setup script runs, or Jules works out the install from your repository; a snapshot speeds up later tasks.",
      "Jules plans, edits files and, following `AGENTS.md`, runs `npx ultracite fix` and `npx ultracite check` in the VM.",
      "You publish the work as a branch or pull request; Jules is the commit author unless you change it in Settings.",
      "If a GitHub Actions check such as `ultracite check` fails on its pull request, CI Fixer hands Jules the error and it pushes a fix.",
    ],
    title: "Lint in the VM, then in CI",
  },
  metaDescription:
    "Set up Ultracite for Jules: rules in a root AGENTS.md, ultracite installed by the setup script, and CI Fixer to repair failing lint checks on its pull requests.",
  metaTitle: "Ultracite for Jules — AGENTS.md, setup scripts and CI Fixer",
  related: ["copilot", "codex", "devin"],
  rules: {
    facts: [
      {
        label: "Location",
        value:
          "`AGENTS.md` at the repository root, the one place Jules’s docs name.",
      },
      {
        label: "Setup hints",
        value:
          "Without a setup script, Jules works out how to prepare the VM from your repository, using `AGENTS.md` and the README as hints.",
      },
      {
        label: "Memory",
        value:
          "Jules also keeps a memory of past tasks for each repository, which you can turn off under Knowledge in the repo’s settings.",
      },
    ],
    lookup: [
      {
        note: "At the repository root. Jules finds it automatically and uses it to plan and write code.",
        path: "AGENTS.md",
      },
      {
        note: "What Jules has learned from your earlier tasks in that repository, unless you turn it off.",
        path: "Repository memory",
      },
      {
        note: "Commands Jules runs to prepare the VM before it starts. Without one, it reads `AGENTS.md` and the README for hints.",
        path: "Configuration → Initial Setup",
      },
      {
        note: "The task itself, plus any files you pick with the file selector.",
        path: "Your prompt",
      },
    ],
    summary:
      "Jules reads one instructions file: `AGENTS.md` at the root of the repository. It uses it to plan and write code, and, with your README, for hints on setting up the VM when you haven’t given it a setup script.",
  },
  skills:
    "Jules’s docs don’t describe `SKILL.md` skills, so don’t count on it loading the Ultracite skill from `.agents/skills/`. `AGENTS.md` carries the same commands, and Jules reads it automatically.",
  sources: [
    {
      title: "Jules: Getting started",
      url: "https://jules.google/docs/",
    },
    {
      title: "Jules: Environment setup",
      url: "https://jules.google/docs/environment/",
    },
    {
      title: "Jules: Running tasks",
      url: "https://jules.google/docs/running-tasks/",
    },
    {
      title: "Jules: FAQ",
      url: "https://jules.google/docs/faq/",
    },
    {
      title: "Jules: Changelog",
      url: "https://jules.google/docs/changelog/",
    },
  ],
};
