// noDistractingElements unsafe fix (Biome 2.5.15): `biome check --write --unsafe` turns this line into
// `export const O08 = () => News</marquee>;`, which no longer parses. a11y-linters.cjs --autofix records it.
export const O08 = () => <marquee>News</marquee>;
