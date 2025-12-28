"use client";

import { Skeleton } from "@repo/design-system/components/ui/skeleton";
import dynamic from "next/dynamic";

const Player = dynamic(
  () => import("react-player").then((mod) => mod.default),
  { ssr: false }
);

interface VideoProps {
  video: string;
}

export const Video = ({ video }: VideoProps) => (
  <div className="relative isolate aspect-video overflow-hidden rounded-lg">
    <Skeleton className="size-full" />
    <Player
      controls
      src={video}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 1,
      }}
    />
  </div>
);
