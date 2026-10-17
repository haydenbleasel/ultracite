// Research posts are MDX files in apps/docs/blog, served under /research. Each
// one has an .astro page of the same name in pages/research, which renders the post's body into
// PostLayout. The page exists so every post is a static route: Blume leaves a
// dynamic [slug].astro route out of the sitemap.
//
// To add a post, write blog/<slug>.mdx with the frontmatter below, then add
// pages/research/<slug>.astro. The index fails the build if a post has no page.
// The post's body ends with <NextSteps /> just above `## References`, which
// renders its `next` and `results` frontmatter.
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
  /**
   * Pages on this site that put the post's advice to work, usually docs.
   * Settings that change between releases belong there, not in the post.
   */
  next?: { href?: string; label?: string }[];
  /** The research/ harnesses holding the post's results, keys of `harnesses`. */
  results?: string[];
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

export interface Link {
  href: string;
  label: string;
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
  next: Link[];
  readingMinutes: number;
  /** Each harness's report of the post's method and findings, on GitHub. */
  results: Link[];
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

const REPO_URL = "https://github.com/haydenbleasel/ultracite";

/** The research/ folder on GitHub, whose README says how to rerun a post. */
export const RESEARCH_URL = `${REPO_URL}/tree/main/research`;

// The research/ harnesses, which keep each post's output under
// results/<slug>/ with a REPORT.md of the method, findings and caveats.
const harnesses = {
  "agent-experiment": "Agent experiment",
  corpus: "Codebase measurements",
} satisfies Record<string, string>;

const isHarness = (value: string): value is keyof typeof harnesses =>
  Object.hasOwn(harnesses, value);

const NEXT_STEPS = "<NextSteps />";
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

const toNext = (file: string, steps: PostFrontmatter["next"]): Link[] => {
  if (!steps?.length) {
    throw new Error(
      `${file}: frontmatter needs "next", the pages that put the post's advice to work.`
    );
  }

  return steps.map(({ href, label }) => {
    if (!(href?.startsWith("/") && label?.trim())) {
      throw new Error(
        `${file}: each "next" link needs a label and a path on this site, like /docs/configuration#overriding-rules.`
      );
    }

    return { href, label };
  });
};

const toResults = (
  file: string,
  slug: string,
  names: string[] | undefined
): Link[] => {
  if (!names?.length) {
    throw new Error(
      `${file}: frontmatter needs "results", the research/ harnesses that measured it.`
    );
  }

  return names.map((name) => {
    if (!isHarness(name)) {
      throw new Error(
        `${file}: unknown harness "${name}" in "results". Use one of: ${Object.keys(harnesses).join(", ")}.`
      );
    }

    return {
      href: `${REPO_URL}/blob/main/research/${name}/results/${slug}/REPORT.md`,
      label: harnesses[name],
    };
  });
};

const toPost = (path: string, data: PostFrontmatter): Post => {
  const slug = slugOf(path);
  const file = `blog/${slug}.mdx`;
  const source = sources[path] ?? "";

  const authorId = requireText(file, "author", data.author);

  if (!isAuthorId(authorId)) {
    throw new Error(
      `${file}: unknown author "${authorId}". Add them to authors in lib/blog.ts.`
    );
  }

  if (!source.includes(NEXT_STEPS)) {
    throw new Error(
      `${file}: put ${NEXT_STEPS} above "## References" so its next steps and results show.`
    );
  }

  return {
    author: authors[authorId],
    date: toDate(file, "date", data.date),
    description: requireText(file, "description", data.description),
    href: `/research/${slug}`,
    next: toNext(file, data.next),
    readingMinutes: countMinutes(source),
    results: toResults(file, slug, data.results),
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

/** The post served at `pathname`, for a component inside a post's body. */
export const postAt = (pathname: string): Post => {
  const post = posts.find((candidate) => candidate.href === pathname);

  if (!post) {
    throw new Error(`${pathname} isn't a post in apps/docs/blog.`);
  }

  return post;
};

/** The yyyy-mm-dd form for JSON-LD. Dates aren't shown on the page, so posts read as evergreen. */
export const isoDate = (date: Date): string =>
  date.toISOString().slice(0, "yyyy-mm-dd".length);
