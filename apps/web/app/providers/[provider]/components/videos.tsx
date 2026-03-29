import { SectionIntro } from "@/components/ultracite/section-intro";
import { Video } from "./video";
import type { ProviderPageContent } from "@/lib/provider-content";

interface VideosProps {
  content: ProviderPageContent;
  data: string[];
}

export const Videos = ({ data, content }: VideosProps) => (
  <div className="grid gap-8">
    <SectionIntro
      description={content.videosDescription ?? ""}
      title={content.videosTitle ?? ""}
    />
    <div className="grid gap-8 sm:grid-cols-2">
      {data.map((video) => (
        <Video key={video} video={video} />
      ))}
    </div>
  </div>
);
