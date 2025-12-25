import { providers } from "@ultracite/data/providers";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CallToAction } from "../../components/cta";
import { Footer } from "../../components/footer";
import { Logos } from "../../components/logos";
import { Social } from "../../components/social";
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
  const provider = providers.find((provider) => provider.id === providerId);

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
  const provider = providers.find((provider) => provider.id === providerId);

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
      <CallToAction />
      <Footer />
    </div>
  );
};

export default ProviderPage;
