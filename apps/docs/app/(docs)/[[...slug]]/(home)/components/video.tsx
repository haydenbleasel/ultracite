"use client";

import dynamic from "next/dynamic";

const Player = dynamic(
  () => import("react-player").then((mod) => mod.default),
  { ssr: false }
);

type VideoProps = {
  video: string;
};

export const Video = ({ video }: VideoProps) => (
  <div className="relative aspect-video overflow-hidden rounded-lg">
    <Player
      controls
      src={video}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
      }}
    />
  </div>
);
