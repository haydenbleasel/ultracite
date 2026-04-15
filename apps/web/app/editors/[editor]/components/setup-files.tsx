"use client";

import { SiJson, SiMarkdown } from "@icons-pack/react-simple-icons";
import type { EditorSetupFile } from "@repo/data/editors";
import {
  FileCode2Icon,
  FolderCog2Icon,
  SparklesIcon,
  ZapIcon,
} from "lucide-react";
import { useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CodeBlock } from "@/components/ultracite/code-block/client";
import { SectionIntro } from "@/components/ultracite/section-intro";

interface SetupFilesProps {
  editorName: string;
  setupFiles: EditorSetupFile[];
}

const getIcon = (lang: EditorSetupFile["lang"]) =>
  lang === "json" ? SiJson : SiMarkdown;

export const SetupFiles = ({ editorName, setupFiles }: SetupFilesProps) => {
  const [activeFile, setActiveFile] = useState(setupFiles[0]?.title ?? "");
  const currentFile =
    setupFiles.find((f) => f.title === activeFile) ?? setupFiles[0];

  return (
    <div className="grid gap-8">
      <SectionIntro
        description={`Ultracite uses these ${editorName} settings, rules, and hooks files to keep editor behavior and AI output aligned with your repo standards.`}
        title={`Setup files for ${editorName}`}
      />

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div className="grid gap-3">
          <h3 className="font-semibold text-xl tracking-tight">
            {currentFile.title}
          </h3>
          <p className="text-muted-foreground tracking-tight">
            {currentFile.description}
          </p>
          <div className="grid gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <FolderCog2Icon className="size-4" />
              <span className="font-mono">{currentFile.path}</span>
            </div>
            <div className="flex items-center gap-2">
              <FileCode2Icon className="size-4" />
              <span>
                {currentFile.lang === "json"
                  ? "JSON config"
                  : "Markdown guidance"}
              </span>
            </div>
            {currentFile.title === "AI rules" && (
              <div className="flex items-center gap-2">
                <SparklesIcon className="size-4" />
                <span>Shapes AI output before review</span>
              </div>
            )}
            {currentFile.title === "Post-edit hooks" && (
              <div className="flex items-center gap-2">
                <ZapIcon className="size-4" />
                <span>Runs after AI file edits</span>
              </div>
            )}
          </div>
        </div>

        <div className="col-span-2 mx-auto w-full max-w-3xl overflow-hidden rounded-2xl border">
          <Tabs
            className="w-full gap-0"
            defaultValue={setupFiles[0]?.title}
            onValueChange={setActiveFile}
          >
            <TabsList className="w-full justify-start rounded-none border-b bg-secondary px-4 py-3 group-data-horizontal/tabs:h-auto">
              {setupFiles.map((file) => {
                const Icon = getIcon(file.lang);
                return (
                  <TabsTrigger
                    className="inline-flex flex-auto grow-0 items-center gap-2 rounded-sm px-2 py-1 text-xs"
                    key={file.title}
                    value={file.title}
                  >
                    <Icon className="size-3.5 text-muted-foreground" />
                    <span>{file.path}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
            {setupFiles.map((file) => (
              <TabsContent className="mt-0" key={file.title} value={file.title}>
                <div className="mx-auto max-h-[32rem] w-full max-w-3xl overflow-auto">
                  <CodeBlock code={file.code} lang={file.lang} />
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>
    </div>
  );
};
