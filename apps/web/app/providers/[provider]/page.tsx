import { providers } from "@repo/data/providers";
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
import { getProviderPageContent } from "@/lib/provider-content";

import { Benefits } from "./components/benefits";
import { Config } from "./components/config";
import { ProviderHero } from "./components/hero";
import { Narrative } from "./components/narrative";
import { RelatedResources } from "./components/related-resources";
import { Videos } from "./components/videos";

export const generateStaticParams = () =>
  providers.map((provider) => ({ provider: provider.id }));

export const generateMetadata = async ({
  params,
}: PageProps<"/providers/[provider]">): Promise<Metadata> => {
  const { provider: providerId } = await params;
  const provider = providers.find((p) => p.id === providerId);

  if (!provider) {
    return {};
  }

  const content = getProviderPageContent(provider.id);

  return createPageMetadata({
    description: content.metadataDescription,
    path: `/providers/${provider.id}`,
    title: content.metadataTitle,
  });
};

const ProviderPage = async ({ params }: PageProps<"/providers/[provider]">) => {
  const { provider: providerId } = await params;
  const provider = providers.find((p) => p.id === providerId);

  if (!provider) {
    notFound();
  }

  const content = getProviderPageContent(provider.id);

  return (
    <>
      <JsonLd
        data={createBreadcrumbStructuredData([
          { name: "Home", path: "/" },
          { name: provider.name, path: `/providers/${provider.id}` },
        ])}
      />
      <JsonLd data={createFaqStructuredData(content.faqs)} />
      <div className="grid gap-16 sm:gap-24 md:gap-32">
        <ProviderHero content={content} provider={provider} />
        <Narrative content={content} />
        <Config content={content} provider={provider} />
        <Benefits content={content} provider={provider} />
        {provider.videos && content.videosTitle && content.videosDescription ? (
          <Videos content={content} data={provider.videos} />
        ) : null}
        <FaqSection
          description={content.faqsDescription}
          items={content.faqs}
          title={content.faqsTitle}
        />
        <RelatedResources content={content} />
        <Logos />
        <Social />
      </div>
    </>
  );
};

export default ProviderPage;
