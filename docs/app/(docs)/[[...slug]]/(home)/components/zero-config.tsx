import { FileIcon } from "lucide-react";
import { codeToHtml } from "shiki";

const config = `{
  "$schema": "./node_modules/@biomejs/biome/configuration_schema.json",
  "extends": ["ultracite"]
}`;

export const ZeroConfig = async () => {
  const [light, dark] = await Promise.all([
    codeToHtml(config, {
      lang: "jsonc",
      theme: "vitesse-light",
    }),
      codeToHtml(config, {
      lang: "jsonc",
      theme: "vitesse-dark",
    }),
  ]);

  return (
    <div className="grid gap-8 py-16 px-8">
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
        <div className="grid gap-4 overflow-hidden rounded-2xl border bg-gradient-to-b from-secondary/50 to-transparent p-4 pb-8 font-mono text-muted-foreground">
          <div className="flex items-center gap-3">
            <FileIcon className="size-4" />
            <p className="font-medium">biome.jsonc</p>
          </div>
          <div
            className="dark:hidden text-xs leading-relaxed sm:text-sm md:text-base [&_pre]:bg-transparent!"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: "required for shiki"
            dangerouslySetInnerHTML={{ __html: light }}
          />
          <div
            className="hidden dark:block text-xs leading-relaxed sm:text-sm md:text-base [&_pre]:bg-transparent!"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: "required for shiki"
            dangerouslySetInnerHTML={{ __html: dark }}
          />
        </div>
        <div className="absolute right-0 bottom-0 left-0 h-20 bg-gradient-to-t from-background to-transparent" />
      </div>
    </div>
  );
};
