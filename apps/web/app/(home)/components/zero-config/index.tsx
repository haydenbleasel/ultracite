"use client";

import { SiJavascript, SiJson } from "@icons-pack/react-simple-icons";
import type { ConfigFile } from "@repo/data/providers";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/design-system/components/ui/tabs";
import { CodeBlock } from "@repo/design-system/components/ultracite/code-block/client";
import { useEffect, useMemo, useState } from "react";
import type { BundledLanguage } from "shiki";
import { FrameworkSelector, frameworks } from "./framework-selector";
import { ProviderSelector, providers } from "./provider-selector";

const getIcon = (lang: ConfigFile["lang"]) =>
  lang === "json" ? SiJson : SiJavascript;

const getLang = (lang: ConfigFile["lang"]): BundledLanguage =>
  lang === "json" ? "json" : "js";

export const ZeroConfig = () => {
  const [provider, setProvider] = useState<string | null>(
    providers[1].id ?? null
  );
  const [framework, setFramework] = useState<string | null>(
    frameworks[0].label
  );

  const selectedProvider = providers.find((p) => p.id === provider);
  const selectedFramework = frameworks.find((f) => f.label === framework);

  const config = useMemo(() => {
    return selectedProvider?.configFiles ?? [];
  }, [selectedProvider]);

  // Make Tabs a controlled component: Tabs' value is the open tab, set by state.
  // The value should always be valid for the current config; fallback to first available tab if needed.
  const [tabValue, setTabValue] = useState<string>(config[0]?.name ?? "");

  // Whenever config changes, reset tab to first in config
  // (guard against stale name if provider/framework is switched)
  // This avoids uncontrolled->controlled warning.
  // We only setTabValue if the name list changed and tabValue is not present.
  useEffect(() => {
    if (!config.some((c) => c.name === tabValue)) {
      setTabValue(config[0]?.name ?? "");
    }
  }, [config, tabValue]);

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
                  code={f.code(selectedFramework?.presets ?? [])}
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
