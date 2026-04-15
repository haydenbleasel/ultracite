import type { Editor } from "@repo/data/editors";
import { Fragment } from "react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { SectionIntro } from "@/components/ultracite/section-intro";

interface WorkflowProps {
  editor: Editor;
}

const getSegmentKey = (
  source: string,
  segment: string,
  searchStart: { value: number }
) => {
  const start = source.indexOf(segment, searchStart.value);
  searchStart.value = start + segment.length;

  return `${String(start)}-${segment}`;
};

const renderStep = (step: string) => {
  const searchStart = { value: 0 };

  return step
    .split(/(`[^`]+`)/g)
    .filter(Boolean)
    .map((segment) => {
      const key = getSegmentKey(step, segment, searchStart);

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

export const Workflow = ({ editor }: WorkflowProps) => (
  <div className="grid gap-8">
    <SectionIntro
      description={`Keep Ultracite present in the day-to-day ${editor.name} workflow with a few editor-specific habits, not just a one-time setup.`}
      title={`Workflow tips for ${editor.name}`}
    />

    <div className="grid gap-4 md:grid-cols-3">
      {editor.workflowHighlights.map((step, index) => (
        <Card className="gap-2" key={step}>
          <CardHeader>
            <span className="mb-3 inline-flex size-9 items-center justify-center rounded-full bg-secondary font-mono text-sm text-muted-foreground">
              {index + 1}
            </span>
          </CardHeader>
          <CardContent>
            <p className="text-pretty text-sm">{renderStep(step)}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);
