/**
 * Splits a preset's rule map into the rules that work from the syntax tree
 * and the ones that read TypeScript type information. The framework presets
 * run the first set; their `<framework>/type-aware` add-ons run the second,
 * which throws "requires type information" without a TypeScript program.
 *
 * A rule counts as type-checked when its plugin marks it with
 * `meta.docs.requiresTypeChecking`, or when it is listed in `unmarked`: rules
 * that call the type checker without saying so in their metadata. The ESLint
 * smoke test lints every framework preset without type information, so a new
 * unmarked rule fails there.
 *
 * @param {string} prefix The plugin's rule prefix, such as `jest`.
 * @param {{ rules: Record<string, { meta?: { docs?: { requiresTypeChecking?: boolean } } }> }} plugin The plugin, whose rule metadata marks type-checked rules.
 * @param {Record<string, unknown>} rules The preset's rules for this plugin.
 * @param {string[]} [unmarked] Unprefixed names of unmarked type-checked rules.
 */
export const splitTypeChecked = (prefix, plugin, rules, unmarked = []) => {
  const typeCheckedNames = new Set(
    Object.entries(plugin.rules)
      .filter(
        ([name, rule]) =>
          rule?.meta?.docs?.requiresTypeChecking === true ||
          unmarked.includes(name)
      )
      .map(([name]) => `${prefix}/${name}`)
  );

  const pick = (typeChecked) =>
    Object.fromEntries(
      Object.entries(rules).filter(
        ([key]) => typeCheckedNames.has(key) === typeChecked
      )
    );

  return { syntactic: pick(false), typeChecked: pick(true) };
};
