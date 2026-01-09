import { type Agent, agents } from "@repo/data/agents";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@repo/design-system/components/ui/tooltip";
import { cn } from "@repo/design-system/lib/utils";
import Image from "next/image";
import Link from "next/link";

const featuredAgentIds = [
  "claude",
  "codex",
  "gemini",
  "warp",
  "opencode",
  "qwen",
  "copilot",
];

const featuredAgents = featuredAgentIds
  .map((id) => agents.find((agent) => agent.id === id))
  .filter(Boolean) as Agent[];

const remainingCount = agents.length - featuredAgents.length;

export const Agents = () => (
  <div className="grid gap-8">
    <div className="mx-auto grid max-w-3xl gap-4 text-center">
      <h2 className="text-balance font-semibold text-2xl tracking-tighter sm:text-3xl md:text-4xl">
        Works with all your favourite agents...
      </h2>
      <p className="text-balance text-muted-foreground tracking-tight sm:text-lg">
        Ultracite can generate rules files for all these popular IDEs and
        agents, so you can get the most of out of your AI integrations.
      </p>
    </div>
    <div className="mx-auto flex items-center justify-center -space-x-1">
      {featuredAgents.map((agent, index) => (
        <Tooltip delayDuration={0} key={agent.id}>
          <TooltipTrigger>
            <Link href={`/agents/${agent.id}`}>
              <Image
                alt={agent.name}
                className={cn(
                  "size-10 overflow-hidden rounded-full ring-2 ring-background transition-transform will-change-transform hover:-translate-y-2 sm:size-14",
                  index % 2 === 0 ? "hover:rotate-3" : "hover:-rotate-3"
                )}
                src={agent.logo}
              />
            </Link>
          </TooltipTrigger>
          <TooltipContent>{agent.name}</TooltipContent>
        </Tooltip>
      ))}
      <Tooltip delayDuration={0}>
        <TooltipTrigger>
          <div className="flex size-10 items-center justify-center overflow-hidden rounded-full border bg-secondary ring-2 ring-background transition-transform will-change-transform hover:-translate-y-2 hover:-rotate-3 sm:size-14">
            <span className="text-muted-foreground text-xs sm:text-sm">
              + {remainingCount}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>+ {remainingCount} more agents</TooltipContent>
      </Tooltip>
    </div>
  </div>
);
