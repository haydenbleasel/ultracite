import Link from "next/link";

import { Button } from "@/components/ui/button";
import { SectionIntro } from "@/components/ultracite/section-intro";
import type { ProviderPageContent } from "@/lib/provider-content";

interface RelatedResourcesProps {
  content: ProviderPageContent;
}

const isExternalLink = (href: string) => href.startsWith("http");

export const RelatedResources = ({ content }: RelatedResourcesProps) => (
  <div className="grid gap-8">
    <SectionIntro
      description={content.resourcesDescription}
      title={content.resourcesTitle}
    />
    <div className="grid gap-4 sm:grid-cols-2">
      {content.resources.map((resource) => {
        const external = isExternalLink(resource.href);

        return (
          <article
            className="grid gap-4 rounded-[2rem] border bg-card/40 p-6"
            key={resource.title}
          >
            <div className="grid gap-2">
              <h3 className="text-balance font-medium text-xl tracking-tight">
                {resource.title}
              </h3>
              <p className="text-pretty text-muted-foreground leading-7">
                {resource.description}
              </p>
            </div>
            <div>
              <Button asChild variant="outline">
                {external ? (
                  <a href={resource.href} rel="noreferrer" target="_blank">
                    Open resource
                  </a>
                ) : (
                  <Link href={resource.href}>Open resource</Link>
                )}
              </Button>
            </div>
          </article>
        );
      })}
    </div>
  </div>
);
