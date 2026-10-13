// STUB, not part of the original source: the two functions and one type cookies.ts imports from the
// `cookie` package (v1), reduced to what these files need to type-check and run.
export interface SerializeOptions {
  domain?: string;
  encode?: (value: string) => string;
  expires?: Date;
  httpOnly?: boolean;
  maxAge?: number;
  partitioned?: boolean;
  path?: string;
  sameSite?: boolean | "lax" | "strict" | "none";
  secure?: boolean;
}

export const parseCookie = (
  raw: string,
  options?: { decode?: (value: string) => string }
): Record<string, string | undefined> => {
  const decode = options?.decode ?? decodeURIComponent;
  const out: Record<string, string | undefined> = {};
  for (const part of raw.split(";")) {
    const index = part.indexOf("=");
    if (index > 0) {
      out[part.slice(0, index).trim()] = decode(part.slice(index + 1).trim());
    }
  }
  return out;
};

export const stringifySetCookie = (
  cookie: SerializeOptions & { name: string; value: string },
  options?: { encode?: (value: string) => string }
): string => {
  const encode = options?.encode ?? encodeURIComponent;
  const parts = [`${cookie.name}=${encode(cookie.value)}`];
  if (cookie.path) {
    parts.push(`Path=${cookie.path}`);
  }
  if (cookie.expires) {
    parts.push(`Expires=${cookie.expires.toUTCString()}`);
  }
  if (cookie.maxAge !== undefined) {
    parts.push(`Max-Age=${cookie.maxAge}`);
  }
  if (cookie.httpOnly) {
    parts.push("HttpOnly");
  }
  if (cookie.secure) {
    parts.push("Secure");
  }
  return parts.join("; ");
};
