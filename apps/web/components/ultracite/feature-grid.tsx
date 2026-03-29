import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface FeatureGridItem {
  description: string;
  icon?: ReactNode;
  title: string;
}

interface FeatureGridProps {
  descriptionClassName?: string;
  gridClassName?: string;
  items: FeatureGridItem[];
  titleClassName?: string;
}

export const FeatureGrid = ({
  descriptionClassName,
  gridClassName,
  items,
  titleClassName,
}: FeatureGridProps) => (
  <div
    className={cn(
      "grid divide-x divide-y border-t border-l sm:grid-cols-2 lg:grid-cols-3",
      gridClassName
    )}
  >
    {items.map((item) => (
      <div className="p-6 last:border-r last:border-b" key={item.title}>
        {item.icon ?? null}
        <h3 className={cn("mb-2 font-medium", titleClassName)}>{item.title}</h3>
        <p
          className={cn(
            "text-pretty text-muted-foreground text-sm",
            descriptionClassName
          )}
        >
          {item.description}
        </p>
      </div>
    ))}
  </div>
);
