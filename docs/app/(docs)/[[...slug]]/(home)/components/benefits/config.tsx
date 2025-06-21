import { FileIcon } from 'lucide-react';

export const ConfigGraphic = () => (
  <div className="relative">
    <div className="grid gap-4 overflow-hidden rounded-2xl border bg-gradient-to-b from-foreground/2 to-transparent p-4 font-mono text-muted-foreground">
      <div className="flex items-center gap-3">
        <FileIcon className="size-5" />
        <p className="font-medium text-lg">biome.jsonc</p>
      </div>
      <pre className="grid text-xl leading-relaxed">
        <code>{'{'}</code>
        <code>{`  "$schema": "https://www.ultracite.ai/v/2.0.0",`}</code>
        <code>
          {`  "extends": ["`}
          <span className="text-foreground">ultracite</span>
          {`"]`}
        </code>
        <code>{'}'}</code>
      </pre>
    </div>
    <div className="absolute right-0 bottom-0 left-0 h-20 bg-gradient-to-t from-background to-transparent" />
  </div>
);
