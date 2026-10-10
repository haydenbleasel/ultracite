import type { EditorPageContent } from "./types";

export const voidEditor: EditorPageContent = {
  afterInit: [
    "If `init` asked you to, install `oxc.oxc-vscode` from Void’s Extensions view, which searches the Visual Studio Marketplace.",
    "Copy the rules you want Void’s agent to follow from `AGENTS.md` into a `.voidrules` file at the project root.",
    "Save a file: Oxfmt formats it and Oxlint’s safe fixes apply.",
  ],
  agent: {
    body: "Void’s agent reads the AI Instructions in its settings and a `.voidrules` file at the root of each workspace folder, and no other instruction file, so Ultracite’s `AGENTS.md` doesn’t reach it. After each edit it reads that file’s errors and warnings from the editor, which is where the Oxc, Biome or ESLint extension reports them.",
    lookup: [
      {
        note: "Instructions you type into Void’s settings. They go into the agent’s system message ahead of `.voidrules`.",
        path: "AI Instructions, in Void’s settings",
      },
      {
        note: "Read from the root of each workspace folder and added to the system message as guidelines.",
        path: ".voidrules",
      },
      {
        note: "Not read. Void loads no other instruction file, so copy the rules you want from `AGENTS.md` into `.voidrules`.",
        path: "AGENTS.md",
      },
    ],
    steps: [
      "In Agent mode, Void’s agent changes a file with its `edit_file` or `rewrite_file` tool.",
      "Void saves the file with save participants skipped, so format on save and `editor.codeActionsOnSave` don’t run on the agent’s code.",
      "Two seconds later, Void reads the file’s errors and warnings from the editor, up to 100, and adds them to the tool result while “Fix lint errors” is on, as it is by default.",
      "No hook runs: Void has none, so the file is only formatted and fixed when you save it yourself or run `npx ultracite fix`.",
    ],
    title: "Void’s agent reads .voidrules and lint errors",
  },
  checked: {
    date: "2026-10-10",
    version: "1.4.9",
  },
  faqs: [
    {
      answer:
        "No. Void’s README says it’s deprecated and no longer accepting contributions, and its GitHub repository is archived. The last release, Void 1.4.9 (build 1.99.30044), shipped on June 23, 2025.",
      question: "Is Void still maintained?",
    },
    {
      answer:
        "No. Void’s agent reads only the AI Instructions in its settings and a `.voidrules` file at the root of each workspace folder. Copy the rules you want from `AGENTS.md` into `.voidrules`.",
      question: "Does Void read AGENTS.md?",
    },
    {
      answer:
        "Yes. Two seconds after each edit, Void adds the file’s errors and warnings to the tool result while “Fix lint errors” is on (the default), and the agent can call `read_lint_errors` on any file. Both read what the Oxc extension reports in the editor.",
      question: "Can Void’s agent see Oxlint errors?",
    },
    {
      answer:
        "Only up to its 11.x releases. Prettier’s 12.x extension needs VS Code 1.101 or later, and Void is built on VS Code 1.99.3. The current Oxc, Biome and ESLint extensions all support it.",
      question: "Does the Prettier extension work in Void?",
    },
    {
      answer:
        "`init` runs `void --install-extension` only when it creates `.vscode/settings.json`, and only if `void` is on your `PATH`. On macOS, add it with “Shell Command: Install ‘void’ command in PATH”, or install the extension from Void’s Extensions view.",
      question: "Why didn’t init install the Oxc extension in Void?",
    },
    {
      answer:
        "Not through `init`’s setting. Void is built on VS Code 1.99.3, which reads `typescript.tsdk`, not the `js/ts.tsdk.path` key `init` writes. Set `typescript.tsdk` to point Void at the workspace TypeScript.",
      question: "Does Void use my project’s TypeScript version?",
    },
  ],
  headline: "Void, deprecated and frozen on VS Code 1.99",
  highlights: [
    {
      body: "Gather mode gives the model only Void’s read-only tools, `read_lint_errors` among them, so it can walk you through what your linter reported without changing a file.",
      title: "Gather mode reads, never edits",
    },
    {
      body: "Void asks before its agent edits a file or runs a terminal command unless you turn on “Auto-approve edits” or “Auto-approve terminal” in its settings. Running `npx ultracite fix` from the agent needs that approval too.",
      title: "Edits and commands wait for you",
    },
    {
      body: "When you accept the agent’s diff, by hand or with “Auto-accept LLM changes”, Void saves the file again with save participants skipped. Format on save runs the next time you save the file yourself.",
      title: "Accepting a diff doesn’t format",
    },
  ],
  intro:
    "Void is deprecated: its repository is archived, and its last release shipped in June 2025 on VS Code 1.99.3. If you still use it, `ultracite init --editors void` writes `.vscode/settings.json` and installs the extension with `void --install-extension`. Void’s agent sees the lint errors in each file it edits, but it reads `.voidrules`, not `AGENTS.md`.",
  metaDescription:
    "Void is deprecated. If you still use it, Ultracite writes .vscode/settings.json for format on save; Void’s agent sees lint errors but not AGENTS.md.",
  metaTitle: "Ultracite for Void — setup for a deprecated VS Code fork",
  related: ["vscode", "cursor", "zed"],
  setup: {
    facts: [
      {
        label: "Status",
        value:
          "Deprecated. Void’s GitHub repository is archived, and its last release, Void 1.4.9 (build 1.99.30044), shipped on June 23, 2025.",
      },
      {
        label: "Extensions",
        value:
          "From the Visual Studio Marketplace, which Void’s `product.json` sets as its extension gallery, not Open VSX.",
      },
      {
        label: "Launcher",
        value:
          "`void`, which takes `--install-extension` like VS Code’s `code`. On macOS, run “Shell Command: Install ‘void’ command in PATH” to add it.",
      },
      {
        label: "Extension versions",
        value:
          "The current Oxc, Biome and ESLint extensions support VS Code 1.99. Prettier’s 12.x releases need VS Code 1.101, so Void runs Prettier’s extension only up to 11.x.",
      },
      {
        label: "TypeScript",
        value:
          "VS Code 1.99 reads `typescript.tsdk`, not the `js/ts.tsdk.path` key `init` writes, so Void ignores that setting.",
      },
      {
        label: "Explicit saves",
        value:
          'The fixes `init` sets to `"explicit"` run when you save a file yourself, not on auto save, as in VS Code.',
      },
    ],
    summary:
      "Void is a VS Code fork that stopped at VS Code 1.99.3, so it reads `.vscode/settings.json` and installs extensions the way VS Code did then, from the Visual Studio Marketplace.",
    title: "What Void inherits from VS Code 1.99",
  },
  sources: [
    {
      title: "Void README: Void is now deprecated",
      url: "https://github.com/voideditor/void",
    },
    {
      title: "Void 1.99.30044, the final release",
      url: "https://github.com/voideditor/binaries/releases/tag/1.99.30044",
    },
    {
      title: "Void source: product.json",
      url: "https://github.com/voideditor/void/blob/main/product.json",
    },
    {
      title: "Void source: agent, tools and .voidrules",
      url: "https://github.com/voideditor/void/tree/main/src/vs/workbench/contrib/void",
    },
    {
      title: "Void source: TypeScript settings in VS Code 1.99.3",
      url: "https://github.com/voideditor/void/blob/main/extensions/typescript-language-features/package.json",
    },
    {
      title: "Prettier extension on the Visual Studio Marketplace",
      url: "https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode",
    },
    {
      title: "VS Code docs: Code Actions on save",
      url: "https://code.visualstudio.com/docs/editing/refactoring#_code-actions-on-save",
    },
  ],
};
