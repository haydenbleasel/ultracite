import YAML from "yaml";

// A mapping key line followed (past blank and comment lines) by the first
// item of a block sequence under it: compares where the dash sits relative
// to the key.
const BLOCK_SEQUENCE_RE =
  /^(?<keyIndent>[ \t]*)[^\s#-][^\n]*:[^\S\n]*(?:#[^\n]*)?\r?\n(?:[^\S\n]*(?:#[^\n]*)?\r?\n)*(?<dashIndent>[ \t]*)- /mu;

/**
 * Whether a YAML file indents block sequences under their key (`key:\n  -`)
 * or not (`key:\n-`, the style `pre-commit sample-config` writes). Files
 * without a block sequence default to indented, the yaml library's default.
 */
export const usesIndentedSequences = (content: string): boolean => {
  const match = BLOCK_SEQUENCE_RE.exec(content);

  if (!match?.groups) {
    return true;
  }

  return match.groups.dashIndent.length > match.groups.keyIndent.length;
};

/**
 * Renders an edited YAML document in the sequence style of the file it came
 * from. Line folding is off so long commands stay on one line, and inline
 * lists render as `[a, b]`.
 */
export const renderYamlDocument = (
  doc: YAML.Document,
  original: string
): string =>
  doc.toString({
    flowCollectionPadding: false,
    indentSeq: usesIndentedSequences(original),
    lineWidth: 0,
  });

/**
 * Whether any string anywhere under `node` satisfies `predicate`, e.g. a
 * hook command that already runs `ultracite fix`.
 */
export const someYamlString = (
  node: YAML.Node,
  predicate: (value: string) => boolean
): boolean => {
  let found = false;

  YAML.visit(node, {
    Scalar(_key, scalar) {
      // oxlint-disable-next-line anti-slop/no-runtime-typeof -- YAML scalars hold strings, numbers, booleans or null
      if (typeof scalar.value === "string" && predicate(scalar.value)) {
        found = true;
      }
    },
  });

  return found;
};

/**
 * Replaces every value scalar under `node` that `shouldReplace` accepts with
 * `replacement`. Mapping keys are never touched. Returns whether anything
 * changed.
 */
export const replaceYamlStrings = (
  node: YAML.Node,
  shouldReplace: (value: string) => boolean,
  replacement: string
): boolean => {
  let changed = false;

  YAML.visit(node, {
    Scalar(key, scalar) {
      if (
        key !== "key" &&
        // oxlint-disable-next-line anti-slop/no-runtime-typeof -- YAML scalars hold strings, numbers, booleans or null
        typeof scalar.value === "string" &&
        scalar.value !== replacement &&
        shouldReplace(scalar.value)
      ) {
        scalar.value = replacement;
        changed = true;
      }
    },
  });

  return changed;
};
