import { cn } from "@repo/design-system/lib/utils";
import bash from "@shikijs/langs/bash";
import javascript from "@shikijs/langs/javascript";
import json from "@shikijs/langs/json";
import jsonc from "@shikijs/langs/jsonc";
import tsx from "@shikijs/langs/tsx";
import typescript from "@shikijs/langs/typescript";
import yaml from "@shikijs/langs/yaml";
import darkTheme from "@shikijs/themes/vitesse-dark";
import lightTheme from "@shikijs/themes/vitesse-light";
import type { BundledLanguage } from "shiki";
import { createHighlighterCore } from "shiki/core";
import { createOnigurumaEngine } from "shiki/engine/oniguruma";
import shikiWasm from "shiki/wasm";

interface CodeBlockProps {
  code: string;
  lang: BundledLanguage;
  className?: string;
}

let highlighterPromise: ReturnType<typeof createHighlighterCore> | null = null;

const getHighlighter = () => {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighterCore({
      themes: [lightTheme, darkTheme],
      langs: [javascript, json, bash, typescript, jsonc, tsx, yaml],
      // `shiki/wasm` contains the wasm binary inlined as base64 string.
      engine: createOnigurumaEngine(shikiWasm),
    });
  }
  return highlighterPromise;
};

export const CodeBlock = async ({ code, lang, className }: CodeBlockProps) => {
  const highlighter = await getHighlighter();

  const result = highlighter.codeToTokens(code, {
    lang,
    themes: {
      dark: darkTheme,
      light: lightTheme,
    },
  });

  return (
    <pre
      className={cn(className, "p-4 text-sm")}
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
              "before:w-6",
              "before:mr-5",
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
