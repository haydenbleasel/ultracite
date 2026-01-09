import { type Editor, editors } from "@repo/data/editors";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@repo/design-system/components/ui/tooltip";
import { cn } from "@repo/design-system/lib/utils";
import Image from "next/image";
import Link from "next/link";

const featuredEditorIds = [
  "vscode",
  "cursor",
  "windsurf",
  "antigravity",
  "kiro",
  "trae",
  "void",
  "zed",
];

const featuredEditors = featuredEditorIds
  .map((id) => editors.find((editor) => editor.id === id))
  .filter(Boolean) as Editor[];

export const Editors = () => (
  <div className="grid gap-8">
    <div className="mx-auto grid max-w-3xl gap-4 text-center">
      <h2 className="text-balance font-semibold text-2xl tracking-tighter sm:text-3xl md:text-4xl">
        ... and all your favourite editors
      </h2>
      <p className="text-balance text-muted-foreground tracking-tight sm:text-lg">
        Ultracite can generate configuration files for all these popular
        editors, so you can get the most of out of your AI integrations.
      </p>
    </div>
    <div className="mx-auto flex items-center justify-center -space-x-1">
      {featuredEditors.map((editor, index) => (
        <Tooltip delayDuration={0} key={editor.id}>
          <TooltipTrigger>
            <Link href={`/editors/${editor.id}`}>
              <Image
                alt={editor.name}
                className={cn(
                  "size-10 overflow-hidden rounded-full ring-2 ring-background transition-transform will-change-transform hover:-translate-y-2 sm:size-14",
                  index % 2 === 0 ? "hover:rotate-3" : "hover:-rotate-3"
                )}
                src={editor.logo}
              />
            </Link>
          </TooltipTrigger>
          <TooltipContent>{editor.name}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  </div>
);
