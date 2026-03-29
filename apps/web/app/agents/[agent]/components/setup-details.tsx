import {
  getAgentSetupFacts,
  getDefaultAgentHookCommand,
  type Agent,
} from "@repo/data/agents";
import type { LucideIcon } from "lucide-react";
import {
  FileCode2Icon,
  FolderCog2Icon,
  SparklesIcon,
  WrenchIcon,
  ZapIcon,
} from "lucide-react";

interface SetupDetailsProps {
  agent: Agent;
}

export const SetupDetails = ({ agent }: SetupDetailsProps) => {
  const facts = getAgentSetupFacts(agent);
  const items: Array<{
    description: string;
    icon: LucideIcon;
    label: string;
    value: string;
  }> = [
    {
      description:
        "Ultracite writes to this exact file when you initialize or update the agent integration.",
      icon: FileCode2Icon,
      label: "Configuration file",
      value: facts.configPath,
    },
    {
      description:
        facts.writeMode === "append"
          ? "Existing instructions stay in place and Ultracite appends its rules where the agent expects them."
          : "Ultracite writes a fresh rules file so the agent starts from a clean, predictable baseline.",
      icon: WrenchIcon,
      label: "Write mode",
      value:
        facts.writeMode === "append"
          ? "Append to existing instructions"
          : "Replace with a fresh rules file",
    },
    {
      description: facts.hasHeader
        ? "An agent-specific header is prepended before the main Ultracite rules block."
        : "The generated file starts directly with Ultracite rules and skips an extra heading block.",
      icon: SparklesIcon,
      label: "Header handling",
      value: facts.hasHeader
        ? "Prepends an agent header"
        : "Writes rules directly",
    },
    {
      description:
        facts.hookSupport && facts.hookPath
          ? `${facts.hookPath} runs ${getDefaultAgentHookCommand()} after supported file edits.`
          : `${agent.name} does not use a separate hook configuration in Ultracite.`,
      icon: ZapIcon,
      label: "Hook support",
      value:
        facts.hookSupport && facts.hookPath
          ? "Ships with a post-edit hook"
          : "No separate hook file",
    },
  ];

  return (
    <div className="overflow-hidden rounded-[2rem] border bg-card/40">
      <div className="grid lg:grid-cols-[0.95fr_1.05fr]">
        <div className="grid gap-5 border-b px-6 py-8 sm:px-8 lg:border-r lg:border-b-0 lg:px-10 lg:py-10">
          <div className="flex size-11 items-center justify-center rounded-full border bg-background/80">
            <FolderCog2Icon className="size-5 text-muted-foreground" />
          </div>
          <div className="grid gap-3">
            <h2 className="text-balance font-semibold text-2xl tracking-tighter sm:text-3xl md:text-4xl">
              Setup details
            </h2>
            <p className="max-w-xl text-balance text-muted-foreground tracking-tight sm:text-lg">
              These values come from the same data Ultracite uses when it
              creates or updates {agent.name} instructions, so the page matches
              what actually gets written into the repo.
            </p>
          </div>
          <div className="flex items-start gap-3 pt-5">
            <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border bg-background/80">
              <FileCode2Icon className="size-4 text-muted-foreground" />
            </div>
            <div className="grid gap-2">
              <p className="break-all font-mono text-sm">{facts.configPath}</p>
              <p className="text-sm text-muted-foreground leading-6">
                Run <code>npx ultracite@latest init --agents {agent.id}</code>{" "}
                and Ultracite will update this file for the default setup.
              </p>
            </div>
          </div>
        </div>

        <dl className="grid gap-px bg-border/70 sm:grid-cols-2">
          {items.map((item) => (
            <div className="bg-background/90 p-6" key={item.label}>
              <dt className="sr-only">{item.label}</dt>
              <div className="flex size-10 items-center justify-center rounded-full border bg-background/80">
                <item.icon className="size-4 text-muted-foreground" />
              </div>
              <dd className="mt-3 text-balance font-medium text-lg tracking-tight">
                {item.value}
              </dd>
              <p className="mt-3 text-pretty text-muted-foreground text-sm leading-6">
                {item.description}
              </p>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
};
