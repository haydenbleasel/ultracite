import type { Agent, AgentCategory } from "@repo/data/agents";

import { RelatedCardLinks } from "@/components/ultracite/related-card-links";

interface RelatedAgentsProps {
  agents: Agent[];
  category: AgentCategory;
}

const categoryLabels: Record<AgentCategory, string> = {
  "cloud-agent": "cloud agents",
  "editor-agent": "editor agents",
  "ide-agent": "IDE agents",
  "open-source-agent": "open-source agents",
  "terminal-agent": "terminal agents",
};

export const RelatedAgents = ({ agents, category }: RelatedAgentsProps) => {
  return (
    <RelatedCardLinks
      description={`If ${agentNameList(agents)} are close to the way you work, these neighboring integrations are worth comparing too.`}
      items={agents.map((agent) => ({
        description: agent.content.metaDescription,
        href: `/agents/${agent.id}`,
        imageAlt: agent.name,
        imageSrc: agent.logo,
        subtitle: agent.subtitle,
        title: agent.name,
      }))}
      title={`Related ${categoryLabels[category]}`}
    />
  );
};

const agentNameList = (agents: Agent[]) =>
  agents.map((agent) => agent.name).join(", ");
