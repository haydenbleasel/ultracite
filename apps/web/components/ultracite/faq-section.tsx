import { Fragment } from "react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SectionIntro } from "@/components/ultracite/section-intro";
import { cn } from "@/lib/utils";

export interface FaqSectionItem {
  answer: string;
  question: string;
}

interface FaqSectionProps {
  accordionClassName?: string;
  description: string;
  items: FaqSectionItem[];
  title: string;
}

const getFaqValue = (question: string, index: number) => {
  const value = question
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/(^-|-$)/g, "");

  return value || `faq-${String(index + 1)}`;
};

const getSegmentKey = (
  source: string,
  segment: string,
  searchStart: { value: number }
) => {
  const start = source.indexOf(segment, searchStart.value);
  searchStart.value = start + segment.length;

  return `${String(start)}-${segment}`;
};

const renderAnswer = (answer: string) => {
  const searchStart = { value: 0 };

  return answer
    .split(/(`[^`]+`)/g)
    .filter(Boolean)
    .map((segment) => {
      const key = getSegmentKey(answer, segment, searchStart);

      if (segment.startsWith("`") && segment.endsWith("`")) {
        return (
          <code
            className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.9em] text-foreground"
            key={key}
          >
            {segment.slice(1, -1)}
          </code>
        );
      }

      return <Fragment key={key}>{segment}</Fragment>;
    });
};

export const FaqSection = ({
  accordionClassName,
  description,
  items,
  title,
}: FaqSectionProps) => {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-8">
      <SectionIntro description={description} title={title} />
      <Accordion
        className={cn(
          "mx-auto w-full max-w-4xl rounded-[2rem] bg-card/40",
          accordionClassName
        )}
        collapsible
        type="single"
      >
        {items.map((item, index) => (
          <AccordionItem
            key={item.question}
            value={getFaqValue(item.question, index)}
          >
            <AccordionTrigger className="px-6 py-5 text-balance text-base tracking-tight hover:no-underline sm:text-lg">
              {item.question}
            </AccordionTrigger>
            <AccordionContent className="px-6 text-base text-pretty text-muted-foreground leading-7">
              <p>{renderAnswer(item.answer)}</p>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};
