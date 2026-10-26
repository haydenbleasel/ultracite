// Calibration case P01 (length-calibration.cjs): a function whose length depends on the formatter's
// printWidth. As written it is 12 lines with lines of 90 to 115 characters; the runner formats copies
// with Oxfmt at printWidth 80, 100 and 120 (Ultracite's config otherwise) and recounts. Nothing here
// is run.

declare function register(name: string, handler: (input: string) => string, options: { retries: number }): void;

// P01: a function whose length depends on printWidth
export function P01(prefix: string) {
  register(`${prefix}:alpha`, (input) => input.trim().toLowerCase(), { retries: 3 });
  register(`${prefix}:beta-handler`, (input) => input.trim().toUpperCase().slice(0, 10), { retries: 1 });
  register(`${prefix}:gamma-long-name`, (input) => input.split(",").map((part) => part.trim()).join(","), { retries: 2 });
  register(`${prefix}:delta`, (input) => input.replaceAll("-", "_"), { retries: 0 });
  register(`${prefix}:epsilon-handler`, (input) => input.padStart(20, " ").padEnd(40, " "), { retries: 5 });
  register(`${prefix}:zeta`, (input) => [...input].reverse().join(""), { retries: 4 });
  register(`${prefix}:eta-handler-name`, (input) => input.normalize("NFC").replace(/\s+/g, " "), { retries: 2 });
  register(`${prefix}:theta`, (input) => encodeURIComponent(input).slice(0, 64), { retries: 1 });
  return prefix;
}
