import type { AgentPageContent } from "./types";

export const pi: AgentPageContent = {
  checked: { date: "2026-10-10", version: "1.1.0" },
  faqs: [
    {
      answer:
        "Yes. Pi loads `~/.pi/agent/AGENTS.md` and one context file from each folder between the filesystem root and where you start it, preferring `AGENTS.md` over `CLAUDE.md`.",
      question: "Does Pi read AGENTS.md?",
    },
    {
      answer:
        "Only in folders without an `AGENTS.md`. Pi takes one file per folder, so once `init` writes `AGENTS.md` beside your `CLAUDE.md`, Pi reads `AGENTS.md` there and skips the `CLAUDE.md`. Move anything Pi still needs into `AGENTS.md`.",
      question: "Does Pi still read my CLAUDE.md?",
    },
    {
      answer:
        "Not as config files. Pi’s extensions are TypeScript modules that subscribe to events with `pi.on()`, including `tool_result`, which can change what a tool returns to the model. Ultracite doesn’t provide one yet.",
      question: "Does Pi support hooks?",
    },
    {
      answer:
        '`pi --print "…"` runs the prompt and exits, and `--mode json` streams events as JSONL instead. Add `--approve` so trust-gated project resources, the Ultracite skill among them, load without a prompt.',
      question: "How do I run Pi with Ultracite in CI?",
    },
  ],
  headline: "Pi reads AGENTS.md in every folder above you",
  highlights: [
    {
      body: 'A project `.agents/skills` folder is trust-gated, so after `init` installs the skill, Pi asks whether to trust the project. Print, JSON and RPC modes can’t ask, so they skip it unless you pass `--approve` or set `defaultProjectTrust` to `"always"`.',
      title: "The Ultracite skill asks for trust",
    },
    {
      body: "An extension in `.pi/extensions/` or `~/.pi/agent/extensions/` can register a `tool_result` handler that changes what the model gets back from a tool. Handlers run in load order and see each other’s changes. Ultracite doesn’t provide one yet.",
      title: "Extensions see every tool result",
    },
    {
      body: "Pi runs tools with the permissions of the account that started it and has no built-in sandbox. Its docs recommend running it inside a container, VM or sandbox, and giving it only the files and credentials the task needs.",
      title: "No approvals, so isolate it",
    },
  ],
  intro:
    "Pi loads one context file from each folder between the filesystem root and where you start it, and `AGENTS.md` wins over `CLAUDE.md` in the same folder. Pi doesn’t ask before running tools, so when the rules tell it to run `ultracite fix` and `check`, it runs them.",
  loop: {
    body: "Pi has no built-in approval prompts and no hook files, so the commands in `AGENTS.md` run as soon as the model decides to run them. Extensions can change tool results with a `tool_result` handler, but Ultracite doesn’t ship one for Pi yet.",
    steps: [
      "Pi changes a file with its `edit` or `write` tool.",
      "Following `AGENTS.md`, the model runs `npx ultracite fix` or `npx ultracite check` with `bash`.",
      "Pi runs the command without an approval prompt.",
      "The model reads the output and fixes what’s left.",
    ],
    title: "No prompts and no hooks, just the rules",
  },
  metaDescription:
    "Set up Ultracite for Pi: one context file per folder from the filesystem root down, AGENTS.md ahead of CLAUDE.md, and tool calls that run without approvals.",
  metaTitle: "Ultracite for Pi — AGENTS.md from every folder above you",
  related: ["crush", "aider", "mistral-vibe"],
  rules: {
    facts: [
      {
        label: "One per folder",
        value:
          "Pi loads the first of `AGENTS.override.md`, `AGENTS.md`, `AGENTS.MD`, `CLAUDE.md` and `CLAUDE.MD` in each folder.",
      },
      {
        label: "Past the repo",
        value:
          "The walk doesn’t stop at the git root, so an `AGENTS.md` in a parent folder applies too.",
      },
      {
        label: "Not below",
        value:
          "Only the working folder and its parents count. Pi doesn’t load `AGENTS.md` files from subfolders.",
      },
      {
        label: "Trust",
        value:
          "Context files load whether or not you trust the project. Trust covers `.pi` settings, extensions and skills.",
      },
      {
        label: "Turn it off",
        value: "`--no-context-files` (`-nc`) skips discovery for one run.",
      },
      {
        label: "Reload",
        value:
          "Run `/reload` after editing instructions; Pi picks them up without a restart.",
      },
    ],
    lookup: [
      {
        note: "Your instructions for every project. `AGENTS.override.md` or `CLAUDE.md` there work too.",
        path: "~/.pi/agent/AGENTS.md",
      },
      {
        note: "In any folder, replaces that folder’s `AGENTS.md` or `CLAUDE.md`. Other folders still load.",
        path: "AGENTS.override.md",
      },
      {
        note: "One per folder from the filesystem root down to where you started, outermost first.",
        path: "AGENTS.md, root to working folder",
      },
      {
        note: "Used in a folder only when it has no `AGENTS.md`.",
        path: "CLAUDE.md",
      },
    ],
    summary:
      "Pi takes your global file from `~/.pi/agent`, then one context file from each folder between the filesystem root and your working folder. In each folder the first of `AGENTS.override.md`, `AGENTS.md` and `CLAUDE.md` wins.",
  },
  skills:
    "Pi loads skills from `.pi/skills/` and from `.agents/skills/` in the working folder and its parents up to the repo root, so it finds the Ultracite skill `init` installs once you grant project trust. Run `/skill:ultracite` to load it yourself.",
  sources: [
    {
      title: "Pi: Configuration",
      url: "https://pi.dev/docs/latest/configuration",
    },
    {
      title: "Pi: Run Pi safely",
      url: "https://pi.dev/docs/latest/security",
    },
    {
      title: "Pi: Skills",
      url: "https://pi.dev/docs/latest/skills",
    },
    {
      title: "Pi: Extensions",
      url: "https://pi.dev/docs/latest/extensions",
    },
    {
      title: "Pi: Command line",
      url: "https://pi.dev/docs/latest/cli",
    },
    {
      title: "Pi source: context file discovery",
      url: "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/resource-loader.ts",
    },
  ],
};
