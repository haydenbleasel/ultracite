"use client";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from "@repo/design-system/components/ui/input-group";
import { track } from "@vercel/analytics";
import { CheckIcon, CopyIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const COPY_TIMEOUT = 2000;

interface InstallerProps {
  command: string;
  className?: string;
}

export const Installer = ({ command, className }: InstallerProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(command);
    toast.success("Copied to clipboard", {
      description: "Paste it into your terminal to install Ultracite.",
    });
    setCopied(true);

    track("Copied installer command");
    setTimeout(() => {
      setCopied(false);
    }, COPY_TIMEOUT);
  };

  const Icon = copied ? CheckIcon : CopyIcon;

  return (
    <InputGroup
      className={cn("dark h-10 bg-card font-mono shadow-none", className)}
    >
      <InputGroupAddon>
        <InputGroupText className="pl-2 font-normal text-muted-foreground">
          $
        </InputGroupText>
      </InputGroupAddon>
      <InputGroupInput className="text-foreground" readOnly value={command} />
      <InputGroupAddon align="inline-end" className="pr-2">
        <InputGroupButton
          aria-label="Copy"
          onClick={handleCopy}
          size="icon-sm"
          title="Copy"
        >
          <Icon className="size-3.5" size={14} />
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
};
