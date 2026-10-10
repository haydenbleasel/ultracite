import type { AgentPageContent } from "./types";

export const vercel: AgentPageContent = {
  checked: { date: "2026-10-10" },
  faqs: [
    {
      answer:
        "Code Review does. `AGENTS.md` is first in its list of guideline files, ahead of `CLAUDE.md`, `.github/copilot-instructions.md` and Cursor rules, and it applies by directory: inherited from parents, scoped to its own subtree.",
      question: "Does Vercel Agent read AGENTS.md?",
    },
    {
      answer:
        "When it proposes a fix, yes: it runs the patch in a Vercel Sandbox against your real builds, tests and linters, and only shows suggestions that pass. That checks its own suggestions, not every commit, so keep `ultracite check` as a required CI check.",
      question: "Does Vercel Agent run my linter?",
    },
    {
      answer:
        'When several guideline files share a directory, Code Review uses only the highest-priority one, and `AGENTS.md` outranks `CLAUDE.md`. Move what reviews need into `AGENTS.md`, or pull it in from there with `@import "CLAUDE.md"`.',
      question: "Why does Code Review ignore my CLAUDE.md?",
    },
    {
      answer:
        "Mention `@vercel` with the request in a pull request comment. Vercel’s docs give `@vercel fix the type errors` as an example that implements and commits a fix, and `@vercel why is this failing?` to investigate.",
      question: "Can Vercel Agent fix lint errors on a pull request?",
    },
    {
      answer:
        "Pro and Enterprise, in public beta. Code Review bills by tokens: the AI provider’s rate with no markup, plus $0.25 per million tokens.",
      question: "Which Vercel plans include Vercel Agent?",
    },
  ],
  headline: "Vercel Agent reviews PRs against AGENTS.md",
  highlights: [
    {
      body: "Mention `@vercel` in any pull request comment: `@vercel run a review` runs a full review, `@vercel fix the type errors` implements and commits a fix, and `@vercel why is this failing?` investigates. Replies land in the same thread.",
      title: "@vercel in pull request comments",
    },
    {
      body: "For a linked repository, Vercel Agent can read CI check results and save a check-job log to inspect. When it opens a pull request of its own, it works on a `vercel-agent/` branch and only after you approve the plan.",
      title: "It reads your CI results",
    },
    {
      body: "If your tooling comes from a private registry, add `NPM_TOKEN` or `NPM_RC` as a Shared Environment Variable in Development or Preview so the sandbox can install dependencies. The credentials stay outside the sandbox.",
      title: "Private packages in the sandbox",
    },
  ],
  intro:
    "Vercel Agent’s Code Review reads `AGENTS.md` first among the guideline files it supports, so Ultracite’s rules become context for every pull request it reviews. It doesn’t edit as you work: it proposes fixes, runs each one in a Vercel Sandbox against your builds, tests and linters, and posts only the ones that pass.",
  loop: {
    body: "Code Review writes a patch for each fix it proposes, runs it in a Vercel Sandbox with your real builds, tests and linters, and only posts suggestions that pass. Vercel’s docs don’t say how it picks those commands, so `ultracite check` in CI stays the gate for every commit.",
    steps: [
      "A pull request is opened or gets new commits, or someone comments `@vercel run a review`.",
      "Code Review reads the change against the whole codebase, with `AGENTS.md` as guidelines.",
      "Each proposed fix runs in a Vercel Sandbox against your builds, tests and linters; only passing ones are posted.",
      "You apply a suggestion with one click, and your CI runs `ultracite check` on the new commit.",
    ],
    title: "Fixes tested in a sandbox before you see them",
  },
  metaDescription:
    "How Vercel Agent’s Code Review uses Ultracite’s AGENTS.md as guidelines and tests its fixes against your builds, tests and linters before posting.",
  metaTitle: "Ultracite for Vercel Agent — AGENTS.md in Code Review",
  related: ["copilot", "devin", "jules"],
  rules: {
    facts: [
      {
        label: "Size limit",
        value:
          "50 KB for all guidelines combined. Ultracite’s rules are about 5 KB.",
      },
      {
        label: "Context, not orders",
        value:
          "Guidelines are treated as context. Finding bugs, security issues and performance problems wins over any guideline that conflicts.",
      },
      {
        label: "What to write",
        value:
          "Vercel suggests guidelines cover what a linter can’t enforce. Ultracite’s rules end with a section on exactly that.",
      },
      {
        label: "One per directory",
        value:
          "With `AGENTS.md` and `CLAUDE.md` side by side, only `AGENTS.md` counts. A `CLAUDE.md` that just imports it loses nothing.",
      },
      {
        label: "Triggers",
        value:
          "New pull requests and new pushes to open ones, plus drafts if you turn that on. `@vercel run a review` starts one by hand.",
      },
      {
        label: "Repositories",
        value:
          "Reviews cover repositories connected to your Vercel projects: all of them by default, or only public or only private ones.",
      },
    ],
    lookup: [
      {
        note: "Highest priority. In a directory that has one, Code Review uses it and skips the other files.",
        path: "AGENTS.md",
      },
      {
        note: "Used in a directory with no `AGENTS.md`.",
        path: "CLAUDE.md",
      },
      {
        note: "Then Cursor (`.cursor/rules/*.mdc`, `.cursorrules`), Windsurf, Cline and other tools’ files, in that order.",
        path: ".github/copilot-instructions.md",
      },
      {
        note: "Adds to the parent directory’s guidelines for files in its subtree, and doesn’t affect anything outside it.",
        path: "src/**/AGENTS.md",
      },
      {
        note: "Guidelines can pull in other files with `@import` or relative Markdown links.",
        path: '@import "file.md"',
      },
    ],
    summary:
      "Code Review looks for guideline files in each directory and uses the highest-priority one there, with `AGENTS.md` at the top. Guidelines are inherited from parent directories and scoped to their own subtree.",
  },
  skills:
    "Vercel Agent’s docs don’t describe loading `SKILL.md` skills, so the Ultracite skill in `.agents/skills/` doesn’t come into it. Code Review gets the rules from `AGENTS.md` instead.",
  sources: [
    {
      title: "Vercel: Vercel Agent",
      url: "https://vercel.com/docs/agent",
    },
    {
      title: "Vercel: Code Review",
      url: "https://vercel.com/docs/agent/pr-review",
    },
    {
      title: "Vercel: Using Vercel Agent to review pull requests",
      url: "https://vercel.com/kb/guide/vercel-agent-code-review",
    },
    {
      title: "Vercel: Vercel Agent GitHub operations",
      url: "https://vercel.com/docs/agent/chat/github",
    },
    {
      title: "Vercel: Private dependencies",
      url: "https://vercel.com/docs/agent/private-dependencies",
    },
  ],
};
