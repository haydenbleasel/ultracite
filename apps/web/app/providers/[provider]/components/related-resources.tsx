import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
          <Card className="gap-2" key={resource.title}>
            <CardHeader>
              <CardTitle className="text-balance text-xl tracking-tight">
                {resource.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <p className="text-pretty text-base text-muted-foreground leading-7">
                {resource.description}
              </p>
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
            </CardContent>
          </Card>
        );
      })}
    </div>
  </div>
);
