// Minimal build-time tweet fetch via Twitter's public syndication endpoint —
// no react-tweet runtime, no client JS. Returns null when a tweet can't be
// loaded so the homepage can skip it gracefully.

export interface TweetData {
  id: string;
  text: string;
  url: string;
  name: string;
  handle: string;
  avatar: string;
  verified: boolean;
}

interface UrlEntity {
  url?: string;
  display_url?: string;
}

interface SyndicationTweet {
  id_str?: string;
  text?: string;
  user?: {
    name?: string;
    screen_name?: string;
    profile_image_url_https?: string;
    verified?: boolean;
    is_blue_verified?: boolean;
  };
  entities?: {
    urls?: UrlEntity[];
    media?: { url?: string }[];
  };
}

// The syndication text keeps t.co short links. Swap each linked URL for its
// human-readable display form (e.g. ultracite.ai) and drop trailing media
// links (the pic.x.com attachment), matching how an embedded tweet reads.
const formatText = (
  text: string,
  entities: SyndicationTweet["entities"]
): string => {
  let out = text;
  for (const entity of entities?.urls ?? []) {
    if (entity.url && entity.display_url) {
      out = out.replaceAll(entity.url, entity.display_url);
    }
  }
  for (const media of entities?.media ?? []) {
    if (media.url) {
      out = out.replaceAll(media.url, "");
    }
  }
  return out.trim();
};

// Mirrors react-tweet's token derivation for the syndication API.
const getToken = (id: string): string =>
  ((Number(id) / 1e15) * Math.PI)
    .toString(36)
    .replaceAll(/(?<zerosOrDot>0+|\.)/gu, "");

export const getTweet = async (id: string): Promise<TweetData | null> => {
  const url = `https://cdn.syndication.twimg.com/tweet-result?id=${id}&lang=en&token=${getToken(
    id
  )}`;

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; UltraciteBot/1.0)" },
    });
    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as SyndicationTweet;
    const { user } = data;
    if (!(data.text && user?.screen_name)) {
      return null;
    }

    return {
      avatar: user.profile_image_url_https ?? "",
      handle: user.screen_name,
      id,
      name: user.name ?? user.screen_name,
      text: formatText(data.text, data.entities),
      url: `https://x.com/${user.screen_name}/status/${id}`,
      verified: Boolean(user.verified || user.is_blue_verified),
    };
  } catch {
    return null;
  }
};
