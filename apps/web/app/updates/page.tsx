import { getReleaseGroups } from "@/lib/changelog";
import { createPageMetadata } from "@/lib/site-metadata";

import { ReleaseList } from "./components/release-list";

export const metadata = createPageMetadata({
  description:
    "The latest releases, changes, and improvements to Ultracite across every version.",
  path: "/updates",
  title: "Updates",
});

const UpdatesPage = async () => {
  const groups = await getReleaseGroups();

  return (
    <div className="typography mx-auto">
      <h1>Updates</h1>
      <p>
        The latest releases, changes, and improvements to Ultracite across every
        version.
      </p>
      <ReleaseList groups={groups} />
    </div>
  );
};

export default UpdatesPage;
