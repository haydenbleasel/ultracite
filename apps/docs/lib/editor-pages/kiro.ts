import type { EditorPageContent } from "./types";

export const kiro: EditorPageContent = {
  afterInit: [
    "Open the project in Kiro. If `init` couldn’t run `kiro`, install `oxc.oxc-vscode` from the Extensions view, or `biomejs.biome` if you picked Biome.",
    "Save a TypeScript file: Oxfmt formats it and Oxlint’s safe fixes apply.",
  ],
  agent: {
    body: "Kiro’s agent treats `AGENTS.md` as steering that’s always included, at the workspace root and in subfolders. IDE 1.0 removed the agent’s standalone `diagnostics` tool, so to hand it your linter’s findings, add `#problems` to a message or let it run `ultracite check` as the rules ask.",
    lookup: [
      {
        note: "Global steering for every workspace, including an `AGENTS.md` placed here. Workspace steering wins when the two disagree.",
        path: "~/.kiro/steering/",
      },
      {
        note: "Workspace steering, loaded by each file’s `inclusion` mode: `always` (the default), `fileMatch`, `manual` or `auto`. Skipped until you trust the workspace.",
        path: ".kiro/steering/*.md",
      },
      {
        note: "Where `init` writes Ultracite’s rules. Always included; inclusion modes don’t apply to it.",
        path: "AGENTS.md",
      },
      {
        note: "Subfolder `AGENTS.md` files load as steering alongside the rest.",
        path: "packages/ui/AGENTS.md",
      },
      {
        note: "Skills, loaded when a request matches their description. Kiro’s skill folders are this one and `~/.kiro/skills/`, so `init` installs the Ultracite skill here when the project has a `.kiro` folder.",
        path: ".kiro/skills/",
      },
    ],
    snippets: [
      {
        code: 'rules:\n  - capability: shell\n    match: ["npx ultracite *"]\n    effect: allow',
        lang: "yaml",
        title: "~/.kiro/settings/permissions.yaml",
      },
    ],
    steps: [
      "The agent writes a file in your workspace.",
      "Your Oxc, Biome or ESLint extension reports problems in the editor, as it does for your own edits. Since IDE 1.0 the agent has no standalone tool for reading them.",
      "Add `#problems` to your next message to hand it those findings.",
      "Or it runs `npx ultracite check` because `AGENTS.md` says to. A `shell` allow rule lets that run without a prompt in a trusted workspace.",
    ],
    title: "Lint errors reach Kiro through #problems",
  },
  checked: {
    date: "2026-10-10",
    version: "1.2.56",
  },
  faqs: [
    {
      answer:
        "No. Kiro installs extensions from Open VSX unless an admin sets another registry with the `ExtensionGalleryServiceUrl` policy. `oxc.oxc-vscode`, `biomejs.biome`, `dbaeumer.vscode-eslint` and `esbenp.prettier-vscode` are all published on Open VSX.",
      question: "Does Kiro use the VS Code Marketplace?",
    },
    {
      answer:
        "Yes. Kiro loads `AGENTS.md` from the workspace root, from subfolders and from `~/.kiro/steering/` as steering that’s always included. Inclusion modes don’t apply to it.",
      question: "Does Kiro read AGENTS.md?",
    },
    {
      answer:
        "Not through a dedicated tool: IDE 1.0 removed the agent’s standalone `diagnostics` tool. Add `#problems` to a chat message to share the language server’s findings, or let the agent run `npx ultracite check`.",
      question: "Can Kiro’s agent see my lint errors?",
    },
    {
      answer:
        "`init` runs `kiro --install-extension` only when it creates `.vscode/settings.json`, and only if `kiro` is on your PATH. Otherwise, install `oxc.oxc-vscode` from Kiro’s Extensions view, which searches Open VSX.",
      question: "Why didn’t init install the Oxlint extension in Kiro?",
    },
    {
      answer:
        "Kiro can: a `PostFileSave` hook in `.kiro/hooks/*.json` fires when the agent saves or modifies a matching file. Ultracite doesn’t write one, and `init --hooks` doesn’t support Kiro.",
      question: "Can Kiro run Ultracite after every agent edit?",
    },
  ],
  headline: "Kiro IDE, linted on save and steered by AGENTS.md",
  highlights: [
    {
      body: "Kiro asks before its agent writes anything under `.vscode/`, in trusted and untrusted workspaces alike, and no `allow` rule removes that prompt. The agent can’t change your format-on-save settings without your approval.",
      title: "Changes to .vscode always ask",
    },
    {
      body: "Kiro’s `PostFileSave` hook runs when the agent saves or modifies a file, and `PostTaskExec` runs after a spec task finishes. Both are for the agent’s changes; format on save covers yours. Ultracite doesn’t write Kiro hooks.",
      title: "Hooks follow the agent, not you",
    },
    {
      body: "A steering file can pull in a live file with `#[[file:path]]`, a line range with `#[[file:path:12-28]]` or a folder listing with `#[[folder:path]]`. In an `AGENTS.md`, paths resolve from that file’s folder, so it can point the agent at the `oxlint.config.ts` you actually ship.",
      title: "Steering can read your config",
    },
  ],
  intro:
    "`ultracite init --editors kiro` writes `.vscode/settings.json` and installs your toolchain’s extension from Open VSX through the `kiro` launcher, so Kiro formats on save and applies safe fixes as VS Code would. Kiro’s agent always loads `AGENTS.md` as steering, but IDE 1.0 removed its `diagnostics` tool, so `#problems` or `ultracite check` is how lint errors reach it.",
  metaDescription:
    "Ultracite writes .vscode/settings.json for Kiro and installs Oxc, Biome or ESLint from Open VSX. Kiro’s agent loads AGENTS.md; #problems shows it lint errors.",
  metaTitle: "Ultracite for Kiro — Open VSX extensions, AGENTS.md steering",
  related: ["vscode", "antigravity", "cursor"],
  setup: {
    facts: [
      {
        label: "Extensions",
        value:
          "Kiro installs from Open VSX, not the Visual Studio Marketplace. `oxc.oxc-vscode`, `biomejs.biome`, `dbaeumer.vscode-eslint` and `esbenp.prettier-vscode` are all published there.",
      },
      {
        label: "Private registry",
        value:
          "An admin can point Kiro at another registry with the `ExtensionGalleryServiceUrl` policy. Check that it carries your toolchain’s extension.",
      },
      {
        label: "Code OSS 1.131",
        value:
          "Kiro has been on Code OSS 1.131 since IDE 1.1, so it reads `.vscode/settings.json` as VS Code does.",
      },
      {
        label: "Workspace trust",
        value:
          "Until you trust a workspace, Kiro skips its steering files and skills and asks before every shell command, even one a rule allows. The decision is stored outside the repository.",
      },
      {
        label: "Shell commands",
        value:
          "Without a rule, read-only `git` commands run silently and other commands ask. A `shell` rule in `~/.kiro/settings/permissions.yaml` can allow `npx ultracite *`.",
      },
      {
        label: "Agent autonomy",
        value:
          "Settings → Agent → Agent Autonomy (`kiroAgent.agentAutonomy`): Autopilot goes ahead with allowed actions; Supervised asks before any action.",
      },
    ],
    summary:
      "Kiro reads the same `.vscode/settings.json` as VS Code. What differs is where its extensions come from, and how much its agent may do before you trust the workspace.",
    title: "Kiro runs VS Code extensions from Open VSX",
  },
  sources: [
    {
      title: "Kiro: Custom extension registry",
      url: "https://kiro.dev/docs/ide/editor/extension-registry",
    },
    { title: "Kiro: Steering", url: "https://kiro.dev/docs/steering" },
    { title: "Kiro: Agent Skills", url: "https://kiro.dev/docs/skills" },
    { title: "Kiro: Permissions", url: "https://kiro.dev/docs/permissions" },
    {
      title: "Kiro: What’s new in IDE 1.0, Hooks",
      url: "https://kiro.dev/docs/ide/whats-new-v1/hooks",
    },
    {
      title: "Kiro: IDE 0.x reference",
      url: "https://kiro.dev/docs/ide/0x-reference",
    },
    { title: "Kiro: IDE changelog", url: "https://kiro.dev/changelog/ide/" },
  ],
};
