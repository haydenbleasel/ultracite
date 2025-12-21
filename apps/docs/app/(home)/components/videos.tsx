import { Video } from "./video";

export const Videos = () => (
  <div className="grid gap-8">
    <div className="mx-auto grid max-w-3xl gap-4 text-center">
      <h2 className="text-balance font-semibold text-3xl tracking-tighter md:text-4xl">
        See how to <span className="italic">migrate</span> to Ultracite
      </h2>
      <p className="text-balance text-lg text-muted-foreground tracking-tight">
        Watch some popular YouTubers use Ultracite to lint and format their
        code.
      </p>
    </div>
    <div className="grid gap-8 sm:grid-cols-2">
      <Video video="https://www.youtube.com/watch?v=lEkXbneUnWg" />
      <Video video="https://www.youtube.com/watch?v=b_F4LaycQcE" />
    </div>
  </div>
);
