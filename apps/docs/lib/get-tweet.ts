// Minimal build-time tweet fetch via Twitter's public syndication endpoint —
// no react-tweet runtime, no client JS. Returns null when a tweet can't be
// loaded so the homepage can skip it gracefully.

export interface TweetData {
  avatar: string;
  handle: string;
  id: string;
  /** BCP 47 language of the tweet body, for the `lang` attribute. */
  lang: string | null;
  name: string;
  text: string;
  /**
   * The tweet is a long "note" whose body the syndication endpoint cuts off
   * at 280 characters, so the caller should supply the full text.
   */
  truncated: boolean;
  url: string;
  verified: boolean;
}

interface UrlEntity {
  display_url?: string;
  url?: string;
}

interface SyndicationTweet {
  entities?: {
    media?: { url?: string }[];
    urls?: UrlEntity[];
  };
  id_str?: string;
  lang?: string;
  note_tweet?: unknown;
  text?: string;
  user?: {
    is_blue_verified?: boolean;
    name?: string;
    profile_image_url_https?: string;
    screen_name?: string;
    verified?: boolean;
  };
}

// A stalled request would otherwise hold the build for undici's 300 s
// header/body timeouts.
const FETCH_TIMEOUT_MS = 5000;

// Twitter's language code for tweets it can't classify (emoji only, links).
const UNDETERMINED_LANG = "und";

// The endpoint returns the 48px `_normal` avatar; the homepage shows it at
// 40 CSS px, so fetch the 200px rendition to stay sharp on 2x screens.
const NORMAL_AVATAR_SUFFIX = /_normal(?=\.\w+$)/u;

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

const warn = (id: string, reason: string): void => {
  console.warn(`[homepage] Skipping tweet ${id}: ${reason}`);
};

export const getTweet = async (id: string): Promise<TweetData | null> => {
  const url = `https://cdn.syndication.twimg.com/tweet-result?id=${id}&lang=en&token=${getToken(
    id
  )}`;

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; UltraciteBot/1.0)" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!response.ok) {
      warn(id, `syndication endpoint answered ${response.status}`);
      return null;
    }

    // SAFETY: this is the fetch boundary decoding the syndication endpoint's
    // JSON. SyndicationTweet declares every field optional, and each field is
    // checked before use below.
    const data = (await response.json()) as SyndicationTweet;
    const { user } = data;
    if (!(data.text && user?.screen_name)) {
      warn(id, "response has no text or author (deleted or protected?)");
      return null;
    }

    return {
      avatar: (user.profile_image_url_https ?? "").replace(
        NORMAL_AVATAR_SUFFIX,
        "_200x200"
      ),
      handle: user.screen_name,
      id,
      lang: data.lang && data.lang !== UNDETERMINED_LANG ? data.lang : null,
      name: user.name ?? user.screen_name,
      text: formatText(data.text, data.entities),
      truncated: Boolean(data.note_tweet),
      url: `https://x.com/${user.screen_name}/status/${id}`,
      verified: Boolean(user.verified || user.is_blue_verified),
    };
  } catch (error) {
    warn(id, error instanceof Error ? error.message : String(error));
    return null;
  }
};
