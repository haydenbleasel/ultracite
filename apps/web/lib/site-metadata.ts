import type { Metadata } from "next";

export const siteName = "Ultracite";
export const siteDescription =
  "Ultracite is a highly opinionated preset for ESLint, Biome and Oxlint; designed to help you and your AI models write consistent and type-safe code without the hassle of configuration.";

const ogImagePath = "/opengraph-image.png";
const twitterHandle = "@haydenbleasel";
const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
const productionHost =
  process.env.VERCEL_PROJECT_PRODUCTION_URL ?? "localhost:3000";
const canonicalHost =
  productionHost === "ultracite.ai" ? "www.ultracite.ai" : productionHost;
export const siteUrl = `${protocol}://${canonicalHost}`;

const facebookAppId =
  process.env.FACEBOOK_APP_ID ?? process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;

const createFacebookMetadata = (): Metadata["other"] | undefined =>
  facebookAppId ? { "fb:app_id": facebookAppId } : undefined;

export const createAbsoluteUrl = (path = "/") =>
  new URL(path, siteUrl).toString();

export const rootMetadata: Metadata = {
  applicationName: siteName,
  alternates: {
    canonical: createAbsoluteUrl("/"),
  },
  description: siteDescription,
  metadataBase: new URL(siteUrl),
  openGraph: {
    description: siteDescription,
    images: [
      {
        alt: siteName,
        height: 630,
        url: createAbsoluteUrl(ogImagePath),
        width: 1200,
      },
    ],
    locale: "en_US",
    siteName,
    title: siteName,
    type: "website",
    url: createAbsoluteUrl("/"),
  },
  other: createFacebookMetadata(),
  robots: {
    follow: true,
    googleBot: {
      follow: true,
      index: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
    index: true,
  },
  title: {
    default: siteName,
    template: `%s | ${siteName}`,
  },
  twitter: {
    card: "summary_large_image",
    creator: twitterHandle,
    description: siteDescription,
    images: [createAbsoluteUrl(ogImagePath)],
    site: twitterHandle,
    title: siteName,
  },
};

interface CreatePageMetadataOptions {
  description?: string;
  imageAlt?: string;
  imagePath?: string;
  path?: string;
  title: string;
}

export const createPageMetadata = ({
  description = siteDescription,
  imageAlt = siteName,
  imagePath = ogImagePath,
  path = "/",
  title,
}: CreatePageMetadataOptions): Metadata => {
  const canonicalUrl = createAbsoluteUrl(path);
  const imageUrl = createAbsoluteUrl(imagePath);

  return {
    alternates: {
      canonical: canonicalUrl,
    },
    description,
    openGraph: {
      description,
      images: [
        {
          alt: imageAlt,
          height: 630,
          url: imageUrl,
          width: 1200,
        },
      ],
      locale: "en_US",
      siteName,
      title,
      type: "website",
      url: canonicalUrl,
    },
    other: createFacebookMetadata(),
    title,
    twitter: {
      card: "summary_large_image",
      creator: twitterHandle,
      description,
      images: [imageUrl],
      site: twitterHandle,
      title,
    },
  };
};

interface BreadcrumbItem {
  name: string;
  path: string;
}

interface FaqItem {
  answer: string;
  question: string;
}

export const createSiteStructuredData = () => ({
  "@context": "https://schema.org",
  "@graph": [
    {
      "@id": `${createAbsoluteUrl("/")}#organization`,
      "@type": "Organization",
      logo: createAbsoluteUrl("/icon.png"),
      name: siteName,
      sameAs: [
        "https://github.com/haydenbleasel/ultracite",
        "https://x.com/haydenbleasel",
      ],
      url: createAbsoluteUrl("/"),
    },
    {
      "@id": `${createAbsoluteUrl("/")}#website`,
      "@type": "WebSite",
      description: siteDescription,
      inLanguage: "en-US",
      name: siteName,
      publisher: {
        "@id": `${createAbsoluteUrl("/")}#organization`,
      },
      url: createAbsoluteUrl("/"),
    },
  ],
});

export const createSoftwareApplicationStructuredData = () => ({
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  applicationCategory: "DeveloperApplication",
  description: siteDescription,
  image: createAbsoluteUrl(ogImagePath),
  name: siteName,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  operatingSystem: "macOS, Windows, Linux",
  publisher: {
    "@id": `${createAbsoluteUrl("/")}#organization`,
  },
  url: createAbsoluteUrl("/"),
});

export const createBreadcrumbStructuredData = (items: BreadcrumbItem[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((item, index) => ({
    "@type": "ListItem",
    item: createAbsoluteUrl(item.path),
    name: item.name,
    position: index + 1,
  })),
});

export const createFaqStructuredData = (items: FaqItem[]) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: items.map((item) => ({
    "@type": "Question",
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
    name: item.question,
  })),
});
