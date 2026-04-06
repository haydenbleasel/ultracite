import type { StaticImageData } from "next/image";

import adalLogo from "../logos/adal.svg";
import aiderLogo from "../logos/aider.svg";
import amazonQLogo from "../logos/amazon-q.svg";
import ampLogo from "../logos/amp.svg";
import augmentcodeLogo from "../logos/augmentcode.svg";
import bobLogo from "../logos/bob.svg";
import claudeLogo from "../logos/claude.svg";
import clineLogo from "../logos/cline.svg";
import coderLogo from "../logos/coder.svg";
import codexLogo from "../logos/codex.svg";
import continueLogo from "../logos/continue.svg";
import copilotLogo from "../logos/copilot.svg";
import crushLogo from "../logos/crush.svg";
import cursorCliLogo from "../logos/cursor.svg";
import devinLogo from "../logos/devin.svg";
import droidLogo from "../logos/droid.svg";
import firebaseStudioLogo from "../logos/firebase-studio.svg";
import firebenderLogo from "../logos/firebender.svg";
import geminiLogo from "../logos/gemini.svg";
import gooseLogo from "../logos/goose.svg";
import julesLogo from "../logos/jules.svg";
import junieLogo from "../logos/junie.svg";
import kiloCodeLogo from "../logos/kilo-code.svg";
import kimiLogo from "../logos/kimi.svg";
import langchainLogo from "../logos/langchain.svg";
import lovableLogo from "../logos/lovable.svg";
import mcpjamLogo from "../logos/mcpjam.svg";
import mistralLogo from "../logos/mistral.svg";
import onaLogo from "../logos/ona.svg";
import openHandsLogo from "../logos/open-hands.svg";
import openclawLogo from "../logos/openclaw.svg";
import opencodeLogo from "../logos/opencode.svg";
import piLogo from "../logos/pi.svg";
import qoderLogo from "../logos/qoder.svg";
import qwenLogo from "../logos/qwen.svg";
import replitLogo from "../logos/replit.svg";
import rooCodeLogo from "../logos/roo-code.svg";
import snowflakeLogo from "../logos/snowflake.svg";
import vercelLogo from "../logos/vercel.svg";
import warpLogo from "../logos/warp.svg";
import zencoderLogo from "../logos/zencoder.svg";
import { getRules } from "./rules";
import type { HooksConfig } from "./types";

export interface AgentConfig {
  appendMode?: boolean;
  header?: string;
  path: string;
}

export interface AgentUseCase {
  description: string;
  title: string;
}

export interface AgentDifferentiator {
  description: string;
  icon: string;
  title: string;
}

export interface AgentFaq {
  answer: string;
  question: string;
}

export interface AgentContent {
  differentiators: AgentDifferentiator[];
  faq?: AgentFaq[];
  intro: string;
  metaDescription: string;
  useCases: AgentUseCase[];
}

export type AgentCategory =
  | "cloud-agent"
  | "editor-agent"
  | "ide-agent"
  | "open-source-agent"
  | "terminal-agent";

export interface Agent {
  category: AgentCategory;
  config: AgentConfig;
  content: AgentContent;
  description: string;
  hooks?: HooksConfig;
  id: string;
  logo: StaticImageData;
  logoFile: string;
  name: string;
  subtitle: string;
}

export interface AgentSetupFacts {
  configPath: string;
  hasHeader: boolean;
  hookPath?: string;
  hookSupport: boolean;
  writeMode: "append" | "replace";
}

const defaultRulesRunner = "npx";
const defaultRulesProviderName = "Biome";
const defaultHookPackageManager = "npm";
const defaultHookLinter = "biome";

const agentUseCase = (title: string, description: string): AgentUseCase => ({
  description,
  title,
});

const differentiator = (
  title: string,
  description: string,
  icon: string
): AgentDifferentiator => ({
  description,
  icon,
  title,
});

const runPackageScript = (
  packageManager: string,
  script: string,
  args: string[] = []
) => {
  const parts = [packageManager];

  if (packageManager === "npm") {
    parts.push("run");
  }

  parts.push(script);

  if (args.length > 0) {
    if (packageManager === "npm") {
      parts.push("--");
    }

    parts.push(...args);
  }

  return parts.join(" ");
};

export const getDefaultAgentHookCommand = () => {
  const args =
    defaultHookLinter === "biome" ? ["--skip=correctness/noUnusedImports"] : [];

  return runPackageScript(defaultHookPackageManager, "fix", args);
};

export const getDefaultAgentRulesContent = (agent: Agent) => {
  const rules = getRules(defaultRulesRunner, defaultRulesProviderName);

  return agent.config.header ? `${agent.config.header}\n\n${rules}` : rules;
};

export const getDefaultAgentHookContent = (agent: Agent) => {
  if (!agent.hooks) {
    return null;
  }

  return JSON.stringify(
    agent.hooks.getContent(getDefaultAgentHookCommand()),
    null,
    2
  );
};

export const getAgentSetupFacts = (agent: Agent): AgentSetupFacts => ({
  configPath: agent.config.path,
  hasHeader: Boolean(agent.config.header),
  hookPath: agent.hooks?.path,
  hookSupport: Boolean(agent.hooks),
  writeMode: agent.config.appendMode ? "append" : "replace",
});

export const agents: Agent[] = [
  {
    category: "terminal-agent",
    config: {
      appendMode: true,
      path: ".claude/CLAUDE.md",
    },
    content: {
      differentiators: [
        differentiator(
          "Terminal-native workflow",
          "Claude Code already lives in the terminal, so Ultracite guidance stays close to the commands, diffs, and review loops developers run every day.",
          "Terminal"
        ),
        differentiator(
          "Rules plus hooks",
          "Claude Code is one of the few agent integrations here that can pair repo instructions with an automatic PostToolUse hook for cleanup after edits.",
          "Workflow"
        ),
        differentiator(
          "Long-running repo work",
          "The integration works especially well for multi-file refactors where Claude Code needs explicit guardrails around architecture, typing, and conventions.",
          "GitBranch"
        ),
      ],
      faq: [
        {
          answer:
            "Ultracite writes the coding rules to `.claude/CLAUDE.md`. The optional hook config lives in `.claude/settings.json` and runs after file edits.",
          question: "Do I need both CLAUDE.md and settings.json?",
        },
        {
          answer:
            "The rules file is appended so you can keep existing project guidance in place. The hook config is merged separately in the settings file.",
          question: "Will Ultracite overwrite my existing Claude setup?",
        },
      ],
      intro:
        "Use Ultracite with Claude Code when you want an agentic terminal workflow to respect the same code standards your team expects from human contributors. It is a strong fit for repo-wide edits, review loops, and autonomous tasks where consistency matters as much as speed.",
      metaDescription:
        "Configure Claude Code with Ultracite so terminal-based agent runs follow your TypeScript, React, accessibility, and performance standards from the first edit.",
      useCases: [
        agentUseCase(
          "Repo-wide refactors from the terminal",
          "Give Claude Code clear repo instructions before it edits many files, renames APIs, or updates patterns across a monorepo."
        ),
        agentUseCase(
          "Remote and SSH-heavy development",
          "Keep standards close to terminal workflows when you work in remote environments where editor-specific settings are less useful."
        ),
        agentUseCase(
          "Teams standardizing autonomous runs",
          "Share one CLAUDE.md contract so multiple developers can run Claude Code without each session drifting into a different style."
        ),
      ],
    },
    description:
      "Anthropic's official CLI for Claude, an agentic coding tool that lives in your terminal.",
    hooks: {
      getContent: (command) => ({
        hooks: {
          PostToolUse: [
            {
              hooks: [
                {
                  command,
                  type: "command",
                },
              ],
              matcher: "Write|Edit",
            },
          ],
        },
      }),
      path: ".claude/settings.json",
    },
    id: "claude",
    logo: claudeLogo,
    logoFile: "claude.svg",
    name: "Claude Code",
    subtitle: "Anthropic's agentic CLI",
  },
  {
    category: "cloud-agent",
    config: {
      appendMode: true,
      path: "AGENTS.md",
    },
    content: {
      differentiators: [
        differentiator(
          "Cloud-run task execution",
          "Codex works asynchronously, so Ultracite gives each remote task the same repo-aware instructions without relying on local editor state.",
          "Cloud"
        ),
        differentiator(
          "AGENTS.md compatibility",
          "The integration uses the same `AGENTS.md` convention many agent tools understand, making it easy to share repo guidance across systems.",
          "Layers"
        ),
        differentiator(
          "Clean handoffs",
          "Codex benefits from explicit standards when tasks are delegated, reviewed later, or resumed in a fresh cloud context.",
          "Bot"
        ),
      ],
      faq: [
        {
          answer:
            "No. Ultracite appends its guidance to `AGENTS.md`, so you can keep broader repo notes and add coding standards in the same place.",
          question: "Does Codex need a separate rules file format?",
        },
        {
          answer:
            "Yes. Because Codex tasks may execute remotely, putting repo guidance in `AGENTS.md` ensures every run starts with the same shared contract.",
          question: "Why is AGENTS.md useful for Codex specifically?",
        },
      ],
      intro:
        "Use Ultracite with Codex when you want cloud-executed development tasks to inherit the same standards you apply in local workflows. It is well suited to delegated implementation, long-running async work, and repos where handoff quality matters.",
      metaDescription:
        "Add Ultracite to Codex via AGENTS.md so OpenAI's coding agent produces repo-aware code that matches your team's linting and architecture standards.",
      useCases: [
        agentUseCase(
          "Async background implementation",
          "Give Codex a stable repo contract before it works through larger tasks outside your interactive editor session."
        ),
        agentUseCase(
          "Cross-repo standardization",
          "Use the same AGENTS.md pattern across repositories so Codex starts every task with familiar instructions and expectations."
        ),
        agentUseCase(
          "Review-heavy delivery",
          "Reduce cleanup during review by making type safety, accessibility, and framework conventions explicit before Codex writes code."
        ),
      ],
    },
    description:
      "OpenAI's cloud-based coding agent for autonomous software development tasks.",
    id: "codex",
    logo: codexLogo,
    logoFile: "codex.svg",
    name: "Codex",
    subtitle: "OpenAI's coding agent",
  },
  {
    category: "cloud-agent",
    config: {
      appendMode: true,
      path: "AGENTS.md",
    },
    content: {
      differentiators: [
        differentiator(
          "Built for background work",
          "Jules runs asynchronously, so shared repo instructions matter more than local IDE settings or one-off chat prompts.",
          "Clock3"
        ),
        differentiator(
          "Low-friction setup",
          "Jules uses `AGENTS.md`, which keeps the integration simple and portable across repos without another custom config surface.",
          "Command"
        ),
        differentiator(
          "Strong for queued tasks",
          "Ultracite helps Jules keep standards intact when it works through queued fixes, migrations, or codebase chores over time.",
          "Workflow"
        ),
      ],
      intro:
        "Use Ultracite with Jules when you want a background coding agent to start from explicit repo standards instead of ad hoc prompts. It fits teams that queue work for async execution and still want predictable code shape when the result comes back.",
      metaDescription:
        "Configure Jules with Ultracite through AGENTS.md so Google's async coding agent returns code that matches your repo standards and review expectations.",
      useCases: [
        agentUseCase(
          "Queued maintenance work",
          "Keep standards stable when Jules handles dependency updates, cleanup tasks, or incremental fixes in the background."
        ),
        agentUseCase(
          "Distributed team handoffs",
          "Give every async run the same instructions so results stay consistent even when different teammates trigger the work."
        ),
        agentUseCase(
          "Multi-repo automation",
          "Reuse the same AGENTS.md pattern across several codebases where Jules needs clear project-specific expectations."
        ),
      ],
    },
    description:
      "Google's asynchronous AI coding agent that works in the background to complete development tasks.",
    id: "jules",
    logo: julesLogo,
    logoFile: "jules.svg",
    name: "Jules",
    subtitle: "Google's async agent",
  },
  {
    category: "cloud-agent",
    config: {
      appendMode: true,
      path: "replit.md",
    },
    content: {
      differentiators: [
        differentiator(
          "Workspace-native instructions",
          "Replit Agent already expects repo guidance in `replit.md`, so Ultracite can fit naturally into the browser workflow without introducing another config surface.",
          "Cloud"
        ),
        differentiator(
          "Fast prototype-to-product loop",
          "Replit is strong for building quickly in the browser, and explicit repo rules help generated code stay maintainable once the project grows beyond a demo.",
          "Rocket"
        ),
        differentiator(
          "Collaborative workspace fit",
          "Because Replit projects are often shared across teammates, a committed rules file helps keep the coding contract stable between sessions and handoffs.",
          "Users"
        ),
      ],
      intro:
        "Use Ultracite with Replit Agent when you want browser-based app generation to stay aligned with the same standards you expect in a maintained codebase. It is especially useful for full-stack products that start fast, but still need reviewable, team-friendly code as they evolve.",
      metaDescription:
        "Configure Replit Agent with Ultracite through replit.md so browser-based app generation follows your repo's linting, architecture, and framework standards.",
      useCases: [
        agentUseCase(
          "Browser-based full-stack building",
          "Give Replit Agent a durable repo contract before it generates frontend, backend, and configuration code in the same workspace."
        ),
        agentUseCase(
          "Prototypes that need guardrails",
          "Keep early product iterations aligned with your team's typing, accessibility, and architecture expectations."
        ),
        agentUseCase(
          "Shared cloud workspaces",
          "Use one committed `replit.md` file so collaborators get the same coding guidance every time they open the project."
        ),
      ],
    },
    description:
      "Replit's cloud agent for building and iterating on apps directly in the browser.",
    id: "replit",
    logo: replitLogo,
    logoFile: "replit.svg",
    name: "Replit Agent",
    subtitle: "Replit's cloud agent",
  },
  {
    category: "cloud-agent",
    config: {
      appendMode: true,
      path: "AGENTS.md",
    },
    content: {
      differentiators: [
        differentiator(
          "Agent-first execution",
          "Devin is built around autonomous software work, so explicit repo rules help long-running tasks come back as reviewable changes instead of cleanup-heavy drafts.",
          "Bot"
        ),
        differentiator(
          "Native AGENTS.md support",
          "Devin uses `AGENTS.md`, which keeps the integration portable and consistent with other cloud agents already in the Ultracite dataset.",
          "Layers"
        ),
        differentiator(
          "Strong for multi-step tasks",
          "Persistent repo guidance helps Devin stay aligned across investigation, implementation, and follow-up passes on the same task.",
          "Workflow"
        ),
      ],
      intro:
        "Use Ultracite with Devin when you want delegated engineering work to stay inside a clear repo contract from the first file read to the final patch. It is a strong fit for teams assigning real implementation work and expecting the result to hold up in review.",
      metaDescription:
        "Add Ultracite to Devin through AGENTS.md so Cognition's software engineering agent follows your repo's linting, architecture, and framework standards.",
      useCases: [
        agentUseCase(
          "Asynchronous task delegation",
          "Give Devin a stable repo contract before it works through larger implementation tasks outside the normal interactive development loop."
        ),
        agentUseCase(
          "Review-ready autonomous patches",
          "Reduce cleanup during review by making naming, typing, and framework conventions explicit before the task starts."
        ),
        agentUseCase(
          "Multi-step bug investigation",
          "Keep standards stable while Devin traces behavior, updates code in several places, and iterates on a fix."
        ),
      ],
    },
    description:
      "Cognition's autonomous software engineering agent for completing development tasks in the background.",
    id: "devin",
    logo: devinLogo,
    logoFile: "devin.svg",
    name: "Devin",
    subtitle: "Cognition's async agent",
  },
  {
    category: "cloud-agent",
    config: {
      appendMode: true,
      path: "AGENTS.md",
    },
    content: {
      differentiators: [
        differentiator(
          "Product-focused generation",
          "Lovable can move from prompt to working app quickly, so explicit repo rules help generated code stay maintainable once the prototype becomes a real product.",
          "Sparkles"
        ),
        differentiator(
          "Portable repo guidance",
          "Using `AGENTS.md` gives Lovable a committed project contract that can live alongside other agent tools instead of hiding standards in workspace-only settings.",
          "Layers"
        ),
        differentiator(
          "Better prototype handoff",
          "Ultracite helps Lovable output feel closer to team-owned production code, which makes the handoff from idea to review much smoother.",
          "ShieldCheck"
        ),
      ],
      intro:
        "Use Ultracite with Lovable when you want fast app generation without dropping the quality bar your team expects from maintained code. It is especially helpful when a quick prototype is likely to turn into a shipped product with ongoing review and iteration.",
      metaDescription:
        "Configure Lovable with Ultracite through AGENTS.md so AI-generated apps follow your repo's coding, architecture, and review standards from the first commit.",
      useCases: [
        agentUseCase(
          "Prompt-to-product builds",
          "Keep Lovable aligned when a generated app moves beyond a demo and into a codebase your team will keep shipping."
        ),
        agentUseCase(
          "Rapid iteration with guardrails",
          "Make architecture, typing, and framework conventions explicit before Lovable generates new pages, flows, or backend logic."
        ),
        agentUseCase(
          "Shared product experiments",
          "Use one committed AGENTS.md file so follow-up sessions and teammates inherit the same coding expectations."
        ),
      ],
    },
    description:
      "Lovable's AI app builder for generating and iterating on full-stack products in the cloud.",
    id: "lovable",
    logo: lovableLogo,
    logoFile: "lovable.svg",
    name: "Lovable",
    subtitle: "Lovable's app builder",
  },
  {
    category: "editor-agent",
    config: {
      appendMode: true,
      path: "AGENTS.md",
    },
    content: {
      differentiators: [
        differentiator(
          "IDE-first guidance",
          "Zencoder is designed to work close to the editor, so a committed `AGENTS.md` file helps steer generated edits before they become review feedback.",
          "Monitor"
        ),
        differentiator(
          "Portable repo contract",
          "Using `AGENTS.md` keeps Zencoder aligned with the same repository guidance other agent tools can reuse across the stack.",
          "Layers"
        ),
        differentiator(
          "Useful for team handoffs",
          "Explicit repo standards help Zencoder stay consistent when several developers bounce between the same editor-assisted workflow.",
          "Users"
        ),
      ],
      intro:
        "Use Ultracite with Zencoder when you want an editor-native coding agent to follow the same repo contract your team expects from human contributors. It fits best when AI-assisted edits happen close to the IDE, but still need to land cleanly in review.",
      metaDescription:
        "Configure Zencoder with Ultracite through AGENTS.md so its IDE agent follows your repo's linting, architecture, and framework standards.",
      useCases: [
        agentUseCase(
          "Editor-assisted implementation",
          "Guide Zencoder before it creates or edits files so the first draft already reflects your repo conventions."
        ),
        agentUseCase(
          "Shared IDE workflows",
          "Use one committed AGENTS.md file so teammates get the same coding contract in every Zencoder session."
        ),
        agentUseCase(
          "Review-conscious AI edits",
          "Reduce cleanup after editor-side generations by making typing, naming, and structure explicit upfront."
        ),
      ],
    },
    description:
      "Zencoder's IDE coding agent for generating and refining code inside the editor workflow.",
    id: "zencoder",
    logo: zencoderLogo,
    logoFile: "zencoder.svg",
    name: "Zencoder",
    subtitle: "Zencoder's IDE agent",
  },
  {
    category: "cloud-agent",
    config: {
      appendMode: true,
      path: "AGENTS.md",
    },
    content: {
      differentiators: [
        differentiator(
          "Background-first execution",
          "Ona is designed around delegated work, so a committed repo contract helps long-running tasks return reviewable code instead of cleanup-heavy drafts.",
          "Cloud"
        ),
        differentiator(
          "Shared AGENTS.md setup",
          "Using `AGENTS.md` keeps the integration simple and portable across repositories without introducing another product-specific file.",
          "Layers"
        ),
        differentiator(
          "Strong for async delivery",
          "Ultracite gives Ona a stable coding baseline before work is handed off, resumed later, or reviewed by another teammate.",
          "Workflow"
        ),
      ],
      intro:
        "Use Ultracite with Ona when you want cloud-executed engineering work to inherit the same repo standards your team uses locally. It is a strong fit for async delivery where handoff quality matters as much as speed.",
      metaDescription:
        "Add Ultracite to Ona through AGENTS.md so its cloud agent follows your repo's linting, architecture, and framework standards.",
      useCases: [
        agentUseCase(
          "Delegated background work",
          "Give Ona a durable repo contract before it works through larger implementation tasks asynchronously."
        ),
        agentUseCase(
          "Multi-repo consistency",
          "Reuse the same AGENTS.md pattern across repositories where Ona needs explicit project expectations."
        ),
        agentUseCase(
          "Review-ready delivery",
          "Reduce cleanup during review by making accessibility, naming, and architecture expectations explicit before code is written."
        ),
      ],
    },
    description:
      "Ona's cloud coding agent for asynchronous implementation and engineering tasks.",
    id: "ona",
    logo: onaLogo,
    logoFile: "ona.svg",
    name: "Ona",
    subtitle: "Ona's cloud agent",
  },
  {
    category: "open-source-agent",
    config: {
      appendMode: true,
      path: "AGENTS.md",
    },
    content: {
      differentiators: [
        differentiator(
          "Open-source agent gateway",
          "OpenClaw benefits from an explicit repo contract because it can orchestrate several coding flows across an open, self-hostable stack.",
          "Globe"
        ),
        differentiator(
          "Portable AGENTS.md contract",
          "Using `AGENTS.md` keeps OpenClaw aligned with a convention that is easy to commit, audit, and reuse across repos.",
          "Layers"
        ),
        differentiator(
          "Reproducible experiments",
          "Committed repo guidance makes OpenClaw easier to evaluate across environments because the same standards follow every run.",
          "ShieldCheck"
        ),
      ],
      intro:
        "Use Ultracite with OpenClaw when you want an open-source agent stack to follow explicit repo guidance instead of relying on ad hoc prompts. It is especially useful for teams experimenting with self-hosted or reproducible AI development workflows.",
      metaDescription:
        "Configure OpenClaw with Ultracite through AGENTS.md so its open-source agent stack follows your repo's implementation and review standards.",
      useCases: [
        agentUseCase(
          "Self-hosted agent experiments",
          "Keep OpenClaw grounded when you evaluate autonomous coding workflows in your own infrastructure."
        ),
        agentUseCase(
          "Reproducible repo demos",
          "Use a committed AGENTS.md file so contributors can see the same repo guidance every time OpenClaw runs."
        ),
        agentUseCase(
          "Open-source team workflows",
          "Share one durable coding contract so multiple users can run OpenClaw without style drift."
        ),
      ],
    },
    description:
      "An open-source agent gateway for orchestrating coding workflows with a committed repo contract.",
    id: "openclaw",
    logo: openclawLogo,
    logoFile: "openclaw.svg",
    name: "OpenClaw",
    subtitle: "Open-source agent gateway",
  },
  {
    category: "terminal-agent",
    config: {
      appendMode: true,
      path: "AGENTS.md",
    },
    content: {
      differentiators: [
        differentiator(
          "Terminal-native control",
          "Continue can work close to terminal and automation workflows, so repo guidance helps keep broad code changes aligned with the project contract.",
          "Terminal"
        ),
        differentiator(
          "Simple AGENTS.md adoption",
          "Using `AGENTS.md` gives Continue a repo-scoped instruction file that is easy to review and reuse across environments.",
          "Layers"
        ),
        differentiator(
          "Good for iterative agent loops",
          "Ultracite helps Continue stay consistent during repeated investigate-edit-review cycles where drift can build up over time.",
          "Workflow"
        ),
      ],
      intro:
        "Use Ultracite with Continue when you want terminal-driven agent work to stay anchored to a committed repo contract. It is a practical fit for teams that want lightweight adoption without giving up reviewable code quality.",
      metaDescription:
        "Configure Continue with Ultracite through AGENTS.md so its terminal agent follows your repo's linting, architecture, and framework standards.",
      useCases: [
        agentUseCase(
          "Terminal-heavy development",
          "Keep Continue aligned while you switch between shell commands, repo analysis, and code generation."
        ),
        agentUseCase(
          "Fast iterative fixes",
          "Use a committed AGENTS.md file to stabilize behavior across several short agent loops in the same task."
        ),
        agentUseCase(
          "Portable repo guidance",
          "Reuse one repo contract across environments where Continue needs clear coding expectations."
        ),
      ],
    },
    description:
      "Continue's terminal coding agent for iterative implementation and repo-aware edits.",
    id: "continue",
    logo: continueLogo,
    logoFile: "continue.svg",
    name: "Continue",
    subtitle: "Continue's terminal agent",
  },
  {
    category: "cloud-agent",
    config: {
      appendMode: true,
      path: "AGENTS.md",
    },
    content: {
      differentiators: [
        differentiator(
          "Data-platform context",
          "Snowflake Cortex sits close to data and platform workflows, so explicit repo guidance helps generated code stay aligned with broader engineering standards.",
          "Cloud"
        ),
        differentiator(
          "Shared AGENTS.md contract",
          "Using `AGENTS.md` keeps Cortex guidance portable and easy to commit even when code spans data, application, and operational concerns.",
          "Layers"
        ),
        differentiator(
          "Useful for full-stack data work",
          "Ultracite helps Cortex produce changes that are easier to review when SQL-adjacent logic and app code live in the same repository.",
          "Boxes"
        ),
      ],
      intro:
        "Use Ultracite with Snowflake Cortex when you want cloud-connected code generation to respect the same repo standards your team expects across application and data-oriented work. It is especially useful where data logic and shipped code evolve together.",
      metaDescription:
        "Add Ultracite to Snowflake Cortex through AGENTS.md so cloud-connected engineering work follows your repo's coding and review standards.",
      useCases: [
        agentUseCase(
          "Data-aware application repos",
          "Keep Cortex aligned when application code, data logic, and supporting scripts change together."
        ),
        agentUseCase(
          "Platform-connected features",
          "Use a committed repo contract before Cortex works on code that touches product and platform concerns in the same task."
        ),
        agentUseCase(
          "Review-friendly data workflows",
          "Reduce cleanup by making naming, typing, and structure explicit before cloud-generated changes reach review."
        ),
      ],
    },
    description:
      "Snowflake's cloud AI platform for engineering and data-adjacent development workflows.",
    id: "snowflake-cortex",
    logo: snowflakeLogo,
    logoFile: "snowflake-cortex.svg",
    name: "Snowflake Cortex",
    subtitle: "Snowflake's AI platform agent",
  },
  {
    category: "terminal-agent",
    config: {
      appendMode: true,
      path: "AGENTS.md",
    },
    content: {
      differentiators: [
        differentiator(
          "Framework-backed autonomy",
          "Deepagents is built for multi-step agent flows, so explicit repo standards help each step stay aligned with the codebase contract.",
          "Bot"
        ),
        differentiator(
          "Portable AGENTS.md file",
          "Using `AGENTS.md` keeps guidance close to the repo rather than hidden in agent runtime settings.",
          "Layers"
        ),
        differentiator(
          "Good for long task chains",
          "Committed repo instructions help Deepagents stay consistent across research, planning, and implementation passes.",
          "Workflow"
        ),
      ],
      intro:
        "Use Ultracite with Deepagents when you want agentic task chains to inherit the same repo standards your team expects from direct edits. It is a good fit for multi-step work where consistency matters across several sub-tasks.",
      metaDescription:
        "Configure Deepagents with Ultracite through AGENTS.md so terminal agent workflows follow your repo's linting, architecture, and review standards.",
      useCases: [
        agentUseCase(
          "Multi-step implementation flows",
          "Keep Deepagents aligned when one task spans research, coding, and several follow-up changes."
        ),
        agentUseCase(
          "Agent framework prototypes",
          "Use a committed repo contract while you experiment with Deepagents in real repositories."
        ),
        agentUseCase(
          "Structured autonomous work",
          "Reduce drift by giving every Deepagents run the same durable coding baseline."
        ),
      ],
    },
    description:
      "LangChain's deep agent framework for multi-step terminal-driven coding workflows.",
    id: "deepagents",
    logo: langchainLogo,
    logoFile: "deepagents.svg",
    name: "Deepagents",
    subtitle: "LangChain's deep agent framework",
  },
  {
    category: "terminal-agent",
    config: {
      appendMode: true,
      path: "AGENTS.md",
    },
    content: {
      differentiators: [
        differentiator(
          "CLI-first coding flow",
          "Qoder works well in terminal-centric development, so a committed repo contract helps generated patches stay aligned with local workflows.",
          "Terminal"
        ),
        differentiator(
          "Shared AGENTS.md setup",
          "Using `AGENTS.md` keeps the integration portable and easy to audit when Qoder is used across several repositories.",
          "Layers"
        ),
        differentiator(
          "Fast prompt-to-patch loops",
          "Ultracite gives Qoder a stable baseline during rapid iteration where output quality can otherwise vary widely.",
          "Gauge"
        ),
      ],
      intro:
        "Use Ultracite with Qoder when you want a fast CLI coding agent to move quickly without abandoning the repo standards your team depends on. It is a strong fit for terminal-heavy workflows and quick implementation loops.",
      metaDescription:
        "Add Ultracite to Qoder through AGENTS.md so its coding CLI follows your repo's linting, architecture, and framework standards.",
      useCases: [
        agentUseCase(
          "Fast terminal iteration",
          "Keep Qoder aligned while you move quickly from prompt to patch and refine the result in the shell."
        ),
        agentUseCase(
          "Portable repo setup",
          "Reuse one AGENTS.md pattern across repositories where Qoder needs explicit project expectations."
        ),
        agentUseCase(
          "Review-conscious generation",
          "Make repo standards explicit before terminal-generated edits reach human review."
        ),
      ],
    },
    description:
      "Qoder's terminal coding agent for fast prompt-to-patch development loops.",
    id: "qoder",
    logo: qoderLogo,
    logoFile: "qoder.svg",
    name: "Qoder",
    subtitle: "Qoder's terminal agent",
  },
  {
    category: "terminal-agent",
    config: {
      appendMode: true,
      path: "AGENTS.md",
    },
    content: {
      differentiators: [
        differentiator(
          "Dedicated coding CLI",
          "Kimi CLI is built for agentic coding from the terminal, so committed repo standards help broad natural-language tasks resolve into consistent implementation choices.",
          "Command"
        ),
        differentiator(
          "Portable AGENTS.md contract",
          "The integration uses a shared repo file that is easy to commit, review, and reuse across codebases.",
          "Layers"
        ),
        differentiator(
          "Useful for rapid iteration",
          "Ultracite helps Kimi CLI stay disciplined during fast prompt-driven loops where output quality can otherwise swing a lot.",
          "Gauge"
        ),
      ],
      intro:
        "Use Ultracite with Kimi CLI when you want a coding-focused terminal agent to move quickly without drifting away from your repo's standards. It is a practical fit for natural-language tasking and shell-first development.",
      metaDescription:
        "Configure Kimi CLI with Ultracite through AGENTS.md so its coding agent follows your repo's linting, architecture, and framework standards.",
      useCases: [
        agentUseCase(
          "Natural-language terminal tasking",
          "Keep Kimi CLI aligned when broad prompt requests need to turn into code that still fits the project."
        ),
        agentUseCase(
          "Fast fix loops",
          "Use a committed repo contract to stabilize output during quick terminal-driven iterations."
        ),
        agentUseCase(
          "Shared coding standards",
          "Reuse one AGENTS.md file across repos where Kimi CLI needs explicit project guidance."
        ),
      ],
    },
    description:
      "Kimi's terminal coding CLI for natural-language implementation tasks.",
    id: "kimi-cli",
    logo: kimiLogo,
    logoFile: "kimi-cli.svg",
    name: "Kimi CLI",
    subtitle: "Kimi's coding CLI",
  },
  {
    category: "cloud-agent",
    config: {
      appendMode: true,
      path: "AGENTS.md",
    },
    content: {
      differentiators: [
        differentiator(
          "Cloud-based MCP workflow",
          "MCPJam fits hosted coordination and evaluation workflows, so a committed repo contract helps keep generated changes aligned with project standards.",
          "Cloud"
        ),
        differentiator(
          "Shared AGENTS.md convention",
          "Using `AGENTS.md` gives MCPJam a portable repo instruction file that works well across several projects and collaborators.",
          "Layers"
        ),
        differentiator(
          "Good for tool-rich experiments",
          "Ultracite helps MCPJam stay consistent when work spans several tools, prompts, and follow-up iterations.",
          "Workflow"
        ),
      ],
      intro:
        "Use Ultracite with MCPJam when you want hosted, tool-connected agent workflows to follow the same repo standards your team expects elsewhere. It is especially useful when experimentation still needs a durable project contract behind it.",
      metaDescription:
        "Configure MCPJam with Ultracite through AGENTS.md so hosted agent workflows follow your repo's implementation and review standards.",
      useCases: [
        agentUseCase(
          "Tool-rich hosted workflows",
          "Keep MCPJam aligned when a task moves across several connected tools before changes land in the repo."
        ),
        agentUseCase(
          "Experimentation with guardrails",
          "Use AGENTS.md so exploratory agent work still respects the project's coding standards."
        ),
        agentUseCase(
          "Shared project contracts",
          "Commit one repo-level file so MCPJam sessions start from the same expectations every time."
        ),
      ],
    },
    description:
      "MCPJam's cloud agent workflow for connected, repo-aware engineering tasks.",
    id: "mcpjam",
    logo: mcpjamLogo,
    logoFile: "mcpjam.svg",
    name: "MCPJam",
    subtitle: "MCPJam's cloud agent",
  },
  {
    category: "cloud-agent",
    config: {
      appendMode: true,
      path: "AGENTS.md",
    },
    content: {
      differentiators: [
        differentiator(
          "Background agent execution",
          "Mux is built for asynchronous agent work, so explicit repo rules help the result come back reviewable and consistent.",
          "Cloud"
        ),
        differentiator(
          "Portable AGENTS.md setup",
          "Using `AGENTS.md` keeps Mux aligned with a repo-level convention that is easy to version and share across workspaces.",
          "Layers"
        ),
        differentiator(
          "Strong for queued tasks",
          "Ultracite helps Mux keep standards intact when several background tasks or workspaces touch the same repository over time.",
          "Workflow"
        ),
      ],
      intro:
        "Use Ultracite with Mux when you want background coding agents to follow the same repo standards your team expects from local development. It is a strong fit for queued work, parallel sessions, and async implementation handoffs.",
      metaDescription:
        "Add Ultracite to Mux through AGENTS.md so its background agents follow your repo's coding and review standards.",
      useCases: [
        agentUseCase(
          "Queued background implementation",
          "Give Mux a stable repo contract before several async tasks work through the same codebase."
        ),
        agentUseCase(
          "Parallel agent workspaces",
          "Use one AGENTS.md file so multiple workspaces inherit the same standards and expectations."
        ),
        agentUseCase(
          "Review-ready async delivery",
          "Reduce cleanup by making naming, structure, and framework conventions explicit before work starts."
        ),
      ],
    },
    description:
      "Coder's background agent system for cloud-executed engineering tasks across workspaces.",
    id: "mux",
    logo: coderLogo,
    logoFile: "coder.svg",
    name: "Mux",
    subtitle: "Coder's background agents",
  },
  {
    category: "terminal-agent",
    config: {
      appendMode: true,
      path: "AGENTS.md",
    },
    content: {
      differentiators: [
        differentiator(
          "Terminal-first coding flow",
          "Pi lives close to the shell, so a committed repo contract helps AI assistance stay disciplined while you work through real repository changes.",
          "Terminal"
        ),
        differentiator(
          "Simple AGENTS.md contract",
          "Using `AGENTS.md` gives Pi a portable setup that is easy to commit and reuse across several projects.",
          "Layers"
        ),
        differentiator(
          "Good for focused implementation",
          "Ultracite helps Pi stay consistent during fast prompt-to-code loops where output quality needs guardrails.",
          "Gauge"
        ),
      ],
      intro:
        "Use Ultracite with Pi when you want a shell-first coding agent to move quickly without drifting away from your repo standards. It is a good fit for focused terminal work and fast iteration.",
      metaDescription:
        "Configure Pi with Ultracite through AGENTS.md so its coding CLI follows your repo's linting, architecture, and framework standards.",
      useCases: [
        agentUseCase(
          "Focused terminal tasks",
          "Keep Pi aligned on quick fixes and small features where speed matters but standards still matter too."
        ),
        agentUseCase(
          "Portable repo guidance",
          "Use one AGENTS.md file so Pi behaves consistently across different repositories and environments."
        ),
        agentUseCase(
          "Prompt-driven coding loops",
          "Anchor output in repo rules so concise interactions still produce reviewable code."
        ),
      ],
    },
    description:
      "Pi's shell-first coding CLI for focused implementation and repo-aware edits.",
    id: "pi",
    logo: piLogo,
    logoFile: "pi.svg",
    name: "Pi",
    subtitle: "Pi's coding CLI",
  },
  {
    category: "terminal-agent",
    config: {
      appendMode: true,
      path: "AGENTS.md",
    },
    content: {
      differentiators: [
        differentiator(
          "CLI-oriented coding flow",
          "AdaL fits shell-based implementation work, so explicit repo standards help prompt-driven edits stay consistent with the existing codebase.",
          "Terminal"
        ),
        differentiator(
          "Portable AGENTS.md contract",
          "Using `AGENTS.md` gives AdaL a simple, shareable setup that works across repositories and contributors.",
          "Layers"
        ),
        differentiator(
          "Good for repeated task loops",
          "Ultracite keeps AdaL aligned across several small implementation steps where drift can otherwise build up quickly.",
          "Workflow"
        ),
      ],
      intro:
        "Use Ultracite with AdaL when you want a coding CLI to stay inside a durable repo contract instead of relying on repeated prompt context. It is a good fit for shell-first development and iterative implementation work.",
      metaDescription:
        "Configure AdaL with Ultracite through AGENTS.md so its coding CLI follows your repo's linting, architecture, and framework standards.",
      useCases: [
        agentUseCase(
          "Shell-first development",
          "Keep AdaL aligned while you move between commands, repo inspection, and generated edits in the terminal."
        ),
        agentUseCase(
          "Iterative implementation loops",
          "Use a committed repo contract to stabilize behavior across several small prompt-to-edit cycles."
        ),
        agentUseCase(
          "Cross-project reuse",
          "Reuse one AGENTS.md pattern across repos where AdaL needs explicit project expectations."
        ),
      ],
    },
    description:
      "Sylph's coding CLI for shell-first implementation and repo-aware edits.",
    id: "adal",
    logo: adalLogo,
    logoFile: "adal.svg",
    name: "AdaL",
    subtitle: "Sylph's coding CLI",
  },
  {
    category: "editor-agent",
    config: {
      appendMode: true,
      path: "AGENTS.md",
    },
    content: {
      differentiators: [
        differentiator(
          "Editor-first guidance",
          "GitHub Copilot benefits from repo instructions that shape inline completions and chat-assisted edits inside the normal development loop.",
          "Github"
        ),
        differentiator(
          "Shared AGENTS.md contract",
          "Copilot can now read `AGENTS.md`, which lets teams keep one committed repo contract across Copilot and other compatible agents.",
          "Layers"
        ),
        differentiator(
          "Optional edit hooks",
          "Copilot can pair instructions with a follow-up hook config, which makes it easier to auto-run fixers after AI-driven edits.",
          "Workflow"
        ),
      ],
      faq: [
        {
          answer:
            "Ultracite now writes Copilot guidance to `AGENTS.md`, which GitHub Copilot can read alongside other compatible tools. That keeps one shared repo contract instead of a Copilot-only file.",
          question: "Why does Ultracite use AGENTS.md for Copilot now?",
        },
        {
          answer:
            "If you enable hooks, Ultracite also writes `.github/hooks/ultracite.json` so post-edit fixes can run automatically after Copilot changes files.",
          question: "Can Copilot use hooks as well as instructions?",
        },
      ],
      intro:
        "Use Ultracite with GitHub Copilot when you want inline completions, chat suggestions, and editor-side edits to stay inside your project's coding contract. It is especially useful for teams that rely on Copilot daily and want fewer stylistic cleanups during review.",
      metaDescription:
        "Set up GitHub Copilot with Ultracite via AGENTS.md so suggestions and AI-assisted edits follow your repo's formatting and framework standards.",
      useCases: [
        agentUseCase(
          "Day-to-day editor assistance",
          "Keep Copilot's inline suggestions aligned with your repo standards while developers stay inside their normal IDE workflow."
        ),
        agentUseCase(
          "Large teams using Copilot Chat",
          "Share one AGENTS.md file so Copilot behaves consistently across many contributors, feature branches, and compatible agent tools."
        ),
        agentUseCase(
          "Automated post-edit cleanup",
          "Pair Copilot instructions with hooks when you want formatting and fix steps to run after AI edits land in the working tree."
        ),
      ],
    },
    description:
      "GitHub's AI pair programmer that suggests code completions and helps write code faster.",
    hooks: {
      getContent: (command) => ({
        hooks: {
          PostToolUse: [
            {
              command,
              type: "command",
            },
          ],
        },
      }),
      path: ".github/hooks/ultracite.json",
    },
    id: "copilot",
    logo: copilotLogo,
    logoFile: "copilot.svg",
    name: "GitHub Copilot",
    subtitle: "GitHub's AI pair programmer",
  },
  {
    category: "editor-agent",
    config: {
      appendMode: true,
      path: "AGENTS.md",
    },
    content: {
      differentiators: [
        differentiator(
          "VS Code-native autonomous flow",
          "Cline acts directly inside VS Code, and `AGENTS.md` lets Ultracite shape autonomous edits where developers already review and approve changes.",
          "Monitor"
        ),
        differentiator(
          "Portable repo guidance",
          "Using `AGENTS.md` keeps Cline aligned with the same repository guidance other compatible agent tools can reuse.",
          "Layers"
        ),
        differentiator(
          "Good fit for repo exploration",
          "Cline often works through multi-step repo tasks, and explicit standards help it make consistent decisions across repeated edits.",
          "FolderGit2"
        ),
      ],
      intro:
        "Use Ultracite with Cline when you want an autonomous VS Code agent to make changes that already match your repo rules. It is a practical fit for developers who approve edits in-editor and want less style drift from long multi-file sessions.",
      metaDescription:
        "Configure Cline with Ultracite through AGENTS.md so autonomous VS Code edits follow your repo's linting, React, and TypeScript standards.",
      useCases: [
        agentUseCase(
          "Autonomous edits in VS Code",
          "Guide Cline before it creates or modifies files so the first draft already reflects your team's standards."
        ),
        agentUseCase(
          "Mixed human and AI workflows",
          "Keep repo guidance in the same tool where developers inspect diffs, accept changes, and continue iterating."
        ),
        agentUseCase(
          "Cross-tool repo standards",
          "Use one AGENTS.md file when you want Cline and other compatible agents to inherit the same coding contract."
        ),
      ],
    },
    description:
      "An autonomous coding agent for VS Code that can create and edit files, run commands, and more.",
    id: "cline",
    logo: clineLogo,
    logoFile: "cline.svg",
    name: "Cline",
    subtitle: "Autonomous VS Code agent",
  },
  {
    category: "cloud-agent",
    config: {
      appendMode: true,
      path: "AGENTS.md",
    },
    content: {
      differentiators: [
        differentiator(
          "Codebase-aware assistant",
          "AMP is designed around understanding larger repositories, which makes explicit repo standards especially valuable during search-heavy tasks.",
          "BrainCircuit"
        ),
        differentiator(
          "Shared repo contract",
          "Using `AGENTS.md` keeps Ultracite guidance portable and easy to audit when Sourcegraph-powered workflows move between repositories.",
          "GitBranch"
        ),
        differentiator(
          "Strong for review preparation",
          "The setup helps AMP produce changes that are easier to review because expectations are clear before the first file is touched.",
          "ShieldCheck"
        ),
      ],
      intro:
        "Use Ultracite with AMP when you want a codebase-aware agent to combine semantic repo understanding with explicit implementation standards. It works best in larger projects where context retrieval is powerful, but style drift can still slow reviews down.",
      metaDescription:
        "Add Ultracite to AMP via AGENTS.md so Sourcegraph's coding agent uses repo-aware search with explicit code quality and architecture guidance.",
      useCases: [
        agentUseCase(
          "Large codebase navigation",
          "Give AMP a stable implementation contract before it reasons across many packages, modules, or services."
        ),
        agentUseCase(
          "Review-ready patches",
          "Reduce cleanup work after search-driven edits by making naming, typing, and framework conventions explicit upfront."
        ),
        agentUseCase(
          "Sourcegraph-heavy teams",
          "Keep one repo-level instruction file for teams already leaning on Sourcegraph to answer code questions and generate fixes."
        ),
      ],
    },
    description:
      "Sourcegraph's AI coding agent that understands your entire codebase for intelligent assistance.",
    id: "amp",
    logo: ampLogo,
    logoFile: "amp.svg",
    name: "AMP",
    subtitle: "Sourcegraph's coding agent",
  },
  {
    category: "terminal-agent",
    config: {
      path: "ultracite.md",
    },
    content: {
      differentiators: [
        differentiator(
          "Pair-programming cadence",
          "Aider is conversational and iterative, so a single dedicated rules file helps every back-and-forth stay grounded in the same standards.",
          "Terminal"
        ),
        differentiator(
          "Dedicated config path",
          "Aider uses `ultracite.md`, which gives the integration a focused file rather than a shared AGENTS.md document.",
          "Command"
        ),
        differentiator(
          "Works well with git-driven edits",
          "Ultracite is useful when Aider is applying patches, staging changes, and iterating quickly against a repo's real history.",
          "GitBranch"
        ),
      ],
      intro:
        "Use Ultracite with Aider when you want terminal pair programming to stay aligned with the same repo rules you expect from direct edits. It is a natural fit for patch-based workflows, quick iterations, and developer-in-the-loop collaboration.",
      metaDescription:
        "Configure Aider with Ultracite through `ultracite.md` so terminal pair-programming sessions follow your repo's code quality and framework rules.",
      useCases: [
        agentUseCase(
          "Tight edit-review loops",
          "Keep Aider aligned while you iterate quickly on a fix, inspect the patch, and ask for the next change."
        ),
        agentUseCase(
          "Git-centric workflows",
          "Use a dedicated rules file when Aider is operating close to commits, diffs, and staged changes."
        ),
        agentUseCase(
          "Solo developer pair programming",
          "Give Aider a persistent repo contract so it behaves consistently across multiple terminal sessions."
        ),
      ],
    },
    description:
      "AI pair programming in your terminal with support for multiple LLM providers.",
    id: "aider",
    logo: aiderLogo,
    logoFile: "aider.svg",
    name: "Aider",
    subtitle: "Terminal pair programming",
  },
  {
    category: "cloud-agent",
    config: {
      appendMode: true,
      path: "AGENTS.md",
    },
    content: {
      differentiators: [
        differentiator(
          "Cloud IDE setup",
          "Firebase Studio runs in a hosted development environment, so repo-level rules help every workspace start with the same standards.",
          "Cloud"
        ),
        differentiator(
          "AGENTS.md compatibility",
          "Firebase Studio can read `AGENTS.md`, which makes repo guidance easier to share across Studio and other compatible agent tools.",
          "Layers"
        ),
        differentiator(
          "Good for app stacks",
          "The integration suits teams building full-stack apps in Firebase Studio where frontend, backend, and configuration files all need the same code quality bar.",
          "Boxes"
        ),
      ],
      intro:
        "Use Ultracite with Firebase Studio when you want a hosted IDE workspace to inherit the same project standards every time it boots. It is especially useful when multiple developers or generated workspaces touch the same app codebase.",
      metaDescription:
        "Set up Firebase Studio with Ultracite through AGENTS.md so Google's cloud IDE follows your repo's linting, accessibility, and performance rules from the start.",
      useCases: [
        agentUseCase(
          "Hosted app development",
          "Give Firebase Studio a clear repo contract before it generates or edits frontend and backend code."
        ),
        agentUseCase(
          "Shared cloud workspaces",
          "Keep standards stable when several developers open the same project in a managed IDE environment."
        ),
        agentUseCase(
          "Greenfield prototypes that need discipline",
          "Add strong defaults early so generated code in a new Firebase Studio project does not drift before the team establishes habits."
        ),
      ],
    },
    description:
      "Google's AI-powered development environment integrated with Firebase services.",
    id: "firebase-studio",
    logo: firebaseStudioLogo,
    logoFile: "firebase-studio.svg",
    name: "Firebase Studio",
    subtitle: "Google's cloud IDE",
  },
  {
    category: "open-source-agent",
    config: {
      appendMode: true,
      path: "AGENTS.md",
    },
    content: {
      differentiators: [
        differentiator(
          "Open-source agent platform",
          "OpenHands is designed for autonomous software work, so repo-level rules help keep generated changes aligned with human review expectations.",
          "Bot"
        ),
        differentiator(
          "Always-on repo guidance",
          "Using `AGENTS.md` gives OpenHands a root-level instruction file it can keep in context across longer autonomous runs.",
          "Layers"
        ),
        differentiator(
          "Useful for reproducible runs",
          "Because OpenHands can be deployed in different environments, a committed repo instruction file helps make behavior more predictable.",
          "ShieldCheck"
        ),
      ],
      intro:
        "Use Ultracite with OpenHands when you want an open-source autonomous agent to follow explicit project standards while it works through development tasks. The integration is a good fit for teams experimenting with reproducible agent runs in real repositories.",
      metaDescription:
        "Configure OpenHands with Ultracite through AGENTS.md so autonomous code changes stay aligned with your repo standards and review process.",
      useCases: [
        agentUseCase(
          "Autonomous task execution",
          "Keep OpenHands grounded when it handles longer implementation tasks or explores a repository without constant human steering."
        ),
        agentUseCase(
          "Open-source experimentation",
          "Commit a clear repo instruction file so contributors testing OpenHands get consistent behavior across environments."
        ),
        agentUseCase(
          "Reproducible agent demos",
          "Use the same microagent guidance to show how OpenHands behaves in a repo before and after changes to your coding standards."
        ),
      ],
    },
    description:
      "An open-source platform for AI software development agents with autonomous capabilities.",
    id: "open-hands",
    logo: openHandsLogo,
    logoFile: "open-hands.svg",
    name: "OpenHands",
    subtitle: "Open-source AI agents",
  },
  {
    category: "terminal-agent",
    config: {
      appendMode: true,
      path: "GEMINI.md",
    },
    content: {
      differentiators: [
        differentiator(
          "Dedicated Gemini instructions",
          "Gemini uses its own repo file, so Ultracite can tailor the setup without competing with other agent conventions.",
          "Command"
        ),
        differentiator(
          "Terminal-centered flow",
          "The integration is optimized for developers who want AI help in the shell without depending on editor-specific settings.",
          "Terminal"
        ),
        differentiator(
          "Good cross-tool companion",
          "Because many teams already use Gemini elsewhere, a committed repo file helps keep coding guidance consistent when they move into the CLI.",
          "Layers"
        ),
      ],
      intro:
        "Use Ultracite with Gemini when you want command-line AI assistance to start from a committed repo contract instead of repeating the same coding rules in prompts. It is a strong fit for teams that want a clean terminal setup with durable project guidance.",
      metaDescription:
        "Add Ultracite to Gemini through GEMINI.md so Google's terminal AI follows your repo's TypeScript, React, accessibility, and performance standards.",
      useCases: [
        agentUseCase(
          "Terminal-first development",
          "Keep Gemini aligned while you work in the shell, inspect code, and iterate without switching into a dedicated AI editor."
        ),
        agentUseCase(
          "Cross-repo consistency",
          "Use a committed `GEMINI.md` file to keep standards stable as developers move between projects."
        ),
        agentUseCase(
          "Prompt reduction",
          "Avoid repeating architecture and style instructions every time you ask Gemini to help with a fix or refactor."
        ),
      ],
    },
    description:
      "Google's command-line interface for Gemini, bringing AI assistance to your terminal.",
    id: "gemini",
    logo: geminiLogo,
    logoFile: "gemini.svg",
    name: "Gemini",
    subtitle: "Google's terminal AI",
  },
  {
    category: "ide-agent",
    config: {
      appendMode: true,
      path: "AGENTS.md",
    },
    content: {
      differentiators: [
        differentiator(
          "JetBrains-native guidance",
          "Junie lives inside the JetBrains ecosystem, so repo instructions help it work with the same precision developers expect from IDE-assisted workflows.",
          "Laptop"
        ),
        differentiator(
          "Portable AGENTS.md setup",
          "Committing `AGENTS.md` means Junie can share the same repo contract as other compatible tools instead of relying on local IDE preferences alone.",
          "Layers"
        ),
        differentiator(
          "Useful for typed codebases",
          "Junie is a good fit for strongly typed projects where explicit standards around TypeScript, testing, and architecture improve the quality of generated edits.",
          "Code2"
        ),
      ],
      intro:
        "Use Ultracite with Junie when you want JetBrains-assisted coding to follow a committed project contract instead of relying on per-user IDE habits. It is particularly helpful for typed application codebases where consistency and safe refactors matter.",
      metaDescription:
        "Configure Junie with Ultracite so JetBrains' AI agent follows your repo's code quality rules and team conventions inside the IDE.",
      useCases: [
        agentUseCase(
          "JetBrains-centered teams",
          "Share one AGENTS.md file so Junie behaves predictably across IntelliJ, WebStorm, and other JetBrains workflows."
        ),
        agentUseCase(
          "Typed refactors",
          "Give Junie a stable contract before it updates TypeScript-heavy code or makes larger structural edits."
        ),
        agentUseCase(
          "Repo onboarding",
          "Help new contributors inherit the same IDE-side AI behavior by committing standards directly into the repo."
        ),
      ],
    },
    description:
      "JetBrains' AI coding agent integrated into their IDE ecosystem.",
    id: "junie",
    logo: junieLogo,
    logoFile: "junie.svg",
    name: "Junie",
    subtitle: "JetBrains' AI agent",
  },
  {
    category: "editor-agent",
    config: {
      appendMode: true,
      path: "AGENTS.md",
    },
    content: {
      differentiators: [
        differentiator(
          "Hierarchical AGENTS.md support",
          "Augment Code can read `AGENTS.md`, which makes it easier to share repo standards across Augment and other compatible agents.",
          "Layers"
        ),
        differentiator(
          "Designed for collaboration",
          "Ultracite complements Augment's team-oriented workflow by turning shared coding conventions into a committed repo asset.",
          "Users"
        ),
        differentiator(
          "Focused repo replacement",
          "Because Ultracite writes the file directly, teams get a clean, deterministic rules payload instead of accumulating duplicate content over time.",
          "ShieldCheck"
        ),
      ],
      intro:
        "Use Ultracite with Augment Code when you want a team-oriented AI assistant to follow an explicit project ruleset stored with the repository. It fits organizations that want consistent AI output across shared development workflows and review processes.",
      metaDescription:
        "Set up Augment Code with Ultracite so its team-focused AI assistant follows committed repo rules for linting, architecture, and code quality.",
      useCases: [
        agentUseCase(
          "Shared enterprise workflows",
          "Store a deterministic AGENTS.md file in the repo so Augment sessions across the team start from the same coding contract."
        ),
        agentUseCase(
          "Code review discipline",
          "Reduce review churn by making architecture and style expectations explicit before Augment suggests or edits code."
        ),
        agentUseCase(
          "Cross-tool repo guidance",
          "Use AGENTS.md when you want Augment and other compatible tools to inherit the same committed AI setup."
        ),
      ],
    },
    description:
      "An AI coding assistant focused on enterprise development workflows and team collaboration.",
    id: "augmentcode",
    logo: augmentcodeLogo,
    logoFile: "augmentcode.svg",
    name: "Augment Code",
    subtitle: "Enterprise AI assistant",
  },
  {
    category: "ide-agent",
    config: {
      appendMode: true,
      path: ".bob/rules/ultracite.md",
    },
    content: {
      differentiators: [
        differentiator(
          "Enterprise IDE workflows",
          "Bob is built for teams adopting agentic coding inside the editor, with modes, governance-minded defaults, and integrations suited to large organizations.",
          "Building2"
        ),
        differentiator(
          "Workspace rules directory",
          "IBM Bob loads team rules from `.bob/rules/` (and can use optional root `AGENTS.md`). Ultracite writes `.bob/rules/ultracite.md` so standards live where Bob merges workspace rules.",
          "Layers"
        ),
        differentiator(
          "Beyond the editor",
          "With literate coding, in-flow reviews, and Bob Shell for the terminal, a single committed contract keeps standards consistent across the surfaces where Bob works.",
          "Workflow"
        ),
      ],
      faq: [
        {
          answer:
            "No. Bob supports `.bob/rules/`, `.bobrules`, mode-specific files, global `~/.bob/rules/`, and optional root `AGENTS.md`. Ultracite targets `.bob/rules/ultracite.md` for Bob-native workspace rules; add `AGENTS.md` yourself if you also want Copilot, Cursor, or other tools that read that file.",
          question: "Does IBM Bob only use AGENTS.md for rules?",
        },
      ],
      intro:
        "Use Ultracite with IBM Bob when you want an enterprise-focused AI coding partner in the IDE with committed rules under `.bob/rules/`. It suits organizations that combine agentic modes, editor assistance, and terminal workflows while keeping implementation rules reviewable in version control.",
      metaDescription:
        "Set up IBM Bob with Ultracite via `.bob/rules/ultracite.md` so IBM's AI assistant applies your repo's linting, TypeScript, and quality standards in the IDE.",
      useCases: [
        agentUseCase(
          "Team-wide AI standards",
          "Commit `.bob/rules/ultracite.md` so every developer using Bob starts from the same coding, testing, and documentation expectations."
        ),
        agentUseCase(
          "Agentic mode discipline",
          "Give Bob explicit guardrails before it works in specialized modes or across larger refactors."
        ),
        agentUseCase(
          "Editor and shell together",
          "Keep `.bob/rules/ultracite.md` aligned when developers use Bob in the IDE and Bob Shell in the pipeline or locally."
        ),
      ],
    },
    description:
      "IBM's AI coding assistant for the IDE with agentic modes, literate coding, reviews, and Bob Shell for terminal workflows.",
    id: "bob",
    logo: bobLogo,
    logoFile: "bob.svg",
    name: "IBM Bob",
    subtitle: "IBM's AI coding assistant",
  },
  {
    category: "editor-agent",
    config: {
      appendMode: true,
      path: "AGENTS.md",
    },
    content: {
      differentiators: [
        differentiator(
          "Default AGENTS.md support",
          "Kilo Code now supports `AGENTS.md` by default, which makes a committed repo contract the practical source of truth.",
          "Layers"
        ),
        differentiator(
          "Portable repo guidance",
          "Using `AGENTS.md` keeps Kilo Code aligned with the same repository guidance other compatible agents can reuse.",
          "FolderGit2"
        ),
        differentiator(
          "Strong for repeatable suggestions",
          "Explicit standards help Kilo Code produce more stable results across autocomplete, chat, and repeated editing sessions.",
          "Sparkles"
        ),
      ],
      intro:
        "Use Ultracite with Kilo Code when you want a configurable VS Code assistant to inherit a durable project contract instead of relying on one-off prompts. It is a good fit for teams that want repeatable AI behavior in a familiar editor workflow.",
      metaDescription:
        "Configure Kilo Code with Ultracite so customizable VS Code AI assistance follows your repo's formatting, typing, and framework conventions.",
      useCases: [
        agentUseCase(
          "Config-driven editor workflows",
          "Keep AI behavior grounded in committed repo standards instead of per-user prompt preferences."
        ),
        agentUseCase(
          "Repeatable VS Code assistance",
          "Give Kilo Code stable rules for day-to-day suggestions, edits, and explanations inside the editor."
        ),
        agentUseCase(
          "Team-managed AI setup",
          "Store one AGENTS.md file in the repo so contributors can share one source of truth for Kilo Code behavior."
        ),
      ],
    },
    description:
      "A VS Code extension providing AI-powered coding assistance with customizable rules.",
    id: "kilo-code",
    logo: kiloCodeLogo,
    logoFile: "kilo-code.svg",
    name: "Kilo Code",
    subtitle: "Customizable VS Code AI",
  },
  {
    category: "open-source-agent",
    config: {
      appendMode: true,
      path: "AGENTS.md",
    },
    content: {
      differentiators: [
        differentiator(
          "Open-source terminal agent",
          "Goose works well with committed repo guidance because it is often used by developers who want transparent, hackable agent workflows.",
          "Terminal"
        ),
        differentiator(
          "AGENTS.md-first discovery",
          "Goose looks for `AGENTS.md` before `.goosehints`, which makes a shared repo contract the lightweight default.",
          "Layers"
        ),
        differentiator(
          "Autonomy with guardrails",
          "The repo hints help Goose move quickly through autonomous work without losing consistency in style and structure.",
          "ShieldCheck"
        ),
      ],
      intro:
        "Use Ultracite with Goose when you want an open-source developer agent to work from a committed set of repo standards. It is a strong fit for terminal-heavy teams that want autonomy, but still need predictable edits and reviewable output.",
      metaDescription:
        "Add Ultracite to Goose through AGENTS.md so Block's open-source AI agent follows your repo's standards and review expectations.",
      useCases: [
        agentUseCase(
          "Terminal-heavy open-source workflows",
          "Keep Goose aligned in repos where developers want an open toolchain and committed AI guidance."
        ),
        agentUseCase(
          "Autonomous maintenance tasks",
          "Use hints to steer Goose through repetitive fixes or cleanup work without repeating instructions in each run."
        ),
        agentUseCase(
          "Experimental agent setups",
          "Commit repo guidance so Goose behavior stays stable while you tune the rest of your local tooling."
        ),
      ],
    },
    description:
      "Block's open-source AI developer agent for autonomous software development.",
    id: "goose",
    logo: gooseLogo,
    logoFile: "goose.svg",
    name: "Goose",
    subtitle: "Block's open-source agent",
  },
  {
    category: "editor-agent",
    config: {
      appendMode: true,
      path: ".roo/rules/ultracite.md",
    },
    content: {
      differentiators: [
        differentiator(
          "Codebase-navigation focus",
          "Roo Code shines when it understands existing project structure, which makes explicit repo standards especially valuable during exploration-heavy tasks.",
          "FolderGit2"
        ),
        differentiator(
          "Project-scoped rules directory",
          "Ultracite writes into Roo Code's rules path so coding guidance stays close to the tool's own repo configuration model.",
          "Layers"
        ),
        differentiator(
          "Helpful for large repos",
          "The setup works well when Roo Code is traversing many files and needs reminders about conventions, architecture, and safe edits.",
          "BrainCircuit"
        ),
      ],
      intro:
        "Use Ultracite with Roo Code when you want a codebase-navigation assistant to combine deep repo context with explicit implementation standards. It is especially helpful in larger repositories where understanding structure is easy, but consistent execution still needs guardrails.",
      metaDescription:
        "Configure Roo Code with Ultracite so its codebase-navigation assistant follows your repo's architecture, typing, and framework rules.",
      useCases: [
        agentUseCase(
          "Exploring large repositories",
          "Give Roo Code a stable contract before it hops between many modules, traces behavior, and applies edits in several places."
        ),
        agentUseCase(
          "Context-heavy refactors",
          "Use committed rules when Roo Code needs to understand existing architecture before changing it."
        ),
        agentUseCase(
          "Shared repo conventions",
          "Keep Roo Code aligned with the rest of the team by storing guidance in a dedicated project rules directory."
        ),
      ],
    },
    description:
      "An AI coding assistant focused on understanding and navigating complex codebases.",
    id: "roo-code",
    logo: rooCodeLogo,
    logoFile: "roo-code.svg",
    name: "Roo Code",
    subtitle: "Codebase navigation AI",
  },
  {
    category: "terminal-agent",
    config: {
      appendMode: true,
      path: "AGENTS.md",
    },
    content: {
      differentiators: [
        differentiator(
          "Terminal workflow companion",
          "Warp blends terminal usage with AI assistance, so repo-level instructions help it stay grounded while developers execute commands and iterate quickly.",
          "Terminal"
        ),
        differentiator(
          "Shared AGENTS.md contract",
          "Using `AGENTS.md` lets Warp share the same repo guidance as other agent tools instead of introducing another custom file format.",
          "Layers"
        ),
        differentiator(
          "Fits automation-friendly shells",
          "Ultracite works well when Warp is part of a broader automation workflow where consistency matters across many short AI interactions.",
          "Workflow"
        ),
      ],
      intro:
        "Use Ultracite with Warp when you want AI-assisted terminal workflows to start from a committed set of coding expectations. It is a practical fit for developers who bounce between commands, quick fixes, and lightweight agent help throughout the day.",
      metaDescription:
        "Add Ultracite to Warp through AGENTS.md so terminal AI suggestions and coding help stay aligned with your repo standards.",
      useCases: [
        agentUseCase(
          "Command-line development loops",
          "Keep Warp aligned while you switch between shell commands, AI suggestions, and incremental code changes."
        ),
        agentUseCase(
          "Shared terminal environments",
          "Use one committed AGENTS.md file so teammates get the same guidance when they use Warp in the same repo."
        ),
        agentUseCase(
          "Automation-adjacent workflows",
          "Make repo rules explicit when Warp is part of a larger sequence of command-driven development tasks."
        ),
      ],
    },
    description:
      "A modern terminal with AI-powered command suggestions and workflow automation.",
    id: "warp",
    logo: warpLogo,
    logoFile: "warp.svg",
    name: "Warp",
    subtitle: "Modern AI terminal",
  },
  {
    category: "cloud-agent",
    config: {
      appendMode: true,
      path: "AGENTS.md",
    },
    content: {
      differentiators: [
        differentiator(
          "Task-completion oriented",
          "Droid focuses on completing development tasks, so a committed repo contract helps keep fast output from turning into cleanup later.",
          "Bot"
        ),
        differentiator(
          "Simple repo-level setup",
          "Using `AGENTS.md` keeps the integration easy to adopt in projects where you want agent guidance without much overhead.",
          "Command"
        ),
        differentiator(
          "Useful for repeatable implementation work",
          "Ultracite makes Droid a better fit for repeated task patterns where consistent standards matter more than one-off cleverness.",
          "ShieldCheck"
        ),
      ],
      intro:
        "Use Ultracite with Droid when you want a task-oriented coding agent to move quickly without drifting away from your repo's standards. The setup is a good fit for teams that want straightforward adoption and more predictable output from autonomous tasks.",
      metaDescription:
        "Configure Droid with Ultracite through AGENTS.md so automated coding tasks follow your repo's linting, architecture, and review standards.",
      useCases: [
        agentUseCase(
          "Repeated implementation tasks",
          "Keep Droid aligned on bug fixes, cleanup work, and structured feature tasks that show up again and again."
        ),
        agentUseCase(
          "Simple repo onboarding",
          "Add one AGENTS.md file so Droid starts with clear instructions and contributors do not need custom local setup."
        ),
        agentUseCase(
          "Review-conscious automation",
          "Make repo standards explicit before Droid generates changes that will be inspected by humans later."
        ),
      ],
    },
    description:
      "An AI development agent focused on automated code generation and task completion.",
    id: "droid",
    logo: droidLogo,
    logoFile: "droid.svg",
    name: "Droid",
    subtitle: "Automated code generation",
  },
  {
    category: "open-source-agent",
    config: {
      appendMode: true,
      path: "AGENTS.md",
    },
    content: {
      differentiators: [
        differentiator(
          "Open-source across surfaces",
          "OpenCode spans terminal, desktop, and IDE use cases, so repo-level instructions help keep behavior stable across several working styles.",
          "Globe"
        ),
        differentiator(
          "Provider-agnostic environment",
          "Because OpenCode can target many LLM providers, a committed rules file helps anchor output even when the backing model changes.",
          "Layers"
        ),
        differentiator(
          "Strong shared contract",
          "AGENTS.md gives OpenCode a portable repo contract that works whether the session starts locally or in another surface.",
          "ShieldCheck"
        ),
      ],
      intro:
        "Use Ultracite with OpenCode when you want an open-source coding agent to carry the same repo standards across terminal, desktop, and IDE sessions. It is a useful choice for teams that care about portability and want one committed source of truth for AI guidance.",
      metaDescription:
        "Add Ultracite to OpenCode through AGENTS.md so open-source coding sessions stay consistent across terminals, desktops, IDEs, and model providers.",
      useCases: [
        agentUseCase(
          "Multi-surface development",
          "Keep OpenCode aligned whether you start from the terminal, a desktop app, or an IDE integration."
        ),
        agentUseCase(
          "Provider switching",
          "Use one repo contract to stabilize coding behavior even if your team experiments with different LLM providers."
        ),
        agentUseCase(
          "Open-source friendly workflows",
          "Commit repo guidance so contributors can reproduce the same OpenCode behavior without hidden local setup."
        ),
      ],
    },
    description:
      "An open-source AI coding agent that runs in your terminal, desktop, or IDE with support for 75+ LLM providers.",
    id: "opencode",
    logo: opencodeLogo,
    logoFile: "opencode.svg",
    name: "OpenCode",
    subtitle: "Open-source coding agent",
  },
  {
    category: "terminal-agent",
    config: {
      appendMode: true,
      path: "AGENTS.md",
    },
    content: {
      differentiators: [
        differentiator(
          "Charmbracelet terminal experience",
          "Crush is built for polished terminal interactions, and a committed repo contract helps keep that experience productive rather than purely conversational.",
          "Terminal"
        ),
        differentiator(
          "Default AGENTS.md setup",
          "Crush initializes projects with `AGENTS.md` by default, which makes repo guidance portable across Crush and other compatible tools.",
          "Layers"
        ),
        differentiator(
          "Model-flexible setup",
          "Since Crush supports multiple models, repo rules provide the stable baseline when the underlying model changes.",
          "Sparkles"
        ),
      ],
      intro:
        "Use Ultracite with Crush when you want a terminal-native coding agent to feel polished without losing repo discipline. It is a good fit for developers who like model flexibility, but still want a durable project contract behind every interaction.",
      metaDescription:
        "Configure Crush with Ultracite through AGENTS.md so Charmbracelet's terminal coding agent follows your repo standards across models and sessions.",
      useCases: [
        agentUseCase(
          "Styled terminal workflows",
          "Keep Crush productive in day-to-day shell usage by giving it committed repo standards instead of repeating guidance in prompts."
        ),
        agentUseCase(
          "Model experimentation",
          "Anchor output with one repo contract while switching among supported models inside Crush."
        ),
        agentUseCase(
          "Committed project guidance",
          "Use a shared AGENTS.md file when you want Crush and other compatible agents to inherit the same project instructions."
        ),
      ],
    },
    description:
      "Charmbracelet's glamorous AI coding agent for your terminal with multi-model support.",
    id: "crush",
    logo: crushLogo,
    logoFile: "crush.svg",
    name: "Crush",
    subtitle: "Glamorous terminal agent",
  },
  {
    category: "terminal-agent",
    config: {
      appendMode: true,
      path: "AGENTS.md",
    },
    content: {
      differentiators: [
        differentiator(
          "Coder-focused CLI",
          "Qwen Code is built around agentic coding from natural language, so repo standards help focus that flexibility into consistent implementation decisions.",
          "Command"
        ),
        differentiator(
          "Portable AGENTS.md setup",
          "The integration uses a shared repo file that is easy to commit, review, and reuse across projects.",
          "Layers"
        ),
        differentiator(
          "Useful for rapid iteration",
          "Ultracite helps Qwen Code stay consistent during fast prompt-to-code loops where output quality can otherwise vary widely.",
          "Gauge"
        ),
      ],
      intro:
        "Use Ultracite with Qwen Code when you want a coding-focused CLI to move quickly without abandoning the repo standards your team depends on. It is a good fit for rapid iteration, natural-language tasking, and terminal-heavy development.",
      metaDescription:
        "Add Ultracite to Qwen Code through AGENTS.md so Alibaba's coding CLI follows your repo's linting, architecture, and framework standards.",
      useCases: [
        agentUseCase(
          "Fast terminal iteration",
          "Keep Qwen Code aligned while you move quickly from prompt to patch and refine the result in the shell."
        ),
        agentUseCase(
          "Natural-language tasking",
          "Use a committed repo contract so broad natural-language requests still produce code that fits the project."
        ),
        agentUseCase(
          "Portable agent setup",
          "Reuse the same AGENTS.md pattern across repos where Qwen Code needs explicit project expectations."
        ),
      ],
    },
    description:
      "Alibaba's command-line interface for Qwen3-Coder, enabling agentic coding with natural language.",
    id: "qwen",
    logo: qwenLogo,
    logoFile: "qwen.svg",
    name: "Qwen Code",
    subtitle: "Alibaba's coding CLI",
  },
  {
    category: "terminal-agent",
    config: {
      appendMode: true,
      path: ".amazonq/rules/ultracite.md",
    },
    content: {
      differentiators: [
        differentiator(
          "AWS-aware terminal workflow",
          "Amazon Q CLI often sits close to infrastructure and deployment tasks, so repo standards help code changes stay disciplined in a broader operational workflow.",
          "Cloud"
        ),
        differentiator(
          "Dedicated rules location",
          "Ultracite uses Amazon Q's rules directory so project guidance stays clearly scoped to the tool.",
          "FolderGit2"
        ),
        differentiator(
          "Strong fit for full-stack repos",
          "This setup helps when Amazon Q CLI touches application code, scripts, and cloud-adjacent files in the same repository.",
          "Boxes"
        ),
      ],
      intro:
        "Use Ultracite with Amazon Q CLI when you want terminal AI assistance that spans code and cloud-oriented workflows without losing repo discipline. It is especially useful in full-stack repositories where application code sits close to operational tooling.",
      metaDescription:
        "Configure Amazon Q CLI with Ultracite so AWS's terminal AI follows your repo's coding standards in full-stack and cloud-adjacent projects.",
      useCases: [
        agentUseCase(
          "Full-stack application repos",
          "Keep Amazon Q CLI aligned when it edits frontend, backend, and support scripts in one repository."
        ),
        agentUseCase(
          "Cloud-adjacent code changes",
          "Use committed repo rules when the same workflow touches infrastructure scripts and application logic."
        ),
        agentUseCase(
          "Terminal-first AWS teams",
          "Store guidance in Amazon Q's rules directory so every contributor gets the same coding contract."
        ),
      ],
    },
    description:
      "Amazon's AI-powered CLI with command autocompletion, natural language chat, and AWS integration.",
    id: "amazon-q-cli",
    logo: amazonQLogo,
    logoFile: "amazon-q.svg",
    name: "Amazon Q CLI",
    subtitle: "AWS's terminal AI",
  },
  {
    category: "ide-agent",
    config: {
      path: "firebender.json",
    },
    content: {
      differentiators: [
        differentiator(
          "Android Studio specialist",
          "Firebender targets Android workflows directly, so Ultracite can complement that focus with consistent TypeScript, JavaScript, and app-adjacent frontend guidance in mixed repos.",
          "Laptop"
        ),
        differentiator(
          "Dedicated JSON config",
          "The integration writes to `firebender.json`, which gives Firebender a deterministic config surface rather than a prose-based shared file.",
          "Wrench"
        ),
        differentiator(
          "Great for mobile product teams",
          "Teams that ship Android apps alongside backend or web surfaces can use one repo contract to keep AI output consistent across the stack.",
          "Building2"
        ),
      ],
      faq: [
        {
          answer:
            "Firebender uses `firebender.json`, so Ultracite writes the repo instructions to that dedicated file instead of `AGENTS.md` or a markdown rules file.",
          question: "Why does Firebender use a different config file?",
        },
        {
          answer:
            "No. Firebender uses a single config file and does not expose a separate hook integration in the current Ultracite dataset.",
          question: "Does Firebender also support hooks?",
        },
      ],
      intro:
        "Use Ultracite with Firebender when you want Android Studio AI assistance to inherit explicit repo standards from a deterministic config file. It is a particularly good fit for mobile product teams working in mixed codebases where app logic, tooling, and web surfaces live together.",
      metaDescription:
        "Configure Firebender with Ultracite through `firebender.json` so Android Studio AI assistance follows your repo's coding standards and review expectations.",
      useCases: [
        agentUseCase(
          "Android teams in mixed repos",
          "Keep Firebender aligned when Android code, shared tooling, and supporting web or backend code live in the same repository."
        ),
        agentUseCase(
          "Deterministic IDE setup",
          "Use a dedicated JSON config file when you want AI guidance to be explicit, reviewable, and easy to diff."
        ),
        agentUseCase(
          "Mobile-focused review flows",
          "Reduce cleanup during review by giving Firebender repo-specific standards before it generates or edits code."
        ),
      ],
    },
    description:
      "The most powerful AI coding assistant for Android Studio with codebase context and up-to-date Android knowledge.",
    id: "firebender",
    logo: firebenderLogo,
    logoFile: "firebender.svg",
    name: "Firebender",
    subtitle: "Android Studio AI",
  },
  {
    category: "terminal-agent",
    config: {
      appendMode: true,
      path: "AGENTS.md",
    },
    content: {
      differentiators: [
        differentiator(
          "Cursor's terminal companion",
          "Cursor CLI keeps the agent workflow close to the shell while still fitting into the broader Cursor ecosystem.",
          "Terminal"
        ),
        differentiator(
          "AGENTS.md compatibility",
          "Cursor CLI reads `AGENTS.md`, which lets repo guidance travel cleanly between Cursor CLI and other compatible tools.",
          "Layers"
        ),
        differentiator(
          "Useful for repo portability",
          "Committing `AGENTS.md` helps developers carry the same Cursor CLI behavior across checkouts and environments.",
          "ShieldCheck"
        ),
      ],
      intro:
        "Use Ultracite with Cursor CLI when you want terminal-based agent work to stay aligned with the same standards you expect from the wider Cursor workflow. It is a solid choice for developers who like shell-driven tasks but still want tool-native project rules.",
      metaDescription:
        "Add Ultracite to Cursor CLI through AGENTS.md so shell-driven agent runs follow your repo's coding, typing, and framework standards.",
      useCases: [
        agentUseCase(
          "Shell-driven Cursor workflows",
          "Keep Cursor CLI aligned when you want to work in the terminal without losing the benefits of Cursor's rules system."
        ),
        agentUseCase(
          "Portable repo configuration",
          "Commit AGENTS.md so Cursor CLI behaves the same across machines and developer environments."
        ),
        agentUseCase(
          "Fast task execution with guardrails",
          "Use committed standards to make quick terminal-generated edits easier to trust and review."
        ),
      ],
    },
    description:
      "Cursor's CLI, built to help you ship right from your terminal.",
    id: "cursor-cli",
    logo: cursorCliLogo,
    logoFile: "cursor.svg",
    name: "Cursor CLI",
    subtitle: "Cursor's terminal agent",
  },
  {
    category: "terminal-agent",
    config: {
      appendMode: true,
      path: "AGENTS.md",
    },
    content: {
      differentiators: [
        differentiator(
          "Minimal terminal surface",
          "Mistral Vibe keeps the interface lightweight, so a committed repo contract does most of the heavy lifting for consistent output.",
          "Terminal"
        ),
        differentiator(
          "Root-level AGENTS.md support",
          "Mistral Vibe reads `AGENTS.md` from the workspace root, which gives the integration a simple and portable place to store coding expectations.",
          "Layers"
        ),
        differentiator(
          "Good for focused tasks",
          "The setup works best when you want a small, fast coding assistant to stay disciplined on implementation details.",
          "Gauge"
        ),
      ],
      intro:
        "Use Ultracite with Mistral Vibe when you want a lightweight terminal coding agent to stay anchored to repo standards. It is a good fit for focused tasks where you value speed and simplicity, but still want reviewable, consistent output.",
      metaDescription:
        "Configure Mistral Vibe with Ultracite through AGENTS.md so its minimal coding CLI follows your repo's standards and quality expectations.",
      useCases: [
        agentUseCase(
          "Focused terminal tasks",
          "Keep Mistral Vibe aligned on quick fixes and small features where speed matters but standards still matter too."
        ),
        agentUseCase(
          "Lightweight repo setup",
          "Use a shared AGENTS.md file when you want a clear, minimal config surface for coding guidance."
        ),
        agentUseCase(
          "Model experiments with guardrails",
          "Anchor output in repo rules so concise interactions still produce code that fits the project."
        ),
      ],
    },
    description:
      "Mistral's minimal CLI coding agent for streamlined development tasks.",
    id: "mistral-vibe",
    logo: mistralLogo,
    logoFile: "mistral.svg",
    name: "Mistral Vibe",
    subtitle: "Minimal CLI coding agent",
  },
  {
    category: "cloud-agent",
    config: {
      appendMode: true,
      path: "AGENTS.md",
    },
    content: {
      differentiators: [
        differentiator(
          "Vercel ecosystem alignment",
          "Vercel Agent sits inside a broader deployment and platform workflow, so committed repo rules help keep AI output aligned with production expectations.",
          "Cloud"
        ),
        differentiator(
          "Simple AGENTS.md adoption",
          "The integration uses a portable repo file that is easy to review, version, and share across services.",
          "Layers"
        ),
        differentiator(
          "Helpful for platform-connected tasks",
          "Ultracite gives Vercel Agent a stable coding contract before it works on features that may later interact with deployment, routing, or runtime concerns.",
          "Workflow"
        ),
      ],
      intro:
        "Use Ultracite with Vercel Agent when you want cloud-connected coding tasks to follow the same repo standards you apply before code reaches production. It is a strong fit for teams building inside the Vercel ecosystem and shipping through fast feedback loops.",
      metaDescription:
        "Add Ultracite to Vercel Agent through AGENTS.md so cloud-connected coding tasks follow your repo's implementation and quality standards.",
      useCases: [
        agentUseCase(
          "Production-minded feature work",
          "Keep Vercel Agent aligned when code changes are likely to move quickly from implementation into deployment workflows."
        ),
        agentUseCase(
          "Platform-centric teams",
          "Use one committed AGENTS.md file so every repo in a Vercel-heavy stack shares the same coding contract."
        ),
        agentUseCase(
          "Fast feedback loops",
          "Reduce cleanup after AI-generated changes by making standards explicit before the work reaches preview or production environments."
        ),
      ],
    },
    description: "Vercel's agent, powered by their AI Cloud.",
    id: "vercel",
    logo: vercelLogo,
    logoFile: "vercel.svg",
    name: "Vercel Agent",
    subtitle: "Vercel's AI Cloud agent",
  },
];
