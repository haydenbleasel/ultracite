// The same JSX in a .js file: Oxlint parses JSX in .js; ESLint's react preset only covers .jsx/.tsx.
const open = () => {};
// T01: img with no alt
export const T01 = () => <img src="/chart.png" />;
// T02: div with onClick
export const T02 = () => <div onClick={open}>Open</div>;
// T03: a href="#"
export const T03 = () => <a href="#">Delete</a>;
// T04: iframe with no title
export const T04 = () => <iframe src="https://example.com/embed" />;
// T05: button with no type
export const T05 = () => <button onClick={open}>Save</button>;
// T06: input with autoFocus
export const T06 = () => <input autoFocus type="search" />;
// T07: aria-hidden on a button
export const T07 = () => <button aria-hidden="true" type="button">Close</button>;
// T08: positive tabIndex
export const T08 = () => <input tabIndex={2} type="text" />;
// T09: empty heading
export const T09 = () => <h2 />;
// T10: label with no control
export const T10 = () => (
  <>
    <label>Name</label>
    <input type="text" />
  </>
);
// END
