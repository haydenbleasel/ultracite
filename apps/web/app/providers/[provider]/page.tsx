"use cache";

import { providers } from "@repo/data/providers";
import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import { notFound } from "next/navigation";

import { Logos } from "@/components/ultracite/logos";
import { Social } from "@/components/ultracite/social";

import { Benefits } from "./components/benefits";
import { Config } from "./components/config";
import { ProviderHero } from "./components/hero";
import { Videos } from "./components/videos";

interface ProviderPageProps {
  params: Promise<{ provider: string }>;
}

export const generateStaticParams = () =>
  providers.map((provider) => ({ provider: provider.id }));

export const generateMetadata = async ({
  params,
}: ProviderPageProps): Promise<Metadata> => {
  const { provider: providerId } = await params;
  const provider = providers.find((p) => p.id === providerId);

  if (!provider) {
    return {};
  }

  return {
    description: provider.description,
    title: provider.name,
  };
};

const ProviderPage = async ({ params }: ProviderPageProps) => {
  cacheLife("days");
  const { provider: providerId } = await params;
  const provider = providers.find((p) => p.id === providerId);

  if (!provider) {
    notFound();
  }

  return (
    <div className="grid gap-16 sm:gap-24 md:gap-32">
      <ProviderHero provider={provider} />
      <Config provider={provider} />
      <Benefits provider={provider} />
      {provider.videos && <Videos data={provider.videos} />}
      <Logos />
      <Social />
    </div>
  );
};

export default ProviderPage;
