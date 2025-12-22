"use client";

import { SiJavascript, SiJson } from "@icons-pack/react-simple-icons";
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
    code: (presets: string[]) => `import { defineConfig } from "eslint/config";
${presets.map((p) => `import ${p} from "ultracite/eslint/${p}";`).join("\n")}

export default defineConfig([
  {
    extends: [
      ${presets.join(",\n      ")}
    ],
  },
]);`,
  },
  {
    filename: "prettier.config.mjs",
    icon: SiJavascript,
    lang: "ts",
    code: () => `export { default } from "ultracite/prettier";`,
  },
  {
    filename: "stylelint.config.mjs",
    icon: SiJavascript,
    lang: "ts",
    code: () => `export { default } from 'ultracite/stylelint';`,
  },
];

const oxlintConfig = [
  {
    filename: ".oxlintrc.json",
    icon: SiJson,
    lang: "json",
    code: (presets: string[]) => `{
  "extends": [
    ${presets.map((p) => `"ultracite/oxlint/${p}"`).join(",\n    ")}
  ]
}`,
  },
  {
    filename: ".oxfmtrc.jsonc",
    icon: SiJson,
    lang: "json",
    code: () => `{
  "$schema": "./node_modules/oxfmt/configuration_schema.json"
}`,
  },
];

export const ZeroConfig = () => {
  const [provider, setProvider] = useState<string | null>(providers[1].id);
  const [framework, setFramework] = useState<string | null>(
    frameworks[0].label
  );

  const selectedProvider = providers.find((p) => p.id === provider);
  const selectedFramework = frameworks.find((f) => f.label === framework);

  const config = useMemo(() => {
    if (selectedProvider?.id === "biome") {
      return biomeConfig;
    }
    if (selectedProvider?.id === "eslint") {
      return eslintConfig;
    }
    return oxlintConfig;
  }, [selectedProvider]);

  // Make Tabs a controlled component: Tabs' value is the open tab, set by state.
  // The value should always be valid for the current config; fallback to first available tab if needed.
  const [tabValue, setTabValue] = useState<string>(config[0]?.filename ?? "");

  // Whenever config changes, reset tab to first in config
  // (guard against stale filename if provider/framework is switched)
  // This avoids uncontrolled->controlled warning.
  // We only setTabValue if the filename list changed and tabValue is not present.
  useMemo(() => {
    if (!config.some((c) => c.filename === tabValue)) {
      setTabValue(config[0]?.filename ?? "");
    }
    // Only run when config changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, tabValue]);

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
        <ProviderSelector onValueChange={setProvider} value={provider} />
        <span className="text-muted-foreground text-sm">on my</span>
        <FrameworkSelector onValueChange={setFramework} value={framework} />
        <span className="text-muted-foreground text-sm">project</span>
      </div>

      {config && (
        <div className="mx-auto w-full max-w-3xl overflow-hidden rounded-lg border">
          <Tabs
            className="w-full gap-0"
            onValueChange={setTabValue}
            value={tabValue}
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
