import { type BundledLanguage, codeToTokens } from "shiki";
import { cn } from "@/lib/utils";

type CodeBlockProps = {
  code: string;
  lang: BundledLanguage;
  className?: string;
};

export const CodeBlock = async ({ code, lang, className }: CodeBlockProps) => {
  const result = await codeToTokens(code, {
    lang,
    themes: {
      light: "github-light-default",
      dark: "github-dark-default",
    },
  });

  return (
    <pre
      className={cn(className, "p-4 text-sm dark:bg-(--shiki-dark-bg)!")}
      data-language={lang}
      style={{
        backgroundColor: result.bg,
        color: result.fg,
      }}
    >
      <code className="[counter-increment:line_0] [counter-reset:line]">
        {result.tokens.map((row, index) => (
          <span
            className={cn(
              "block",
              "before:content-[counter(line)]",
              "before:inline-block",
              "before:[counter-increment:line]",
              "before:w-4",
              "before:mr-4",
              "before:text-[13px]",
              "before:text-right",
              "before:text-muted-foreground/50",
              "before:font-mono",
              "before:select-none"
            )}
            // biome-ignore lint/suspicious/noArrayIndexKey: "This is a stable key."
            key={index}
          >
            {row.map((token, tokenIndex) => (
              <span
                className="dark:bg-(--shiki-dark-bg)! dark:text-(--shiki-dark)!"
                // biome-ignore lint/suspicious/noArrayIndexKey: "This is a stable key."
                key={tokenIndex}
                style={{
                  color: token.color,
                  backgroundColor: token.bgColor,
                  ...token.htmlStyle,
                }}
                {...token.htmlAttrs}
              >
                {token.content}
              </span>
            ))}
          </span>
        ))}
      </code>
    </pre>
  );
};
