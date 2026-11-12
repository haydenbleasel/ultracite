import { version } from "../../shared/version.mjs";
import { isWholePage } from "./template-parser.mjs";

// The name of the block that holds an HTML file's inline scripts. ESLint
// lints it as `<file>.html/1_inline-scripts.htm`. The extension has to differ
// from the file's own, or ESLint lints the block with the file's config, and
// `.htm` is one eslint-plugin-html reads. So a config object for `**/*.html`
// doesn't reach the scripts; `**/*.html/*.htm` does.
const SCRIPTS_BLOCK = "inline-scripts.htm";

/** Matches the inline-scripts block of every HTML file. */
export const inlineScriptsFiles = [`**/*.html/*_${SCRIPTS_BLOCK}`];

const SCRIPT_TAG_RE = /<script/iu;

const FILENAME_RULE = "github/filenames-match-regex";

/**
 * Drops the filename rule's reports on every block of a file but the first.
 * The file's own name is checked there; the others are named by ESLint, such
 * as `index.html/1_inline-scripts.htm`. Done here rather than in a config
 * object, which a project's own setting for the rule, without `files`, would
 * override.
 */
export const dropBlockFilenames = (blocks) =>
  blocks.map((messages, index) =>
    index === 0
      ? messages
      : messages.filter((message) => message.ruleId !== FILENAME_RULE)
  );

// Template rules that only fit a template Angular compiles. On a whole page
// they report plain HTML: an `<img src>` that isn't `ngSrc`, an email's
// `style` attributes, and `<my-widget></my-widget>`, which the fix rewrites
// to `<my-widget />`, an open tag to a browser.
const templateOnlyRules = new Set([
  "@angular-eslint/template/no-inline-styles",
  "@angular-eslint/template/prefer-ngsrc",
  "@angular-eslint/template/prefer-self-closing-tags",
]);

// Whether each file being linted is a whole page, from `preprocess` to
// `postprocess`, which ESLint calls in turn for each file.
const wholePages = new Map();

/**
 * Lints an HTML file twice: as an Angular template, and, when it has a
 * `<script>`, as the HTML file core lints with eslint-plugin-html. One config
 * can't do both. Where that plugin is active ESLint never parses the HTML
 * file itself: the plugin hands each inline script to the file's parser, and
 * Angular's template parser would read that JavaScript as a template. So the
 * scripts are linted in a block of their own, under core's config for HTML.
 *
 * A whole page is linted as a template too, for accessibility and the rules
 * that read plain HTML, but without the rules that only fit a template.
 */
const inlineScripts = {
  meta: {
    name: "ultracite/angular-inline-scripts",
    version,
  },
  postprocess: (blocks, filename) => {
    const [template, ...scripts] = dropBlockFilenames(blocks);
    const wholePage = wholePages.get(filename);
    wholePages.delete(filename);

    const templateMessages = wholePage
      ? template.filter((message) => !templateOnlyRules.has(message.ruleId))
      : template;

    return [...templateMessages, ...scripts.flat()];
  },
  preprocess: (text, filename) => {
    wholePages.set(filename, isWholePage(text));

    return SCRIPT_TAG_RE.test(text)
      ? [text, { filename: SCRIPTS_BLOCK, text }]
      : [text];
  },
  supportsAutofix: true,
};

export default inlineScripts;
