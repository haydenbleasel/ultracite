import type * as angularTemplateParser from "@angular-eslint/template-parser";

/** Whether an HTML file is a whole page rather than a fragment. */
export declare const isWholePage: (text: string) => boolean;

/**
 * Angular's template parser, with a `range` on every node and pages that
 * don't fail on their text.
 */
declare const withRanges: (parser: typeof angularTemplateParser) => {
  meta: { name: string; version: string };
  parseForESLint: typeof angularTemplateParser.parseForESLint;
};

export default withRanges;
