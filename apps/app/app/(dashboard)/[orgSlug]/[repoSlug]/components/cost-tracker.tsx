import type { LintRun } from "@repo/backend/database";
import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@repo/design-system/components/ui/popover";
import { DollarSignIcon } from "lucide-react";

interface CostTrackerProps {
  runs: Pick<LintRun, "sandboxCostUsd" | "aiCostUsd">[];
}

export const CostTracker = ({ runs }: CostTrackerProps) => {
  const totalSandboxCost = runs.reduce(
    (acc, run) => acc + Number(run.sandboxCostUsd),
    0
  );
  const totalAiCost = runs.reduce(
    (acc, run) => acc + Number(run.aiCostUsd ?? 0),
    0
  );
  const totalCost = totalSandboxCost + totalAiCost;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Badge className="hidden cursor-pointer lg:flex" variant="secondary">
          <DollarSignIcon className="size-4" />
          <span className="font-mono tabular-nums">{totalCost.toFixed(2)}</span>
        </Badge>
      </PopoverTrigger>
      <PopoverContent align="start" side="bottom">
        <PopoverHeader>
          <PopoverTitle>Usage Cost Breakdown</PopoverTitle>
          <PopoverDescription>
            {runs.length} run{runs.length === 1 ? "" : "s"}
          </PopoverDescription>
        </PopoverHeader>
        <div className="flex flex-col gap-2">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Sandbox:</span>
            <span className="font-mono tabular-nums">
              ${totalSandboxCost.toFixed(4)}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">AI:</span>
            <span className="font-mono tabular-nums">
              ${totalAiCost.toFixed(4)}
            </span>
          </div>
          <div className="flex justify-between gap-4 border-t pt-2">
            <span className="font-medium">Total:</span>
            <span className="font-mono tabular-nums">
              ${totalCost.toFixed(4)}
            </span>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
