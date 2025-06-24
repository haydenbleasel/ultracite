import { Tweet } from 'react-tweet';

const tweets = [
  '1882412853656977654',
  '1855005109572247585',
  '1863809657543799251',
  '1915946188635050258',
  '1891799924343197884',
  '1889956770472403335',
  '1882561938141634712',
  '1883945341185355949',
  '1914441046618214702',
];

export const Tweets = () => (
  <div className="grid gap-8">
    <div>
      <h2 className="font-semibold text-4xl tracking-tight">
        What the community is saying
      </h2>
      <p className="mt-4 text-balance text-muted-foreground sm:text-lg">
        Here's what some of the most FORWARD-THINKING, 1000 IQ developers in the
        React ecosystem have to say about Ultracite.
      </p>
    </div>
    <div className="sm:col-span-2 lg:columns-2 xl:columns-3 [&_.react-tweet-theme]:mt-0! [&_.react-tweet-theme]:mb-4! [&_.react-tweet-theme]:border-border! [&_.react-tweet-theme]:bg-transparent!">
      {tweets.map((tweet) => (
        <Tweet id={tweet} key={tweet} />
      ))}
    </div>
  </div>
);
