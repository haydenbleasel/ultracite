import { unstable_cache } from "next/cache";
import { Suspense } from "react";
import { EmbeddedTweet, TweetNotFound, TweetSkeleton } from "react-tweet";
import { getTweet as _getTweet } from "react-tweet/api";

const getTweet = unstable_cache(
  async (id: string) => _getTweet(id),
  ["tweet"],
  { revalidate: 3600 * 24 }
);

const Tweet = async ({ id }: { id: string }) => {
  try {
    const tweet = await getTweet(id);
    return tweet ? <EmbeddedTweet tweet={tweet} /> : <TweetNotFound />;
  } catch (error) {
    console.error(error);
    return <TweetNotFound error={error} />;
  }
};

type TweetsProps = {
  tweets: string[];
};

export const Tweets = ({ tweets }: TweetsProps) => (
  <div className="lg:columns-2 xl:columns-3">
    {tweets.map((tweet) => (
      <Suspense fallback={<TweetSkeleton />} key={tweet}>
        <div className="[&_.react-tweet-theme]:mt-0! [&_.react-tweet-theme]:mb-4! [&_.react-tweet-theme]:border-border! [&_.react-tweet-theme]:bg-transparent!">
          <Tweet id={tweet} />
        </div>
      </Suspense>
    ))}
  </div>
);
