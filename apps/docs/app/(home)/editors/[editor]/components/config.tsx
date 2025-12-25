"use client";

import type { Editor } from "@ultracite/data/editors";
import { CodeBlock } from "@/components/ultracite/code-block/client";

interface ConfigProps {
  editor: Editor;
}

export const Config = ({ editor }: ConfigProps) => (
  <div className="grid items-start gap-8 lg:grid-cols-3">
    <div className="grid gap-4">
      <h2 className="text-balance font-semibold text-2xl tracking-tighter sm:text-3xl md:text-4xl">
        Configuration
      </h2>
      <p className="text-balance text-muted-foreground tracking-tight sm:text-lg">
        Ultracite automatically creates and manages the settings file for{" "}
        {editor.name}.
      </p>
      <p className="text-balance text-muted-foreground tracking-tight sm:text-lg">
        These settings enable format on save, auto-fix linting issues, and
        configure TypeScript for consistent type checking across your project.
      </p>
    </div>

    <div className="col-span-2 mx-auto w-full max-w-3xl divide-y overflow-hidden rounded-lg border">
      <div className="bg-secondary px-4 py-3">
        <p className="inline-flex flex-auto grow-0 items-center gap-2 rounded-sm px-2 py-1 font-mono text-xs">
          {editor.config.path}
        </p>
      </div>
      <div className="mx-auto h-96 w-full max-w-3xl overflow-hidden overflow-y-auto">
        <CodeBlock
          code={JSON.stringify(editor.config.content, null, 2)}
          lang="json"
        />
      </div>
    </div>
  </div>
);
