// Hand-written calibration cases for the server-side security rules (not from any repo): Node
// crypto, TLS, cookies, CORS, SQL, child processes and the vm module. Never executed, only
// linted, so the imported packages don't need to exist.
//
// Each case starts with a `// <ID>: <description>` comment and runs to the next one.
// Run: node research/corpus/scripts/security-linters.cjs --calibration

import { exec, spawn } from "node:child_process";
import { createCipheriv, createHash } from "node:crypto";
import fs, { chmodSync, writeFileSync } from "node:fs";
import { request } from "node:https";
import { Script, runInNewContext } from "node:vm";

import cors from "cors";
import express from "express";
import session from "express-session";
import jwt from "jsonwebtoken";
import { Pool } from "pg";

declare const input: string;
declare const key: Buffer;
declare const iv: Buffer;
declare const db: { query: (sql: string) => Promise<unknown> };

// ── crypto and TLS ───────────────────────────────────────────────────
// V01: MD5
export const v01 = (): string => createHash("md5").update(input).digest("hex");
// V02: SHA-1
export const v02 = (): string => createHash("sha1").update(input).digest("hex");
// V03: triple DES
export const v03 = (): unknown => createCipheriv("des-ede3-cbc", key, iv);
// V04: AES in ECB mode
export const v04 = (): unknown => createCipheriv("aes-128-ecb", key, null);
// V05: TLS without certificate verification
export const v05 = (): unknown => request({ hostname: "example.com", rejectUnauthorized: false });
// V06: a JWT signed with the none algorithm
export const v06 = (): string => jwt.sign({ sub: input }, key, { algorithm: "none" });

// ── HTTP servers ─────────────────────────────────────────────────────
// V07: an Express app (x-powered-by left on)
export const app = express();
// V08: cors() with the default (any origin)
app.use(cors());
// V09: a wildcard CORS header set by hand
app.get("/a", (_req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.send("ok");
});
// V10: a cookie with no flags
app.get("/b", (_req, res) => {
  res.cookie("session", input);
  res.send("ok");
});
// V11: a cookie with httpOnly and secure turned off
app.get("/c", (_req, res) => {
  res.cookie("session", input, { httpOnly: false, secure: false });
  res.send("ok");
});
// V12: reflecting a query parameter into HTML
app.get("/d", (req, res) => {
  res.send(`<p>Hello ${String(req.query.name)}</p>`);
});

// ── injection ────────────────────────────────────────────────────────
// V13: SQL built by concatenation
export const v13 = async (id: string): Promise<unknown> => db.query("SELECT * FROM users WHERE id = " + id);
// V14: SQL built with a template literal
export const v14 = async (id: string): Promise<unknown> => db.query(`SELECT * FROM users WHERE id = ${id}`);
// V15: a shell command built by concatenation
export const v15 = (): unknown => exec("ls " + input);
// V16: a command resolved through PATH
export const v16 = (): unknown => spawn("git", ["status"]);
// V17: vm.runInNewContext on a variable
export const v17 = (): unknown => runInNewContext(input);
// V18: new vm.Script on a variable
export const v18 = (): unknown => new Script(input);
// V19: require of a variable
export const v19 = (): unknown => require(input);

// ── file system ──────────────────────────────────────────────────────
// V20: world-writable permissions through fs.chmodSync
export const v20 = (): void => fs.chmodSync(input, 0o777);
// V21: a file in /tmp
export const v21 = (): void => writeFileSync("/tmp/upload.json", input);
// V22: world-writable permissions through a named import
export const v22 = (): void => chmodSync(input, 0o777);

// ── cookies and SQL through the libraries sonarjs models ─────────────
// V23: express-session with secure and httpOnly turned off
app.use(session({ cookie: { httpOnly: false, secure: false }, secret: input }));
// V24: SQL built by concatenation through node-postgres
export const v24 = async (id: string): Promise<unknown> => new Pool().query("SELECT * FROM users WHERE id = " + id);
