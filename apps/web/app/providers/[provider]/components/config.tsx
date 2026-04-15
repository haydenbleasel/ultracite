import { SiJavascript, SiJson } from "@icons-pack/react-simple-icons";
import type { ConfigFile, Provider } from "@repo/data/providers";
import type { BundledLanguage } from "shiki";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CodeBlock } from "@/components/ultracite/code-block/client";
import type { ProviderPageContent } from "@/lib/provider-content";

interface ConfigProps {
  content: ProviderPageContent;
  provider: Provider;
}

const getIcon = (lang: ConfigFile["lang"]) =>
  lang === "json" ? SiJson : SiJavascript;

const getLang = (lang: ConfigFile["lang"]): BundledLanguage => lang;

export const Config = ({ provider, content }: ConfigProps) => {
  const { configFiles } = provider;

  return (
    <div className="grid items-start gap-8 lg:grid-cols-3">
      <div className="grid gap-4">
        <h2 className="text-balance font-semibold text-2xl tracking-tighter sm:text-3xl md:text-4xl">
          {content.configTitle}
        </h2>
        <p className="text-balance text-muted-foreground tracking-tight sm:text-lg">
          {content.configDescription}
        </p>
      </div>

      <div className="col-span-2 mx-auto w-full max-w-3xl overflow-hidden rounded-2xl border">
        <Tabs className="w-full gap-0" defaultValue={configFiles[0]?.name}>
          <TabsList className="w-full justify-start rounded-none border-b bg-secondary px-4 py-3 group-data-horizontal/tabs:h-auto">
            {configFiles.map((file) => {
              const Icon = getIcon(file.lang);
              return (
                <TabsTrigger
                  className="inline-flex flex-auto grow-0 items-center gap-2 rounded-sm px-2 py-1 text-xs"
                  key={file.name}
                  value={file.name}
                >
                  <Icon className="size-3.5 text-muted-foreground" />
                  <span>{file.name}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
          {configFiles.map((file) => (
            <TabsContent key={file.name} value={file.name}>
              <CodeBlock
                code={file.code(["core", "react", "next"])}
                lang={getLang(file.lang)}
              />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
};
