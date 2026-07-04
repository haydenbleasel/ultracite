import { SectionIntro } from "@/components/ultracite/section-intro";

import { Video } from "./video";

const videos = [
  "https://www.youtube.com/watch?v=lEkXbneUnWg",
  "https://www.youtube.com/watch?v=b_F4LaycQcE",
];

export const Videos = () => (
  <div className="grid gap-8">
    <SectionIntro
      description="These walkthroughs focus on the Biome migration path and show what the setup looks like in a real project instead of a generic landing-page demo."
      title="Watch the Biome migration flow in action"
    />
    <div className="grid w-full gap-8 sm:grid-cols-2">
      {videos.map((video) => (
        <Video key={video} video={video} />
      ))}
    </div>
  </div>
);
