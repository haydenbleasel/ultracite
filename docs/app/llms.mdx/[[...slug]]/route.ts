import { type NextRequest, NextResponse } from 'next/server';
import { getLLMText } from '@/lib/get-llm-text';
import { source } from '@/lib/source';
import { notFound } from 'next/navigation';

export const revalidate = false;

type GetProps = {
  params: Promise<{ slug?: string[] }>;
}

export const GET = async (_req: NextRequest, { params }: GetProps) => {
  const { slug } = await params;
  const page = source.getPage(slug);
  
  if (!page) {
    notFound();
  }

  const text = await getLLMText(page);

  return new NextResponse(text);
}

export const generateStaticParams = () => source.generateParams();