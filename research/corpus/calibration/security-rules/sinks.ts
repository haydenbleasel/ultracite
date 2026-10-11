// Hand-written calibration cases for the security rules (not from any repo): the plain sinks,
// and the evasions an agent might write to get past a rule. Never executed, only linted.
//
// Each case starts with a `// <ID>: <description>` comment and runs to the next one, so a
// diagnostic maps to the case it falls inside. `input` stands for a value that may be
// attacker-controlled.
// Run: node research/corpus/scripts/security-linters.cjs --calibration

declare const input: string;
declare const element: HTMLElement;
declare const frame: HTMLIFrameElement;
declare const newTab: boolean;

// ── code execution ───────────────────────────────────────────────────
// E01: direct eval of a variable
export const e01 = (): unknown => eval(input);
// E02: direct eval of a literal
export const e02 = (): unknown => eval("1 + 1");
// E03: window.eval
export const e03 = (): unknown => window.eval(input);
// E04: globalThis.eval
export const e04 = (): unknown => globalThis.eval(input);
// E05: indirect eval through a sequence expression, (0, eval)(x)
export const e05 = (): unknown => (0, eval)(input);
// E06: eval reached through a computed, concatenated name
export const e06 = (): unknown => (window as unknown as Record<string, (code: string) => unknown>)["ev" + "al"](input);
// E07: eval reached through a computed string literal
export const e07 = (): unknown => globalThis["eval"](input);
// E08: eval aliased to a variable first
export const e08 = (): unknown => {
  const run = eval;
  return run(input);
};
// E09: self.eval
export const e09 = (): unknown => self.eval(input);
// E10: new Function with a body from a variable
export const e10 = (): unknown => new Function("a", input);
// E11: Function called without new
export const e11 = (): unknown => Function(input);
// E12: Function.prototype.constructor
export const e12 = (): unknown => Function.prototype.constructor(input);
// E13: an arrow function's constructor (which is Function)
export const e13 = (): unknown => (() => undefined).constructor(input);
// E14: the AsyncFunction constructor
export const e14 = (): unknown => Object.getPrototypeOf(async () => undefined).constructor(input);
// E15: Reflect.apply on eval
export const e15 = (): unknown => Reflect.apply(eval, undefined, [input]);
// E16: Reflect.construct on Function
export const e16 = (): unknown => Reflect.construct(Function, [input]);
// E17: setTimeout with a string literal
export const e17 = (): unknown => setTimeout("console.log(1)", 0);
// E18: setTimeout with a string variable
export const e18 = (): unknown => setTimeout(input, 0);
// E19: setInterval with a template literal
export const e19 = (): unknown => setInterval(`run(${input})`, 10);
// E20: window.setTimeout with a string literal
export const e20 = (): unknown => window.setTimeout("tick()", 1);
// E21: setTimeout with a const string declared above
export const e21 = (): unknown => {
  const code = "tick()";
  return setTimeout(code, 1);
};
// E22: dynamic import of a variable specifier
export const e22 = async (): Promise<unknown> => import(input);
// E23: a Worker built from a Blob of code
export const e23 = (): Worker => new Worker(URL.createObjectURL(new Blob([input])));
// E24: a script element whose src is set from a variable
export const e24 = (): void => {
  const script = document.createElement("script");
  script.src = input;
  document.head.append(script);
};
// E25: a script element whose text is set from a variable
export const e25 = (): void => {
  const script = document.createElement("script");
  script.textContent = input;
  document.head.append(script);
};

// ── HTML sinks ───────────────────────────────────────────────────────
// H01: innerHTML from a variable
export const h01 = (): void => {
  element.innerHTML = input;
};
// H02: innerHTML from a static literal
export const h02 = (): void => {
  element.innerHTML = "<b>static</b>";
};
// H03: innerHTML +=
export const h03 = (): void => {
  element.innerHTML += input;
};
// H04: outerHTML
export const h04 = (): void => {
  element.outerHTML = input;
};
// H05: innerHTML through a computed, concatenated name
export const h05 = (): void => {
  (element as unknown as Record<string, string>)["inner" + "HTML"] = input;
};
// H06: innerHTML through a computed string literal
export const h06 = (): void => {
  element["innerHTML"] = input;
};
// H07: innerHTML through a variable holding the property name
export const h07 = (): void => {
  const property = "innerHTML";
  (element as unknown as Record<string, string>)[property] = input;
};
// H08: Object.assign onto the element
export const h08 = (): void => {
  Object.assign(element, { innerHTML: input });
};
// H09: Reflect.set onto the element
export const h09 = (): void => {
  Reflect.set(element, "innerHTML", input);
};
// H10: insertAdjacentHTML
export const h10 = (): void => {
  element.insertAdjacentHTML("beforeend", input);
};
// H11: document.write
export const h11 = (): void => {
  document.write(input);
};
// H12: document.writeln
export const h12 = (): void => {
  document.writeln(input);
};
// H13: iframe srcdoc property
export const h13 = (): void => {
  frame.srcdoc = input;
};
// H14: iframe srcdoc via setAttribute
export const h14 = (): void => {
  frame.setAttribute("srcdoc", input);
};
// H15: Range.createContextualFragment
export const h15 = (): void => {
  element.append(document.createRange().createContextualFragment(input));
};
// H16: setHTMLUnsafe
export const h16 = (): void => {
  element.setHTMLUnsafe(input);
};
// H17: DOMParser, then move the parsed nodes into the page
export const h17 = (): void => {
  const parsed = new DOMParser().parseFromString(input, "text/html");
  element.append(...parsed.body.childNodes);
};
// H18: an inline event handler attribute
export const h18 = (): void => {
  element.setAttribute("onclick", input);
};
// H19: reading innerHTML (not a sink)
export const h19 = (): string => element.innerHTML;

// ── URLs ─────────────────────────────────────────────────────────────
// U01: javascript: literal assigned to location
export const u01 = (): void => {
  location.href = "javascript:alert(1)";
};
// U02: javascript: in a template literal
export const u02 = (): void => {
  location.href = `javascript:${input}`;
};
// U03: javascript: split across a concatenation
export const u03 = (): void => {
  location.href = "java" + "script:" + input;
};
// U04: new URL with a javascript: literal
export const u04 = (): string => new URL("javascript:alert(1)").href;
// U05: a URL from a variable assigned to an anchor
export const u05 = (anchor: HTMLAnchorElement): void => {
  anchor.href = input;
};
// U06: window.open without noopener
export const u06 = (): Window | null => window.open(input);
// U07: window.open with _blank and noopener
export const u07 = (): Window | null => window.open(input, "_blank", "noopener");
// U08: window.open with _blank and no features
export const u08 = (): Window | null => window.open("https://example.com", "_blank");
// U09: location.assign from a variable
export const u09 = (): void => {
  location.assign(input);
};

// ── cookies and storage ──────────────────────────────────────────────
// K01: document.cookie with a literal
export const k01 = (): void => {
  document.cookie = "theme=dark";
};
// K02: document.cookie with a template literal
export const k02 = (): void => {
  document.cookie = `session=${input}`;
};
// K03: window.document.cookie
export const k03 = (): void => {
  window.document.cookie = input;
};
// K04: document aliased first
export const k04 = (): void => {
  const doc = document;
  doc.cookie = input;
};
// K05: document["cookie"]
export const k05 = (): void => {
  document["cookie"] = input;
};
// K06: reading document.cookie (not a write)
export const k06 = (): string[] => document.cookie.split(";");
// K07: an auth token in localStorage
export const k07 = (token: string): void => {
  localStorage.setItem("authToken", token);
};

// ── randomness ───────────────────────────────────────────────────────
// R01: Math.random
export const r01 = (): number => Math.random();
// R02: Math.random used for a token
export const r02 = (): string => Math.random().toString(36).slice(2);
// R03: Math.random destructured first
export const r03 = (): number => {
  const { random } = Math;
  return random();
};
// R04: crypto.getRandomValues (secure)
export const r04 = (): Uint8Array => crypto.getRandomValues(new Uint8Array(16));
// R05: crypto.randomUUID (secure)
export const r05 = (): string => crypto.randomUUID();

// ── secrets and IPs ──────────────────────────────────────────────────
// S01: a password literal
export const s01 = { password: "hunter2hunter2" };
// S02: AWS's documented example access key id
export const s02 = { accessKeyId: "AKIAIOSFODNN7EXAMPLE" };
// S03: AWS's documented example secret access key
export const s03 = { secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY" };
// S04: a high-entropy literal under a secret-like name
export const s04 = { clientSecret: "q8F3kZ9vT2mX7pL4sW1nB6cR0dY5hJ3a" };
// S05: credentials inside a connection URL
export const s05 = "postgres://admin:hunter2@db.internal:5432/app";
// S06: a public IP literal (TEST-NET-3)
export const s06 = "203.0.113.7";
// S07: loopback
export const s07 = "127.0.0.1";
// S08: a private IP
export const s08 = "10.0.0.5";
// S09: a hardcoded fallback for a secret environment variable
export const s09 = process.env.API_SECRET ?? "fallback-secret-123456";
// S10: a secret read from the environment (fine)
export const s10 = process.env.DATABASE_PASSWORD;
// S11: a label that only mentions passwords (fine)
export const s11 = { passwordLabel: "Password" };
// S12: a bearer token literal in a header
export const s12 = { Authorization: "Bearer q8F3kZ9vT2mX7pL4sW1nB6cR0dY5hJ3a" };
// S13: a password with more varied characters (S01's has too little entropy for sonarjs)
export const s13 = { adminPassword: "Tr0ub4dor&3x!" };
// S14: a hardcoded fallback for a secret, under a secret-like name
export const apiSecret = process.env.API_SECRET ?? "q8F3kZ9vT2mX7pL4sW1nB6cR0dY5hJ3a";

// ── messaging ────────────────────────────────────────────────────────
// M01: postMessage without a target origin
export const m01 = (data: unknown): void => {
  window.parent.postMessage(data);
};
// M02: postMessage to "*"
export const m02 = (data: unknown): void => {
  window.parent.postMessage(data, "*");
};
// M03: a message listener that doesn't check the origin
export const m03 = (): void => {
  window.addEventListener("message", (event: MessageEvent<string>) => {
    element.textContent = event.data;
  });
};

// ── transport and regexes ────────────────────────────────────────────
// T01: a clear-text http URL
export const t01 = async (): Promise<Response> => fetch("http://example.com/api");
// T02: a regex with nested quantifiers
export const t02 = (): boolean => /^(a+)+$/u.test(input);
// T03: a regex with super-linear backtracking
export const t03 = (): boolean => /\s*#?\s*$/u.test(input);
// T04: a clear-text http URL on a domain that isn't example.com
export const t04 = async (): Promise<Response> => fetch("http://api.acme-corp.io/v1/users");
