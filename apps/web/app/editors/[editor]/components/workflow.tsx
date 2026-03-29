import type { Editor } from "@repo/data/editors";
import { Fragment } from "react";

import { SectionIntro } from "@/components/ultracite/section-intro";

interface WorkflowProps {
  editor: Editor;
}

const renderStep = (step: string) =>
  step
    .split(/(`[^`]+`)/g)
    .filter(Boolean)
    .map((segment, index) => {
      if (segment.startsWith("`") && segment.endsWith("`")) {
        return (
          <code
            className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.9em] text-foreground"
            key={`${step}-${String(index)}`}
          >
            {segment.slice(1, -1)}
          </code>
        );
      }

      return <Fragment key={`${step}-${String(index)}`}>{segment}</Fragment>;
    });

export const Workflow = ({ editor }: WorkflowProps) => (
  <div className="grid gap-8">
    <SectionIntro
      description={`Keep Ultracite present in the day-to-day ${editor.name} workflow with a few editor-specific habits, not just a one-time setup.`}
      title={`Workflow tips for ${editor.name}`}
    />

    <div className="grid gap-4 md:grid-cols-3">
      {editor.workflowHighlights.map((step, index) => (
        <div
          className="grid gap-4 rounded-[1.75rem] border bg-card/40 p-6 transition-colors hover:bg-card/70"
          key={step}
        >
          <span className="inline-flex size-9 items-center justify-center rounded-full bg-secondary font-mono text-sm text-muted-foreground">
            {index + 1}
          </span>
          <p className="text-pretty leading-7 tracking-tight">
            {renderStep(step)}
          </p>
        </div>
      ))}
    </div>
  </div>
);
