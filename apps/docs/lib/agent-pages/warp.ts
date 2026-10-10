import type { AgentPageContent } from "./types";

export const warp: AgentPageContent = {
  checked: { date: "2026-10-10", version: "0.2026.10.07.08.29" },
  faqs: [
    {
      answer:
        "Yes, as a project rule. Warp applies the `AGENTS.md` at the repository root and in your current directory automatically, and `ultracite init --agents warp` writes Ultracite’s rules to the root file.",
      question: "Does Warp read AGENTS.md?",
    },
    {
      answer:
        "Look for a `WARP.md` in the same folder. Warp keeps one rules file per directory and prefers `WARP.md`, so move its contents into `AGENTS.md` and delete it. Also check the name is all caps: Warp ignores `agents.md` and `Agents.md`.",
      question: "Why isn’t Warp following my AGENTS.md?",
    },
    {
      answer:
        "Not on its own. `/init` can link an existing `CLAUDE.md`, `.cursorrules`, `GEMINI.md` and a few other tools’ files to `AGENTS.md`. Ultracite writes `AGENTS.md` directly, so its rules don’t need a link.",
      question: "Does Warp read CLAUDE.md?",
    },
    {
      answer:
        "Not for its own agent: Warp’s agent docs describe no post-edit hook. Ultracite’s loop runs through the commands in `AGENTS.md`, and your command allowlist decides whether they need a click.",
      question: "Does Warp support hooks?",
    },
    {
      answer:
        "In Warp Drive under Personal, Rules, Global, or in a file at `~/.agents/AGENTS.md`, which applies to every project. A project’s rules files win over them when they conflict.",
      question: "Where do Warp’s global rules go?",
    },
  ],
  headline: "Warp’s agent reads AGENTS.md, unless WARP.md wins",
  highlights: [
    {
      body: "Add a regular expression such as `npx ultracite (check|fix)(\\s.*)?` under Settings, Agents, Profiles, Command allowlist; allowlisted commands always run without asking. The denylist overrides it, and Run until completion bypasses the denylist unless you turn that off.",
      title: "An allowlist entry for Ultracite",
    },
    {
      body: "The Code Review panel shows uncommitted changes, the agent’s included. Leave an inline comment on a line and the agent can act on it in real time, or revert a single hunk yourself.",
      title: "Review comments the agent acts on",
    },
    {
      body: "The Warp Agent CLI picks up the same `AGENTS.md`, `WARP.md` and skills as the app, and re-scopes them when you `cd`, so Ultracite’s rules follow you between the two.",
      title: "One set of rules for app and CLI",
    },
  ],
  intro:
    "Warp’s agent reads Ultracite’s rules from `AGENTS.md` as a project rule, in the Warp app and the Warp Agent CLI alike. Warp has no post-edit hook, so the loop is the one the rules describe: after editing, the agent runs `ultracite fix` and fixes what’s left. An entry in your profile’s command allowlist lets that run without a prompt.",
  loop: {
    body: "Warp’s agent has no post-edit hook, so Ultracite’s loop lives in `AGENTS.md`: after editing, run `ultracite fix`, then fix what it reports. Commands go through your Agent Profile’s permissions, where an allowlist entry lets `ultracite` run without asking.",
    steps: [
      "The agent applies a code diff to your file.",
      "Following `AGENTS.md`, it calls for `npx ultracite fix`.",
      "If the command matches your allowlist, it runs at once; otherwise your Execute commands setting decides whether Warp asks.",
      "The agent reads the output and fixes what’s left.",
    ],
    title: "Warp’s agent runs what the rules ask for",
  },
  metaDescription:
    "Set up Ultracite for Warp: rules in AGENTS.md as a project rule, why a WARP.md in the same folder hides them, and a command allowlist entry for ultracite.",
  metaTitle: "Ultracite for Warp — Project rules, allowlists and WARP.md",
  related: ["cursor-cli", "amp", "droid"],
  rules: {
    facts: [
      {
        label: "Precedence",
        value:
          "The current directory’s rules file, then the root’s, then Global Rules.",
      },
      {
        label: "Same folder",
        value:
          "Warp keeps one rules file per directory and prefers `WARP.md`, so an `AGENTS.md` beside it is skipped.",
      },
      {
        label: "File name",
        value: "All caps only: `AGENTS.md`, not `agents.md` or `Agents.md`.",
      },
      {
        label: "Linking",
        value:
          "`/init` can link `CLAUDE.md`, `AGENT.md`, `GEMINI.md`, `.cursorrules`, `.clinerules`, `.windsurfrules` or `.github/copilot-instructions.md` to `AGENTS.md`.",
      },
      {
        label: "Check it",
        value:
          "Rules the agent used appear under References in the conversation.",
      },
      {
        label: "Open them",
        value:
          "`/open-project-rules` opens the project’s rules in Warp’s editor.",
      },
    ],
    lookup: [
      {
        note: "A global rule file that applies to every project, alongside the Global Rules you keep in Warp Drive.",
        path: "~/.agents/AGENTS.md",
      },
      {
        note: "The repository root’s file, applied whenever you work inside the repository.",
        path: "AGENTS.md",
      },
      {
        note: "Still supported. In a folder that has both, Warp uses `WARP.md` and skips that folder’s `AGENTS.md`.",
        path: "WARP.md",
      },
      {
        note: "Your current directory’s file, applied automatically and ahead of the root’s on conflicts.",
        path: "ui/AGENTS.md",
      },
      {
        note: "Another subdirectory’s file, added on a best-effort basis when the agent edits files there.",
        path: "api/AGENTS.md",
      },
    ],
    summary:
      "Warp treats `AGENTS.md` as a project rule. It applies the root file and the one in your current directory automatically, and tries to add a subdirectory’s file when the agent edits there.",
  },
  skills:
    "Warp loads skills from `.agents/skills/` (its recommended project folder) and several others, from your current directory up to the repository root, so it finds the Ultracite skill `init` installs. Run `/skills` in the Warp Agent CLI to browse them.",
  sources: [
    {
      title: "Warp: Rules for agents",
      url: "https://docs.warp.dev/agents/capabilities/rules/",
    },
    {
      title: "Warp: Profiles & Permissions",
      url: "https://docs.warp.dev/agents/capabilities/agent-profiles-permissions/",
    },
    {
      title: "Warp: Skills for agents",
      url: "https://docs.warp.dev/agents/capabilities/skills/",
    },
    {
      title: "Warp: Customizing the Warp Agent CLI",
      url: "https://docs.warp.dev/agents/cli/configuration/",
    },
    {
      title: "Warp: Code Review panel",
      url: "https://docs.warp.dev/code/code-review/",
    },
    {
      title: "Warp source: project rules model",
      url: "https://github.com/warpdotdev/warp/blob/master/crates/ai/src/project_context/model.rs",
    },
  ],
};
