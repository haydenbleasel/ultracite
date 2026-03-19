import { cacheLife } from "next/cache";
import { Suspense } from "react";
import { EmbeddedTweet, TweetNotFound, TweetSkeleton } from "react-tweet";
import { getTweet as _getTweet } from "react-tweet/api";

const getTweet = async (id: string) => {
  "use cache";
  cacheLife("days");
  return _getTweet(id);
};

const Tweet = async ({ id }: { id: string }) => {
  try {
    const tweet = await getTweet(id);
    return tweet ? <EmbeddedTweet tweet={tweet} /> : <TweetNotFound />;
  } catch {
    return <TweetNotFound />;
  }
};

interface TweetsProps {
  tweets: string[];
}

export const Tweets = ({ tweets }: TweetsProps) => (
  <div className="md:columns-2 xl:columns-3">
    {tweets.map((tweet) => (
      <Suspense fallback={<TweetSkeleton />} key={tweet}>
        <div className="[&_.react-tweet-theme]:mt-0! [&_.react-tweet-theme]:mb-4! [&_.react-tweet-theme]:border-border! [&_.react-tweet-theme]:bg-card!">
          <Tweet id={tweet} />
        </div>
      </Suspense>
    ))}
  </div>
);
