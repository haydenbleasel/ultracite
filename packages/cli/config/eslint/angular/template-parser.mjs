// Keys ESLint never walks into when a node type has no visitor keys.
const SKIPPED_KEYS = new Set(["parent", "leadingComments", "trailingComments"]);

// The offsets of a template node. Elements and blocks carry a span whose ends
// are locations with an `offset`; expressions, one whose ends are offsets.
const rangeOf = (node) => {
  const span = node.sourceSpan;

  return span
    ? [span.start.offset ?? span.start, span.end.offset ?? span.end]
    : null;
};

const childrenOf = (node, visitorKeys) =>
  (
    visitorKeys[node.type] ??
    Object.keys(node).filter(
      (key) => !SKIPPED_KEYS.has(key) && !key.startsWith("_")
    )
  )
    .flatMap((key) => [node[key]].flat())
    .filter((child) => child?.type);

/**
 * Gives every node of a template a `range`, which Angular's parser leaves
 * out. Rules written for JavaScript read it, and some, such as the
 * `jsdoc/*` rules, throw on every template without it. Core's rules are off
 * for templates, but a rule a project's config turns on without `files`
 * still runs there. Follows the nodes the way ESLint walks them, so each one
 * a rule can be handed has a range; a node with no span of its own takes
 * its parent's.
 */
const addRanges = (node, visitorKeys, parentRange, seen) => {
  if (seen.has(node)) {
    return;
  }

  seen.add(node);
  node.range ??= rangeOf(node) ?? parentRange;

  for (const child of childrenOf(node, visitorKeys)) {
    addRanges(child, visitorKeys, node.range, seen);
  }
};

/** Angular's template parser, with a `range` on every node it returns. */
const withRanges = (parser) => ({
  meta: {
    name: "ultracite/angular-template-parser",
    version: parser.version,
  },
  parseForESLint: (code, options) => {
    const result = parser.parseForESLint(code, options);

    addRanges(result.ast, result.visitorKeys, [0, code.length], new WeakSet());

    return result;
  },
});

export default withRanges;
