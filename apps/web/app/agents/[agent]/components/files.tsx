import {
  getDefaultAgentHookContent,
  getDefaultAgentRulesContent,
  type Agent,
} from "@repo/data/agents";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CodeBlock } from "@/components/ultracite/code-block/client";

interface FilesProps {
  agent: Agent;
}

export const Files = ({ agent }: FilesProps) => {
  const rulesContent = getDefaultAgentRulesContent(agent);
  const hookContent = getDefaultAgentHookContent(agent);
  return (
    <div className="grid items-start gap-8 lg:grid-cols-3">
      <div className="grid gap-4">
        <h2 className="text-balance font-semibold text-2xl tracking-tighter sm:text-3xl md:text-4xl">
          Files Ultracite writes for {agent.name}
        </h2>
        <p className="text-balance text-muted-foreground tracking-tight sm:text-lg">
          This preview shows the exact default file content Ultracite writes for{" "}
          {agent.name} when you use the standard Biome setup.
        </p>
        <p className="text-balance text-muted-foreground tracking-tight sm:text-lg">
          If {agent.name} supports hooks, the second tab shows the companion
          hook config that runs after AI-driven edits.
        </p>
      </div>

      <div className="col-span-2 mx-auto w-full max-w-3xl overflow-hidden rounded-lg border">
        <Tabs className="gap-0" defaultValue="rules">
          <div className="border-b bg-secondary px-4 py-3">
            <TabsList>
              <TabsTrigger value="rules">{agent.config.path}</TabsTrigger>
              {hookContent ? (
                <TabsTrigger value="hooks">
                  {agent.hooks?.path ?? "Hook config"}
                </TabsTrigger>
              ) : null}
            </TabsList>
          </div>
          <TabsContent className="mt-0" value="rules">
            <div className="mx-auto h-96 w-full max-w-3xl overflow-auto">
              <CodeBlock code={rulesContent} lang="markdown" />
            </div>
          </TabsContent>
          {hookContent ? (
            <TabsContent className="mt-0" value="hooks">
              <div className="mx-auto h-96 w-full max-w-3xl overflow-auto">
                <CodeBlock code={hookContent} lang="json" />
              </div>
            </TabsContent>
          ) : null}
        </Tabs>
      </div>
    </div>
  );
};
