import { cn } from "@repo/design-system/lib/utils";

interface IndicatorProps {
  title: string;
  description: string;
  className?: string;
  reverse?: boolean;
}

export const Indicator = ({
  title,
  description,
  className,
  reverse,
}: IndicatorProps) => (
  <div className={cn("flex flex-col gap-1", className)}>
    <div
      className={cn(
        "flex items-center gap-2",
        reverse ? "xl:flex-row-reverse" : "flex-row"
      )}
    >
      <p className="shrink-0 font-medium xl:text-sm">{title}</p>
      <div className="hidden h-px flex-1 bg-foreground/10 xl:block" />
    </div>
    <p className="text-muted-foreground xl:text-xs">{description}</p>
  </div>
);
