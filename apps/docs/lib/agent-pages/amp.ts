import type { AgentPageContent } from "./types";

export const amp: AgentPageContent = {
  checked: { date: "2026-10-10" },
  faqs: [
    {
      answer:
        "Yes. Amp always includes the `AGENTS.md` in your working directory and in each parent folder up to `$HOME`, and adds a subtree’s file when it reads a file there. `ultracite init --agents amp` writes Ultracite’s rules to the root one.",
      question: "Does Amp read AGENTS.md?",
    },
    {
      answer:
        "Only as a fallback. Amp reads `AGENT.md` or `CLAUDE.md` in a folder that has no `AGENTS.md`, so once `init` writes `AGENTS.md`, a `CLAUDE.md` beside it is skipped. Move what you need into `AGENTS.md`, or pull it in with an `@CLAUDE.md` mention.",
      question: "Does Amp read CLAUDE.md?",
    },
    {
      answer:
        "Amp has plugins instead: TypeScript or JavaScript files in `.amp/plugins/` that handle events such as `tool.call` and `tool.result`. A `tool.result` handler runs before the result goes back to the model and can replace it. Ultracite doesn’t ship an Amp plugin yet.",
      question: "Does Amp support hooks?",
    },
    {
      answer:
        "With a plugin. Amp doesn’t ask before running tools by default, and its docs point to a `tool.call` handler that returns `allow`, `reject-and-continue` or another action. Workspace admins can share one with every member as a workspace plugin.",
      question: "Can I make Amp ask before it runs commands?",
    },
  ],
  headline: "Amp runs your lint commands without asking",
  highlights: [
    {
      body: "Amp doesn’t ask before running tools, so `ultracite check` and `ultracite fix` run as soon as the rules call for them. If you want a gate, Amp’s docs point to a plugin that handles `tool.call`.",
      title: "No approval prompts by default",
    },
    {
      body: "Orbs are remote machines where Amp works a thread without your computer. Commit an executable `.agents/setup` that installs your dependencies so `npx ultracite` resolves there; Amp reuses the prepared snapshot for up to 72 hours, and editing the script doesn’t refresh it.",
      title: "Orbs need your dependencies",
    },
    {
      body: "Before reporting a pull request complete, Amp subscribes to its comments, reviews and checks, and new reviews continue the same thread. Run `ultracite check` in CI and a failure reaches Amp without you pasting it in.",
      title: "Pull requests stay subscribed",
    },
  ],
  intro:
    "Amp reads Ultracite’s rules from `AGENTS.md` in your working directory and every parent up to `$HOME`, so they’re in context from the first message. It doesn’t ask before running tools by default, so when the rules say to run `ultracite fix` after editing, it runs it and fixes what’s left.",
  loop: {
    body: "Ultracite doesn’t install an Amp plugin, so the loop is the one in `AGENTS.md`: edit, run `ultracite fix`, then fix what it reports. Amp plugins can handle `tool.result` and replace a result before the model sees it, but Ultracite doesn’t configure one yet.",
    steps: [
      "Amp edits a file in the thread.",
      "Following `AGENTS.md`, it runs `ultracite fix` in the shell, with no approval prompt by default.",
      "It reads what `ultracite fix` couldn’t settle and edits again.",
      "On a pull request, Amp subscribes to the checks before reporting it complete, so a failing `ultracite check` in CI comes back to the thread.",
    ],
    title: "Amp runs the checks the rules ask for",
  },
  metaDescription:
    "Set up Ultracite for Amp: rules in AGENTS.md from your folder up to $HOME, lint commands it runs without prompts, and dependencies ready in orbs.",
  metaTitle: "Ultracite for Amp — Lint rules in every thread and orb",
  related: ["codex", "droid", "pi"],
  rules: {
    facts: [
      {
        label: "Fallback",
        value:
          "`AGENT.md` or `CLAUDE.md`, read only in a folder with no `AGENTS.md`.",
      },
      {
        label: "Monorepos",
        value:
          "Parents count up to `$HOME`, so a repo root’s `AGENTS.md` still applies when you start Amp inside a package.",
      },
      {
        label: "Mentions",
        value:
          "`@path` pulls another file in, relative to the file that mentions it. Absolute paths, `@~/` and globs work; mentions in code blocks don’t.",
      },
      {
        label: "Scoped mentions",
        value:
          "A mentioned file with `globs` in its front matter loads only after Amp reads a matching file.",
      },
      {
        label: "Opt out",
        value:
          "`AMP_IGNORE_GUIDANCE_FILES` takes colon-separated globs of files to skip; `*` turns automatic loading off.",
      },
      {
        label: "Workspace",
        value:
          "Admins can set guidance for every member. It loads before personal and repository guidance and doesn’t reach subagents.",
      },
    ],
    lookup: [
      {
        note: "System-wide guidance, always included when present: `/etc/ampcode/AGENTS.md` on Linux, `/Library/Application Support/ampcode/AGENTS.md` on macOS.",
        path: "System AGENTS.md",
      },
      {
        note: "Your own guidance for every project; `~/.config/AGENTS.md` works too.",
        path: "~/.config/amp/AGENTS.md",
      },
      {
        note: "In the working directory and each parent up to `$HOME`, always included.",
        path: "AGENTS.md",
      },
      {
        note: "A subtree’s file, included when Amp reads a file in that subtree.",
        path: "src/**/AGENTS.md",
      },
    ],
    summary:
      "Amp includes several `AGENTS.md` files at once: system-wide, personal, and the project’s from your working directory up to `$HOME`. Files deeper in the tree join when Amp reads a file below them.",
  },
  skills:
    "Amp loads skills from `.agents/skills/` in the project and its parent folders, so it finds the Ultracite skill `init` installs there. It also reads `.claude/skills/`; run `amp skills list` to see what it found.",
  sources: [
    {
      title: "Amp: AGENTS.md",
      url: "https://ampcode.com/docs/customize/agents-md",
    },
    {
      title: "Amp: Plugins",
      url: "https://ampcode.com/docs/customize/plugins",
    },
    {
      title: "Amp: Skills",
      url: "https://ampcode.com/docs/customize/skills",
    },
    {
      title: "Amp: Tools",
      url: "https://ampcode.com/docs/tools",
    },
    {
      title: "Amp: Customizing orbs",
      url: "https://ampcode.com/docs/orbs/customizing",
    },
    {
      title: "Amp: GitHub & Git",
      url: "https://ampcode.com/docs/github",
    },
  ],
};
