/*
 * Calibration cases for the post on task-marker comments. Run with todo-linters.cjs --calibration.
 *
 * Every case starts with a caseStart("ID", "what it is") call, and every diagnostic up to the
 * next caseStart belongs to it. The headers are calls rather than comments so that they can't
 * trip the rules under test themselves. This header avoids the marker words for the same reason.
 * The package.json next to this file gives unicorn/expiring-todo-comments a version (2.0.0), a
 * dependency (react ^19.0.0) and a Node engine (>=20) to compare its conditions against.
 */
declare function caseStart(id: string, what: string): void;
declare function work(): void;
declare const flag: boolean;

caseStart("T01", "the plain form, with a colon");
// TODO: handle the empty case
work();

caseStart("T02", "no space, lower case");
//todo handle the empty case
work();

caseStart("T03", "title case with a colon");
// Todo: handle the empty case
work();

caseStart("T04", "mixed case");
// ToDo: handle the empty case
work();

caseStart("T05", "the bare word, nothing after it");
// TODO
work();

caseStart("T06", "a block comment");
/* FIXME */
work();

caseStart("T07", "XXX");
// XXX: this breaks on Windows
work();

caseStart("T08", "FIXME with a description");
// FIXME: this breaks on Windows
work();

caseStart("T09", "the JSDoc @todo tag");
/** @todo handle the empty case */
work();

caseStart("T10", "a JSDoc block with the marker on a later line");
/**
 * Loads the user's settings.
 * TODO: cache the result
 */
work();

caseStart("T11", "a block comment with the marker on its second line, no asterisks");
/*
  TODO: cache the result
*/
work();

caseStart("T12", "with an issue reference");
// TODO(#12): handle the empty case
work();

caseStart("T13", "with an owner");
// TODO(alice): handle the empty case
work();

caseStart("T14", "with a GitHub issue URL");
// TODO: remove once https://github.com/vitejs/vite/issues/12345 is fixed
work();

caseStart("T15", "with a Jira-style key");
// TODO PROJ-123 handle the empty case
work();

caseStart("T16", "with a key in parentheses (Next.js's Linear form)");
// TODO(NAR-804): handle the empty case
work();

caseStart("T17", "an area tag glued with a dash (Next.js's TODO-APP form)");
// TODO-APP: handle the empty case
work();

caseStart("T18", "trailing, after code on the same line");
work(); // TODO: handle the empty case

caseStart("T19", "in the middle of a comment");
// This works for now, TODO: handle the empty case
work();

caseStart("T20", "at the end of a comment");
// Handle the empty case (todo)
work();

caseStart("T21", "a later line of a run of line comments");
// Loads the user's settings.
// TODO: cache the result
work();

caseStart("T22", "two markers in one comment");
// TODO: cache the result. FIXME: this breaks on Windows
work();

caseStart("T23", "a JSX comment child");
export const T23 = () => <div>{/* TODO: handle the empty case */}</div>;

caseStart("T24", "a comment inside a JSX attribute expression");
export const T24 = () => <div title={/* TODO */ "x"} />;

caseStart("T25", "the word in a string literal");
export const T25 = "TODO: handle the empty case";

caseStart("T26", "the word in a template literal");
export const T26 = `// TODO: handle the empty case ${String(flag)}`;

caseStart("T27", "the word in JSX text");
export const T27 = () => <div>TODO: handle the empty case</div>;

caseStart("T28", "a comment-like string in JSX text");
export const T28 = () => <div>// TODO handle the empty case</div>;

caseStart("T29", "the word as an identifier");
export const TODO_LIMIT = 3;

caseStart("T30", "after a ts-expect-error directive");
// @ts-expect-error TODO: fix the types
export const T30: number = "x";

caseStart("T31", "the reason of an eslint-disable directive");
// eslint-disable-next-line no-console -- TODO: remove before release
console.log("x");

caseStart("T32", "an eslint-disable for the rule itself, with the word");
// eslint-disable-next-line no-warning-comments -- TODO: tracked in #12
work();

caseStart("T33", "an oxlint-disable for the rule itself, with the word");
// oxlint-disable-next-line no-warning-comments -- TODO: tracked in #12
work();

caseStart("T34", "the plural");
// TODOs are tracked in the issue tracker
work();

caseStart("T35", "Todo as the first word of a sentence (prose)");
// Todo items are sorted by date
work();

caseStart("T36", "todo in lower case in the middle of a sentence (prose)");
// Sort the todo items by date
work();

caseStart("T37", "an embedded word");
// See todo_list.ts for the format
work();

// ── unicorn's expiration conditions ───────────────────────────────────
caseStart("U01", "an expired date");
// TODO [2000-01-01]: remove the fallback
work();

caseStart("U02", "a future date");
// TODO [2999-01-01]: remove the fallback
work();

caseStart("U03", "two dates");
// TODO [2000-01-01, 2999-01-01]: remove the fallback
work();

caseStart("U04", "a package version already reached (package.json says 2.0.0)");
// TODO [>1.0.0]: remove the fallback
work();

caseStart("U05", "a package version not reached yet");
// TODO [>3.0.0]: remove the fallback
work();

caseStart("U06", "a dependency that is installed");
// TODO [+react]: remove the fallback
work();

caseStart("U07", "a dependency that is not installed");
// TODO [+left-pad]: use left-pad
work();

caseStart("U08", "a dependency that is not installed, with a removal condition");
// TODO [-left-pad]: remove the fallback
work();

caseStart("U09", "a dependency version already reached");
// TODO [react@>=18]: remove the fallback
work();

caseStart("U10", "a Node engine already reached (engines says >=20)");
// TODO [engine:node@>=18]: remove the fallback
work();

caseStart("U11", "a condition with whitespace");
// TODO [ > 1.0.0 ]: remove the fallback
work();

caseStart("U12", "a condition missing its @");
// TODO [react>=18]: remove the fallback
work();

caseStart("U13", "brackets that aren't a condition");
// TODO: read arr[0] instead
work();

caseStart("U14", "a condition in prose form (no brackets)");
// TODO: remove the fallback once React 19 is the minimum
work();

// ── rewordings that keep the task and drop the marker ──────────────────
caseStart("R01", "NOTE instead");
// NOTE: handle the empty case
work();

caseStart("R02", "Later instead");
// Later: handle the empty case
work();

caseStart("R03", "TBD instead");
// TBD: handle the empty case
work();

caseStart("R04", "Pending instead");
// Pending: handle the empty case
work();

caseStart("R05", "Follow-up instead");
// Follow-up: handle the empty case
work();

caseStart("R06", "HACK instead");
// HACK: handle the empty case
work();

caseStart("R07", "BUG instead");
// BUG: the empty case isn't handled
work();

caseStart("R08", "the task as a plain sentence");
// The empty case isn't handled yet.
work();

caseStart("R09", "the word moved away from the start");
// Handle the empty case. TODO
work();

caseStart("R10", "decoration in front of the word");
// - TODO: handle the empty case
work();

caseStart("R11", "an asterisk in front of the word");
// * TODO: handle the empty case
work();

caseStart("R12", "the word in brackets");
// [TODO] handle the empty case
work();

caseStart("R13", "the word in bold");
// **TODO**: handle the empty case
work();

caseStart("R14", "a block comment with decoration");
/* ** TODO: handle the empty case */
work();

caseStart("R15", "split with a space");
// TO DO: handle the empty case
work();

caseStart("R16", "split with a dash");
// TO-DO: handle the empty case
work();

caseStart("R17", "zero for the letter O");
// T0D0: handle the empty case
work();

caseStart("R18", "a Cyrillic homoglyph (U+0422, U+041E)");
// ТОDО: handle the empty case
work();

caseStart("R19", "a zero-width space inside the word");
// TO​DO: handle the empty case
work();

caseStart("R20", "full-width letters");
// ＴＯＤＯ: handle the empty case
work();

caseStart("R21", "a trailing underscore");
// TODO_: handle the empty case
work();

caseStart("R22", "the word glued to a letter");
// TODOx: handle the empty case
work();

caseStart("R23", "moved into a string");
export const R23 = { todo: "handle the empty case" };

caseStart("R24", "moved into a ts-expect-error reason");
// @ts-expect-error -- TODO: handle the empty case
export const R24: number = "x";

caseStart("R25", "a Jira-style key after the word");
// TODO ABC-1: handle the empty case
work();

caseStart("R26", "the comment deleted (control)");
work();
