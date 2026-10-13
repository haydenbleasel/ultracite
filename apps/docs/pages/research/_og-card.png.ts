// Serves each research post's Open Graph card at /research/og/<slug>.png,
// prerendered at build. Blume generates cards for custom pages from a title
// alone, so a post's card would carry the site description; this renders the
// same card, with the same branding, from the post's own title and
// description. The `research-cards` integration in blume.config.ts mounts it,
// since pages/ only routes .astro files, and PostLayout points og:image here.
import { renderOgImage } from "blume/og";
import data from "blume:data";

import { posts } from "../../lib/blog";
import type { Post } from "../../lib/blog";

export const prerender = true;

export const getStaticPaths = () =>
  posts.map((post) => ({ params: { slug: post.slug }, props: { post } }));

const { config } = data;

export const GET = async ({ props }: { props: { post: Post } }) => {
  const png = await renderOgImage({
    brand: config.title,
    description: props.post.description,
    // The fonts Blume derives for its own cards from the theme (Inter, the
    // default display and body face), which it bakes into its endpoint
    // rather than the runtime data.
    families: { body: "Inter", title: "Inter" },
    fonts: [{ name: "Inter", weight: "400..700" }],
    logo: config.og.logo,
    palette: config.og.palette,
    repo: config.github
      ? `${config.github.owner}/${config.github.repo}`
      : undefined,
    site: config.og.site,
    title: props.post.title,
  });
  return new Response(new Uint8Array(png), {
    headers: { "Content-Type": "image/png" },
  });
};
