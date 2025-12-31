import type { Editor } from "@repo/data/editors";
import { Logo } from "@repo/design-system/components/ultracite/logo";
import { XIcon } from "lucide-react";
import Image from "next/image";
import { Installer } from "@/components/installer";

interface EditorHeroProps {
  editor: Editor;
}

export const EditorHero = ({ editor }: EditorHeroProps) => (
  <div className="grid gap-8">
    <div className="flex items-center gap-2">
      <Logo className="size-10" />
      <XIcon className="size-4 text-muted-foreground" />
      <Image
        alt={editor.name}
        className="size-10 rounded-full"
        height={40}
        src={editor.logo}
        width={40}
      />
    </div>

    <div className="grid gap-4">
      <h1 className="mb-0 max-w-xl text-balance font-semibold text-3xl leading-none tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl">
        {editor.name}
      </h1>
      <p className="max-w-xl text-balance text-lg text-muted-foreground tracking-tight">
        {editor.description} Integrate with Ultracite for seamless formatting
        and linting.
      </p>
      <Installer
        className="max-w-md"
        command={`npx ultracite@latest init --editors ${editor.id}`}
      />
    </div>
  </div>
);
