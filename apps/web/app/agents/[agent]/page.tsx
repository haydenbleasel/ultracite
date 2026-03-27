import { agents } from "@repo/data/agents";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { JsonLd } from "@/components/seo/json-ld";
import { Logos } from "@/components/ultracite/logos";
import { Social } from "@/components/ultracite/social";
import {
  createBreadcrumbStructuredData,
  createPageMetadata,
} from "@/lib/site-metadata";

import { Benefits } from "./components/benefits";
import { Files } from "./components/files";
import { AgentHero } from "./components/hero";

export const generateStaticParams = () =>
  agents.map((agent) => ({ agent: agent.id }));

export const generateMetadata = async ({
  params,
}: PageProps<"/agents/[agent]">): Promise<Metadata> => {
  const { agent: agentId } = await params;
  const agent = agents.find((a) => a.id === agentId);

  if (!agent) {
    return {};
  }

  return createPageMetadata({
    description: `Set up Ultracite for ${agent.name}. ${agent.description}`,
    path: `/agents/${agent.id}`,
    title: `Ultracite for ${agent.name}`,
  });
};

const AgentPage = async ({ params }: PageProps<"/agents/[agent]">) => {
  const { agent: agentId } = await params;
  const agent = agents.find((a) => a.id === agentId);

  if (!agent) {
    notFound();
  }

  return (
    <>
      <JsonLd
        data={createBreadcrumbStructuredData([
          { name: "Home", path: "/" },
          { name: agent.name, path: `/agents/${agent.id}` },
        ])}
      />
      <div className="grid gap-16 sm:gap-24 md:gap-32">
        <AgentHero agent={agent} />
        <Files agent={agent} />
        <Benefits agent={agent} />
        <Logos />
        <Social />
      </div>
    </>
  );
};

export default AgentPage;
