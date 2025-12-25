import type { Provider } from "@ultracite/data/providers";
import {
  ArrowUpDown,
  Box,
  Boxes,
  Bug,
  Code,
  FileCode,
  FolderTree,
  Layers,
  type LucideIcon,
  Package,
  Puzzle,
  RefreshCw,
  ShieldCheck,
  Target,
  Zap,
} from "lucide-react";

interface BenefitsProps {
  provider: Provider;
}

const iconMap: Record<string, LucideIcon> = {
  ArrowUpDown,
  Box,
  Boxes,
  Bug,
  Code,
  FileCode,
  FolderTree,
  Layers,
  Package,
  Puzzle,
  RefreshCw,
  ShieldCheck,
  Target,
  Zap,
};

export const Benefits = ({ provider }: BenefitsProps) => (
  <div className="grid gap-8">
    <div className="mx-auto grid max-w-3xl gap-4 text-center">
      <h2 className="text-balance font-semibold text-2xl tracking-tighter sm:text-3xl md:text-4xl">
        Why choose {provider.name.split(" ")[0]}?
      </h2>
      <p className="text-balance text-muted-foreground tracking-tight sm:text-lg">
        {provider.description}
      </p>
    </div>
    <div className="grid divide-x divide-y rounded-lg border-t border-l sm:grid-cols-2 lg:grid-cols-3">
      {provider.benefits.map((benefit) => {
        const Icon = iconMap[benefit.icon];
        return (
          <div className="p-6 last:border-r last:border-b" key={benefit.title}>
            {Icon && <Icon className="mb-3 size-5 text-muted-foreground" />}
            <h3 className="mb-2 font-medium">{benefit.title}</h3>
            <p className="text-pretty text-muted-foreground text-sm">
              {benefit.description}
            </p>
          </div>
        );
      })}
    </div>
  </div>
);
