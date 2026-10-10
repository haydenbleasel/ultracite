import type { AgentPageContent } from "./types";

export const deepagents: AgentPageContent = {
  checked: { date: "2026-10-10" },
  faqs: [
    {
      answer:
        "Deep Agents Code does: `dcode` appends `.deepagents/AGENTS.md` and the `AGENTS.md` at your git root to its instructions at startup. An agent you build with the SDK reads an `AGENTS.md` only when you pass its path to `memory=`.",
      question: "Does Deep Agents read AGENTS.md?",
    },
    {
      answer:
        "Yes. `hooks.json` in `~/.deepagents/`, or in a trusted project’s `.deepagents/`, takes Claude-style events, and a `PostToolUse` handler that exits 2 sends its stderr back as feedback. Ultracite doesn’t configure one yet.",
      question: "Does Deep Agents Code support hooks?",
    },
    {
      answer:
        "Non-interactive runs disable shell execution by default. Pass `-S` with the commands the agent may run, such as `-S npx`; keep `execute` available if you also restrict tools with `--allow-fs-tools`.",
      question: "Why can’t dcode run Ultracite in CI?",
    },
    {
      answer:
        "In `~/.deepagents/<agent>/AGENTS.md` and the `memories/` folder beside it. Project instruction files are read-only to `dcode`, and `dcode agents reset --agent <name>` resets an agent’s own instructions.",
      question: "Where does Deep Agents Code keep what it learns?",
    },
  ],
  headline: "Deep Agents Code picks up the root AGENTS.md",
  highlights: [
    {
      body: "`dcode -n` disables shell execution unless you pass `-S` with command names, `recommended` or `all`, so without it the agent can’t run `ultracite` at all. `--max-turns` and `--timeout` cap a run and exit with code 124 when the budget runs out.",
      title: "Headless runs start without a shell",
    },
    {
      body: "`/rubric set` gives every turn acceptance criteria that a grader model checks the work against, such as “`npx ultracite check` reports no problems”. Headless runs take the same criteria with `--rubric`.",
      title: "A rubric can make clean lint the bar",
    },
    {
      body: "If you build on the Deep Agents SDK, nothing reads `AGENTS.md` for you. Pass its path to `memory=` in `create_deep_agent`, and the backend you choose decides where that path resolves.",
      title: "SDK agents load only what you pass",
    },
  ],
  intro:
    "Deep Agents Code (`dcode`), LangChain’s terminal agent, appends the `AGENTS.md` at your git root to its instructions every session, so it starts with Ultracite’s rules. It runs `ultracite fix` when the rules tell it to, through its `execute` tool and your approval mode. Agents you build on the SDK load an `AGENTS.md` only when you pass it to `memory=`.",
  loop: {
    body: "Ultracite doesn’t configure hooks for Deep Agents, so `dcode` runs `ultracite fix` because `AGENTS.md` tells it to. `dcode` does have Claude-style hooks: a `PostToolUse` handler in `~/.deepagents/hooks.json`, or a trusted project’s `.deepagents/hooks.json`, can send feedback on exit 2.",
    snippets: [
      {
        code: 'dcode -n "Run npx ultracite fix, then fix what it reports" -S "npx" --max-turns 10',
        lang: "bash",
        title: "Headless run in CI",
      },
    ],
    steps: [
      "`dcode` changes a file with `write_file` or `edit_file`.",
      "Following `AGENTS.md`, it calls `execute` to run `npx ultracite fix`.",
      "Manual mode asks you first and Auto mode leaves it to an LLM classifier; in headless runs, `-S` decides which commands may run.",
      "The agent reads the output and fixes what’s left before it finishes.",
    ],
    title: "The rules run the linter, approvals gate it",
  },
  metaDescription:
    "Set up Ultracite for Deep Agents: dcode appends the root AGENTS.md every session, while SDK agents load it only when you pass it to memory=.",
  metaTitle: "Ultracite for Deep Agents — Rules for dcode and the SDK",
  related: ["open-hands", "pi", "codex"],
  rules: {
    facts: [
      {
        label: "Combined",
        value: "Every source is appended; none replaces another.",
      },
      {
        label: "Project root",
        value:
          "The folder with `.git`, so `dcode` finds the project files from anywhere inside the repository.",
      },
      {
        label: "Per agent",
        value:
          "`--agent backend-dev` reads `~/.deepagents/backend-dev/AGENTS.md`. The default agent is named `agent`.",
      },
      {
        label: "Extra files",
        value:
          "Other files in `.deepagents/` aren’t read at startup. The agent knows about them only when `AGENTS.md` references them.",
      },
      {
        label: "Profile",
        value:
          "`DEEPAGENTS_HOME` moves everything under `~/.deepagents`, per-agent `AGENTS.md` files included.",
      },
      {
        label: "SDK",
        value:
          "`create_deep_agent` loads only the paths you pass to `memory=`, read through its backend.",
      },
    ],
    lookup: [
      {
        note: "The base instructions shipped with `dcode`, always loaded.",
        path: "default_agent_prompt.md",
      },
      {
        note: "Your instructions for that agent, appended.",
        path: "~/.deepagents/<agent>/AGENTS.md",
      },
      {
        note: "The project file in `.deepagents/` at the git root, appended.",
        path: ".deepagents/AGENTS.md",
      },
      {
        note: "The `AGENTS.md` at the git root, appended too. Both project files load when present.",
        path: "AGENTS.md",
      },
    ],
    summary:
      "`dcode` combines its instruction sources instead of choosing one: the built-in prompt, your per-agent file, then the project’s `.deepagents/AGENTS.md` and root `AGENTS.md`.",
  },
  skills:
    "`dcode` loads skills from `.agents/skills/`, `.deepagents/skills/`, `~/.agents/skills/` and `~/.deepagents/<agent>/skills/`, with the project’s `.agents/skills/` taking precedence, so it finds the Ultracite skill `init` installs there. Run it with `/skill:ultracite`.",
  sources: [
    {
      title: "Deep Agents Code: Memory and skills",
      url: "https://docs.langchain.com/oss/deepagents/code/memory-and-skills",
    },
    {
      title: "Deep Agents Code: Configuration",
      url: "https://docs.langchain.com/oss/deepagents/code/configuration",
    },
    {
      title: "Deep Agents Code: Hooks",
      url: "https://docs.langchain.com/oss/deepagents/code/hooks",
    },
    {
      title: "Deep Agents Code: CLI reference",
      url: "https://docs.langchain.com/oss/deepagents/code/cli-reference",
    },
    {
      title: "Deep Agents Code: Goals and rubrics",
      url: "https://docs.langchain.com/oss/deepagents/code/goals-and-rubrics",
    },
    {
      title: "Deep Agents: Memory",
      url: "https://docs.langchain.com/oss/python/deepagents/memory",
    },
  ],
};
