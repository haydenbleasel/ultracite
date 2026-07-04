"use client";

import { SiJavascript, SiJson } from "@icons-pack/react-simple-icons";
import type { ConfigFile } from "@repo/data/providers";
import { providers } from "@repo/data/providers";
import { useState } from "react";
import type { BundledLanguage } from "shiki";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CodeBlock } from "@/components/ultracite/code-block/client";

import { FrameworkSelector } from "./framework-selector";
import { frameworks } from "./frameworks";
import { ProviderSelector } from "./provider-selector";

const getIcon = (lang: ConfigFile["lang"]) =>
  lang === "json" ? SiJson : SiJavascript;

const getLang = (lang: ConfigFile["lang"]): BundledLanguage => lang;

const frameworkByLabel = new Map(frameworks.map((f) => [f.label, f]));

export const ZeroConfig = () => {
  const [provider, setProvider] = useState<string | null>(
    providers[1].id ?? null
  );
  const [selectedFrameworks, setSelectedFrameworks] = useState<string[]>([
    "Next.js",
    "React",
    "Vitest",
  ]);

  const selectedProvider = providers.find((p) => p.id === provider);

  const presetSet = new Set<string>(["core"]);
  for (const label of selectedFrameworks) {
    const fw = frameworkByLabel.get(label);
    if (fw) {
      for (const p of fw.presets) {
        presetSet.add(p);
      }
    }
  }
  const mergedPresets = [...presetSet];

  const config = selectedProvider?.configFiles ?? [];

  // Make Tabs a controlled component: Tabs' value is the open tab, set by state.
  const [tabValue, setTabValue] = useState<string>(config[0]?.name ?? "");

  // Derive the active tab during render: if the selected tab is no longer valid
  // for the current config (e.g. provider/framework switched), fall back to the
  // first available tab. This avoids an effect that resets state.
  const activeTab = config.some((c) => c.name === tabValue)
    ? tabValue
    : (config[0]?.name ?? "");

  return (
    <div className="grid gap-8">
      <div className="mx-auto grid max-w-xl gap-4 text-center">
        <h2 className="text-balance font-semibold text-2xl tracking-tighter sm:text-3xl md:text-4xl">
          Zero-config by design
        </h2>
        <p className="text-balance text-muted-foreground tracking-tight sm:text-lg">
          Hundreds of rules for your framework to optimize your JavaScript /
          TypeScript code, while still allowing you to customize when needed.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center gap-2 sm:flex-row">
        <span className="text-muted-foreground text-sm">I&apos;m using</span>
        <ProviderSelector onValueChange={setProvider} value={provider} />
        <span className="text-muted-foreground text-sm">with</span>
        <FrameworkSelector
          onValueChange={setSelectedFrameworks}
          values={selectedFrameworks}
        />
      </div>

      {config && (
        <div className="mx-auto w-full max-w-3xl overflow-hidden rounded-lg border">
          <Tabs
            className="w-full gap-0"
            onValueChange={setTabValue}
            value={activeTab}
          >
            <TabsList className="w-full justify-start overflow-auto rounded-none border-b px-4 py-3 group-data-horizontal/tabs:h-auto">
              {config.map((f) => {
                const Icon = getIcon(f.lang);
                return (
                  <TabsTrigger
                    className="inline-flex flex-auto shrink-0 grow-0 items-center gap-2 rounded-sm px-2 py-1 text-xs"
                    key={f.name}
                    value={f.name}
                  >
                    <Icon className="size-3.5 text-muted-foreground" />
                    <span>{f.name}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
            {config.map((f) => (
              <TabsContent key={f.name} value={f.name}>
                <CodeBlock
                  code={f.code(mergedPresets)}
                  lang={getLang(f.lang)}
                />
              </TabsContent>
            ))}
          </Tabs>
        </div>
      )}
    </div>
  );
};
