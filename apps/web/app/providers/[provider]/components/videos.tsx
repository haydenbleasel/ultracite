import { Video } from "./video";

interface VideosProps {
  data: string[];
}

export const Videos = ({ data }: VideosProps) => (
  <div className="grid gap-8">
    <div className="mx-auto grid max-w-3xl gap-4 text-center">
      <h2 className="text-balance font-semibold text-2xl tracking-tighter sm:text-3xl md:text-4xl">
        See how to migrate to Ultracite
      </h2>
      <p className="text-balance text-muted-foreground tracking-tight sm:text-lg">
        Watch some popular YouTubers use Ultracite to lint and format their
        code.
      </p>
    </div>
    <div className="grid gap-8 sm:grid-cols-2">
      {data.map((video) => (
        <Video key={video} video={video} />
      ))}
    </div>
  </div>
);
