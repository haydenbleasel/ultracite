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
        height: "100%",
        left: 0,
        position: "absolute",
        top: 0,
        width: "100%",
        zIndex: 1,
      }}
    />
  </div>
);
