import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CodeBlock } from "../code-block";
import {
  Angular,
  Astro,
  Nextjs,
  Qwik,
  React,
  Remix,
  Solid,
  Svelte,
  Vue,
} from "./icons";

const configs = [
  {
    label: "Next.js",
    logo: Nextjs,
    presets: ["core", "react", "next"],
  },
  {
    label: "React",
    logo: React,
    presets: ["core", "react"],
  },
  {
    label: "Solid",
    logo: Solid,
    presets: ["core", "solid"],
  },
  {
    label: "Vue",
    logo: Vue,
    presets: ["core", "vue"],
  },
  {
    label: "Svelte",
    logo: Svelte,
    presets: ["core", "svelte"],
  },
  {
    label: "Qwik",
    logo: Qwik,
    presets: ["core", "qwik"],
  },
  {
    label: "Angular",
    logo: Angular,
    presets: ["core", "angular"],
  },
  {
    label: "Remix",
    logo: Remix,
    presets: ["core", "remix"],
  },
  {
    label: "Astro",
    logo: Astro,
    presets: ["core", "astro"],
  },
];

export const ZeroConfig = () => (
  <div className="grid gap-8">
    <div className="mx-auto grid max-w-xl gap-4 text-center">
      <h2 className="text-balance font-medium text-3xl tracking-tighter">
        Zero-config by design
      </h2>
      <p className="text-balance text-lg text-muted-foreground">
        Hundreds of rules for your framework to optimize your JavaScript /
        TypeScript code, while still allowing you to customize when needed.
      </p>
    </div>
    <Tabs
      className="mx-auto w-full max-w-4xl gap-0 overflow-hidden rounded-lg border bg-sidebar"
      defaultValue={configs[0].label}
    >
      <TabsList className="w-full rounded-none bg-transparent">
        {configs.map((config) => (
          <TabsTrigger
            className="flex-auto p-0 data-[state=active]:border data-[state=active]:bg-secondary data-[state=active]:shadow-none"
            key={config.label}
            value={config.label}
          >
            <config.logo className="size-4" />
            <span className="hidden lg:block">{config.label}</span>
          </TabsTrigger>
        ))}
      </TabsList>
      {configs.map((config) => (
        <TabsContent className="p-0" key={config.label} value={config.label}>
          <CodeBlock
            code={`{
  "$schema": "./node_modules/@biomejs/biome/configuration_schema.json",
  "extends": [${config.presets.map((preset) => `"ultracite/${preset}"`).join(", ")}]
}`}
            lang="json"
          />
        </TabsContent>
      ))}
    </Tabs>
  </div>
);
