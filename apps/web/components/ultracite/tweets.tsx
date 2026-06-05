"use client";

import {
  EmbeddedTweet,
  TweetNotFound,
  TweetSkeleton,
  useTweet,
} from "react-tweet";
import type { Tweet } from "react-tweet/api";

interface TweetsProps {
  tweets: string[];
}

// The Twitter syndication API sometimes returns `entities` without its
// sub-arrays (e.g. an empty object). react-tweet's `enrichTweet` assumes they
// are always present and iterates over them, so a single such tweet throws
// "x is not iterable" inside EmbeddedTweet's useMemo and crashes the whole page.
// Backfill the arrays so enrichTweet can run safely.
const normalizeEntities = (
  entities: Partial<Tweet["entities"]>
): Tweet["entities"] => ({
  hashtags: [],
  symbols: [],
  urls: [],
  user_mentions: [],
  ...entities,
});

const normalizeTweet = (tweet: Tweet): Tweet => ({
  ...tweet,
  entities: normalizeEntities(tweet.entities),
  quoted_tweet: tweet.quoted_tweet
    ? {
        ...tweet.quoted_tweet,
        entities: normalizeEntities(tweet.quoted_tweet.entities),
      }
    : undefined,
});

const SingleTweet = ({ id }: { id: string }) => {
  const { data, error, isLoading } = useTweet(id);

  if (isLoading) {
    return <TweetSkeleton />;
  }

  if (error || !data) {
    return <TweetNotFound error={error} />;
  }

  return <EmbeddedTweet tweet={normalizeTweet(data)} />;
};

export const Tweets = ({ tweets }: TweetsProps) => (
  <div className="md:columns-2 xl:columns-3">
    {tweets.map((tweet) => (
      <div
        className="[&_.react-tweet-theme]:mt-0! [&_.react-tweet-theme]:mb-4! [&_.react-tweet-theme]:border-border! [&_.react-tweet-theme]:bg-card!"
        key={tweet}
      >
        <SingleTweet id={tweet} />
      </div>
    ))}
  </div>
);
