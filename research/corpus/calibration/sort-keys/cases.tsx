// Calibration cases in JSX: props aren't object keys, but a style={{…}} value is an object.
// See cases.ts for how cases are named and read.

declare const label: string;

export const K29 = () => <div title={label} id="x" aria-label={label} />;
export const K30 = () => <div style={{ zIndex: 1, color: "red" }} />;
export const K30b = () => <div style={{ marginTop: 4, margin: 0 }} />;
export const K30c = () => <div style={{ borderColor: "red", border: "1px solid black" }} />;
