'use client';

import { CheckIcon, CopyIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

const command = 'npx ultracite@latest init';

export const Installer = () => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(command);
    toast.success('Copied to clipboard');
    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  const Icon = copied ? CheckIcon : CopyIcon;

  return (
    <div className="flex h-10 w-full items-center justify-center gap-2 whitespace-nowrap rounded-md border border-foreground/5 bg-foreground/5 py-2 pr-0.5 pl-4 text-foreground text-sm backdrop-blur-sm">
      <p className="pointer-events-none shrink-0 select-none text-muted-foreground">
        $
      </p>
      <div className="flex-1 truncate text-left font-mono">{command}</div>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          aria-label="Copy"
          className="cursor-pointer rounded-[6px] hover:bg-background/50"
          disabled={copied}
          onClick={handleCopy}
          size="icon"
          variant="ghost"
        >
          <Icon className="text-muted-foreground" size={14} />
        </Button>
      </div>
    </div>
  );
};
