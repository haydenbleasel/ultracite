import type { AgentPageContent } from "./types";

export const xum: AgentPageContent = {
  checked: { date: "2026-10-10", version: "0.31.0" },
  faqs: [
    {
      answer:
        "Either, but not both from one folder: at each location Xum loads the first of `AGENTS.md`, `AGENT.md` and `CLAUDE.md`. With Ultracite’s `AGENTS.md` in place, a `CLAUDE.md` beside it isn’t loaded.",
      question: "Does Xum read AGENTS.md or CLAUDE.md?",
    },
    {
      answer:
        "Yes, as an experiment: executable `.xum/tool_pre`, `.xum/tool_post` and `.xum/tool_env` files in the project or `~/.xum/`. `tool_post` runs after every tool, must finish within 10 seconds, and its output reaches the agent. Ultracite doesn’t configure them.",
      question: "Does Xum support hooks?",
    },
    {
      answer:
        "Yes. Xum reads `.mux/` when `.xum/` is missing, keeps `MUX_*` environment variables working, and still answers to the `mux` command.",
      question: "Xum used to be Mux. Does my setup still work?",
    },
    {
      answer:
        "Put them in `AGENTS.local.md` next to `AGENTS.md`, and keep it out of git. Xum appends it to the shared file from the same folder.",
      question: "How do I keep personal notes out of the shared rules?",
    },
    {
      answer:
        "Xum no longer parses `Model:` and `Mode:` sections in shared files like `AGENTS.md`; they reach the agent as ordinary markdown. Move them to `.xum/AGENTS.md` or `~/.xum/AGENTS.md`.",
      question: "Why don’t my Model: sections work in AGENTS.md?",
    },
  ],
  headline: "Xum reads AGENTS.md first, CLAUDE.md as backup",
  highlights: [
    {
      body: "A worktree workspace is a separate git worktree, so it starts without your gitignored files, `node_modules` included. An executable `.xum/init` runs once when each workspace is created, which makes it the place to install dependencies before the agent runs `ultracite`.",
      title: "Every workspace needs its own install",
    },
    {
      body: "Trust gates Xum’s repo-controlled automation: project hooks, workflows and `.mux` configuration. Grant it in Settings → Security or with `xum trust`, which records it for the main repository even when you run it from a workspace’s worktree.",
      title: "Hooks run only in trusted projects",
    },
    {
      body: "`xum run` executes one task and exits, in the current directory or, with `--runtime worktree`, in an isolated worktree. `--budget` is a hard spending limit in US dollars, which helps in CI.",
      title: "One-off tasks with xum run",
    },
  ],
  intro:
    "Xum picks up `AGENTS.md` at each workspace location, ahead of `AGENT.md` or `CLAUDE.md`, and layers `.xum/AGENTS.md` on top. Ultracite doesn’t configure Xum’s experimental tool hooks, so the agent runs `ultracite fix` with its `bash` tool when the rules tell it to.",
  loop: {
    body: "Xum runs `ultracite fix` when `AGENTS.md` tells it to. Its experimental `.xum/tool_post` hook runs after every tool in trusted projects, within 10 seconds, but Ultracite doesn’t configure it. A `Tool:` section is a documented way to put the reminder on the edit tool itself: Xum appends it to that tool’s description.",
    snippets: [
      {
        code: "## Tool: file_edit_replace_string\n\n- Run `npx ultracite fix` on the file after editing it",
        lang: "md",
        title: ".xum/AGENTS.md",
      },
    ],
    steps: [
      "The agent edits a file with `file_edit_replace_string` or `file_edit_insert`.",
      "`AGENTS.md`, and any `Tool:` section on that tool, tell it to run `npx ultracite fix`.",
      "It runs the command with `bash` in the workspace’s runtime: local, worktree, SSH or Docker.",
      "It reads the output and fixes what’s left before moving on.",
    ],
    title: "Put the reminder on the edit tool",
  },
  metaDescription:
    "Set up Ultracite for Xum, Coder’s app formerly called Mux: rules in AGENTS.md, a Tool: section on the edit tool, and setup for parallel workspaces.",
  metaTitle: "Ultracite for Xum — AGENTS.md across parallel workspaces",
  related: ["warp", "amp", "devin"],
  rules: {
    facts: [
      {
        label: "First match",
        value:
          "With an `AGENTS.md` in a folder, Xum skips that folder’s `AGENT.md` and `CLAUDE.md`.",
      },
      {
        label: "Local notes",
        value:
          "`AGENTS.local.md` is appended to the shared file in the same folder. Keep it gitignored for personal tweaks.",
      },
      {
        label: "Tool sections",
        value:
          "A `## Tool: <name>` section in any instructions file is appended to that tool’s description instead of the general instructions.",
      },
      {
        label: "Xum-only sections",
        value:
          "`Model:` and `Mode:` sections work only in `.xum/AGENTS.md`, `~/.xum/AGENTS.md` and agent definitions.",
      },
      {
        label: "Comments",
        value:
          "Xum strips HTML comments from instruction files before the model sees them.",
      },
      {
        label: "Legacy names",
        value:
          "`.mux/` still works as a read fallback for `.xum/`, and `mux` as an alias for the `xum` command.",
      },
    ],
    lookup: [
      {
        note: "Read only with the Claude compatibility experiment on, at the lowest precedence.",
        path: "~/.claude/CLAUDE.md",
      },
      {
        note: "Your global defaults, layered over the Claude file.",
        path: "~/.xum/AGENTS.md",
      },
      {
        note: "The workspace root’s shared file: the first of `AGENTS.md`, `AGENT.md` or `CLAUDE.md`, plus `AGENTS.local.md`.",
        path: "AGENTS.md",
      },
      {
        note: "Xum-only instructions, loaded alongside the shared file. The place for `Model:` and `Mode:` sections.",
        path: ".xum/AGENTS.md",
      },
      {
        note: "In multi-project workspaces, each sub-project and repo directory adds its own shared file and `.xum/AGENTS.md`.",
        path: "Sub-projects",
      },
    ],
    summary:
      "At each location, Xum loads the first of `AGENTS.md`, `AGENT.md` and `CLAUDE.md`, appends `AGENTS.local.md` from the same folder, and adds a Xum-only `.xum/AGENTS.md`. Locations layer from most general to most specific.",
  },
  skills:
    "Xum discovers skills in `.xum/skills/` and `.agents/skills/` from the working directory up to the checkout root, so it finds the Ultracite skill `init` installs in `.agents/skills/`. Run it with `/ultracite`.",
  sources: [
    {
      title: "Xum: Instruction files",
      url: "https://xum.cdr.dev/agents/instruction-files",
    },
    {
      title: "Xum: Tool hooks",
      url: "https://xum.cdr.dev/hooks/tools",
    },
    {
      title: "Xum: Init hooks",
      url: "https://xum.cdr.dev/hooks/init",
    },
    {
      title: "Xum: Agent skills",
      url: "https://xum.cdr.dev/agents/agent-skills",
    },
    {
      title: "Xum: CLI",
      url: "https://xum.cdr.dev/reference/cli",
    },
    {
      title: "Xum: Mux compatibility",
      url: "https://xum.cdr.dev/reference/mux-compatibility",
    },
  ],
};
