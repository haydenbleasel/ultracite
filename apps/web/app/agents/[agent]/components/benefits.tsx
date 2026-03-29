import type { Agent } from "@repo/data/agents";
import {
  Bot,
  BrainCircuit,
  Building2,
  Cloud,
  Code2,
  Command,
  FolderGit2,
  Gauge,
  GitBranch,
  Globe,
  Laptop,
  Layers,
  Monitor,
  ShieldCheck,
  Sparkles,
  Terminal,
  Users,
  Workflow,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { FeatureGrid } from "@/components/ultracite/feature-grid";
import { SectionIntro } from "@/components/ultracite/section-intro";

interface BenefitsProps {
  agent: Agent;
}

const iconMap: Record<string, LucideIcon> = {
  Bot,
  BrainCircuit,
  Building2,
  Cloud,
  Code2,
  Command,
  FolderGit2,
  Gauge,
  GitBranch,
  Github: GitBranch,
  Globe,
  Laptop,
  Layers,
  Monitor,
  ShieldCheck,
  Sparkles,
  Terminal,
  Users,
  Workflow,
  Wrench,
};

export const Benefits = ({ agent }: BenefitsProps) => (
  <div className="grid gap-8">
    <SectionIntro
      description={`These differentiators come from the way ${agent.name} actually handles repo instructions, file updates, and AI-assisted development work.`}
      title={`Why this setup works for ${agent.name}`}
    />
    <FeatureGrid
      items={agent.content.differentiators.map((benefit) => {
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
