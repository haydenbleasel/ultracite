// The name of the block that holds an HTML file's inline scripts. ESLint
// lints it as `<file>.html/1_inline-scripts.htm` (`0_` for a whole page). The
// extension has to differ from the file's own, or ESLint lints the block with
// the file's config, and `.htm` is one eslint-plugin-html reads. So a config
// object for `**/*.html` doesn't reach the scripts; `**/*.html/*.htm` does.
const SCRIPTS_BLOCK = "inline-scripts.htm";

/** Matches the inline-scripts block of every HTML file. */
export const inlineScriptsFiles = [`**/*.html/*_${SCRIPTS_BLOCK}`];

const SCRIPT_TAG_RE = /<script/iu;

// A whole page: a doctype or an `<html>` element first, after any comments.
// Angular serves such a file as it is (`src/index.html`, a static page in
// `public/`, an email) and never compiles it as a template.
const DOCUMENT_RE = /^\uFEFF?(?:\s|<!--(?:[^-]|-(?!->))*-->)*<(?:!doctype|html)[\s>]/isu;

/**
 * Lints an HTML file twice: as an Angular template, and, when it has a
 * `<script>`, as the HTML file core lints with eslint-plugin-html. One config
 * can't do both. Where that plugin is active ESLint never parses the HTML
 * file itself: the plugin hands each inline script to the file's parser, and
 * Angular's template parser would read that JavaScript as a template. So the
 * scripts are linted in a block of their own, under core's config for HTML.
 *
 * A whole page isn't a template, so it's only linted for its scripts, as core
 * lints it. Angular's parser would fail on text such as a `{` in a code
 * sample, and the template rules would report plain HTML, such as an
 * `<img src>` that isn't `ngSrc`, and rewrite `<my-widget></my-widget>` to
 * `<my-widget />`, which a browser reads as an open tag.
 */
const inlineScripts = {
  meta: {
    name: "ultracite/angular-inline-scripts",
  },
  postprocess: (messages) => messages.flat(),
  preprocess: (text) => {
    const template = DOCUMENT_RE.test(text) ? [] : [text];

    return SCRIPT_TAG_RE.test(text)
      ? [...template, { filename: SCRIPTS_BLOCK, text }]
      : template;
  },
  supportsAutofix: true,
};

export default inlineScripts;
