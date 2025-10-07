"use client";

import { SiGithub } from "@icons-pack/react-simple-icons";
import { useCopyButton } from "fumadocs-ui/utils/use-copy-button";
import { Check, ChevronDownIcon, Copy, ExternalLinkIcon } from "lucide-react";
import { useState } from "react";
import {
  OpenIn,
  OpenInChatGPT,
  OpenInClaude,
  OpenInContent,
  OpenInCursor,
  OpenInItem,
  OpenInScira,
  OpenInSeparator,
  OpenInT3,
  OpenInTrigger,
  OpenInv0,
} from "@/components/ai-elements/open-in-chat";
import { Button } from "./ui/button";

const cache = new Map<string, string>();

export function LLMCopyButton({
  /**
   * A URL to fetch the raw Markdown/MDX content of page
   */
  markdownUrl,
}: {
  markdownUrl: string;
}) {
  const [isLoading, setLoading] = useState(false);
  const [checked, onClick] = useCopyButton(async () => {
    const cached = cache.get(markdownUrl);
    if (cached) {
      return navigator.clipboard.writeText(cached);
    }

    setLoading(true);

    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/plain": fetch(markdownUrl).then(async (res) => {
            const content = await res.text();
            cache.set(markdownUrl, content);

            return content;
          }),
        }),
      ]);
    } finally {
      setLoading(false);
    }
  });

  const Icon = checked ? Check : Copy;

  return (
    <Button
      className="shadow-none"
      disabled={isLoading}
      onClick={onClick}
      variant="secondary"
    >
      <Icon />
      Copy Markdown
    </Button>
  );
}

type ViewOptionsProps = {
  markdownUrl: string;
  githubUrl: string;
};

export const ViewOptions = ({ markdownUrl, githubUrl }: ViewOptionsProps) => {
  const fullMarkdownUrl =
    typeof window === "undefined"
      ? markdownUrl
      : new URL(markdownUrl, window.location.origin);
  const query = `Read ${fullMarkdownUrl}, I want to ask questions about it.`;

  return (
    <OpenIn query={query}>
      <OpenInTrigger>
        <Button className="shadow-none" variant="secondary">
          Open in...
          <ChevronDownIcon className="size-4 text-muted-foreground" />
        </Button>
      </OpenInTrigger>
      <OpenInContent>
        <OpenInChatGPT />
        <OpenInClaude />
        <OpenInT3 />
        <OpenInScira />
        <OpenInv0 />
        <OpenInCursor />
        <OpenInSeparator />
        <OpenInItem asChild>
          <a
            className="flex items-center gap-2"
            href={githubUrl}
            rel="noopener"
            target="_blank"
          >
            <span className="shrink-0">
              <SiGithub />
            </span>
            <span className="flex-1">Open in GitHub</span>
            <ExternalLinkIcon className="size-4 shrink-0 text-muted-foreground" />
          </a>
        </OpenInItem>
      </OpenInContent>
    </OpenIn>
  );
};
