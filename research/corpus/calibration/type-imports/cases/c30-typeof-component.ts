// A component imported only to read its props type through typeof.
import { Button } from "../lib/button.js";

type Props = Parameters<typeof Button>[0];
const out: Props = { label: "x" };
console.log(JSON.stringify({ evaluated: globalThis.__evaluated ?? [], metadata: globalThis.__metadata ?? null, out }));
