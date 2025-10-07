import { SiJson } from "@icons-pack/react-simple-icons";
import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";

const config = `{
  "$schema": "./node_modules/@biomejs/biome/configuration_schema.json",
  "extends": ["ultracite"]
}`;

export const ZeroConfig = async () => (
  <div className="grid gap-8">
    <div className="mx-auto grid max-w-2xl gap-4 text-center">
      <h2 className="font-semibold text-4xl tracking-tight">
        Zero-config by design
      </h2>
      <p className="text-muted-foreground text-xl">
        Preconfigured rules optimized for Next.js, React and TypeScript projects
        with sensible defaults, while still allowing customization when needed.
      </p>
    </div>
    <DynamicCodeBlock
      code={config}
      codeblock={{
        title: "biome.jsonc",
        icon: <SiJson className="size-4" />,
        className:
          "[&_pre]:text-base w-full max-w-fit mx-auto shadow-none bg-gradient-to-b from-secondary/50 to-transparent",
      }}
      lang="json"
    />
  </div>
);
