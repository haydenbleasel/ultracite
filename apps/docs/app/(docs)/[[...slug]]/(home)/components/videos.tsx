"use client";

import dynamic from "next/dynamic";

const Player = dynamic(
  () => import("react-player").then((mod) => mod.default),
  { ssr: false }
);

const videos = [
  "https://www.youtube.com/watch?v=lEkXbneUnWg",
  "https://www.youtube.com/watch?v=b_F4LaycQcE",
];

export const Videos = () => (
  <div className="grid gap-16 px-8 py-16">
    <div className="mx-auto grid max-w-3xl gap-4 text-center">
      <h2 className="font-semibold text-4xl tracking-tight">
        See how it works
      </h2>
      <p className="max-w-2xl text-balance text-muted-foreground text-xl">
        Ultracite has been called the easiest way to switch from ESLint and
        Prettier to Biome. Here's a couple of videos that show it in action.
      </p>
    </div>
    <div className="grid gap-8 sm:grid-cols-2">
      {videos.map((video) => (
        <div
          className="relative aspect-video overflow-hidden rounded-lg"
          key={video}
        >
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
      ))}
    </div>
  </div>
);
