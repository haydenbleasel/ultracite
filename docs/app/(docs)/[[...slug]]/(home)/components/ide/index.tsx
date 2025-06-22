import { Assistant } from './assistant';
import { Editor } from './editor';
import { Problems } from './problems';
import { Sidebar } from './sidebar';

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
    <div className="grid grid-cols-[200px_1fr_200px] gap-8">
      <div>
        <div className="mt-18 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <p className="shrink-0 font-medium text-sm">AI Editor Rules</p>
            <div className="h-px flex-1 bg-muted" />
          </div>
          <p className="text-muted-foreground text-xs">
            Synchronized rule files for VS Code, Cursor, Windsurf and Zed keeps
            your AI responses consistent with your coding style.
          </p>
        </div>
        <div className="mt-12 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <p className="shrink-0 font-medium text-sm">Configurable spec</p>
            <div className="h-px flex-1 bg-muted" />
          </div>
          <p className="text-muted-foreground text-xs">
            Extend the Ultracite spec to your liking.
          </p>
        </div>
        <div className="mt-32 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <p className="shrink-0 font-medium text-sm">Output panel</p>
            <div className="h-px flex-1 bg-muted" />
          </div>
          <p className="text-muted-foreground text-xs">
            Biome uses the VS Code output panel to show problems.
          </p>
        </div>
      </div>
      <div className="grid aspect-video grid-cols-[180px_1fr_200px] divide-x overflow-hidden rounded-2xl border bg-foreground/5">
        <Sidebar />
        <div className="grid grid-rows-[1fr_150px] divide-y">
          <Editor />
          <Problems />
        </div>
        <Assistant />
      </div>
      <div className="text-right">
        <div className="mt-38 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-muted" />
            <p className="shrink-0 font-medium text-sm">MCP Support</p>
          </div>
          <p className='text-muted-foreground text-xs'>
            Run external code through the Ultracite MCP server to lint without
            needing to install it locally, or connect it to an Agent for
            consistent code quality in background jobs.
          </p>
        </div>
        <div className="mt-24 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-muted" />
            <p className="shrink-0 font-medium text-sm">Format on save</p>
          </div>
          <p className="text-muted-foreground text-xs">
            Format your code on save with Ultracite.
          </p>
        </div>
      </div>
    </div>
  </div>
);
