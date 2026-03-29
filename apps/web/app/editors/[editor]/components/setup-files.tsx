import type { Editor, EditorPageData } from "@repo/data/editors";
import { SiJson } from "@icons-pack/react-simple-icons";
import { FileCode2Icon, FolderCog2Icon, SparklesIcon, ZapIcon } from "lucide-react";

import { CodeBlock } from "@/components/ultracite/code-block/client";
import { SectionIntro } from "@/components/ultracite/section-intro";

interface SetupFilesProps {
  editor: Editor;
  pageData: EditorPageData;
}

export const SetupFiles = ({ editor, pageData }: SetupFilesProps) => {
  return (
    <div className="grid gap-8">
      <SectionIntro
        description={`Ultracite uses these ${editor.name} settings, rules, and hooks files to keep editor behavior and AI output aligned with your repo standards.`}
        title={`Setup files for ${editor.name}`}
      />

      <div className="grid gap-8">
        {pageData.setupFiles.map((file) => (
          <div className="grid items-start gap-6 lg:grid-cols-3" key={file.path}>
            <div className="grid gap-3">
              <h3 className="font-semibold text-xl tracking-tight">
                {file.title}
              </h3>
              <p className="text-muted-foreground tracking-tight">
                {file.description}
              </p>
              <div className="grid gap-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <FolderCog2Icon className="size-4" />
                  <span className="font-mono">{file.path}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileCode2Icon className="size-4" />
                  <span>{file.lang === "json" ? "JSON config" : "Markdown guidance"}</span>
                </div>
                {file.title === "AI rules" && (
                  <div className="flex items-center gap-2">
                    <SparklesIcon className="size-4" />
                    <span>Shapes AI output before review</span>
                  </div>
                )}
                {file.title === "Post-edit hooks" && (
                  <div className="flex items-center gap-2">
                    <ZapIcon className="size-4" />
                    <span>Runs after AI file edits</span>
                  </div>
                )}
              </div>
            </div>

            <div className="col-span-2 mx-auto w-full max-w-3xl divide-y overflow-hidden rounded-lg border">
              <div className="flex items-center gap-2 bg-secondary p-4">
                <SiJson className="size-4 text-muted-foreground" />
                <p className="inline-flex flex-auto grow-0 items-center gap-2 rounded-sm font-mono text-xs">
                  {file.path}
                </p>
              </div>
              <div className="mx-auto max-h-[32rem] w-full max-w-3xl overflow-auto">
                <CodeBlock code={file.code} lang={file.lang} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
