import { SiJson } from "@icons-pack/react-simple-icons";
import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";

const config = `{
  "$schema": "./node_modules/@biomejs/biome/configuration_schema.json",
  "extends": ["ultracite/core"]
}`;

export const ZeroConfig = async () => (
  <div className="grid gap-8">
    <div className="mx-auto grid max-w-2xl gap-4 text-center">
      <h2 className="font-semibold text-3xl tracking-tight sm:text-4xl">
        Zero-config by design
      </h2>
      <p className="text-lg text-muted-foreground sm:text-xl">
        Ultracite preconfigures hundreds of rules to optimize your JavaScript /
        TypeScript code, while still allowing you to customize when needed.
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
    <p className="text-center text-muted-foreground text-sm">
      👆 Yes this is literally all you need.
    </p>
  </div>
);
