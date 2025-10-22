"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const Player = dynamic(
  () => import("react-player").then((mod) => mod.default),
  { ssr: false }
);

type VideoProps = {
  video: string;
};

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
