import { notFound } from "next/navigation";

import { ReleaseMarkdown } from "@/components/ultracite/release-markdown";
import { getReleaseById, getReleases } from "@/lib/changelog";
import { createPageMetadata } from "@/lib/site-metadata";

interface ReleasePageProps {
  params: Promise<{ id: string }>;
}

export const generateStaticParams = async () => {
  const releases = await getReleases();
  return releases.map((release) => ({ id: release.id }));
};

export const generateMetadata = async ({ params }: ReleasePageProps) => {
  const { id } = await params;
  const release = await getReleaseById(id);
  if (!release) {
    return createPageMetadata({
      path: `/updates/${id}`,
      title: "Release not found",
    });
  }

  return createPageMetadata({
    description: `Release notes for Ultracite ${release.title}.`,
    path: `/updates/${release.id}`,
    title: `Ultracite ${release.title}`,
  });
};

const ReleasePage = async ({ params }: ReleasePageProps) => {
  const { id } = await params;
  const release = await getReleaseById(id);

  if (!release) {
    notFound();
  }

  return (
    <div className="typography mx-auto">
      <h1>{release.title}</h1>
      <ReleaseMarkdown>{release.content}</ReleaseMarkdown>
    </div>
  );
};

export default ReleasePage;
