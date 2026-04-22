"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ReleaseMarkdown } from "@/components/ultracite/release-markdown";
import type { ReleaseGroup } from "@/lib/changelog";

interface ReleaseListProps {
  groups: ReleaseGroup[];
}

export const ReleaseList = ({ groups }: ReleaseListProps) => {
  const [visibleCount, setVisibleCount] = useState(1);
  const visibleGroups = groups.slice(0, visibleCount);
  const hasMore = visibleCount < groups.length;

  return (
    <>
      {visibleGroups.map((group, index) => {
        const isLastVisible = index === visibleGroups.length - 1;
        return (
          <div key={group.major}>
            {group.releases.map((release) => (
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
            {isLastVisible && hasMore && (
              <div className="not-typography mt-12 flex justify-center">
                <Button
                  onClick={() => setVisibleCount((count) => count + 1)}
                  variant="outline"
                >
                  See previous releases
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
};
