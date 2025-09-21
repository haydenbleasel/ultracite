import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";
import { SiJson } from "@icons-pack/react-simple-icons";

const config = `{
  "$schema": "./node_modules/@biomejs/biome/configuration_schema.json",
  "extends": ["ultracite"]
}`;

export const ZeroConfig = async () => {

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
      <DynamicCodeBlock code={config} lang="json" codeblock={{
        title: "biome.jsonc",
        icon: <SiJson className="size-4" />,
        className: "[&_pre]:text-base max-w-fit mx-auto shadow-none bg-gradient-to-b from-secondary/50 to-transparent",
      }} />
    </div>
  );
};
