import claude from "@ultracite/data/logos/claude.svg";
import codex from "@ultracite/data/logos/codex.svg";
import cursor from "@ultracite/data/logos/cursor.svg";
import gemini from "@ultracite/data/logos/gemini.svg";
import warp from "@ultracite/data/logos/warp.svg";
import windsurf from "@ultracite/data/logos/windsurf.svg";
import zed from "@ultracite/data/logos/zed.svg";
import { DynamicLink } from "fumadocs-core/dynamic-link";
import Image from "next/image";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const logos = [
  {
    name: "Cursor",
    src: cursor,
  },
  {
    name: "Windsurf",
    src: windsurf,
  },
  {
    name: "Zed",
    src: zed,
  },
  {
    name: "Claude Code",
    src: claude,
  },
  {
    name: "OpenAI Codex",
    src: codex,
  },
  {
    name: "Gemini CLI",
    src: gemini,
  },
  {
    name: "Warp",
    src: warp,
  },
];

export const Agents = () => (
  <div className="grid gap-8">
    <div className="mx-auto grid max-w-3xl gap-4 text-center">
      <h2 className="text-balance font-semibold text-3xl tracking-tighter md:text-4xl">
        Works with all your favourite agents
      </h2>
      <p className="text-balance text-lg text-muted-foreground tracking-tight">
        Ultracite can generate rules files for all these popular IDEs and
        agents, so you can get the most of out of your AI integrations.
      </p>
    </div>
    <div className="mx-auto flex items-center justify-center -space-x-1">
      {logos.map((logo, index) => (
        <Tooltip key={logo.name}>
          <TooltipTrigger delay={0}>
            <Image
              alt={logo.name}
              className={cn(
                "size-14 overflow-hidden rounded-full ring-2 ring-background transition-transform will-change-transform hover:-translate-y-2",
                index % 2 === 0 ? "hover:rotate-3" : "hover:-rotate-3"
              )}
              key={logo.name}
              src={logo.src}
            />
          </TooltipTrigger>
          <TooltipContent>{logo.name}</TooltipContent>
        </Tooltip>
      ))}
      <Tooltip>
        <TooltipTrigger delay={0}>
          <DynamicLink href="/rules">
            <div className="flex size-14 items-center justify-center overflow-hidden rounded-full border bg-secondary ring-2 ring-background transition-transform will-change-transform hover:-translate-y-2 hover:-rotate-3">
              <span className="text-muted-foreground text-sm">+ 16</span>
            </div>
          </DynamicLink>
        </TooltipTrigger>
        <TooltipContent>+ 16 more agents</TooltipContent>
      </Tooltip>
    </div>
  </div>
);
