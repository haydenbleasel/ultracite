import { agents } from "@repo/data/agents";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { JsonLd } from "@/components/seo/json-ld";
import { FaqSection } from "@/components/ultracite/faq-section";
import { Logos } from "@/components/ultracite/logos";
import { Social } from "@/components/ultracite/social";
import {
  createBreadcrumbStructuredData,
  createFaqStructuredData,
  createPageMetadata,
} from "@/lib/site-metadata";

import { BestFor } from "./components/best-for";
import { Benefits } from "./components/benefits";
import { Files } from "./components/files";
import { AgentHero } from "./components/hero";
import { RelatedAgents } from "./components/related-agents";
import { SetupDetails } from "./components/setup-details";

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
    description: agent.content.metaDescription,
    imageAlt: `Ultracite for ${agent.name}`,
    imagePath: `/agents/${agent.id}/opengraph-image`,
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

  const relatedAgents = agents
    .filter(
      (candidate) =>
        candidate.category === agent.category && candidate.id !== agent.id
    )
    .slice(0, 3);

  return (
    <>
      <JsonLd
        data={createBreadcrumbStructuredData([
          { name: "Home", path: "/" },
          { name: agent.name, path: `/agents/${agent.id}` },
        ])}
      />
      {agent.content.faq?.length ? (
        <JsonLd data={createFaqStructuredData(agent.content.faq)} />
      ) : null}
      <div className="grid gap-16 sm:gap-24 md:gap-32">
        <AgentHero agent={agent} />
        <SetupDetails agent={agent} />
        <Files agent={agent} />
        <BestFor agent={agent} />
        <Benefits agent={agent} />
        <RelatedAgents agents={relatedAgents} category={agent.category} />
        {agent.content.faq?.length ? (
          <FaqSection
            description="A few implementation details that come up often when teams wire Ultracite into this agent."
            items={agent.content.faq}
            title="Frequently asked questions"
          />
        ) : null}
        <Logos />
        <Social />
      </div>
    </>
  );
};

export default AgentPage;
