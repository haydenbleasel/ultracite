import type { Agent } from "@repo/data/agents";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface BestForProps {
  agent: Agent;
}

export const BestFor = ({ agent }: BestForProps) => (
  <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
    <div className="grid gap-4">
      <h2 className="text-balance font-semibold text-2xl tracking-tighter sm:text-3xl md:text-4xl">
        Best for
      </h2>
      <p className="max-w-xl text-balance text-muted-foreground tracking-tight sm:text-lg">
        These are the workflows where Ultracite adds the most leverage to{" "}
        {agent.name}, based on how the agent reads instructions and how teams
        typically wire it into day-to-day development.
      </p>
    </div>
    <div className="grid gap-4 md:grid-cols-2">
      {agent.content.useCases.map((useCase, index) => (
        <Card className="gap-2" key={useCase.title}>
          <CardHeader>
            <span className="w-fit rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.24em]">
              {String(index + 1).padStart(2, "0")}
            </span>
          </CardHeader>
          <CardContent>
            <CardTitle className="text-balance text-lg tracking-tight">
              {useCase.title}
            </CardTitle>
            <p className="mt-3 text-pretty text-muted-foreground text-sm leading-6">
              {useCase.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);
