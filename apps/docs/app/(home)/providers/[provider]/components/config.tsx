import { SiJavascript, SiJson } from "@icons-pack/react-simple-icons";
import {
  type ConfigFile,
  getConfigFiles,
  type Provider,
} from "@ultracite/data/providers";
import type { BundledLanguage } from "shiki";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CodeBlock } from "@/components/ultracite/code-block/server";

interface ConfigProps {
  provider: Provider;
}

const getIcon = (lang: ConfigFile["lang"]) =>
  lang === "json" ? SiJson : SiJavascript;

const getLang = (lang: ConfigFile["lang"]): BundledLanguage =>
  lang === "json" ? "json" : "js";

export const Config = ({ provider }: ConfigProps) => {
  const configFiles = getConfigFiles(provider.id);

  return (
    <div className="grid gap-8">
      <div className="mx-auto grid max-w-xl gap-4 text-center">
        <h2 className="text-balance font-semibold text-2xl tracking-tighter sm:text-3xl md:text-4xl">
          Configuration
        </h2>
        <p className="text-balance text-muted-foreground tracking-tight sm:text-lg">
          Simple configuration files which extend the Ultracite configuration,
          giving you control over each aspect of linting and formatting.
        </p>
      </div>

      <div className="mx-auto w-full max-w-3xl overflow-hidden rounded-lg border">
        <Tabs className="w-full gap-0" defaultValue={configFiles[0]?.filename}>
          <TabsList className="w-full justify-start rounded-none border-b px-4 py-3 group-data-horizontal/tabs:h-auto">
            {configFiles.map((file) => {
              const Icon = getIcon(file.lang);
              return (
                <TabsTrigger
                  className="inline-flex flex-auto grow-0 items-center gap-2 rounded-sm px-2 py-1 text-xs"
                  key={file.filename}
                  value={file.filename}
                >
                  <Icon className="size-3.5 text-muted-foreground" />
                  <span>{file.filename}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
          {configFiles.map((file) => (
            <TabsContent key={file.filename} value={file.filename}>
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
