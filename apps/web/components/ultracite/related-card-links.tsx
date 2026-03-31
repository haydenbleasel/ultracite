import type { ImageProps } from "next/image";
import Image from "next/image";
import Link from "next/link";

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
  cardClassName?: string;
  description: string;
  descriptionClassName?: string;
  items: RelatedCardLink[];
  title: string;
}

export const RelatedCardLinks = ({
  cardClassName,
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
          <Link
            className={cn(
              "grid gap-4 rounded-[1.5rem] border bg-card/40 p-6 transition-colors duration-200 hover:bg-secondary/20",
              cardClassName
            )}
            href={item.href}
            key={item.href}
          >
            <div className="flex items-center gap-3">
              <Image
                alt={item.imageAlt}
                className="size-10 rounded-full"
                height={40}
                src={item.imageSrc}
                width={40}
              />
              <div className="grid gap-0.5">
                <span className="font-medium tracking-tight">{item.title}</span>
                <span className="text-muted-foreground text-sm">
                  {item.subtitle}
                </span>
              </div>
            </div>
            <p
              className={cn(
                "text-pretty text-muted-foreground text-sm",
                descriptionClassName
              )}
            >
              {item.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
};
