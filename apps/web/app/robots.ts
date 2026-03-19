import type { MetadataRoute } from "next";

const robots = (): MetadataRoute.Robots => ({
  rules: [{ userAgent: "*", allow: "/" }],
  sitemap: "https://www.ultracite.ai/sitemap.xml",
});

export default robots;
