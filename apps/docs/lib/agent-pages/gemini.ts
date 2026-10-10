import type { AgentPageContent } from "./types";

export const gemini: AgentPageContent = {
  checked: { date: "2026-10-10", version: "0.63.0" },
  faqs: [
    {
      answer:
        "Not by default: it reads `GEMINI.md`. Add `AGENTS.md` to `context.fileName` in `.gemini/settings.json`, which `ultracite init --agents gemini` does for you while keeping `GEMINI.md` in the list.",
      question: "Does Gemini CLI read AGENTS.md?",
    },
    {
      answer:
        "Google AI Pro, Ultra and Gemini Code Assist for individuals accounts lost access on June 18, 2026, and Login with Google no longer works for them; Google points them to Antigravity CLI. Gemini Code Assist Standard and Enterprise subscriptions are on a separate deprecation schedule.",
      question: "Can I still use Gemini CLI?",
    },
    {
      answer:
        "Check that `.gemini/settings.json` lists it under `context.fileName`, then run `/memory reload`. If folder trust is on and the folder isn’t trusted, Gemini CLI ignores the project’s settings file, so only `GEMINI.md` loads.",
      question: "Why isn’t Gemini CLI loading AGENTS.md?",
    },
    {
      answer:
        "Yes: `AfterTool` hooks in `.gemini/settings.json` run after a tool, filtered by a tool-name regex. Ultracite doesn’t configure one, so Gemini CLI lints by running the commands in `AGENTS.md`.",
      question: "Does Gemini CLI support hooks?",
    },
    {
      answer:
        'Add a policy file in `~/.gemini/policies/` with `toolName = "run_shell_command"`, `commandPrefix = "npx ultracite"` and `decision = "allow"`. Policy files in a project’s `.gemini/policies/` don’t take effect yet.',
      question: "How do I stop Gemini CLI asking before every lint?",
    },
  ],
  headline: "Gemini CLI reads AGENTS.md once you ask it to",
  highlights: [
    {
      body: "Since June 18, 2026, Gemini CLI doesn’t serve Google AI Pro, Ultra or Code Assist for individuals accounts, and Google points those users to Antigravity CLI. If that’s you, run `init --agents antigravity` instead. The project itself still ships releases.",
      title: "Consumer accounts moved on",
    },
    {
      body: "Gemini CLI runs `AfterTool` hooks from the `hooks` key in `.gemini/settings.json`, matched by a regex such as `write_file|replace`. It fingerprints project hooks, so a changed command counts as a new, untrusted hook and you’re warned before it runs. Ultracite doesn’t set one up for Gemini CLI.",
      title: "Hooks exist, unconfigured",
    },
    {
      body: "When a tool touches a file or folder, Gemini CLI loads the context files there and in its parents up to a trusted root. A package’s own `AGENTS.md` arrives when Gemini starts working in it.",
      title: "Context loads just in time",
    },
  ],
  intro:
    "Gemini CLI reads only `GEMINI.md` until `context.fileName` says otherwise, so `init` merges `GEMINI.md` and `AGENTS.md` into that list in `.gemini/settings.json` and both files load. There’s no Ultracite hook for it: Gemini runs `ultracite fix` and `ultracite check` through its shell tool because the rules say to, after you approve them or allow them in a policy.",
  loop: {
    body: "The rules give Gemini `ultracite fix` and `ultracite check`, which it runs with `run_shell_command`. Unless a policy rule allows a command, Gemini asks you first, and in a non-interactive run a rule that asks counts as a deny. A user policy that allows the `npx ultracite` prefix lets both run without a prompt.",
    snippets: [
      {
        code: '[[rule]]\ntoolName = "run_shell_command"\ncommandPrefix = "npx ultracite"\ndecision = "allow"\npriority = 100',
        lang: "toml",
        title: "~/.gemini/policies/ultracite.toml",
      },
    ],
    steps: [
      "Gemini edits a file with `write_file` or `replace`.",
      "Following `AGENTS.md`, it calls `run_shell_command` with `npx ultracite fix` or `npx ultracite check`.",
      "The policy engine allows the command, or asks you first if no rule covers it.",
      "Gemini reads the linter’s output from the tool result and fixes what’s left.",
    ],
    title: "Gemini CLI lints through its shell tool",
  },
  metaDescription:
    "Set up Ultracite for Gemini CLI: init adds AGENTS.md to context.fileName in .gemini/settings.json, and a policy lets Gemini run ultracite without asking.",
  metaTitle: "Ultracite for Gemini CLI — AGENTS.md via context.fileName",
  related: ["antigravity", "jules", "codex"],
  rules: {
    facts: [
      {
        label: "Default name",
        value:
          "`GEMINI.md`. Once `context.fileName` is set, the names in it are what Gemini reads, which is why `init` keeps `GEMINI.md` in the list.",
      },
      {
        label: "Trusted folders",
        value:
          "With folder trust on, an untrusted folder ignores `.gemini/settings.json`, so only `GEMINI.md` loads there. Folder trust is off by default.",
      },
      {
        label: "Combined",
        value:
          "Every context file found is concatenated and sent with each prompt. The footer shows how many loaded.",
      },
      {
        label: "Imports",
        value:
          "`@file.md` lines pull other Markdown files into a context file, by relative or absolute path.",
      },
      {
        label: "Check it",
        value: "`/memory show` prints the combined context Gemini sees.",
      },
      {
        label: "Reload",
        value:
          "`/memory reload` re-scans every context file after you edit one.",
      },
    ],
    lookup: [
      {
        note: "Its `context.fileName` decides which names count as context files. `init` sets it to `GEMINI.md` and `AGENTS.md`.",
        path: ".gemini/settings.json",
      },
      {
        note: "Your instructions for every project.",
        path: "~/.gemini/GEMINI.md",
      },
      {
        note: "Read in your workspace directories and their parents, beside `GEMINI.md`, once `context.fileName` lists it.",
        path: "AGENTS.md",
      },
      {
        note: "When a tool reads a file or directory, context files there and in its parents, up to a trusted root, load too.",
        path: "A folder a tool touches",
      },
    ],
    summary:
      "Gemini CLI gathers context files from your home directory, your workspace and its parents, and any folder a tool touches, then concatenates them. Every one of those searches uses the names in `context.fileName`, so listing `AGENTS.md` there is the whole setup.",
  },
  skills:
    "Gemini CLI loads workspace skills from `.gemini/skills/` or its `.agents/skills/` alias, and the alias wins when both hold a skill with the same name. `init` installs the Ultracite skill into `.agents/skills/`, so Gemini CLI finds it; `/skills list` shows it.",
  sources: [
    {
      title: "Gemini CLI: Provide context with GEMINI.md files",
      url: "https://geminicli.com/docs/cli/gemini-md",
    },
    {
      title: "Gemini CLI: Trusted Folders",
      url: "https://geminicli.com/docs/cli/trusted-folders",
    },
    {
      title: "Gemini CLI: Hooks",
      url: "https://geminicli.com/docs/hooks",
    },
    {
      title: "Gemini CLI: Policy engine",
      url: "https://geminicli.com/docs/reference/policy-engine",
    },
    {
      title: "Gemini CLI: Agent Skills",
      url: "https://geminicli.com/docs/cli/skills",
    },
    {
      title: "Google: Gemini Code Assist consumer accounts",
      url: "https://developers.google.com/gemini-code-assist/docs/deprecations/code-assist-individuals",
    },
  ],
};
