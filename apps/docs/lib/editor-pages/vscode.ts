import type { EditorPageContent } from "./types";

export const vscode: EditorPageContent = {
  afterInit: [
    "If VS Code opened the folder in Restricted Mode, trust it from the banner. Until you do, extensions that haven’t opted in to Restricted Mode don’t run.",
    "If `init` asked you to, install `oxc.oxc-vscode` from the Extensions view, or the extension for the toolchain you picked.",
    "Save a file with `Cmd+S` or `Ctrl+S`: Oxfmt formats it and Oxlint’s safe fixes apply.",
  ],
  agent: {
    body: "VS Code runs Copilot two ways, as Copilot sessions on the Agent Host or as the Local agent in the extension host, and both read `AGENTS.md` alongside your other instruction files. The Local agent saves its edits without running format on save, so the fixes wait until you choose Keep, or run after each edit with the hook `init --hooks copilot` writes.",
    lookup: [
      {
        note: "Your instructions for every project, in Copilot sessions. The Local agent keeps user instructions in your VS Code profile instead.",
        path: "~/.copilot/copilot-instructions.md",
      },
      {
        note: "Project-wide instructions for both. The Local agent reads it while `github.copilot.chat.codeGeneration.useInstructionFiles` is on.",
        path: ".github/copilot-instructions.md",
      },
      {
        note: "Attached when the `applyTo` glob matches a file the agent creates or modifies, or loaded when the `description` fits the task. The Local agent also reads `.claude/rules`.",
        path: ".github/instructions/**/*.instructions.md",
      },
      {
        note: "Where `init` writes Ultracite’s rules. Read by Copilot sessions, and by the Local agent while `chat.useAgentsMdFile` is on. Files in subfolders also need `chat.useNestedAgentsMdFiles`, which is off by default.",
        path: "AGENTS.md",
      },
      {
        note: "Also read by the Local agent while `chat.useClaudeMdFile` is on. Every file that applies is added; none replaces another.",
        path: "CLAUDE.md, .claude/CLAUDE.md",
      },
    ],
    steps: [
      "Copilot edits a file. The Local agent saves it with format on save and code actions skipped, and marks the edit as pending.",
      "With `init --hooks copilot`, `.github/hooks/ultracite.json` runs `ultracite fix --hook` on that file. Copilot sessions run it as the Copilot CLI does; the Local agent maps its format onto its own.",
      "The agent can read what’s left with `#read/problems`, which returns the Problems panel’s diagnostics from the Oxc, Biome or ESLint extension.",
      "When you choose Keep, VS Code saves the file again as an explicit save, so `editor.formatOnSave` and `editor.codeActionsOnSave` run on the agent’s code.",
    ],
    title: "Two Copilot harnesses, one AGENTS.md",
  },
  checked: {
    date: "2026-10-10",
    version: "1.141.0",
  },
  faqs: [
    {
      answer:
        "Usually the extension isn’t running. Check that `oxc.oxc-vscode`, or your toolchain’s extension, is installed in the profile this folder uses, and that the folder is trusted: Restricted Mode disables extensions that haven’t opted in.",
      question: "Why doesn’t VS Code format on save after ultracite init?",
    },
    {
      answer:
        'Not with the settings `init` writes. Fixes set to `"explicit"` run only when you save yourself. Set one to `"always"` to also run it on auto saves from focus or window changes; auto save after a delay still won’t trigger it.',
      question: "Does auto save apply Oxlint fixes in VS Code?",
    },
    {
      answer:
        "Yes, in Copilot sessions and in the Local agent, where `chat.useAgentsMdFile` turns it on or off. VS Code adds it to `.github/copilot-instructions.md` and any matching `.instructions.md` files rather than choosing one.",
      question: "Does GitHub Copilot in VS Code read AGENTS.md?",
    },
    {
      answer:
        "Yes. The `#read/problems` tool gets diagnostics from the Problems panel, which is where the Oxc, Biome and ESLint extensions report them. Reference it in a prompt, or add `init --hooks copilot` so each edited file is fixed as Copilot goes.",
      question: "Can Copilot see Oxlint errors in VS Code?",
    },
    {
      answer:
        "`init` installs it only when it creates `.vscode/settings.json`, and only if `code` is on your `PATH`. On macOS, run “Shell Command: Install ‘code’ command in PATH” from the Command Palette, then `code --install-extension oxc.oxc-vscode`.",
      question: "Why didn’t init install the VS Code extension?",
    },
    {
      answer:
        "The Local agent saves its edits without running format on save or code actions. Choosing Keep saves the file again and runs them, and `npx ultracite init --hooks copilot` adds a hook that runs `ultracite fix` after each edit instead.",
      question: "Why isn’t Copilot’s code formatted in VS Code?",
    },
  ],
  headline: "VS Code, with fixes on every save you make",
  highlights: [
    {
      body: "Restricted Mode turns agents off for that workspace, and trust is shared with the Agents window, so an untrusted folder runs no agent in either. Hook files in `.github/hooks` are subject to Workspace Trust too.",
      title: "Agents need a trusted folder",
    },
    {
      body: "The Local agent reads hooks from `.claude/settings.json` only when `chat.useClaudeHooks` is on, which it isn’t by default, and then ignores their matchers. `init --hooks copilot` writes a `.github/hooks` file it reads without a setting.",
      title: "Claude Code hooks are opt-in",
    },
    {
      body: "Expand References under a Copilot response to see which instruction files went into the request, or run “Chat: Open Customizations” to see what the selected harness discovered, `AGENTS.md` included.",
      title: "Check which rules loaded",
    },
  ],
  intro:
    "`ultracite init --editors vscode` writes `.vscode/settings.json`, so VS Code formats with your toolchain’s extension and applies its fixes when you save, and installs that extension with `code --install-extension`. GitHub Copilot reads Ultracite’s rules from `AGENTS.md`, and `init --hooks copilot` adds a hook that fixes each file it edits.",
  metaDescription:
    "Ultracite writes .vscode/settings.json so VS Code formats and fixes on save with Oxlint, Biome or ESLint, and GitHub Copilot follows AGENTS.md.",
  metaTitle: "Ultracite for VS Code — fixes on save and after Copilot edits",
  related: ["cursor", "devin", "zed"],
  setup: {
    facts: [
      {
        label: "Extensions",
        value:
          "From the Visual Studio Marketplace. `init` installs them with `code --install-extension`, the same command you can run by hand.",
      },
      {
        label: "The code command",
        value:
          "Windows and Linux installs put `code` on your `PATH`. On macOS, run “Shell Command: Install ‘code’ command in PATH” first, or `init` can’t install the extension.",
      },
      {
        label: "Profiles",
        value:
          "`code --install-extension` targets a specific profile only when you pass `--profile <name>`, and `init` doesn’t. If this folder uses another profile, install the extension in that profile.",
      },
      {
        label: "Restricted Mode",
        value:
          "VS Code opens an unfamiliar folder in Restricted Mode, which disables extensions that haven’t opted in, limits others and skips some workspace settings. Trust the folder from the banner.",
      },
      {
        label: "Explicit saves",
        value:
          '`init` sets each fix to `"explicit"`, so it runs when you save with `Cmd+S` or `Ctrl+S`, not on auto save.',
      },
      {
        label: "Auto save",
        value:
          'Change a fix to `"always"` to also run it on auto saves from focus or window changes. Auto save after a delay doesn’t trigger it either way.',
      },
    ],
    summary:
      "VS Code formats and fixes through your toolchain’s extension, so a save does both only when that extension runs in the profile you’re using, the folder is trusted, and you saved the file yourself.",
    title: "What decides whether a save formats",
  },
  sources: [
    {
      title: "VS Code docs: Code Actions on save",
      url: "https://code.visualstudio.com/docs/editing/refactoring#_code-actions-on-save",
    },
    {
      title: "VS Code docs: Workspace Trust",
      url: "https://code.visualstudio.com/docs/editing/workspaces/workspace-trust",
    },
    {
      title: "VS Code docs: Command line interface",
      url: "https://code.visualstudio.com/docs/configure/command-line",
    },
    {
      title: "VS Code docs: Use custom instructions",
      url: "https://code.visualstudio.com/docs/agent-customization/custom-instructions",
    },
    {
      title: "VS Code docs: Configure agent hooks",
      url: "https://code.visualstudio.com/docs/agent-customization/hooks",
    },
    {
      title: "VS Code docs: Tools and context reference",
      url: "https://code.visualstudio.com/docs/agents/reference/tools-reference",
    },
    {
      title: "VS Code source: how agent edits are saved (1.141.0)",
      url: "https://github.com/microsoft/vscode/blob/1.141.0/src/vs/workbench/contrib/chat/browser/chatEditing/chatEditingModifiedDocumentEntry.ts",
    },
  ],
};
