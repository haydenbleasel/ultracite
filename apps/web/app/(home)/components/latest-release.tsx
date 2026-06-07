import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";

import { getLatestVersion, getReleaseUrl } from "@/lib/latest-version";

export const LatestRelease = async () => {
  const version = await getLatestVersion();

  return (
    <Link
      className="group flex w-fit items-center gap-2 text-muted-foreground text-sm transition-colors hover:text-foreground"
      href={getReleaseUrl(version)}
      rel="noopener noreferrer"
      target="_blank"
    >
      <span
        aria-hidden="true"
        className="size-2 shrink-0 rounded-full bg-emerald-500"
      />
      <span>Latest update — v{version} released</span>
      <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
};
