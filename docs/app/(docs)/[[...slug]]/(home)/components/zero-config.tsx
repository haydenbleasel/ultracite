import { FileIcon } from 'lucide-react';
import { codeToHtml } from 'shiki';

const config = `{
  "$schema": "https://www.ultracite.ai/v/2.0.0",
  "extends": ["ultracite"]
}`;

const ZeroConfig = async () => {
  const highlightedCode = await codeToHtml(config, {
    lang: 'jsonc',
    theme: 'vesper',
  });

  return (
    <div className="grid gap-8">
      <div className="mx-auto grid max-w-2xl gap-4 text-center">
        <h2 className="font-semibold text-4xl tracking-tight">
          Zero-config by design
        </h2>
        <p className="text-muted-foreground text-xl">
          Preconfigured rules optimized for Next.js, React and TypeScript
          projects with sensible defaults, while still allowing customization
          when needed.
        </p>
      </div>
      <div className="relative mx-auto w-full max-w-2xl">
        <div className="grid gap-4 overflow-hidden rounded-2xl border bg-gradient-to-b from-foreground/2 to-transparent p-4 pb-8 font-mono text-muted-foreground">
          <div className="flex items-center gap-3">
            <FileIcon className="size-5" />
            <p className="font-medium text-lg">biome.jsonc</p>
          </div>
          <div
            className='text-xs leading-relaxed sm:text-sm md:text-base lg:text-lg xl:text-xl [&_pre]:bg-transparent!'
            // biome-ignore lint/security/noDangerouslySetInnerHtml: "required for shiki"
            dangerouslySetInnerHTML={{ __html: highlightedCode }}
          />
        </div>
        <div className="absolute right-0 bottom-0 left-0 h-20 bg-gradient-to-t from-background to-transparent" />
      </div>
    </div>
  );
};

export { ZeroConfig };
