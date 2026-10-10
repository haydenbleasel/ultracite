import type { AgentPageContent } from "./types";

export const kiroCli: AgentPageContent = {
  checked: { date: "2026-10-10", version: "2.29.0" },
  faqs: [
    {
      answer:
        "Yes. Kiro loads `AGENTS.md` from the workspace root, from subdirectories and from `~/.kiro/steering/`, and always includes it: steering inclusion modes don’t apply to it.",
      question: "Does Kiro CLI read AGENTS.md?",
    },
    {
      answer:
        "Kiro CLI replaced it. The `q` and `q chat` commands still work, and Kiro keeps reading a project’s `.amazonq` folder until the project also has a `.kiro` one.",
      question: "Is Kiro CLI the same as Amazon Q Developer CLI?",
    },
    {
      answer:
        "Add a `shell` rule matching `npx ultracite *` with `effect: allow` to `~/.kiro/settings/permissions.yaml`, as above. In a workspace you haven’t trusted, Kiro still asks before each command.",
      question: "How do I let Kiro CLI run Ultracite without asking?",
    },
    {
      answer:
        "Yes. In V3, hook files live in `.kiro/hooks/*.json` and `~/.kiro/hooks/`, with triggers such as `PostFileSave`; CLI 2.x kept hooks inside agent configs. Ultracite doesn’t configure them yet.",
      question: "Does Kiro CLI support hooks?",
    },
  ],
  headline: "Kiro CLI, with AGENTS.md as always-on steering",
  highlights: [
    {
      body: "Kiro CLI still runs Classic (2.x) sessions alongside 3.0 (V3), and since 2.28.0 it offers to switch when you start an interactive Classic session. V3 moved hooks into `.kiro/hooks/*.json` and permissions into `permissions.yaml`; `/upgrade-agent` converts older agent configs.",
      title: "V3 is a switch you make",
    },
    {
      body: "Until you trust a workspace, Kiro asks before every shell command, even one a saved rule allows, and doesn’t load the workspace’s steering files, skills or custom agents. Your decision is stored outside the repository.",
      title: "Untrusted workspaces ask every time",
    },
    {
      body: "Permission rules live in `~/.kiro/settings/permissions.yaml` and a per-workspace file under `~/.kiro/workspace-roots/`, both outside the repository, so a cloned repo can’t approve its own commands. A `deny` beats an `ask`, which beats an `allow`.",
      title: "Permissions a repo can’t set",
    },
  ],
  intro:
    "Kiro CLI treats `AGENTS.md` as steering that’s always included, at the workspace root and in subdirectories. Ultracite doesn’t configure Kiro’s hooks, so the agent runs `ultracite fix` through its shell tool when the rules tell it to, and a permission rule can approve that command ahead of time.",
  loop: {
    body: "Ultracite doesn’t configure Kiro’s hooks yet, so `ultracite fix` runs because `AGENTS.md` tells the agent to run it. A `shell` rule in `~/.kiro/settings/permissions.yaml` lets that command run without a prompt in every trusted workspace.",
    snippets: [
      {
        code: 'rules:\n  - capability: shell\n    match: ["npx ultracite *"]\n    effect: allow',
        lang: "yaml",
        title: "~/.kiro/settings/permissions.yaml",
      },
    ],
    steps: [
      "The agent changes files with its write tools.",
      "Following `AGENTS.md`, it runs `npx ultracite fix` through its shell tool.",
      "A matching `shell` allow rule lets it run silently; in an untrusted workspace, Kiro asks anyway.",
      "Kiro reads the output and fixes what’s left.",
    ],
    title: "Pre-approve the command, not the session",
  },
  metaDescription:
    "Set up Ultracite for Kiro CLI, formerly Amazon Q Developer CLI: AGENTS.md as always-on steering, a shell permission rule, and V3 workspace trust.",
  metaTitle: "Ultracite for Kiro CLI — AGENTS.md as always-on steering",
  related: ["qoder", "copilot", "cursor-cli"],
  rules: {
    facts: [
      {
        label: "Always on",
        value:
          "`AGENTS.md` has no inclusion modes. `fileMatch`, `manual` and `auto` apply only to steering files.",
      },
      {
        label: "Conflicts",
        value:
          "Workspace steering wins over global steering when instructions disagree.",
      },
      {
        label: "File references",
        value:
          "`#[[file:path]]` in `AGENTS.md` pulls in a live file, resolved from that `AGENTS.md`’s folder.",
      },
      {
        label: "Amazon Q",
        value:
          "`.amazonq/rules` keeps working until the project gets a `.kiro` folder; from then on `.kiro` wins and Kiro warns you.",
      },
      {
        label: "Starter files",
        value:
          "Kiro’s foundation steering files, `product.md`, `tech.md` and `structure.md`, load in every interaction by default, like `AGENTS.md`.",
      },
      {
        label: "Team rules",
        value:
          "Global steering in `~/.kiro/steering/` can be pushed to every developer’s machine with MDM or Group Policy.",
      },
    ],
    lookup: [
      {
        note: "Global steering for every workspace. An `AGENTS.md` here is picked up too.",
        path: "~/.kiro/steering/",
      },
      {
        note: "Workspace steering, loaded by each file’s inclusion mode.",
        path: ".kiro/steering/*.md",
      },
      {
        note: "At the workspace root, always included.",
        path: "AGENTS.md",
      },
      {
        note: "Subdirectory `AGENTS.md` files load as steering alongside the rest.",
        path: "services/api/AGENTS.md",
      },
      {
        note: "Still read for projects set up with Amazon Q Developer CLI, unless the project also has a `.kiro` folder.",
        path: ".amazonq/rules/",
      },
    ],
    summary:
      "Kiro calls persistent instructions steering. `AGENTS.md` is steering without inclusion modes: it’s always loaded, next to the Markdown files in `.kiro/steering/` and `~/.kiro/steering/`.",
  },
  skills:
    "Kiro CLI loads skills from `.kiro/skills/` and `~/.kiro/skills/`. When your project has a `.kiro` folder, `init` installs the Ultracite skill into `.kiro/skills/` as well as `.agents/skills/`, so Kiro finds it once the workspace is trusted.",
  sources: [
    {
      title: "Kiro: Steering",
      url: "https://kiro.dev/docs/steering",
    },
    {
      title: "Kiro: Permissions",
      url: "https://kiro.dev/docs/permissions",
    },
    {
      title: "Kiro: Hooks",
      url: "https://kiro.dev/docs/hooks",
    },
    {
      title: "Kiro: Agent Skills",
      url: "https://kiro.dev/docs/skills",
    },
    {
      title: "Kiro: Upgrading from Amazon Q Developer CLI",
      url: "https://kiro.dev/docs/upgrade-guides/migrating-from-q",
    },
    {
      title: "Kiro: CLI changelog",
      url: "https://kiro.dev/changelog/cli/",
    },
  ],
};
