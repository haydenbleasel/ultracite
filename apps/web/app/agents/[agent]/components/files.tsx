import { SiJson, SiMarkdown } from "@icons-pack/react-simple-icons";
import {
  getDefaultAgentHookContent,
  getDefaultAgentRulesContent,
} from "@repo/data/agents";
import type { Agent } from "@repo/data/agents";

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

      <div className="col-span-2 mx-auto w-full max-w-3xl overflow-hidden rounded-2xl border">
        <Tabs className="gap-0" defaultValue="rules">
          <TabsList className="w-full justify-start rounded-none border-b bg-secondary px-4 py-3 group-data-horizontal/tabs:h-auto">
            <TabsTrigger
              className="inline-flex flex-auto grow-0 items-center gap-2 rounded-sm px-2 py-1 text-xs"
              value="rules"
            >
              <SiMarkdown className="size-3.5 text-muted-foreground" />
              <span>{agent.config.path}</span>
            </TabsTrigger>
            {hookContent ? (
              <TabsTrigger
                className="inline-flex flex-auto grow-0 items-center gap-2 rounded-sm px-2 py-1 text-xs"
                value="hooks"
              >
                <SiJson className="size-3.5 text-muted-foreground" />
                <span>{agent.hooks?.path ?? "Hook config"}</span>
              </TabsTrigger>
            ) : null}
          </TabsList>
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
