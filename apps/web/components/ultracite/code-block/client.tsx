"use client";

import { useEffect, useState } from "react";
import type { BundledLanguage, ThemedToken } from "shiki";
import type { createHighlighterCore } from "shiki/core";

import { cn } from "@/lib/utils";

interface CodeBlockProps {
  className?: string;
  code: string;
  lang: BundledLanguage;
}

interface TokenResult {
  bg?: string;
  fg?: string;
  tokens: ThemedToken[][];
}

let highlighterPromise: ReturnType<typeof createHighlighterCore> | null = null;

const getHighlighter = () => {
  if (!highlighterPromise) {
    highlighterPromise = Promise.all([
      import("@shikijs/langs/bash"),
      import("@shikijs/langs/javascript"),
      import("@shikijs/langs/json"),
      import("@shikijs/langs/jsonc"),
      import("@shikijs/langs/markdown"),
      import("@shikijs/langs/tsx"),
      import("@shikijs/langs/typescript"),
      import("@shikijs/langs/yaml"),
      import("@shikijs/themes/vitesse-dark"),
      import("@shikijs/themes/vitesse-light"),
      import("shiki/core"),
      import("shiki/engine/oniguruma"),
      import("shiki/wasm"),
    ]).then(
      ([
        bash,
        javascript,
        json,
        jsonc,
        markdown,
        tsx,
        typescript,
        yaml,
        darkTheme,
        lightTheme,
        { createHighlighterCore: create },
        { createOnigurumaEngine },
        shikiWasm,
      ]) =>
        create({
          engine: createOnigurumaEngine(shikiWasm.default),
          langs: [
            bash.default,
            javascript.default,
            json.default,
            jsonc.default,
            markdown.default,
            tsx.default,
            typescript.default,
            yaml.default,
          ],
          themes: [lightTheme.default, darkTheme.default],
        })
    );
  }
  return highlighterPromise;
};

export const CodeBlock = ({ code, lang, className }: CodeBlockProps) => {
  const [result, setResult] = useState<TokenResult | null>(null);

  useEffect(() => {
    let cancelled = false;

    const highlight = async () => {
      const highlighter = await getHighlighter();

      if (cancelled) {
        return;
      }

      const tokens = highlighter.codeToTokens(code, {
        lang,
        themes: {
          dark: "vitesse-dark",
          light: "vitesse-light",
        },
      });

      setResult(tokens);
    };

    highlight();

    return () => {
      cancelled = true;
    };
  }, [code, lang]);

  const output: ThemedToken[][] = result
    ? result.tokens
    : code.split("\n").map((line) => [
        {
          bgColor: "var(--shiki-light-bg)",
          color: "var(--shiki-light-fg)",
          content: line,
          htmlAttrs: {},
          htmlStyle: {},
          offset: 0,
        },
      ]);

  return (
    <pre
      className={cn(className, "p-4 text-sm")}
      data-language={lang}
      style={{
        backgroundColor: result?.bg,
        color: result?.fg,
      }}
    >
      <code className="[counter-increment:line_0] [counter-reset:line]">
        {output.map((row, index) => (
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
            // eslint-disable-next-line react/no-array-index-key -- tokens have no unique ID
            key={`line-${String(index)}`}
          >
            {row.map((token, tokenIndex) => (
              <span
                className="dark:bg-(--shiki-dark-bg)! dark:text-(--shiki-dark)!"
                // eslint-disable-next-line react/no-array-index-key -- tokens have no unique ID
                key={`token-${String(index)}-${String(tokenIndex)}`}
                style={{
                  backgroundColor: token.bgColor,
                  color: token.color,
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
