import type { Provider } from "@repo/data/providers";
import {
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
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { FeatureGrid } from "@/components/ultracite/feature-grid";
import { SectionIntro } from "@/components/ultracite/section-intro";
import type { ProviderPageContent } from "@/lib/provider-content";

interface BenefitsProps {
  content: ProviderPageContent;
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

export const Benefits = ({ provider, content }: BenefitsProps) => (
  <div className="grid gap-8">
    <SectionIntro
      description={content.benefitsDescription}
      title={content.benefitsTitle}
    />
    <FeatureGrid
      items={provider.benefits.map((benefit) => {
        const Icon = iconMap[benefit.icon];

        return {
          description: benefit.description,
          icon: Icon ? (
            <Icon className="mb-3 size-5 text-muted-foreground" />
          ) : undefined,
          title: benefit.title,
        };
      })}
    />
  </div>
);
