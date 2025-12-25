import {
  getProviderById,
  type ProviderId,
  providerIds,
} from "@ultracite/data/providers";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CallToAction } from "../../components/cta";
import { Footer } from "../../components/footer";
import { Logos } from "../../components/logos";
import { Social } from "../../components/social";
import { Config } from "./components/config";
import { Features } from "./components/features";
import { ProviderHero } from "./components/hero";
import { Sections } from "./components/sections";

interface ProviderPageProps {
  params: Promise<{ provider: string }>;
}

export const generateStaticParams = () =>
  providerIds.map((provider) => ({ provider }));

export const generateMetadata = async ({
  params,
}: ProviderPageProps): Promise<Metadata> => {
  const { provider: providerId } = await params;
  const provider = getProviderById(providerId as ProviderId);

  if (!provider) {
    return {};
  }

  return {
    title: provider.title,
    description: provider.description,
  };
};

const ProviderPage = async ({ params }: ProviderPageProps) => {
  const { provider: providerId } = await params;
  const provider = getProviderById(providerId as ProviderId);

  if (!provider) {
    notFound();
  }

  return (
    <div className="grid gap-16 sm:gap-24 md:gap-32">
      <ProviderHero provider={provider} />
      <Features provider={provider} />
      <Config provider={provider} />
      <Sections provider={provider} />
      <Logos />
      <Social />
      <CallToAction />
      <Footer />
    </div>
  );
};

export default ProviderPage;
