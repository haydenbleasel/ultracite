import { TweetSkeleton } from "react-tweet";

const Loading = () => (
  <div className="grid gap-8 sm:gap-20">
    <div className="grid gap-4">
      <div className="h-12 w-3/4 max-w-2xl animate-pulse rounded bg-muted" />
      <div className="h-6 w-1/2 max-w-xl animate-pulse rounded bg-muted" />
    </div>
    <div className="md:columns-2 xl:columns-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div className="mb-4" key={`skeleton-${String(i)}`}>
          <TweetSkeleton />
        </div>
      ))}
    </div>
  </div>
);

export default Loading;
