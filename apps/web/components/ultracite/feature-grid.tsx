import type { ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", gridClassName)}
  >
    {items.map((item) => (
      <Card className="gap-2" key={item.title}>
        <CardHeader>
          {item.icon ?? null}
          <CardTitle
            className={cn("text-balance tracking-tight", titleClassName)}
          >
            {item.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p
            className={cn(
              "text-pretty text-muted-foreground text-sm",
              descriptionClassName
            )}
          >
            {item.description}
          </p>
        </CardContent>
      </Card>
    ))}
  </div>
);
