'use client';

import { Button } from '@/components/ui/button';
import { CopyIcon } from 'lucide-react';
import { toast } from 'sonner';

const command = 'npx ultracite@latest init';

export const Installer = () => {
  const handleCopy = () => {
    navigator.clipboard.writeText(command);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="flex h-10 w-full items-center justify-center gap-2 whitespace-nowrap rounded-md bg-secondary py-2 pr-0.5 pl-4 text-foreground text-sm">
      <p className="pointer-events-none shrink-0 select-none text-muted-foreground">
        $
      </p>
      <div className="flex-1 truncate text-left font-mono">{command}</div>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          size="icon"
          variant="ghost"
          aria-label="Copy"
          onClick={handleCopy}
          className="cursor-pointer rounded-[6px] hover:bg-background/50"
        >
          <CopyIcon size={14} className="text-muted-foreground" />
        </Button>
      </div>
    </div>
  );
};
