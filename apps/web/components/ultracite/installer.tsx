"use client";

import { track } from "@vercel/analytics";
import { BotIcon, CheckIcon, CopyIcon, UserIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const COPY_TIMEOUT = 2000;
const HUMAN_COMMAND = "npx ultracite@latest init";
const AGENT_COMMAND = "npx skills add haydenbleasel/ultracite";

const MODES = [
  { Icon: UserIcon, label: "Human", value: "human" },
  { Icon: BotIcon, label: "Agent", value: "agent" },
] as const;

type Mode = (typeof MODES)[number]["value"];

interface InstallerProps {
  className?: string;
  human?: string;
  agent?: string;
}

export const Installer = ({
  human = HUMAN_COMMAND,
  agent = AGENT_COMMAND,
  className,
}: InstallerProps) => {
  const [mode, setMode] = useState<Mode>("human");
  const [copied, setCopied] = useState(false);

  const command = mode === "human" ? human : agent;

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(command);
    toast.success("Copied to clipboard", {
      description: "Paste it into your terminal to install Ultracite.",
    });
    setCopied(true);

    track("Copied installer command", { mode });
    setTimeout(() => {
      setCopied(false);
    }, COPY_TIMEOUT);
  }, [command, mode]);

  const CopyButtonIcon = copied ? CheckIcon : CopyIcon;

  return (
    <InputGroup
      className={cn("h-10 bg-card font-mono shadow-none w-full", className)}
    >
      <InputGroupAddon className="pl-px">
        <div className="flex gap-0.5 rounded-full bg-secondary p-0.5">
          {MODES.map(({ value, label, Icon }) => (
            <Tooltip key={value}>
              <TooltipTrigger asChild>
                <InputGroupButton
                  aria-label={`${label} command`}
                  aria-pressed={mode === value}
                  className={cn(
                    mode === value &&
                      "bg-background text-foreground shadow-sm hover:bg-background"
                  )}
                  onClick={() => setMode(value)}
                  size="icon-sm"
                >
                  <Icon className="size-3.5" size={14} />
                </InputGroupButton>
              </TooltipTrigger>
              <TooltipContent>{label}</TooltipContent>
            </Tooltip>
          ))}
        </div>
        <InputGroupText className="font-normal text-muted-foreground px-1">
          $
        </InputGroupText>
      </InputGroupAddon>
      <InputGroupInput className="text-foreground" readOnly value={command} />
      <InputGroupAddon align="inline-end" className="pr-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <InputGroupButton
              aria-label="Copy"
              onClick={handleCopy}
              size="icon-sm"
            >
              <CopyButtonIcon className="size-3.5" size={14} />
            </InputGroupButton>
          </TooltipTrigger>
          <TooltipContent>Copy</TooltipContent>
        </Tooltip>
      </InputGroupAddon>
    </InputGroup>
  );
};
