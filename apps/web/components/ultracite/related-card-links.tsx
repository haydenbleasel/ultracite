import type { ImageProps } from "next/image";
import Image from "next/image";
import Link from "next/link";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { SectionIntro } from "@/components/ultracite/section-intro";
import { cn } from "@/lib/utils";

export interface RelatedCardLink {
  description: string;
  href: string;
  imageAlt: string;
  imageSrc: ImageProps["src"];
  subtitle: string;
  title: string;
}

interface RelatedCardLinksProps {
  description: string;
  descriptionClassName?: string;
  items: RelatedCardLink[];
  title: string;
}

export const RelatedCardLinks = ({
  description,
  descriptionClassName,
  items,
  title,
}: RelatedCardLinksProps) => {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-8">
      <SectionIntro description={description} title={title} />
      <div className="grid gap-4 md:grid-cols-3">
        {items.map((item) => (
          <Link href={item.href} key={item.href}>
            <Card className="h-full transition-colors duration-200 hover:bg-secondary">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Image
                    alt={item.imageAlt}
                    className="size-10 rounded-full"
                    height={40}
                    src={item.imageSrc}
                    width={40}
                  />
                  <div className="grid gap-0.5">
                    <span className="font-medium tracking-tight">
                      {item.title}
                    </span>
                    <span className="text-muted-foreground text-sm">
                      {item.subtitle}
                    </span>
                  </div>
                </div>
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
          </Link>
        ))}
      </div>
    </div>
  );
};
