import type { Agent } from "@ultracite/data/agents";
import { getRules } from "@ultracite/data/rules";
import { CodeBlock } from "@/components/ultracite/code-block/client";

interface FilesProps {
  agent: Agent;
}

export const Files = ({ agent }: FilesProps) => (
  <div className="grid items-start gap-8 lg:grid-cols-3">
    <div className="grid gap-4">
      <h2 className="text-balance font-semibold text-2xl tracking-tighter sm:text-3xl md:text-4xl">
        Configuration
      </h2>
      <p className="text-balance text-muted-foreground tracking-tight sm:text-lg">
        Ultracite automatically creates and manages the configuration file for{" "}
        {agent.name}.
      </p>
      <p className="text-balance text-muted-foreground tracking-tight sm:text-lg">
        This rules file teaches {agent.name} your project's code standards
        covering type safety, modern JavaScript patterns, React best practices,
        accessibility, security, and performance.
      </p>
    </div>

    <div className="col-span-2 mx-auto w-full max-w-3xl divide-y overflow-hidden rounded-lg border">
      <div className="bg-secondary px-4 py-3">
        <p className="inline-flex flex-auto grow-0 items-center gap-2 rounded-sm px-2 py-1 font-mono text-xs">
          {agent.config.path}
        </p>
      </div>
      <div className="mx-auto h-96 w-full max-w-3xl overflow-auto">
        <CodeBlock code={getRules("npm")} lang="markdown" />
      </div>
    </div>
  </div>
);
