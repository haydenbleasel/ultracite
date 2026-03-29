import type { Editor } from "@repo/data/editors";

import { RelatedCardLinks } from "@/components/ultracite/related-card-links";

interface RelatedEditorsProps {
  editor: Editor;
  relatedEditors: Editor[];
}

export const RelatedEditors = ({
  editor,
  relatedEditors,
}: RelatedEditorsProps) => (
  <RelatedCardLinks
    cardClassName="rounded-lg bg-card/20 hover:bg-sidebar"
    description="These nearby setups make it easier to compare how Ultracite handles shared settings, AI rules, and editor-specific workflow details."
    descriptionClassName="tracking-tight"
    items={relatedEditors.map((relatedEditor) => ({
      description: relatedEditor.seo.summary,
      href: `/editors/${relatedEditor.id}`,
      imageAlt: relatedEditor.name,
      imageSrc: relatedEditor.logo,
      subtitle: relatedEditor.subtitle,
      title: relatedEditor.name,
    }))}
    title={`Compare ${editor.name} with other Ultracite-supported editors`}
  />
);
