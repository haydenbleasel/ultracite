import { Video } from "./video";

export const Videos = () => (
  <div className="grid gap-8">
    <div className="mx-auto grid max-w-3xl gap-4 text-center">
      <h2 className="text-balance font-medium text-3xl tracking-tighter">
        See how to migrate to Ultracite
      </h2>
      <p className="text-balance text-lg text-muted-foreground">
        Watch some popular YouTubers use Ultracite to lint and format their
        code.
      </p>
    </div>
    <div className="grid grid-cols-2 gap-8">
      <Video video="https://www.youtube.com/watch?v=lEkXbneUnWg" />
      <Video video="https://www.youtube.com/watch?v=b_F4LaycQcE" />
    </div>
  </div>
);
