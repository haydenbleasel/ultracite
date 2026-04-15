import type { LucideIcon } from "lucide-react";
import {
  FolderTree,
  Layers,
  Puzzle,
  Scale,
  ShieldCheck,
  Zap,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionIntro } from "@/components/ultracite/section-intro";
import type { ProviderPageContent } from "@/lib/provider-content";

interface NarrativeProps {
  content: ProviderPageContent;
}

const iconMap: Record<string, LucideIcon> = {
  FolderTree,
  Layers,
  Puzzle,
  Scale,
  ShieldCheck,
  Zap,
};

export const Narrative = ({ content }: NarrativeProps) => (
  <div className="grid gap-8">
    <SectionIntro
      description={content.sectionsDescription}
      title={content.sectionsTitle}
    />
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {content.sections.map((section) => {
        const Icon = iconMap[section.icon];

        return (
          <Card className="gap-2" key={section.title}>
            <CardHeader>
              {Icon ? (
                <Icon className="mb-3 size-5 text-muted-foreground" />
              ) : null}
              <CardTitle className="max-w-[26ch] text-balance tracking-tight">
                {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              {section.paragraphs.map((paragraph) => (
                <p
                  className="text-pretty text-muted-foreground text-sm leading-6"
                  key={paragraph}
                >
                  {paragraph}
                </p>
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  </div>
);
