import Link from "next/link";

import { ReleaseMarkdown } from "@/components/ultracite/release-markdown";
import { getReleases } from "@/lib/changelog";
import { createPageMetadata } from "@/lib/site-metadata";

export const metadata = createPageMetadata({
  description:
    "The latest releases, changes, and improvements to Ultracite across every version.",
  path: "/updates",
  title: "Updates",
});

const UpdatesPage = async () => {
  const releases = await getReleases();

  return (
    <div className="typography mx-auto">
      <h1>Updates</h1>
      <p>
        The latest releases, changes, and improvements to Ultracite across every
        version.
      </p>
      {releases.map((release) => (
        <section className="mt-16 first:mt-12" key={release.id}>
          <h2 className="!mt-0">
            <Link
              className="no-underline hover:underline"
              href={`/updates/${release.id}`}
            >
              {release.title}
            </Link>
          </h2>
          <ReleaseMarkdown>{release.content}</ReleaseMarkdown>
        </section>
      ))}
    </div>
  );
};

export default UpdatesPage;
