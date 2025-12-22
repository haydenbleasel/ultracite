"use client";

import {
  SiJavascript,
  SiJson,
  SiTypescript,
} from "@icons-pack/react-simple-icons";
import { useMemo, useState } from "react";
import type { BundledLanguage } from "shiki";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CodeBlock } from "@/components/ultracite/code-block/client";
import { FrameworkSelector, frameworks } from "./framework-selector";
import { ProviderSelector, providers } from "./provider-selector";

const biomeConfig = [
  {
    filename: "biome.jsonc",
    icon: SiJson,
    lang: "json",
    code: (presets: string[]) => `{
  "$schema": "./node_modules/@biomejs/biome/configuration_schema.json",
  "extends": [
    ${presets.map((p) => `"ultracite/biome/${p}"`).join(",\n    ")}
  ]
}`,
  },
];

const eslintConfig = [
  {
    filename: "eslint.config.mjs",
    icon: SiJavascript,
    lang: "js",
    code: (presets: string[]) => `export { default } from 'ultracite';`,
  },
  {
    filename: "prettier.config.ts",
    icon: SiTypescript,
    lang: "ts",
    code: (presets: string[]) => "// TBD",
  },
];

const oxlintConfig = [
  {
    filename: ".oxlintrc.json",
    icon: SiJson,
    lang: "json",
    code: (presets: string[]) => `{
  "extends": [${presets.map((p) => `"ultracite/oxlint/${p}"`).join(", ")}]
}`,
  },
  {
    filename: ".oxfmtrc.jsonc",
    icon: SiJson,
    lang: "json",
    code: (presets: string[]) => "// TBD",
  },
];

export const ZeroConfig = () => {
  const [provider, setProvider] = useState<string | null>(providers[0].label);
  const [framework, setFramework] = useState<string | null>(
    frameworks[0].label
  );

  const selectedProvider = providers.find((p) => p.label === provider);
  const selectedFramework = frameworks.find((f) => f.label === framework);

  const config = useMemo(() => {
    if (selectedProvider?.label === "Biome") {
      return biomeConfig;
    }
    if (selectedProvider?.label === "ESLint") {
      return eslintConfig;
    }
    return oxlintConfig;
  }, [selectedProvider]);

  return (
    <div className="grid gap-8">
      <div className="mx-auto grid max-w-xl gap-4 text-center">
        <h2 className="text-balance font-semibold text-3xl tracking-tighter md:text-4xl">
          Zero-config by design
        </h2>
        <p className="text-balance text-lg text-muted-foreground tracking-tight">
          Hundreds of rules for your framework to optimize your JavaScript /
          TypeScript code, while still allowing you to customize when needed.
        </p>
      </div>

      <div className="flex items-center justify-center gap-2">
        <span className="text-muted-foreground text-sm">I'm using</span>
        <ProviderSelector value={provider} onValueChange={setProvider} />
        <span className="text-muted-foreground text-sm">on my</span>
        <FrameworkSelector value={framework} onValueChange={setFramework} />
        <span className="text-muted-foreground text-sm">project</span>
      </div>

      {config && (
        <div className="mx-auto w-full max-w-3xl overflow-hidden rounded-lg border">
          <Tabs
            className="w-full gap-0"
            defaultValue={config[0]?.filename ?? ""}
          >
            <TabsList className="w-full justify-start rounded-none border-b px-4 py-3 group-data-horizontal/tabs:h-auto">
              {config.map((f) => (
                <TabsTrigger
                  className="inline-flex flex-auto grow-0 items-center gap-2 rounded-sm px-2 py-1 text-xs"
                  key={f.filename}
                  value={f.filename}
                >
                  <f.icon className="size-3.5 text-muted-foreground" />
                  <span>{f.filename}</span>
                </TabsTrigger>
              ))}
            </TabsList>
            {config.map((f) => (
              <TabsContent key={f.filename} value={f.filename}>
                <CodeBlock
                  code={f.code(selectedFramework?.presets ?? [])}
                  lang={f.lang as BundledLanguage}
                />
              </TabsContent>
            ))}
          </Tabs>
        </div>
      )}
    </div>
  );
};
