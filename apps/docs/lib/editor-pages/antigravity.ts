import type { EditorPageContent } from "./types";

export const antigravity: EditorPageContent = {
  afterInit: [
    "Install `oxc.oxc-vscode` from the Extensions view, or `biomejs.biome` if you picked Biome. Antigravity IDE searches Open VSX.",
    "Save a TypeScript file: Oxfmt formats it and Oxlint’s safe fixes apply.",
  ],
  agent: {
    body: "Antigravity IDE’s agent combines every rule file it finds instead of picking one, and loads the `AGENTS.md` in each folder between a file it touches and the workspace root. Its edit tools take a `TargetLintErrorIds` argument, so an edit can target specific errors your linter reports.",
    lookup: [
      {
        note: "Global rules for every project: no frontmatter, always on. Modular global rules go in `~/.gemini/config/rules/`.",
        path: "~/.gemini/AGENTS.md, ~/.gemini/GEMINI.md",
      },
      {
        note: "At the workspace root, where `init` writes Ultracite’s rules. Always on for its folder; a `GEMINI.md` beside it loads too.",
        path: "AGENTS.md",
      },
      {
        note: "Modular rules. Each needs a `trigger` in its frontmatter (`always_on`, `model_decision`, `glob` or `manual`), or Antigravity drops it silently.",
        path: ".agents/rules/*.md",
      },
      {
        note: "Loaded when the agent reads or edits a file below that folder. The more specific folder wins when rules conflict.",
        path: "src/**/AGENTS.md",
      },
      {
        note: "Workspace skills, where `init` installs the Ultracite skill. The agent sees each skill’s name and description and reads the rest when it’s relevant.",
        path: ".agents/skills/",
      },
    ],
    steps: [
      "The agent edits a file with `write_to_file`, `replace_file_content` or `multi_replace_file_content`.",
      "Your Oxc, Biome or ESLint extension lints the change in the editor, as it does for your own edits.",
      "The agent can fix them in place, aiming at specific ones with `TargetLintErrorIds`, or run `npx ultracite check` through `run_command`.",
      "No Ultracite hook runs. `.agents/hooks.json` supports `PostToolUse`, but its documented output is an empty object, so a hook can’t send results back.",
    ],
    title: "Rules folder by folder, lint errors by ID",
  },
  checked: {
    date: "2026-10-10",
    version: "2.5.5",
  },
  faqs: [
    {
      answer:
        "Yes. `npx ultracite init --editors antigravity` writes `.vscode/settings.json` for Oxlint and Oxfmt, Biome, or ESLint and Prettier. Install the matching extension from the Extensions view, which searches Open VSX.",
      question: "Does Ultracite work with Antigravity IDE?",
    },
    {
      answer:
        "No. Since May 2026, Antigravity 2.0 is a standalone app for running agents that works independently of an IDE, and Antigravity IDE is the editor, installed separately. Ultracite’s `antigravity` editor setup is for the IDE.",
      question: "Is Antigravity IDE the same as Antigravity 2.0?",
    },
    {
      answer:
        "Yes, alongside `GEMINI.md`, since 1.20.5. It loads `AGENTS.md` at the workspace root and in each folder between a file the agent touches and the root, plus `~/.gemini/AGENTS.md` for every project.",
      question: "Does Antigravity IDE read AGENTS.md?",
    },
    {
      answer:
        "`init` doesn’t install extensions for Antigravity IDE; it tells you which one to add. Install `biomejs.biome` from the Extensions view: Antigravity searches Open VSX, where Biome publishes it.",
      question: "Why didn’t the Biome extension install in Antigravity?",
    },
    {
      answer:
        "Its edit tools take a `TargetLintErrorIds` argument for fixing specific lint errors, so it can work through the ones your Oxc extension reports. For a full report, it can run `npx ultracite check` in the terminal.",
      question: "Does Antigravity’s agent see Oxlint errors?",
    },
    {
      answer:
        "From `.agents/skills/` in the workspace, where `init` installs the Ultracite skill, and from `~/.gemini/config/skills/` for every project. The older `~/.gemini/antigravity/skills/` still works.",
      question: "Where does Antigravity IDE load skills from?",
    },
  ],
  headline: "Antigravity IDE, with AGENTS.md in every folder",
  highlights: [
    {
      body: "In May 2026 the original Antigravity split in two. Antigravity 2.0 became a standalone app for running agents, replacing the Agent Manager, and Antigravity IDE kept the editor. 2.0 has an Open IDE button that opens the current project in the IDE; `--editors antigravity` configures the IDE.",
      title: "Antigravity 2.0 is a different app",
    },
    {
      body: "Workspace rules, `.agents/skills/` and `.agents/hooks.json` work the same in the IDE, Antigravity 2.0 and Antigravity CLI. Global skills don’t: the IDE reads `~/.gemini/config/skills/`, while the CLI reads `~/.gemini/antigravity-cli/skills/`. Keep the Ultracite skill in the workspace.",
      title: "Global skills live in different places",
    },
    {
      body: "Antigravity cuts any rule file past 24,000 bytes, and global and `always_on` rules, `AGENTS.md` included, share a 20,000-token budget. Past it, the largest files become pointers the agent reads on demand. Ultracite’s rules are about 5 KB.",
      title: "Rules have a size budget",
    },
  ],
  intro:
    "`ultracite init --editors antigravity` writes `.vscode/settings.json`, so Antigravity IDE formats on save and applies safe fixes through Oxc, Biome or ESLint once you add the extension from Open VSX. Its agent loads `AGENTS.md` folder by folder, and its edit tools can aim at the lint errors your extension reports, by ID.",
  metaDescription:
    "Ultracite writes .vscode/settings.json for Antigravity IDE: add Oxc, Biome or ESLint from Open VSX, and its agent reads AGENTS.md in every folder.",
  metaTitle: "Ultracite for Antigravity IDE — Format on save, AGENTS.md rules",
  related: ["vscode", "kiro", "cursor"],
  setup: {
    facts: [
      {
        label: "Extensions",
        value:
          "From Open VSX by default (the `antigravity.marketplaceExtensionGalleryServiceURL` setting), not the Visual Studio Marketplace. `oxc.oxc-vscode`, `biomejs.biome`, `dbaeumer.vscode-eslint` and `esbenp.prettier-vscode` are all there.",
      },
      {
        label: "Code OSS 1.107",
        value:
          "Antigravity IDE 2.5.5 is built on Code OSS 1.107, so it reads `.vscode/settings.json` as VS Code does.",
      },
      {
        label: "Moving from 1.0",
        value:
          "Since 2.0.3, the IDE can import settings, extensions and keybindings from Antigravity 1.0, the app before the split.",
      },
      {
        label: "Strict mode",
        value:
          "Since 2.1.1, strict mode asks before the agent touches `.vscode` or `.cache`. It also makes every terminal command ask, ignores the allowlist and respects `.gitignore`.",
      },
      {
        label: "Terminal commands",
        value:
          "Request Review asks before any command that isn’t on your allowlist; Always Proceed runs everything that isn’t on your denylist.",
      },
      {
        label: "File access",
        value:
          "By default the agent reaches only your project folders and `~/.gemini/antigravity-ide/`, where it keeps artifacts and configuration.",
      },
    ],
    summary:
      "Antigravity IDE takes the same settings file as VS Code but gets its extensions from Open VSX. How far its agent can reach into `.vscode` and the terminal depends on your security settings.",
    title: "Open VSX extensions, installed by hand",
  },
  sources: [
    {
      title: "Antigravity: Antigravity 2.0 overview",
      url: "https://antigravity.google/docs/overview",
    },
    {
      title: "Antigravity: Rules",
      url: "https://antigravity.google/docs/rules",
    },
    {
      title: "Antigravity: Agent skills",
      url: "https://antigravity.google/docs/skills",
    },
    {
      title: "Antigravity: Hooks",
      url: "https://antigravity.google/docs/hooks",
    },
    {
      title: "Antigravity: Settings",
      url: "https://antigravity.google/docs/settings",
    },
    {
      title: "Antigravity: Changelog",
      url: "https://antigravity.google/docs/changelog",
    },
    {
      title: "Antigravity IDE 2.5.5 download",
      url: "https://antigravity.google/download",
    },
  ],
};
