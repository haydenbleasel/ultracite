// The name of the block that holds an HTML file's inline scripts. ESLint
// lints it as `<file>.html/1_inline-scripts.htm`. The extension has to differ
// from the file's own, or ESLint lints the block with the file's config, and
// `.htm` is one eslint-plugin-html reads.
const SCRIPTS_BLOCK = "inline-scripts.htm";

/** Matches the inline-scripts block of every HTML file. */
export const inlineScriptsFiles = [`**/*.html/*_${SCRIPTS_BLOCK}`];

const SCRIPT_TAG_RE = /<script/iu;

/**
 * Lints an HTML file twice: as an Angular template, and, when it has a
 * `<script>`, as the HTML file core lints with eslint-plugin-html. One config
 * can't do both. Where that plugin is active ESLint never parses the HTML
 * file itself: the plugin hands each inline script to the file's parser, and
 * Angular's template parser would read that JavaScript as a template. So the
 * scripts are linted in a block of their own, under core's config for HTML.
 */
const inlineScripts = {
  meta: {
    name: "ultracite/angular-inline-scripts",
  },
  postprocess: (messages) => messages.flat(),
  preprocess: (text) =>
    SCRIPT_TAG_RE.test(text)
      ? [text, { filename: SCRIPTS_BLOCK, text }]
      : [text],
  supportsAutofix: true,
};

export default inlineScripts;
