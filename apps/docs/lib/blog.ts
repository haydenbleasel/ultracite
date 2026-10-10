// Blog posts are MDX files in apps/docs/blog. Each one is served by an .astro
// page of the same name in pages/blog, which renders the post's body into
// PostLayout. The page exists so every post is a static route: Blume leaves a
// dynamic [slug].astro route out of the sitemap and gives it no OG card.
//
// To add a post, write blog/<slug>.mdx with the frontmatter below, then add
// pages/blog/<slug>.astro. The index fails the build if a post has no page.
//
//   ---
//   import { components } from "../../components/blog/post-components";
//   import PostLayout from "../../components/blog/post-layout.astro";
//   import * as post from "../../blog/<slug>.mdx";
//   ---
//
//   <PostLayout file={post.file} headings={post.getHeadings()}>
//     <post.Content components={components} />
//   </PostLayout>

/** A post's frontmatter as YAML parses it. */
export interface PostFrontmatter {
  /** A key of `authors` below. */
  author?: string;
  /** Publish date. Unquoted YAML dates parse to a Date. */
  date?: Date | string;
  /** The summary on the index, in search results and on the OG card. */
  description?: string;
  /** Lint rules the post is about, as their config names. */
  rules?: string[];
  title?: string;
  /** Set when a post changes substantially after it's published. */
  updated?: Date | string;
}

export interface Author {
  name: string;
  url: string;
}

export interface Heading {
  depth: number;
  slug: string;
  text: string;
}

export interface Post {
  author: Author;
  date: Date;
  description: string;
  href: string;
  readingMinutes: number;
  rules: string[];
  slug: string;
  title: string;
  updated: Date | null;
}

/** A schema.org JSON-LD node, as the blog pages emit them. */
export interface JsonLdNode {
  [key: string]: JsonLdValue;
}

export type JsonLdValue = string | number | JsonLdValue[] | JsonLdNode;

const authors = {
  hayden: { name: "Hayden Bleasel", url: "https://x.com/haydenbleasel" },
} satisfies Record<string, Author>;

const isAuthorId = (value: string): value is keyof typeof authors =>
  Object.hasOwn(authors, value);

const WORDS_PER_MINUTE = 230;
const FRONTMATTER = /^---\n[\s\S]*?\n---\n/u;
const CODE_FENCE = /```[\s\S]*?```/gu;
const MDX_STATEMENT = /^(?:import|export)\s.*$/gmu;
const WHITESPACE = /\s+/u;
const SLUG = /(?<slug>[^/]+)\.mdx$/u;

const frontmatters = import.meta.glob<PostFrontmatter>("../blog/*.mdx", {
  eager: true,
  import: "frontmatter",
});

const sources = import.meta.glob<string>("../blog/*.mdx", {
  eager: true,
  import: "default",
  query: "?raw",
});

const slugOf = (path: string): string => {
  const slug = SLUG.exec(path)?.groups?.slug;
  if (!slug) {
    throw new Error(`Couldn't read a post slug from ${path}.`);
  }
  return slug;
};

const requireText = (
  file: string,
  key: keyof PostFrontmatter,
  value: string | undefined
): string => {
  if (!value?.trim()) {
    throw new Error(`${file}: frontmatter needs a "${key}".`);
  }
  return value;
};

const toDate = (
  file: string,
  key: keyof PostFrontmatter,
  value: Date | string | undefined
): Date => {
  const date = value instanceof Date ? value : new Date(value ?? "");
  if (Number.isNaN(date.getTime())) {
    throw new TypeError(
      `${file}: frontmatter "${key}" must be a date like 2026-10-10.`
    );
  }
  return date;
};

// Prose only: code blocks and MDX imports would overstate a long read.
const countMinutes = (source: string): number => {
  const words = source
    .replace(FRONTMATTER, "")
    .replaceAll(CODE_FENCE, "")
    .replaceAll(MDX_STATEMENT, "")
    .split(WHITESPACE)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
};

const toPost = (path: string, data: PostFrontmatter): Post => {
  const slug = slugOf(path);
  const file = `blog/${slug}.mdx`;

  const authorId = requireText(file, "author", data.author);
  if (!isAuthorId(authorId)) {
    throw new Error(
      `${file}: unknown author "${authorId}". Add them to authors in lib/blog.ts.`
    );
  }

  return {
    author: authors[authorId],
    date: toDate(file, "date", data.date),
    description: requireText(file, "description", data.description),
    href: `/blog/${slug}`,
    readingMinutes: countMinutes(sources[path] ?? ""),
    rules: data.rules ?? [],
    slug,
    title: requireText(file, "title", data.title),
    updated:
      data.updated === undefined ? null : toDate(file, "updated", data.updated),
  };
};

/** Every post, newest first. */
export const posts: Post[] = Object.entries(frontmatters)
  .map(([path, data]) => toPost(path, data))
  .toSorted((a, b) => b.date.getTime() - a.date.getTime());

/** The post compiled to `file`, the absolute path an MDX module exports. */
export const postFor = (file: string): Post => {
  const slug = slugOf(file);
  const post = posts.find((candidate) => candidate.slug === slug);
  if (!post) {
    throw new Error(`${file} isn't a post in apps/docs/blog.`);
  }
  return post;
};

// Dates are calendar days, so format them in UTC: a reader west of UTC would
// otherwise see 2026-10-10 as the 9th.
const dateFormat = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
  year: "numeric",
});

export const formatDate = (date: Date): string => dateFormat.format(date);

/** The yyyy-mm-dd form for `<time datetime>` and JSON-LD. */
export const isoDate = (date: Date): string =>
  date.toISOString().slice(0, "yyyy-mm-dd".length);
