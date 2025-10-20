"use client";

import { useCopyButton } from "fumadocs-ui/utils/use-copy-button";
import { CheckIcon, CopyIcon, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";

type CopyMarkdownProps = {
  markdownUrl: string;
};

const cache = new Map<string, string>();

export const CopyMarkdown = ({ markdownUrl }: CopyMarkdownProps) => {
  const [isLoading, setLoading] = useState(false);
  const [checked, onClick] = useCopyButton(async () => {
    const cached = cache.get(markdownUrl);

    if (cached) {
      return navigator.clipboard.writeText(cached);
    }

    setLoading(true);

    try {
      const response = await fetch(markdownUrl);
      const content = await response.text();

      cache.set(markdownUrl, content);

      navigator.clipboard.write([
        new ClipboardItem({
          "text/plain": content,
        }),
      ]);
    } finally {
      setLoading(false);
    }
  });

  let Icon = <CopyIcon className="size-4" />;

  if (isLoading) {
    Icon = <Loader2 className="size-4 animate-spin" />;
  } else if (checked) {
    Icon = <CheckIcon className="size-4" />;
  }

  return (
    <Button
      className="shadow-none"
      disabled={isLoading}
      onClick={onClick}
      variant="secondary"
    >
      {Icon}
      Copy Markdown
    </Button>
  );
};
