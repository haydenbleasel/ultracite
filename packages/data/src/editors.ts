/* biome-ignore-all lint/style/useNamingConvention: "Editor configs use various naming conventions" */

import deepmerge from "deepmerge";
import type { StaticImageData } from "next/image";

import antigravityLogo from "../logos/antigravity.svg";
import bobLogo from "../logos/bob.svg";
import codebuddyLogo from "../logos/codebuddy.svg";
import cursorLogo from "../logos/cursor.svg";
import kiroLogo from "../logos/kiro.svg";
import traeLogo from "../logos/trae.svg";
import voidLogo from "../logos/void.svg";
import vscodeLogo from "../logos/vscode.svg";
import windsurfLogo from "../logos/windsurf.svg";
import zedLogo from "../logos/zed.svg";
import type {
  EditorPageCapabilities,
  EditorPageSource,
  EditorSetupFile,
} from "./editor-page";
import {
  getEditorPageCapabilities as getEditorPageCapabilitiesFromSource,
  getEditorSetupFiles as getEditorSetupFilesFromSource,
} from "./editor-page";
import type { ProviderId } from "./providers";
import { getRules } from "./rules";
import type { HooksConfig } from "./types";

export type {
  EditorFamily,
  EditorPageCapabilities,
  EditorSetupFile,
} from "./editor-page";

/* e.g. .cursor/rules/ultracite.mdc */
export interface EditorRulesConfig {
  appendMode?: boolean;
  header?: string;
  path: string;
}

/* e.g. .vscode/settings.json */
export interface EditorSettingsConfig {
  extensionCommand?: string;
  getContent: (linter?: ProviderId) => Record<string, unknown>;
  path: string;
}

export interface EditorDifferentiator {
  description: string;
  title: string;
}

export interface EditorFaqItem {
  answer: string;
  question: string;
}

export interface EditorSeoContent {
  metaDescription: string;
  summary: string;
}

export interface EditorPageData {
  capabilities: EditorPageCapabilities;
  metaDescription: string;
  relatedEditors: Editor[];
  setupFiles: EditorSetupFile[];
  title: string;
}

export interface Editor {
  audience: string;
  config: EditorSettingsConfig;
  differentiators: EditorDifferentiator[];
  description: string;
  faq: EditorFaqItem[];
  hooks?: HooksConfig;
  id: string;
  logo: StaticImageData;
  name: string;
  rules?: EditorRulesConfig;
  seo: EditorSeoContent;
  subtitle: string;
  workflowHighlights: string[];
}

// VS Code base configuration
const vscodeBaseConfig = {
  "editor.formatOnPaste": true,
  "editor.formatOnSave": true,
  "emmet.showExpandedAbbreviation": "never",
  "js/ts.tsdk.path": "node_modules/typescript/lib",
  "js/ts.tsdk.promptToUseWorkspaceVersion": true,
};

// VS Code Biome configuration
// Maps https://biomejs.dev/internals/language-support/
// to https://code.visualstudio.com/docs/languages/identifiers
export const vscodeBiomeConfig = {
  "[css]": { "editor.defaultFormatter": "biomejs.biome" },
  "[graphql]": { "editor.defaultFormatter": "biomejs.biome" },
  "[html]": { "editor.defaultFormatter": "biomejs.biome" },
  "[javascript]": { "editor.defaultFormatter": "biomejs.biome" },
  "[javascriptreact]": { "editor.defaultFormatter": "biomejs.biome" },
  "[json]": { "editor.defaultFormatter": "biomejs.biome" },
  "[jsonc]": { "editor.defaultFormatter": "biomejs.biome" },
  "[markdown]": { "editor.defaultFormatter": "biomejs.biome" },
  "[mdx]": { "editor.defaultFormatter": "biomejs.biome" },
  "[svelte]": { "editor.defaultFormatter": "biomejs.biome" },
  "[typescript]": { "editor.defaultFormatter": "biomejs.biome" },
  "[typescriptreact]": { "editor.defaultFormatter": "biomejs.biome" },
  "[vue]": { "editor.defaultFormatter": "biomejs.biome" },
  "[yaml]": { "editor.defaultFormatter": "biomejs.biome" },
  "editor.defaultFormatter": "biomejs.biome",
  "editor.codeActionsOnSave": {
    "source.fixAll.biome": "explicit",
    "source.organizeImports.biome": "explicit",
  },
};

// VS Code Oxlint configuration
// Maps https://oxc.rs/docs/guide/usage/formatter.html#supported-languages
// to https://code.visualstudio.com/docs/languages/identifiers
export const vscodeOxlintConfig = {
  "[css]": { "editor.defaultFormatter": "oxc.oxc-vscode" },
  "[graphql]": { "editor.defaultFormatter": "oxc.oxc-vscode" },
  "[handlebars]": { "editor.defaultFormatter": "oxc.oxc-vscode" },
  "[html]": { "editor.defaultFormatter": "oxc.oxc-vscode" },
  "[javascript]": { "editor.defaultFormatter": "oxc.oxc-vscode" },
  "[javascriptreact]": { "editor.defaultFormatter": "oxc.oxc-vscode" },
  "[json]": { "editor.defaultFormatter": "oxc.oxc-vscode" },
  "[jsonc]": { "editor.defaultFormatter": "oxc.oxc-vscode" },
  "[less]": { "editor.defaultFormatter": "oxc.oxc-vscode" },
  "[markdown]": { "editor.defaultFormatter": "oxc.oxc-vscode" },
  "[scss]": { "editor.defaultFormatter": "oxc.oxc-vscode" },
  "[typescript]": { "editor.defaultFormatter": "oxc.oxc-vscode" },
  "[typescriptreact]": { "editor.defaultFormatter": "oxc.oxc-vscode" },
  "[vue-html]": { "editor.defaultFormatter": "oxc.oxc-vscode" },
  "[vue]": { "editor.defaultFormatter": "oxc.oxc-vscode" },
  "[yaml]": { "editor.defaultFormatter": "oxc.oxc-vscode" },
  "editor.defaultFormatter": "oxc.oxc-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.oxc": "explicit",
  },
};

// VS Code ESLint/Prettier configuration
export const vscodeEslintConfig = {
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit",
    "source.organizeImports": "explicit",
  },
};

export const getVscodeConfig = (linter: ProviderId = "biome") => {
  switch (linter) {
    case "biome": {
      return deepmerge(vscodeBaseConfig, vscodeBiomeConfig);
    }
    case "eslint": {
      return deepmerge(vscodeBaseConfig, vscodeEslintConfig);
    }
    case "oxlint": {
      return deepmerge(vscodeBaseConfig, vscodeOxlintConfig);
    }
    default: {
      return vscodeBaseConfig;
    }
  }
};

// Zed Biome configuration
export const zedBaseConfig = {
  format_on_save: "on",
  formatter: "language_server",
  lsp: {
    "typescript-language-server": {
      settings: {
        typescript: {
          preferences: {
            includePackageJsonAutoImports: "on",
          },
        },
      },
    },
  },
};

const zedBiomeConfig = {
  languages: {
    JavaScript: {
      code_actions_on_format: {
        "source.fixAll.biome": true,
        "source.organizeImports.biome": true,
      },
      formatter: {
        language_server: {
          name: "biome",
        },
      },
    },
    TSX: {
      code_actions_on_format: {
        "source.fixAll.biome": true,
        "source.organizeImports.biome": true,
      },
      formatter: {
        language_server: {
          name: "biome",
        },
      },
    },
    TypeScript: {
      code_actions_on_format: {
        "source.fixAll.biome": true,
        "source.organizeImports.biome": true,
      },
      formatter: {
        language_server: {
          name: "biome",
        },
      },
    },
  },
};

const zedEslintConfig = {
  languages: {
    JavaScript: {
      code_actions_on_format: {
        "source.fixAll.eslint": true,
        "source.organizeImports.eslint": true,
      },
      formatter: {
        language_server: {
          name: "eslint",
        },
      },
    },
    TSX: {
      code_actions_on_format: {
        "source.fixAll.eslint": true,
        "source.organizeImports.eslint": true,
      },
      formatter: {
        language_server: {
          name: "eslint",
        },
      },
    },
    TypeScript: {
      code_actions_on_format: {
        "source.fixAll.eslint": true,
        "source.organizeImports.eslint": true,
      },
      formatter: {
        language_server: {
          name: "eslint",
        },
      },
    },
  },
};

const zedOxcConfig = {
  languages: {
    JavaScript: {
      code_actions_on_format: {
        "source.fixAll.oxc": true,
        "source.organizeImports.oxc": true,
      },
      formatter: {
        language_server: {
          name: "oxfmt",
        },
      },
    },
    TSX: {
      code_actions_on_format: {
        "source.fixAll.oxc": true,
        "source.organizeImports.oxc": true,
      },
      formatter: {
        language_server: {
          name: "oxfmt",
        },
      },
    },
    TypeScript: {
      code_actions_on_format: {
        "source.fixAll.oxc": true,
        "source.organizeImports.oxc": true,
      },
      formatter: {
        language_server: {
          name: "oxfmt",
        },
      },
    },
  },
  lsp: {
    oxfmt: {
      initialization_options: {
        settings: {
          configPath: null,
          flags: {},
          "fmt.configPath": null,
          "fmt.experimental": true,
          run: "onSave",
          typeAware: false,
          unusedDisableDirectives: false,
        },
      },
    },
    oxlint: {
      initialization_options: {
        settings: {
          disableNestedConfig: false,
          fixKind: "safe_fix",
          run: "onType",
          typeAware: true,
          unusedDisableDirectives: "deny",
        },
      },
    },
  },
};

export const getZedConfig = (linter: ProviderId = "biome") => {
  switch (linter) {
    case "biome": {
      return deepmerge(zedBaseConfig, zedBiomeConfig);
    }
    case "eslint": {
      return deepmerge(zedBaseConfig, zedEslintConfig);
    }
    case "oxlint": {
      return deepmerge(zedBaseConfig, zedOxcConfig);
    }
    default: {
      return zedBaseConfig;
    }
  }
};

export const editors: Editor[] = [
  {
    audience:
      "teams standardizing on the default editor across local and remote workflows",
    config: {
      extensionCommand: "code --install-extension",
      getContent: getVscodeConfig,
      path: ".vscode/settings.json",
    },
    description:
      "Microsoft's popular code editor with extensive extension support and built-in Git integration.",
    differentiators: [
      {
        description:
          "Ultracite writes predictable workspace settings that every VS Code contributor can commit and share.",
        title: "Commit-friendly workspace defaults",
      },
      {
        description:
          "You keep the full Visual Studio Code extension ecosystem while still getting consistent format-on-save behavior.",
        title: "Works with the editor your team already uses",
      },
      {
        description:
          "The generated settings stay narrow and readable, so onboarding new contributors does not require a custom editor guide.",
        title: "Low-friction onboarding",
      },
    ],
    faq: [
      {
        answer:
          "Yes. Ultracite writes a standard .vscode/settings.json file, so the setup works well for teams that commit editor settings into the repository.",
        question:
          "Can I commit Ultracite's Visual Studio Code settings to the repo?",
      },
      {
        answer:
          "Yes. Ultracite can point Visual Studio Code at Biome, ESLint, or Oxlint while keeping format on save and auto-fix behavior consistent.",
        question:
          "Does the Visual Studio Code setup work with different Ultracite linters?",
      },
      {
        answer:
          "No. Visual Studio Code uses workspace settings only, so this page focuses on the editor config rather than extra AI rules or hook files.",
        question:
          "Does Ultracite need extra rules or hooks for plain Visual Studio Code?",
      },
    ],
    id: "vscode",
    logo: vscodeLogo,
    name: "Visual Studio Code",
    seo: {
      metaDescription:
        "Set up Ultracite for Visual Studio Code with a committed .vscode/settings.json, format on save, auto-fixes, and consistent linting for shared projects.",
      summary:
        "Use Ultracite to generate a clean Visual Studio Code settings file with format on save, auto-fixes, and TypeScript defaults that stay consistent across every contributor's workspace.",
    },
    subtitle: "The most popular code editor",
    workflowHighlights: [
      "Run `npx ultracite@latest init --editors vscode` to generate `.vscode/settings.json` for the repo.",
      "Commit the workspace settings so every contributor inherits the same formatter and save-time fixes.",
      "Install the matching linter extension once, then let Visual Studio Code keep the project aligned automatically.",
    ],
  },
  {
    audience:
      "Cursor users who want AI output, workspace settings, and post-edit cleanup to follow the same standards",
    config: {
      extensionCommand: "code --install-extension",
      getContent: getVscodeConfig,
      path: ".vscode/settings.json",
    },
    description:
      "The AI-first code editor built on VS Code with deep AI integration for coding assistance.",
    differentiators: [
      {
        description:
          "Cursor can use Ultracite's rule file to steer AI generations before you even reach the formatter.",
        title: "Guides AI output at the source",
      },
      {
        description:
          "Optional hooks let Cursor clean up generated edits immediately after the agent writes files.",
        title: "Pairs rules with automatic post-edit fixes",
      },
      {
        description:
          "Because Cursor is VS Code-based, you still get a familiar workspace settings model alongside AI-specific files.",
        title: "Keeps the VS Code ergonomics developers expect",
      },
    ],
    faq: [
      {
        answer:
          "Ultracite can configure both. The workspace settings handle format-on-save behavior, while the Cursor rules file teaches the AI how you want code written.",
        question:
          "Should I use both Visual Studio Code settings and Cursor rules with Ultracite?",
      },
      {
        answer:
          "Use hooks when you want Cursor to run Ultracite automatically after AI edits. They are especially helpful if you rely heavily on agent-driven refactors.",
        question: "What do Cursor hooks add on top of the rules file?",
      },
      {
        answer:
          "Yes. Cursor inherits the same workspace settings model as Visual Studio Code, so your formatter and save-time fixes stay aligned with the rest of the team.",
        question:
          "Can Cursor share the same committed workspace settings as Visual Studio Code?",
      },
    ],
    hooks: {
      getContent: (command) => ({
        hooks: {
          afterFileEdit: [{ command }],
        },
        version: 1,
      }),
      path: ".cursor/hooks.json",
    },
    id: "cursor",
    logo: cursorLogo,
    name: "Cursor",
    rules: {
      header: `---
description: Ultracite Rules - AI-Ready Formatter and Linter
globs: "**/*.{ts,tsx,js,jsx,json,jsonc,html,vue,svelte,astro,css,yaml,yml,graphql,gql,md,mdx,grit}"
alwaysApply: false
---`,
      path: ".cursor/rules/ultracite.mdc",
    },
    seo: {
      metaDescription:
        "Configure Ultracite for Cursor with shared VS Code settings, a `.cursor/rules/ultracite.mdc` file, and optional post-edit hooks.",
      summary:
        "Cursor works best with Ultracite when you combine committed workspace settings, a dedicated Cursor rules file, and optional post-edit hooks that run after AI-driven changes land in your repo.",
    },
    subtitle: "The AI-first code editor",
    workflowHighlights: [
      "Generate the shared `.vscode/settings.json` file so Cursor inherits the same formatter and save behavior as the rest of the repo.",
      "Add `.cursor/rules/ultracite.mdc` so Cursor generates code that already matches Ultracite's expectations.",
      "Enable `.cursor/hooks.json` when you want Ultracite to run after AI edits and clean up formatting or auto-fixable issues immediately.",
    ],
  },
  {
    audience:
      "Windsurf teams leaning on agentic edits and wanting automated cleanup after every write",
    config: {
      extensionCommand: "code --install-extension",
      getContent: getVscodeConfig,
      path: ".vscode/settings.json",
    },
    description:
      "Codeium's agentic IDE that combines AI assistance with a powerful VS Code-based development environment.",
    differentiators: [
      {
        description:
          "Windsurf's agentic workflow benefits from a dedicated rules file plus a hook that can run right after generated edits land.",
        title: "Built for post-write automation",
      },
      {
        description:
          "Ultracite keeps Windsurf aligned with standard VS Code workspace settings instead of forcing a separate editor-only config path.",
        title: "Reuses the same workspace configuration as VS Code",
      },
      {
        description:
          "The combination of rules and hooks reduces the amount of cleanup you need after Codeium agents make broad file changes.",
        title: "Keeps agent-driven edits reviewable",
      },
    ],
    faq: [
      {
        answer:
          "The rules file shapes how Windsurf writes code, while the hooks file lets Ultracite run after agent edits to fix what is still auto-fixable.",
        question: "Why would I use both Windsurf rules and hooks?",
      },
      {
        answer:
          "Yes. Windsurf is VS Code-based, so the generated `.vscode/settings.json` remains the main workspace settings file for editor behavior.",
        question:
          "Does Windsurf still use the same workspace settings file as Visual Studio Code?",
      },
      {
        answer:
          "The hook helps when Windsurf agents touch many files at once because Ultracite can normalize formatting and safe fixes immediately after the write step.",
        question: "When are Windsurf hooks most useful?",
      },
    ],
    hooks: {
      getContent: (command) => ({
        hooks: {
          post_write_code: [{ command, show_output: true }],
        },
      }),
      path: ".windsurf/hooks.json",
    },
    id: "windsurf",
    logo: windsurfLogo,
    name: "Windsurf",
    rules: {
      path: ".windsurf/rules/ultracite.md",
    },
    seo: {
      metaDescription:
        "Set up Ultracite for Windsurf with shared VS Code settings, a `.windsurf/rules/ultracite.md` file, and optional post-write hooks.",
      summary:
        "Use Ultracite with Windsurf to pair standard VS Code workspace settings with Windsurf-specific rules and optional hooks that tidy AI-generated edits after every write.",
    },
    subtitle: "The agentic IDE by Codeium",
    workflowHighlights: [
      "Start with the shared `.vscode/settings.json` so Windsurf follows the repo's formatter and save-time fixes.",
      "Add `.windsurf/rules/ultracite.md` to steer Codeium agents toward Ultracite's code standards before they write code.",
      "Turn on `.windsurf/hooks.json` if you want Ultracite to run automatically after Windsurf finishes writing files.",
    ],
  },
  {
    audience:
      "CodeBuddy teams who want shared workspace defaults, a committed memory file, and automated cleanup after AI edits",
    config: {
      extensionCommand: "code --install-extension",
      getContent: getVscodeConfig,
      path: ".vscode/settings.json",
    },
    description:
      "Tencent Cloud CodeBuddy is a next-generation AI code editor powered by the Tencent Yuanbao Code large model.",
    differentiators: [
      {
        description:
          "CodeBuddy can pair shared VS Code-style workspace settings with both a branded memory file and project-level hooks, so editor behavior and AI cleanup stay aligned in one repo contract.",
        title: "Combines memory, settings, and hooks",
      },
      {
        description:
          "Using `CODEBUDDY.md` makes repo guidance explicit before CodeBuddy generates code, while hooks in `.codebuddy/settings.json` can clean up what is still auto-fixable after edits land.",
        title: "Covers both pre- and post-edit quality",
      },
      {
        description:
          "The setup stays familiar for teams already standardizing on `.vscode/settings.json`, which keeps onboarding simple even in an AI-heavy editor.",
        title: "Fits existing VS Code-style collaboration",
      },
    ],
    faq: [
      {
        answer:
          "The workspace settings control format on save and code actions, `CODEBUDDY.md` gives CodeBuddy repo-level instructions for how generated code should look, and `.codebuddy/settings.json` can run Ultracite automatically after AI edits.",
        question:
          "Why does the CodeBuddy setup use settings, CODEBUDDY.md, and hooks?",
      },
      {
        answer:
          "Yes. Ultracite keeps the shared `.vscode/settings.json` file as the baseline so CodeBuddy can stay aligned with teammates using other VS Code-style editors.",
        question:
          "Can CodeBuddy share the same committed workspace settings as other editors?",
      },
      {
        answer:
          "The memory file shapes how CodeBuddy writes code up front, while the hook config lets Ultracite run after `Write` and `Edit` actions so formatting and safe fixes happen automatically.",
        question: "What do CodeBuddy hooks add on top of CODEBUDDY.md?",
      },
    ],
    hooks: {
      getContent: (command) => ({
        hooks: {
          PostToolUse: [
            {
              hooks: [
                {
                  command,
                  timeout: 20,
                  type: "command",
                },
              ],
              matcher: "Write|Edit",
            },
          ],
        },
      }),
      path: ".codebuddy/settings.json",
    },
    id: "codebuddy",
    logo: codebuddyLogo,
    name: "CodeBuddy",
    rules: {
      appendMode: true,
      path: "CODEBUDDY.md",
    },
    seo: {
      metaDescription:
        "Configure Ultracite for CodeBuddy with shared VS Code settings, a `CODEBUDDY.md` memory file, and optional `.codebuddy/settings.json` hooks.",
      summary:
        "CodeBuddy works best with Ultracite when you combine committed workspace settings, a branded project memory file, and optional PostToolUse hooks that clean up AI edits after they land.",
    },
    subtitle: "Tencent Cloud's AI code editor",
    workflowHighlights: [
      "Generate `.vscode/settings.json` so CodeBuddy follows the same formatter, code actions, and TypeScript defaults as the rest of the repo.",
      "Add `CODEBUDDY.md` to give CodeBuddy a committed memory file that reflects Ultracite's coding standards.",
      "Enable `.codebuddy/settings.json` when you want Ultracite to run after CodeBuddy `Write` and `Edit` actions and clean up AI-generated changes automatically.",
    ],
  },
  {
    audience:
      "teams evaluating Google's AI IDE while keeping the same familiar VS Code workspace contract",
    config: {
      extensionCommand: "code --install-extension",
      getContent: getVscodeConfig,
      path: ".vscode/settings.json",
    },
    description:
      "An AI-powered development platform built on VS Code for building and deploying applications faster.",
    differentiators: [
      {
        description:
          "Antigravity can stay on the same committed `.vscode/settings.json` contract as the rest of a mixed-editor team.",
        title: "Easy to standardize during tool evaluation",
      },
      {
        description:
          "Ultracite keeps format-on-save and auto-fixes predictable while teams experiment with Antigravity's AI-driven workflows.",
        title: "Stability while trying a new AI IDE",
      },
      {
        description:
          "The setup is intentionally lightweight, which makes Antigravity a good fit for teams that want consistency without extra editor-specific files.",
        title: "Simple setup with minimal moving parts",
      },
    ],
    faq: [
      {
        answer:
          "Yes. Antigravity uses the same `.vscode/settings.json` approach as other VS Code-based editors, which makes migration straightforward.",
        question:
          "Can Antigravity use the same workspace settings as Visual Studio Code?",
      },
      {
        answer:
          "Ultracite keeps the integration focused on the committed editor settings. If Antigravity-specific AI rule surfaces mature later, you can add them without changing the core workspace config.",
        question:
          "Does Ultracite need extra Antigravity-specific rule files today?",
      },
      {
        answer:
          "Teams piloting Antigravity alongside Visual Studio Code or Cursor can standardize on the same workspace defaults and reduce editor drift during the transition.",
        question: "Who benefits most from the Antigravity setup?",
      },
    ],
    id: "antigravity",
    logo: antigravityLogo,
    name: "Antigravity",
    seo: {
      metaDescription:
        "Configure Ultracite for Antigravity with shared VS Code settings so format on save, auto-fixes, and repo defaults stay aligned.",
      summary:
        "Antigravity can plug into the same Ultracite-managed Visual Studio Code settings file, making it easy to evaluate Google's AI IDE without inventing a second configuration story for your team.",
    },
    subtitle: "Google's next-generation IDE",
    workflowHighlights: [
      "Generate `.vscode/settings.json` so Antigravity uses the same formatter and code actions as the rest of the repository.",
      "Commit the workspace config to keep Antigravity pilots aligned with teammates who still use Visual Studio Code or Cursor.",
      "Use the shared editor settings as the baseline, then layer Antigravity-specific workflow experiments on top without changing repo-level standards.",
    ],
  },
  {
    audience:
      "IBM Bob teams who want VS Code-style workspace defaults plus committed rules in `AGENTS.md` for IBM's AI coding assistant",
    config: {
      extensionCommand: "code --install-extension",
      getContent: getVscodeConfig,
      path: ".vscode/settings.json",
    },
    description:
      "IBM's AI coding assistant for the IDE, built for agentic modes, literate coding, and enterprise workflows alongside familiar editor ergonomics.",
    differentiators: [
      {
        description:
          "IBM Bob reads `AGENTS.md`, the same rules file used by many AI coding tools. Ultracite writes your standards there so they work across agents while staying version-controlled.",
        title: "Shared AGENTS.md rules",
      },
      {
        description:
          "Ultracite still targets the normal `.vscode/settings.json` surface, so format on save, the linter extension, and TypeScript defaults behave like other VS Code–compatible editors.",
        title: "Same workspace settings story as Visual Studio Code",
      },
      {
        description:
          "You can combine editor behavior (settings) with Bob's guidance file so AI output and human edits meet the same bar before review.",
        title: "Editor defaults plus AI rules in one repo",
      },
    ],
    faq: [
      {
        answer:
          "`--editors bob` updates `.vscode/settings.json`. `--agents bob` creates or appends `AGENTS.md` with Ultracite's coding rules. Use both when you want formatter defaults and Bob-readable project standards in one pass.",
        question:
          "Should I run Ultracite with both `--editors bob` and `--agents bob`?",
      },
      {
        answer:
          "Bob supports `.bob/rules/`, `.bobrules`, mode-specific files, and `AGENTS.md`. Ultracite targets `AGENTS.md` so your standards are shared across Bob and other AI coding tools that read the same file.",
        question: "Does Bob only read AGENTS.md for workspace rules?",
      },
      {
        answer:
          "Bob is distributed as its own IDE experience; when it remains compatible with the VS Code settings and extension model, the same Biome, ESLint, or Oxlint extension install path applies as for Cursor or Windsurf.",
        question:
          "Is the Visual Studio Code extension install step the same for IBM Bob?",
      },
    ],
    id: "bob",
    logo: bobLogo,
    name: "IBM Bob",
    rules: {
      appendMode: true,
      path: "AGENTS.md",
    },
    seo: {
      metaDescription:
        "Wire Ultracite to IBM Bob with `.vscode/settings.json` and `AGENTS.md` so IBM's AI follows formatters, linters, and repo coding standards.",
      summary:
        "IBM Bob works well with Ultracite when you pair shared Visual Studio Code workspace settings with `AGENTS.md` rules—matching the standard format while keeping editor behavior predictable.",
    },
    subtitle: "IBM's AI coding assistant",
    workflowHighlights: [
      "Run `npx ultracite@latest init --editors bob` to generate `.vscode/settings.json` and the linter extension defaults Bob-compatible editors expect.",
      "Run with `--agents bob` (or init both) to append `AGENTS.md` so Bob picks up Ultracite standards from the shared rules file.",
      "Optionally add extra files under `.bob/rules/` for Bob-specific instructions that complement `AGENTS.md`.",
    ],
  },
  {
    audience:
      "Kiro users who want spec-driven AI workflows to inherit repo rules before code generation starts",
    config: {
      extensionCommand: "code --install-extension",
      getContent: getVscodeConfig,
      path: ".vscode/settings.json",
    },
    description:
      "AWS's spec-driven AI development environment for building production-ready applications.",
    differentiators: [
      {
        description:
          "Kiro can read an Ultracite steering file, which makes it a strong fit for teams that rely on spec-first development.",
        title: "Steering files match Kiro's planning model",
      },
      {
        description:
          "Ultracite still anchors the day-to-day editor behavior in a normal VS Code settings file, so workspace expectations stay familiar.",
        title: "Spec-driven guidance without losing standard editor defaults",
      },
      {
        description:
          "The steering file helps Kiro generate code that already reflects your repo conventions instead of relying only on after-the-fact fixes.",
        title: "Moves quality earlier in the workflow",
      },
    ],
    faq: [
      {
        answer:
          "The settings file handles editor behavior like format on save, while the steering file gives Kiro higher-level repo guidance before it starts implementing a task.",
        question:
          "How does Kiro's steering file differ from the normal editor settings?",
      },
      {
        answer:
          "Yes. Kiro still benefits from the shared `.vscode/settings.json`, so human edits and AI-assisted edits follow the same formatter and code action defaults.",
        question:
          "Should I still commit the Visual Studio Code settings for Kiro?",
      },
      {
        answer:
          "Teams using Kiro for structured task planning, specs, or implementation outlines usually get the most value because the steering file reinforces repo-wide standards during that planning step.",
        question: "Who is the Kiro setup best suited for?",
      },
    ],
    id: "kiro",
    logo: kiroLogo,
    name: "Kiro",
    rules: {
      path: ".kiro/steering/ultracite.md",
    },
    seo: {
      metaDescription:
        "Set up Ultracite for Kiro with `.vscode/settings.json` plus a `.kiro/steering/ultracite.md` steering file so spec-driven AI work follows your repo standards.",
      summary:
        "Kiro pairs well with Ultracite when you combine shared VS Code workspace settings with a dedicated steering file that guides spec-driven AI work before code is generated.",
    },
    subtitle: "AWS's spec-driven IDE",
    workflowHighlights: [
      "Use `.vscode/settings.json` to keep Kiro's editor behavior aligned with the rest of the repository.",
      "Add `.kiro/steering/ultracite.md` so Kiro sees Ultracite's code standards while turning specs into implementation work.",
      "Treat the steering file as durable repo guidance and update it alongside broader changes to your coding standards.",
    ],
  },
  {
    audience:
      "Trae users who want a dedicated AI rules file without losing the simplicity of VS Code workspace settings",
    config: {
      extensionCommand: "code --install-extension",
      getContent: getVscodeConfig,
      path: ".vscode/settings.json",
    },
    description:
      "ByteDance's AI-powered IDE built on VS Code - the real AI engineer.",
    differentiators: [
      {
        description:
          "Trae can read a project rules file, so Ultracite can influence generated code before review instead of only after save.",
        title: "Project rules keep Trae aligned with repo standards",
      },
      {
        description:
          "The integration stays lightweight because Trae still relies on the same committed VS Code settings pattern as other VS Code-based editors.",
        title: "Simple repo setup for an AI-heavy IDE",
      },
      {
        description:
          "Ultracite helps Trae produce code that is easier to review by combining up-front guidance with save-time fixes.",
        title: "Balances generation quality with reliable formatting",
      },
    ],
    faq: [
      {
        answer:
          "The workspace settings control formatter behavior, while `.trae/rules/project_rules.md` gives Trae repo-level guidance for how code should be written.",
        question:
          "Why does the Trae setup use both Visual Studio Code settings and a project rules file?",
      },
      {
        answer:
          "Yes. Because Trae is built on VS Code, the committed workspace settings remain the most important shared editor configuration for the team.",
        question:
          "Can Trae share the same committed settings file as Visual Studio Code and Cursor?",
      },
      {
        answer:
          "Trae teams that lean heavily on agent-generated code usually benefit the most because the project rules file reduces the amount of style cleanup needed after generation.",
        question: "When does the Trae project rules file matter most?",
      },
    ],
    id: "trae",
    logo: traeLogo,
    name: "Trae",
    rules: {
      path: ".trae/rules/project_rules.md",
    },
    seo: {
      metaDescription:
        "Configure Ultracite for Trae with shared VS Code settings and a `.trae/rules/project_rules.md` file for AI-generated code.",
      summary:
        "Trae works well with Ultracite when you keep the standard VS Code workspace settings in place and add a dedicated project rules file that teaches the AI how your repo expects code to look.",
    },
    subtitle: "ByteDance's AI IDE",
    workflowHighlights: [
      "Generate `.vscode/settings.json` so Trae follows the same formatter, code actions, and TypeScript defaults as the rest of the repo.",
      "Create `.trae/rules/project_rules.md` to give Trae project-level instructions that reflect Ultracite's standards.",
      "Review the rules file whenever your team's coding expectations change so Trae stays aligned before it generates code.",
    ],
  },
  {
    audience:
      "developers choosing an open-source AI editor and wanting a privacy-friendly setup with minimal repo overhead",
    config: {
      extensionCommand: "code --install-extension",
      getContent: getVscodeConfig,
      path: ".vscode/settings.json",
    },
    description:
      "An open-source AI code editor built on VS Code with a focus on privacy and extensibility.",
    differentiators: [
      {
        description:
          "Void keeps the setup transparent because Ultracite only needs the committed workspace settings file to deliver consistent save-time behavior.",
        title: "Lightweight and auditable",
      },
      {
        description:
          "Teams can standardize on an open-source editor without giving up the same VS Code-based config pattern used elsewhere in the stack.",
        title: "Open-source editor, familiar configuration model",
      },
      {
        description:
          "The minimal integration is a good fit for privacy-conscious teams that want fewer editor-specific files in the repository.",
        title: "Good default for privacy-focused workflows",
      },
    ],
    faq: [
      {
        answer:
          "Yes. Void uses the same `.vscode/settings.json` model, so Ultracite can configure it with the same shared workspace file used by other VS Code-based editors.",
        question:
          "Can Void use the same workspace settings as Visual Studio Code?",
      },
      {
        answer:
          "The setup intentionally stays simple. Ultracite focuses on the committed editor settings so teams can keep repo overhead low while still enforcing consistent formatting and fixes.",
        question:
          "Why does the Void integration stay focused on the settings file?",
      },
      {
        answer:
          "Teams that prefer open-source tooling, want a transparent integration surface, or are cautious about extra editor-specific config files tend to get the most value.",
        question: "Who is the Void setup a strong fit for?",
      },
    ],
    id: "void",
    logo: voidLogo,
    name: "Void",
    seo: {
      metaDescription:
        "Use Ultracite with Void through shared VS Code settings so format on save, auto-fixes, and repo defaults stay consistent.",
      summary:
        "Void fits Ultracite well if you want an open-source AI editor that still uses the familiar VS Code workspace settings model for formatting, lint fixes, and consistent team defaults.",
    },
    subtitle: "Open-source AI editor",
    workflowHighlights: [
      "Generate `.vscode/settings.json` so Void inherits the same formatter and save-time fixes as the rest of the repo.",
      "Commit the workspace settings to keep Void aligned with teammates using Visual Studio Code, Cursor, or other VS Code-based editors.",
      "Use the lean setup as a baseline, then layer Void-specific extensions or workflows on top without changing repo-level standards.",
    ],
  },
  {
    audience:
      "Zed users who want a native, high-performance editor without giving up shared repo conventions",
    config: {
      getContent: getZedConfig,
      path: ".zed/settings.json",
    },
    description:
      "A high-performance, multiplayer code editor built in Rust with built-in AI assistance.",
    differentiators: [
      {
        description:
          "Zed uses its own native settings file, so Ultracite can tailor the setup to Zed instead of pretending every editor is a VS Code clone.",
        title: "Native configuration for a native editor",
      },
      {
        description:
          "Ultracite's `.rules` file works well with Zed's append-mode workflow, letting you keep existing instructions and add standards incrementally.",
        title: "Append-mode rules fit iterative teams",
      },
      {
        description:
          "The setup supports fast local editing, multiplayer sessions, and AI assistance without forcing a separate VS Code compatibility layer.",
        title: "Keeps Zed's performance-focused workflow intact",
      },
    ],
    faq: [
      {
        answer:
          "Zed uses `.zed/settings.json` for editor behavior and a `.rules` file for repo guidance, so the setup is intentionally different from VS Code-based editors.",
        question:
          "How is the Zed setup different from Visual Studio Code-based editors?",
      },
      {
        answer:
          "Append mode means Ultracite can add its rules to the existing `.rules` file without replacing everything that is already there, which is helpful for teams layering repo guidance over time.",
        question: "Why does Zed use append mode for the rules file?",
      },
      {
        answer:
          "Teams that care about editor responsiveness, native tooling, or collaborative editing tend to benefit most from keeping Zed's native config model intact while still standardizing on Ultracite.",
        question: "Who is the Zed setup best for?",
      },
    ],
    id: "zed",
    logo: zedLogo,
    name: "Zed",
    rules: {
      appendMode: true,
      path: ".rules",
    },
    seo: {
      metaDescription:
        "Configure Ultracite for Zed with native `.zed/settings.json` defaults and an appendable `.rules` file for shared repo standards.",
      summary:
        "Zed uses a native Ultracite setup with `.zed/settings.json` for editor behavior and an appendable `.rules` file for repo guidance, making it a strong fit for teams that want speed without config drift.",
    },
    subtitle: "The high-performance editor",
    workflowHighlights: [
      "Generate `.zed/settings.json` so Zed handles formatting, code actions, and TypeScript behavior the way Ultracite expects.",
      "Append Ultracite guidance into `.rules` so Zed keeps any existing repo instructions and gains a shared coding standard layer.",
      "Use the native Zed files as the source of truth instead of trying to mirror a VS Code setup in a different editor model.",
    ],
  },
];

const defaultHookCommand = "npx ultracite fix";

const getRulesPreview = (editor: Editor) => {
  const rules = getRules("npx", "your configured linter");

  if (!editor.rules?.header) {
    return rules;
  }

  return `${editor.rules.header}\n\n${rules}`;
};

const toEditorPageSource = (editor: Editor): EditorPageSource => ({
  config: {
    code: JSON.stringify(editor.config.getContent(), null, 2),
    extensionCommand: editor.config.extensionCommand,
    path: editor.config.path,
  },
  hooks: editor.hooks
    ? {
        code: JSON.stringify(
          editor.hooks.getContent(defaultHookCommand),
          null,
          2
        ),
        path: editor.hooks.path,
      }
    : undefined,
  id: editor.id,
  name: editor.name,
  rules: editor.rules
    ? {
        appendMode: editor.rules.appendMode,
        code: getRulesPreview(editor),
        path: editor.rules.path,
      }
    : undefined,
});

const getRelatedScore = (
  current: EditorPageCapabilities,
  candidate: EditorPageCapabilities
) => {
  let score = 0;

  if (current.family === candidate.family) {
    score += 4;
  }

  if (current.hasRules === candidate.hasRules) {
    score += 2;
  }

  if (current.hasHooks === candidate.hasHooks) {
    score += 2;
  }

  if (current.hasExtensionInstall === candidate.hasExtensionInstall) {
    score += 1;
  }

  return score;
};

export const getEditorById = (editorId: string) =>
  editors.find((editor) => editor.id === editorId);

export const getEditorPageCapabilities = (
  editor: Editor
): EditorPageCapabilities =>
  getEditorPageCapabilitiesFromSource(toEditorPageSource(editor));

export const getEditorSetupFiles = (editor: Editor): EditorSetupFile[] =>
  getEditorSetupFilesFromSource(toEditorPageSource(editor));

export const getRelatedEditors = (editor: Editor, limit = 3) => {
  const currentCapabilities = getEditorPageCapabilities(editor);

  return editors
    .filter((candidate) => candidate.id !== editor.id)
    .toSorted((left, right) => {
      const leftScore = getRelatedScore(
        currentCapabilities,
        getEditorPageCapabilities(left)
      );
      const rightScore = getRelatedScore(
        currentCapabilities,
        getEditorPageCapabilities(right)
      );

      if (leftScore !== rightScore) {
        return rightScore - leftScore;
      }

      return left.name.localeCompare(right.name);
    })
    .slice(0, limit);
};

export const getEditorPageData = (editor: Editor): EditorPageData => ({
  capabilities: getEditorPageCapabilities(editor),
  metaDescription: editor.seo.metaDescription,
  relatedEditors: getRelatedEditors(editor),
  setupFiles: getEditorSetupFiles(editor),
  title: `Ultracite for ${editor.name}`,
});
