import { codeToHtml } from "shiki";
import { cn } from "@/lib/utils";

type CodeBlockProps = {
  code: string;
  lang: string;
  className?: string;
};

export const CodeBlock = async ({ code, lang, className }: CodeBlockProps) => {
  const html = await codeToHtml(code, {
    lang,
    themes: {
      light: "github-light-default",
      dark: "github-dark-default",
    },
    defaultColor: false,
  });

  return (
    <div
      className={cn("overflow-x-auto py-4", className)}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: Shiki generates safe HTML
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
