import { webUrl } from "@repo/data/consts";
import type { MetadataRoute } from "next";

const robots = (): MetadataRoute.Robots => ({
  rules: [{ userAgent: "*", allow: "/" }],
  sitemap: `${webUrl}/sitemap.xml`,
});

export default robots;
