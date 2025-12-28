import { agents } from "@repo/data/agents";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Logos } from "@/components/logos";
import { Social } from "@/components/social";
import { Benefits } from "./components/benefits";
import { Files } from "./components/files";
import { AgentHero } from "./components/hero";

export const generateStaticParams = () =>
  agents.map((agent) => ({ agent: agent.id }));

export const generateMetadata = async ({
  params,
}: PageProps<"/agents/[agent]">): Promise<Metadata> => {
  const { agent: agentId } = await params;
  const agent = agents.find((agent) => agent.id === agentId);

  if (!agent) {
    return {};
  }

  return {
    title: `${agent.name} | Ultracite`,
    description: agent.description,
  };
};

const AgentPage = async ({ params }: PageProps<"/agents/[agent]">) => {
  const { agent: agentId } = await params;
  const agent = agents.find((agent) => agent.id === agentId);

  if (!agent) {
    notFound();
  }

  return (
    <div className="grid gap-16 sm:gap-24 md:gap-32">
      <AgentHero agent={agent} />
      <Files agent={agent} />
      <Benefits agent={agent} />
      <Logos />
      <Social />
    </div>
  );
};

export default AgentPage;
