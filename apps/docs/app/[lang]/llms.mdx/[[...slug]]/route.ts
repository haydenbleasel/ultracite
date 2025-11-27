import { notFound } from "next/navigation";
import { type NextRequest, NextResponse } from "next/server";
import { getLLMText, source } from "@/lib/source";

export const revalidate = false;

export const GET = async (
  _req: NextRequest,
  { params }: RouteContext<"/[lang]/llms.mdx/[[...slug]]">
) => {
  const { slug, lang } = await params;
  const page = source.getPage(slug, lang);

  if (!page) {
    notFound();
  }

  const text = await getLLMText(page);

  return new NextResponse(text);
};

export const generateStaticParams = () => source.generateParams();
