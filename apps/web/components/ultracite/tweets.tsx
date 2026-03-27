"use client";

import { Tweet, TweetSkeleton } from "react-tweet";

interface TweetsProps {
  tweets: string[];
}

export const Tweets = ({ tweets }: TweetsProps) => (
  <div className="md:columns-2 xl:columns-3">
    {tweets.map((tweet) => (
      <div
        className="[&_.react-tweet-theme]:mt-0! [&_.react-tweet-theme]:mb-4! [&_.react-tweet-theme]:border-border! [&_.react-tweet-theme]:bg-card!"
        key={tweet}
      >
        <Tweet fallback={<TweetSkeleton />} id={tweet} />
      </div>
    ))}
  </div>
);
