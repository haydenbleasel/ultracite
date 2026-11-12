import { version } from "../../shared/version.mjs";

// A whole page: an XML declaration, a doctype, or an `<html>`, `<head>` or
// `<body>` element first, after any comments. Angular serves such a file as it
// is (`src/index.html`, a static page in `public/`, an email), though a
// component can also render one from its `templateUrl`.
const WHOLE_PAGE_RE =
  /^\uFEFF?(?:\s|<!--(?:[^-]|-(?!->))*-->|<\?[^>]*>)*<(?:!doctype|html|head|body)[\s>]/iu;

// Every `{` and `}` outside a comment. Comments are matched, and kept, so the
// `eslint-disable` comments in them still apply.
const BRACES_RE = /<!--(?:[^-]|-(?!->))*-->|[{}]/gu;

const LINE_BREAK_RE = /\r\n|[\n\r\u2028\u2029]/u;

/** Whether an HTML file is a whole page rather than a fragment. */
export const isWholePage = (text) => WHOLE_PAGE_RE.test(text);

/**
 * Parses a page. A page Angular can't parse isn't a template it compiles, and
 * its text can hold a `{` or `}`, such as a code sample, which Angular reads as
 * the start or end of an ICU message or a block. So a page that fails to parse
 * is parsed again with each of them read as a space, which keeps every offset,
 * and with errors suppressed, since a browser reads markup Angular rejects,
 * such as a stray closing tag.
 */
const parsePage = (parser, code, options) => {
  try {
    return parser.parseForESLint(code, options);
  } catch (error) {
    if (!(error instanceof parser.TemplateParseError)) {
      throw error;
    }

    const text = code.replaceAll(BRACES_RE, (match) =>
      match.length === 1 ? " " : match
    );

    return parser.parseForESLint(text, {
      ...options,
      suppressParseErrors: true,
    });
  }
};

// An end of a span: a location with an `offset`, or an offset itself.
const offsetOf = (end) => end.offset ?? end;

// The offsets of a template node, or null for one with no span. Elements,
// blocks and text carry a span whose ends are locations: `fullStart` takes in
// the leading whitespace Angular leaves out of `start`, which is the node's
// text and lies inside its parent. Expressions carry a span of offsets.
const ownRange = ({ sourceSpan: span }) =>
  span ? [offsetOf(span.fullStart ?? span.start), offsetOf(span.end)] : null;

// What ESLint treats as a node when it walks a syntax tree.
const isNode = (value) =>
  // oxlint-disable-next-line anti-slop/no-runtime-typeof -- ESLint's own test for a node, which Angular's tree has to pass: some of its objects have a numeric `type`
  typeof value?.type === "string";

/**
 * Gives `node` and every node below it a `range`, and returns `node`'s. A
 * node with no span takes its parent's, and each range is widened to hold its
 * children's, since ESLint finds the node at an offset by descending only into
 * nodes whose range holds it.
 *
 * It visits every node reachable through another node's properties, which is
 * every node ESLint can walk to, whichever keys it follows: the visitor keys
 * Angular's parser returns, or each property of a node type with none.
 */
const addRanges = (node, parentRange, seen) => {
  if (seen.has(node)) {
    return node.range;
  }

  seen.add(node);

  // A copy, so widening a node that took its parent's range leaves the
  // parent's alone.
  const range = [...(node.range ?? ownRange(node) ?? parentRange)];
  node.range = range;

  const widen = (child) => {
    if (isNode(child)) {
      const [start, end] = addRanges(child, range, seen);
      range[0] = Math.min(range[0], start);
      range[1] = Math.max(range[1], end);
    }
  };

  for (const key of Object.keys(node)) {
    const value = node[key];

    if (key === "parent") {
      continue;
    }

    if (Array.isArray(value)) {
      for (const child of value) {
        widen(child);
      }
    } else {
      widen(value);
    }
  }

  return range;
};

/**
 * Angular's template parser, with a `range` on every node and pages that
 * don't fail on their text.
 *
 * Angular's parser gives nodes a `loc` but no `range`. Rules written for
 * JavaScript read it, and some, such as the `jsdoc/*` rules, throw on every
 * template without it. Core's rules are off for templates, but a rule a
 * project's config turns on without `files` still runs there. The program
 * spans the whole file, as it does in ESLint's own parser, so a template's
 * leading comments lie inside it.
 */
const withRanges = (parser) => ({
  meta: {
    name: "ultracite/angular-template-parser",
    version: `${version}+${parser.meta.name}@${parser.version}`,
  },
  parseForESLint: (code, options) => {
    const result = isWholePage(code)
      ? parsePage(parser, code, options)
      : parser.parseForESLint(code, options);

    const lines = code.split(LINE_BREAK_RE);

    result.ast.range = [0, code.length];
    result.ast.loc = {
      end: { column: lines.at(-1).length, line: lines.length },
      start: { column: 0, line: 1 },
    };

    addRanges(result.ast, result.ast.range, new WeakSet());

    return result;
  },
});

export default withRanges;
