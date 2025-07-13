import Image from 'next/image';
import { AvatarStack } from '@/components/ui/kibo-ui/avatar-stack';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Assistant } from './assistant';
import { Editor } from './editor';
import Claude from './logos/claude.jpg';
import Cursor from './logos/cursor.jpg';
import OpenAI from './logos/openai.jpg';
import VSCode from './logos/vscode.jpg';
import Windsurf from './logos/windsurf.jpg';
import Zed from './logos/zed.jpg';
import { Problems } from './problems';
import { Sidebar } from './sidebar';

const logos = [
  {
    name: 'Visual Studio Code',
    src: VSCode,
  },
  {
    name: 'Cursor',
    src: Cursor,
  },
  {
    name: 'Windsurf',
    src: Windsurf,
  },
  {
    name: 'Zed',
    src: Zed,
  },
  {
    name: 'Claude Code',
    src: Claude,
  },
  {
    name: 'OpenAI Codex',
    src: OpenAI,
  },
];

export const IDE = () => (
  <div className="grid gap-8">
    <div className="mx-auto grid max-w-3xl gap-4 text-center">
      <h2 className="font-semibold text-4xl tracking-tight">
        Designed for humans and AI
      </h2>
      <p className="text-muted-foreground text-xl">
        Ensure consistent code style and quality across all team members and AI
        models, eliminating debates over formatting and reducing code review
        friction.
      </p>
    </div>
    <div className="grid gap-8 xl:grid-cols-[200px_1fr_200px]">
      <div className="order-1 grid gap-8 xl:order-0 xl:gap-0">
        <div className="flex flex-col gap-1 xl:mt-18">
          <div className="flex items-center gap-2">
            <p className="shrink-0 font-medium xl:text-sm">AI Editor Rules</p>
            <div className="hidden h-px flex-1 bg-muted xl:block" />
          </div>
          <p className="text-muted-foreground xl:text-xs">
            Synchronized rule files for VS Code, Cursor, Windsurf and Zed keeps
            your AI responses consistent with your coding style.
          </p>
        </div>
        <div className="flex flex-col gap-1 xl:mt-12">
          <div className="flex items-center gap-2">
            <p className="shrink-0 font-medium xl:text-sm">Configurable spec</p>
            <div className="hidden h-px flex-1 bg-muted xl:block" />
          </div>
          <p className="text-muted-foreground xl:text-xs">
            Extend the Ultracite spec to your liking.
          </p>
        </div>
        <div className="flex flex-col gap-1 xl:mt-32">
          <div className="flex items-center gap-2">
            <p className="shrink-0 font-medium xl:text-sm">Output panel</p>
            <div className="hidden h-px flex-1 bg-muted xl:block" />
          </div>
          <p className="text-muted-foreground xl:text-xs">
            Biome uses the VS Code output panel to show problems.
          </p>
        </div>
      </div>
      <div className="hidden aspect-video grid-cols-[180px_1fr_200px] divide-x overflow-hidden rounded-2xl border bg-foreground/5 md:grid">
        <Sidebar />
        <div className="grid grid-rows-[2fr_1fr] divide-y overflow-hidden">
          <Editor />
          <Problems />
        </div>
        <Assistant />
      </div>
      <div className="grid gap-8 xl:gap-0 xl:text-right">
        <div className="flex flex-col gap-1 xl:mt-38">
          <div className="flex items-center gap-2">
            <div className="hidden h-px flex-1 bg-muted xl:block" />
            <p className="shrink-0 font-medium xl:text-sm">MCP Support</p>
          </div>
          <p className="text-muted-foreground xl:text-xs">
            Run external code through the Ultracite MCP server to lint without
            needing to install it locally, or connect it to an Agent for
            consistent code quality in background jobs.
          </p>
        </div>
        <div className="flex flex-col gap-1 xl:mt-24">
          <div className="flex items-center gap-2">
            <div className="hidden h-px flex-1 bg-muted xl:block" />
            <p className="shrink-0 font-medium xl:text-sm">Format on save</p>
          </div>
          <p className="text-muted-foreground xl:text-xs">
            Format your code on save with Ultracite.
          </p>
        </div>
      </div>
    </div>
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-center">
      <p className="text-muted-foreground text-sm">
        Works with all your favourite IDEs and agents.
      </p>
      <AvatarStack className="inline-flex" size={32}>
        {logos.map((logo) => (
          <Tooltip key={logo.name}>
            <TooltipTrigger>
              <Image
                alt=""
                className="size-8 overflow-hidden rounded-full border"
                height={32}
                src={logo.src}
                width={32}
              />
            </TooltipTrigger>
            <TooltipContent>{logo.name}</TooltipContent>
          </Tooltip>
        ))}
      </AvatarStack>
    </div>
  </div>
);
