import type { LucideIcon } from "lucide-react";
import {
  FolderTree,
  Layers,
  Puzzle,
  Scale,
  ShieldCheck,
  Zap,
} from "lucide-react";

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
    <div className="grid divide-x divide-y border-t border-l sm:grid-cols-2 lg:grid-cols-3">
      {content.sections.map((section) => (
        <section className="p-6 last:border-r last:border-b" key={section.title}>
          {(() => {
            const Icon = iconMap[section.icon];

            return (
              <>
                {Icon ? (
                  <Icon className="mb-3 size-5 text-muted-foreground" />
                ) : null}
                <h3 className="mb-2 max-w-[26ch] text-balance font-medium tracking-tight">
                  {section.title}
                </h3>
                {section.paragraphs.map((paragraph) => (
                  <p
                    className="mb-4 text-pretty text-muted-foreground text-sm leading-6 last:mb-0"
                    key={paragraph}
                  >
                    {paragraph}
                  </p>
                ))}
              </>
            );
          })()}
        </section>
      ))}
    </div>
  </div>
);
