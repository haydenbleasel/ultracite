import { type InferPageType, loader } from "fumadocs-core/source";
import { docs } from "@/.source/server";
import { i18n } from "./i18n";

export const source = loader({
  i18n,
  baseUrl: "/",
  source: docs.toFumadocsSource(),
});

export function getPageImage(page: InferPageType<typeof source>) {
  const segments = [...page.slugs, "image.png"];

  return {
    segments,
    url: `/og/docs/${segments.join("/")}`,
  };
}

export async function getLLMText(page: InferPageType<typeof source>) {
  const processed = await page.data.getText("processed");

  return `# ${page.data.title}

${processed}`;
}
