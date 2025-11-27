"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Installer } from "./installer";
import { Video } from "./video";

const videos = [
  {
    id: "betterstack",
    url: "https://www.youtube.com/watch?v=lEkXbneUnWg",
    title: "BetterStack",
    avatar: "https://github.com/betterstackhq.png",
  },
  {
    id: "orcdev",
    url: "https://www.youtube.com/watch?v=b_F4LaycQcE",
    title: "OrcDev",
    avatar: "https://github.com/theorcdev.png",
  },
];

export const Videos = () => {
  const [video, setVideo] = useState(videos[0].id);
  const activeVideo = videos.find((v) => v.id === video);

  return (
    <div className="grid items-center gap-8 lg:grid-cols-2">
      <div className="grid gap-6">
        <h1 className="mb-0 text-balance font-semibold text-4xl! tracking-tighter! md:text-5xl! xl:text-6xl!">
          A highly opinionated, zero-configuration linter and formatter
        </h1>
        <p className="max-w-xl text-muted-foreground md:text-xl">
          Ultracite is a highly opinionated preset for{" "}
          <a className="underline" href="https://biomejs.dev">
            Biome
          </a>
          , designed to help you and your AI models write consistent and
          type-safe code without the hassle of configuration.
        </p>
        <div className="flex w-full max-w-lg items-center gap-4">
          <Installer command="npx ultracite@latest init" />
          <Button asChild className="px-4" size="lg" variant="outline">
            <Link href="/introduction">Read the docs</Link>
          </Button>
        </div>
      </div>
      <div>
        {activeVideo && <Video video={activeVideo.url} />}
        <div className="mt-4 flex items-center justify-center gap-2">
          {videos.map((v) => (
            <Button
              key={v.id}
              onClick={() => setVideo(v.id)}
              variant={video === v.id ? "secondary" : "ghost"}
            >
              <Image alt={v.title} height={20} src={v.avatar} width={20} />
              {v.title}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};
