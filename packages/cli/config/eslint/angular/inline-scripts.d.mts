import type { Linter } from "eslint";

/** Matches the inline-scripts block of every HTML file. */
export declare const inlineScriptsFiles: string[];

/**
 * Drops the filename rule's reports on every block of a file but the first,
 * whose name is the file's own.
 */
export declare const dropBlockFilenames: (
  blocks: Linter.LintMessage[][]
) => Linter.LintMessage[][];

/**
 * Lints an HTML file as an Angular template and, when it has a `<script>`,
 * for its inline scripts, and drops the rules that only fit a template from a
 * whole page.
 */
declare const inlineScripts: {
  meta: { name: string; version: string };
  postprocess: (
    blocks: Linter.LintMessage[][],
    filename: string
  ) => Linter.LintMessage[];
  preprocess: (
    text: string,
    filename: string
  ) => (string | { filename: string; text: string })[];
  supportsAutofix: true;
};

export default inlineScripts;
