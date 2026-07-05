const siteName = "Ultracite";
export const siteDescription =
  "Ultracite is a zero-config preset for ESLint, Biome, and Oxlint that helps teams and AI write consistent, type-safe code.";

const ogImagePath = "/opengraph-image.png";

// The homepage passes Blume's resolved `config.site` so absolute URLs in the
// structured data match the deployed origin. It can be empty in a local build
// with no deployment site, so fall back to the production origin.
const FALLBACK_ORIGIN = "https://www.ultracite.ai";

const absolute = (siteUrl: string, path = "/"): string =>
  new URL(path, siteUrl || FALLBACK_ORIGIN).toString();

export const siteJsonLd = (siteUrl: string) => ({
  "@context": "https://schema.org",
  "@graph": [
    {
      "@id": `${absolute(siteUrl)}#organization`,
      "@type": "Organization",
      logo: absolute(siteUrl, "/icon.png"),
      name: siteName,
      sameAs: [
        "https://github.com/haydenbleasel/ultracite",
        "https://x.com/haydenbleasel",
      ],
      url: absolute(siteUrl),
    },
    {
      "@id": `${absolute(siteUrl)}#website`,
      "@type": "WebSite",
      description: siteDescription,
      inLanguage: "en-US",
      name: siteName,
      publisher: { "@id": `${absolute(siteUrl)}#organization` },
      url: absolute(siteUrl),
    },
  ],
});

export const softwareAppJsonLd = (siteUrl: string) => ({
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  applicationCategory: "DeveloperApplication",
  description: siteDescription,
  image: absolute(siteUrl, ogImagePath),
  name: siteName,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  operatingSystem: "macOS, Windows, Linux",
  publisher: { "@id": `${absolute(siteUrl)}#organization` },
  url: absolute(siteUrl),
});
