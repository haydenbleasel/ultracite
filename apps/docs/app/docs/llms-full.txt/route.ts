import { getLLMText, source } from "@/lib/source";

export const revalidate = false;

export const GET = async () => {
  const scan = source.getPages().map(getLLMText);
  const scanned = await Promise.all(scan);

  return new Response(scanned.join("\n\n"));
};
