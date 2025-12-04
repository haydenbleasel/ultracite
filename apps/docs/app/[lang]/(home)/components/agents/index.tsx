import { DynamicLink } from "fumadocs-core/dynamic-link";
import Image from "next/image";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import claude from "./logos/claude.svg";
import codex from "./logos/codex.svg";
import cursor from "./logos/cursor.svg";
import gemini from "./logos/gemini.svg";
import warp from "./logos/warp.svg";
import windsurf from "./logos/windsurf.svg";
import zed from "./logos/zed.svg";

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
      <h2 className="text-balance font-medium text-3xl tracking-tighter">
        Works with all your favourite agents
      </h2>
      <p className="text-balance text-lg text-muted-foreground">
        Ultracite can generate rules files for all these popular IDEs and
        agents, so you can get the most of out of your AI integrations.
      </p>
    </div>
    <div className="-space-x-1 mx-auto flex items-center justify-center">
      {logos.map((logo, index) => (
        <Tooltip delayDuration={0} key={logo.name}>
          <TooltipTrigger>
            <Image
              alt={logo.name}
              className={cn(
                "hover:-translate-y-2 size-10 overflow-hidden rounded-sm ring-2 ring-background transition-transform will-change-transform",
                index % 2 === 0 ? "hover:rotate-3" : "hover:-rotate-3"
              )}
              key={logo.name}
              src={logo.src}
            />
          </TooltipTrigger>
          <TooltipContent>{logo.name}</TooltipContent>
        </Tooltip>
      ))}
      <Tooltip delayDuration={0}>
        <TooltipTrigger>
          <DynamicLink href="/[lang]/rules">
            <div className="hover:-translate-y-2 hover:-rotate-3 flex size-10 items-center justify-center overflow-hidden rounded-sm bg-muted-foreground ring-2 ring-background transition-transform will-change-transform">
              <span className="text-background text-sm">+ 12</span>
            </div>
          </DynamicLink>
        </TooltipTrigger>
        <TooltipContent>+ 12 more agents</TooltipContent>
      </Tooltip>
    </div>
  </div>
);
