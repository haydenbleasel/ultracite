import type { AgentPageContent } from "./types";

export const openclaw: AgentPageContent = {
  checked: { date: "2026-10-10", version: "2026.9.9" },
  faqs: [
    {
      answer:
        "Yes, when a session runs in that folder: a working directory set with `cwd`, a session’s own working directory, or a managed worktree. OpenClaw appends that folder’s `AGENTS.md` after its workspace files as project context.",
      question: "Does OpenClaw read my project’s AGENTS.md?",
    },
    {
      answer:
        "It’s the agent’s own operating instructions, including how it should use memory, and it loads at the start of every session. Onboarding creates it. Keep one project’s lint rules in that project’s `AGENTS.md` instead.",
      question: "What is the AGENTS.md in ~/.openclaw/workspace?",
    },
    {
      answer:
        "Not in a way the agent sees. The plugin hook `after_tool_call` is observe-only: handlers run concurrently and their return values are ignored. Ultracite doesn’t configure OpenClaw hooks; the agent runs `ultracite fix` because the rules say to.",
      question: "Can an OpenClaw hook run Ultracite after each edit?",
    },
    {
      answer:
        "Set `cwd` on an agent entry in `~/.openclaw/openclaw.json`, as in the example above, or run the task in a managed worktree. A working directory separate from the workspace needs an unsandboxed run.",
      question: "How do I point OpenClaw at my repository?",
    },
    {
      answer:
        "Send `/context list` or `/context detail`. Both show each injected file with its raw and injected size, so you can see whether `AGENTS.md` loaded and whether it was truncated.",
      question: "How do I check OpenClaw loaded the rules?",
    },
  ],
  headline: "OpenClaw, working from your repo’s AGENTS.md",
  highlights: [
    {
      body: "The workspace `AGENTS.md` shapes how the agent behaves everywhere; your project’s `AGENTS.md` adds project context only when a session runs there. Ultracite’s rules belong in the project, which is where `init` writes them.",
      title: "Two AGENTS.md files, two jobs",
    },
    {
      body: "Each session runs in `read-only`, `guarded`, `workspace` or `full` mode. In `workspace`, an LLM reviewer allows, denies or escalates each exec; a denial goes back to the agent with a reason, and three in a row bring in a person.",
      title: "Permission modes decide who reviews exec",
    },
    {
      body: "On the native Codex harness, Codex reads the execution folder’s `AGENTS.md` through its own project-doc discovery, so OpenClaw doesn’t inject it again. When that folder isn’t the workspace, OpenClaw passes the workspace `AGENTS.md` as thread-level developer instructions, which Codex sub-agents inherit.",
      title: "Codex sessions load AGENTS.md natively",
    },
  ],
  intro:
    "OpenClaw’s own `AGENTS.md` lives in its workspace and holds the agent’s operating instructions. When a session runs in your project folder, OpenClaw appends that folder’s `AGENTS.md`, with Ultracite’s rules, as project context, and the agent runs `ultracite fix` through its `exec` tool when the rules tell it to.",
  loop: {
    body: "OpenClaw’s plugin hooks can watch tool calls, but `after_tool_call` is observe-only, so it can’t hand lint results back to the agent. Ultracite doesn’t set up hooks for OpenClaw; the rules in your project’s `AGENTS.md` tell the agent to run `ultracite fix` itself.",
    snippets: [
      {
        code: '{\n  agents: {\n    defaults: { workspace: "~/.openclaw/workspace" },\n    entries: { coder: { cwd: "~/path/to/app", sandbox: { mode: "off" } } },\n  },\n}',
        lang: "json5",
        title: "~/.openclaw/openclaw.json",
      },
    ],
    steps: [
      "The agent changes files in the project, for example with `apply_patch`.",
      "Following the project’s `AGENTS.md`, it runs `npx ultracite fix` with `exec` in that folder.",
      "The session’s permission mode decides what happens next: `full` runs it, `workspace` sends it to an LLM reviewer, `guarded` asks a person unless the allowlist covers it, and `read-only` denies it.",
      "The output comes back as the tool result, and the agent fixes what’s left before it replies.",
    ],
    title: "The agent runs Ultracite through exec",
  },
  metaDescription:
    "How OpenClaw loads a project’s AGENTS.md next to its own workspace files, how to point an agent at your repo, and how it runs Ultracite’s checks.",
  metaTitle: "Ultracite for OpenClaw — Project rules for a personal agent",
  related: ["goose", "pi", "deepagents"],
  rules: {
    facts: [
      {
        label: "Workspace",
        value:
          "`~/.openclaw/workspace` by default. `OPENCLAW_WORKSPACE_DIR` or `agents.defaults.workspace` moves it.",
      },
      {
        label: "Project folder",
        value:
          "A session’s own working directory, then `agents.entries.<id>.cwd`, then `agents.defaults.cwd`. A managed worktree pins one too.",
      },
      {
        label: "Size",
        value:
          "20,000 characters per file and 60,000 in total, set by `bootstrapMaxChars` and `bootstrapTotalMaxChars`. Longer files are truncated with a notice.",
      },
      {
        label: "From the project",
        value:
          "Only `AGENTS.md`. OpenClaw never loads `SOUL.md`, `IDENTITY.md`, `USER.md` or `MEMORY.md` from the execution folder.",
      },
      {
        label: "Sub-agents",
        value:
          "Sub-agent sessions inject `AGENTS.md` and filter out the other bootstrap files.",
      },
      {
        label: "Check it",
        value:
          "`/context list` shows each injected file with its raw and injected size.",
      },
    ],
    lookup: [
      {
        note: "The agent’s operating instructions, loaded every session. `openclaw onboard` or `openclaw setup` creates it.",
        path: "~/.openclaw/workspace/AGENTS.md",
      },
      {
        note: "Persona, identity and your preferences, from the same workspace.",
        path: "SOUL.md, IDENTITY.md, USER.md",
      },
      {
        note: "Curated long-term memory, when the workspace has one.",
        path: "MEMORY.md",
      },
      {
        note: "The execution folder’s file, appended after the workspace files as project context.",
        path: "your-project/AGENTS.md",
      },
    ],
    summary:
      "OpenClaw has two kinds of `AGENTS.md`: the workspace one, which shapes the agent itself, and the one in the folder a session runs in. Only `AGENTS.md` comes from that execution folder; persona and memory files always come from the workspace.",
  },
  skills:
    "OpenClaw loads skills from its workspace’s `skills/` and `.agents/skills/`, and when a session runs in another folder, from that folder’s `skills/` and `.agents/skills/` too. The Ultracite skill `init` installs in your project’s `.agents/skills/` reaches sessions that run there.",
  sources: [
    {
      title: "OpenClaw: Agent workspace",
      url: "https://docs.openclaw.ai/concepts/agent-workspace",
    },
    {
      title: "OpenClaw: System prompt",
      url: "https://docs.openclaw.ai/concepts/system-prompt",
    },
    {
      title: "OpenClaw: Agent workspace and bootstrap configuration",
      url: "https://docs.openclaw.ai/gateway/config-agents/workspace-and-bootstrap",
    },
    {
      title: "OpenClaw: Session permission modes",
      url: "https://docs.openclaw.ai/gateway/permission-modes",
    },
    {
      title: "OpenClaw: Plugin hook reference",
      url: "https://docs.openclaw.ai/plugins/hooks/reference",
    },
    {
      title: "OpenClaw: Skills",
      url: "https://docs.openclaw.ai/tools/skills",
    },
  ],
};
