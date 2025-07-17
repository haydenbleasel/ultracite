import { Tweet } from 'react-tweet';
import { cn } from '@/lib/utils';

const tweets = [
  '1937342910519038142',
  '1855005109572247585',
  '1863809657543799251',
  '1915946188635050258',
  '1891799924343197884',
  '1889956770472403335',
  '1882561938141634712',
  '1883945341185355949',
  '1914441046618214702',
  '1937346263621730369',
  '1937355014017810569',
  '1937498470103068852',
  '1937457894179438852',
  '1937454418942665033',
  '1937393811002654784',
  '1937271312734445767',
  '1937555727713005683',
  '1937540457623355603',
  '1937532629416554910',
  '1937510541850710503',
  '1937458682595295287',
  '1937428212813861131',
  '1937370588433265115',
  '1937362844309197311',
  '1937358142448222561',
  '1937294047191961676',
  '1937265589439046093',
  '1937254447190606096',
  '1937211838355132797',
  '1937194064543150576',
  '1937911064550846559',
  '1937929808983326760',
  '1938493510736335220',
  '1939794667484156350',
  '1940543658333499717',
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
    <div className="sm:col-span-2 lg:columns-2 xl:columns-3">
      {tweets.map((tweet, index) => (
        <div
          className={cn(
            '[&_.react-tweet-theme]:mt-0! [&_.react-tweet-theme]:mb-4! [&_.react-tweet-theme]:bg-transparent!',
            index
              ? '[&_.react-tweet-theme]:border-border!'
              : '[&_.react-tweet-theme]:border-foreground! [&_.react-tweet-theme]:shadow-foreground/20! [&_.react-tweet-theme]:shadow-lg!'
          )}
          key={tweet}
        >
          <Tweet id={tweet} key={tweet} />
        </div>
      ))}
    </div>
  </div>
);
