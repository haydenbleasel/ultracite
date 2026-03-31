import type { Editor } from "@repo/data/editors";

import { FeatureGrid } from "@/components/ultracite/feature-grid";
import { SectionIntro } from "@/components/ultracite/section-intro";

interface BenefitsProps {
  editor: Editor;
}

export const Benefits = ({ editor }: BenefitsProps) => (
  <div className="grid gap-8">
    <SectionIntro
      description={editor.description}
      title={`Why ${editor.name} teams choose Ultracite`}
    />
    <FeatureGrid
      gridClassName="md:grid-cols-3"
      items={editor.differentiators.map((benefit) => ({
        description: benefit.description,
        title: benefit.title,
      }))}
    />
  </div>
);
