"use client";

import { useCopyButton } from "fumadocs-ui/utils/use-copy-button";
import { CheckIcon, CopyIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "./ui/button";

type CopyMarkdownProps = {
  markdown: string;
};

export const CopyMarkdown = ({ markdown }: CopyMarkdownProps) => {
  const [checked, onClick] = useCopyButton(() => {
    try {
      navigator.clipboard.write([
        new ClipboardItem({
          "text/plain": markdown,
        }),
      ]);
    } catch (error) {
      toast.error("Failed to copy markdown", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  const Icon = checked ? CheckIcon : CopyIcon;

  return (
    <Button className="shadow-none" onClick={onClick} variant="outline">
      <Icon className="size-4" />
      Copy Markdown
    </Button>
  );
};
