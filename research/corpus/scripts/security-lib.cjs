// Shared definitions for the security-rules scripts: which rules count as security rules, what
// each one is meant to detect, and helpers to load Ultracite's presets for all three linters.
//
// "Security rule" here means a rule whose own documentation frames it as preventing a
// vulnerability (code injection, XSS, tabnabbing, weak crypto, leaked secrets, insecure
// transport or cookies, and so on). Hardening-adjacent rules that are about deprecated or
// confusing language features (no-caller, no-proto, no-with) are not counted.
"use strict";

const { execFileSync } = require("node:child_process");
const { existsSync, readFileSync } = require("node:fs");
const { dirname, join, resolve } = require("node:path");
const { pathToFileURL } = require("node:url");

const { ULTRACITE } = require("./tools.cjs");

const HERE = resolve(__dirname, "..");
const CLI = join(ULTRACITE, "packages/cli");
const TOPIC_DEFAULT = "security-rules";

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const flag = (name) => args.includes(`--${name}`);
const TOPIC = arg("topic", process.env.RESEARCH_TOPIC ?? TOPIC_DEFAULT);
const RESULTS_DIR = join(HERE, "results", TOPIC);
const OUT_DIR = join(HERE, "out", "security-rules");
const CALIBRATION_DIR = join(HERE, "calibration", "security-rules");
const DOGFOOD = new Set(["ultracite"]);

// ── vulnerability classes the rules map to ─────────────────────────────
const CLASSES = {
  "code-injection": "Code execution from strings (CWE-94/95)",
  xss: "HTML/script injection (CWE-79)",
  "url-scheme": "javascript: URLs (CWE-79)",
  tabnabbing: "Reverse tabnabbing / opener access (CWE-1022)",
  cookies: "Cookie handling (CWE-1004, CWE-614)",
  randomness: "Insecure randomness (CWE-338)",
  secrets: "Hardcoded credentials, secrets and IPs (CWE-798)",
  crypto: "Weak cryptography and TLS (CWE-326/327/295)",
  transport: "Clear-text protocols (CWE-319)",
  "http-headers": "HTTP security headers and server config (CWE-693, CWE-200)",
  "cross-origin": "CORS, CSRF and postMessage (CWE-942, CWE-352, CWE-345)",
  injection: "SQL, OS command and template injection (CWE-89/78/1336)",
  redos: "Regular-expression denial of service (CWE-1333)",
  "file-system": "File permissions, uploads and temp dirs (CWE-732/434/377)",
  framework: "Framework-specific sanitizer bypasses and misconfiguration",
  cloud: "AWS CDK infrastructure misconfiguration",
  "data-exposure": "Secrets or tokens exposed to the client",
  other: "Other",
};

// ── the security rules, per plugin ─────────────────────────────────────
// `detects` describes each rule's scope as the calibration cases measured it
// (calibration/security-rules/, linters.json), not only as documented.
const ESLINT_CORE = {
  "no-eval": [
    "code-injection",
    "eval(…), (0, eval)(…), globalThis.eval, globalThis['eval'], Reflect.apply(eval); window.eval only with the browser env; not self.eval",
  ],
  "no-implied-eval": [
    "code-injection",
    "setTimeout/setInterval/execScript with a string, template or same-file const string; Oxlint only when the browser env is set",
  ],
  "no-new-func": [
    "code-injection",
    "new Function(…) and Function(…) by name; not aliases or Function.prototype.constructor",
  ],
  "no-script-url": [
    "url-scheme",
    "string literals that start with javascript: (not templates or split strings)",
  ],
};
const TYPESCRIPT = {
  "no-implied-eval": [
    "code-injection",
    "type-aware: implied eval, including setTimeout(string) through variables and new Function",
  ],
};
const UNICORN = {
  "no-unsafe-dom-html": [
    "xss",
    "writes to innerHTML/outerHTML/srcdoc (also el['innerHTML']), insertAdjacentHTML, createContextualFragment, setHTMLUnsafe, setAttribute('srcdoc'), document.write/writeln",
  ],
  "no-unsafe-sqlite-interpolation": [
    "injection",
    "interpolation into SQL passed to node:sqlite",
  ],
  "no-document-cookie": ["cookies", "assignments to document.cookie"],
  "require-post-message-target-origin": [
    "cross-origin",
    "window.postMessage() without a targetOrigin",
  ],
};
const REACT = {
  "no-danger": [
    "xss",
    "the dangerouslySetInnerHTML JSX prop (Oxlint also createElement props; neither a spread object)",
  ],
  "no-danger-with-children": [
    "xss",
    "dangerouslySetInnerHTML together with children (a correctness check)",
  ],
  "jsx-no-target-blank": [
    "tabnabbing",
    'target="_blank" (literal or conditional) on links to external or dynamic URLs without rel="noreferrer"; noopener alone is flagged, internal links and forms are not',
  ],
  "jsx-no-script-url": [
    "url-scheme",
    "a literal javascript: URL in a JSX href",
  ],
  "iframe-missing-sandbox": [
    "xss",
    "<iframe> without sandbox, or with a literal allow-scripts + allow-same-origin; Oxlint also document.createElement('iframe')",
  ],
};
const GITHUB = {
  "no-inner-html": ["xss", "reads and writes of Element.innerHTML"],
  "no-dynamic-script-tag": [
    "code-injection",
    "document.createElement('script'), whatever is assigned to it",
  ],
  "authenticity-token": [
    "cross-origin",
    "reading Rails authenticity_token (CSRF token) values in JavaScript",
  ],
  "unescaped-html-literal": [
    "xss",
    "HTML string literals and templates that interpolate without escaping",
  ],
};
// eslint-plugin-sonarjs: every non-deprecated rule whose description is about security.
const SONARJS = {
  "aws-apigateway-public-api": ["cloud", "AWS CDK: API Gateway without auth"],
  "aws-ec2-rds-dms-public": ["cloud", "AWS CDK: public network access"],
  "aws-ec2-unencrypted-ebs-volume": ["cloud", "AWS CDK: unencrypted EBS"],
  "aws-efs-unencrypted": ["cloud", "AWS CDK: unencrypted EFS"],
  "aws-iam-all-privileges": ["cloud", "AWS CDK: IAM *:* privileges"],
  "aws-iam-all-resources-accessible": ["cloud", "AWS CDK: IAM all resources"],
  "aws-iam-privilege-escalation": [
    "cloud",
    "AWS CDK: IAM privilege escalation",
  ],
  "aws-iam-public-access": ["cloud", "AWS CDK: public resource policies"],
  "aws-opensearchservice-domain": ["cloud", "AWS CDK: unencrypted OpenSearch"],
  "aws-rds-unencrypted-databases": ["cloud", "AWS CDK: unencrypted RDS"],
  "aws-restricted-ip-admin-access": [
    "cloud",
    "AWS CDK: admin ports open to 0.0.0.0/0",
  ],
  "aws-s3-bucket-granted-access": ["cloud", "AWS CDK: S3 public grants"],
  "aws-s3-bucket-insecure-http": ["cloud", "AWS CDK: S3 without HTTPS-only"],
  "aws-s3-bucket-public-access": ["cloud", "AWS CDK: S3 public access"],
  "aws-s3-bucket-versioning": ["cloud", "AWS CDK: S3 versioning off"],
  "aws-sagemaker-unencrypted-notebook": [
    "cloud",
    "AWS CDK: unencrypted SageMaker",
  ],
  "aws-sns-unencrypted-topics": ["cloud", "AWS CDK: unencrypted SNS"],
  "aws-sqs-unencrypted-queue": ["cloud", "AWS CDK: unencrypted SQS"],
  "code-eval": [
    "code-injection",
    "eval, Function (including a local alias) and node:vm called with a non-literal argument, and dynamic javascript: URLs",
  ],
  "content-length": [
    "http-headers",
    "body-parser/multer/formidable without size limits",
  ],
  "content-security-policy": [
    "http-headers",
    "helmet CSP disabled or weakened",
  ],
  "cookie-no-httponly": [
    "cookies",
    "httpOnly: false passed to cookie-session, express-session, csurf or the cookies package (not Express res.cookie)",
  ],
  cors: [
    "cross-origin",
    "cors() from the cors package, '*' set in an http.createServer callback, Express handlers reflecting the Origin header",
  ],
  csrf: ["cross-origin", "csurf disabled or unsafe methods ignored"],
  "disabled-auto-escaping": [
    "xss",
    "template engines with auto-escaping turned off",
  ],
  "disabled-resource-integrity": [
    "xss",
    "type-aware: <script> created without an integrity attribute",
  ],
  "dompurify-unsafe-config": ["xss", "DOMPurify configs that allow bypass"],
  "dynamically-constructed-templates": [
    "injection",
    "server-side template engines compiling non-literal templates",
  ],
  "encryption-secure-mode": ["crypto", "ECB / no-padding cipher modes"],
  "file-permissions": [
    "file-system",
    "x.chmod*/process.umask member calls with world-accessible modes (not named imports)",
  ],
  "file-uploads": [
    "file-system",
    "formidable/multer without upload restrictions",
  ],
  "hardcoded-secret-signatures": [
    "secrets",
    "string literals matching known secret formats (keys, tokens)",
  ],
  hashing: ["crypto", "MD5/SHA-1 and other weak hashes via crypto"],
  "insecure-cookie": [
    "cookies",
    "secure: false passed to the same cookie libraries as cookie-no-httponly",
  ],
  "insecure-jwt-token": ["crypto", "jsonwebtoken with the none algorithm"],
  "link-with-target-blank": [
    "tabnabbing",
    "window.open(url, '_blank') without noopener in the features",
  ],
  "no-angular-bypass-sanitization": [
    "framework",
    "Angular DomSanitizer bypassSecurityTrust*",
  ],
  "no-clear-text-protocols": [
    "transport",
    "http://, ftp://, telnet:// URLs (example.com and localhost excluded) and clear-text clients",
  ],
  "no-hardcoded-ip": [
    "secrets",
    "IP-address literals; loopback, unspecified and documentation addresses are excluded unless written as full-length IPv6",
  ],
  "no-hardcoded-passwords": [
    "secrets",
    "string literals (entropy ≥ 3 bits/char) under password-like names, and password= in literals",
  ],
  "no-hardcoded-secrets": [
    "secrets",
    "high-entropy string literals assigned to secret-like names",
  ],
  "no-mime-sniff": ["http-headers", "helmet noSniff disabled"],
  "no-os-command-from-path": [
    "injection",
    "child_process commands resolved through PATH",
  ],
  "no-referrer-policy": [
    "http-headers",
    "helmet referrerPolicy set to an unsafe value",
  ],
  "no-session-cookies-on-static-assets": [
    "cookies",
    "session middleware before static files",
  ],
  "no-weak-cipher": ["crypto", "DES/RC4 and other weak ciphers"],
  "no-weak-keys": ["crypto", "short RSA/EC keys"],
  "post-message": [
    "cross-origin",
    "type-aware: message listeners without origin checks",
  ],
  "production-debug": ["http-headers", "errorhandler / debug features enabled"],
  "pseudo-random": ["randomness", "every Math.random() call"],
  "publicly-writable-directories": [
    "file-system",
    "/tmp and similar paths in literals",
  ],
  "review-blockchain-mnemonic": ["secrets", "hardcoded wallet seed phrases"],
  "session-regeneration": [
    "cross-origin",
    "passport login without session regeneration",
  ],
  "slow-regex": ["redos", "regexes vulnerable to catastrophic backtracking"],
  "sql-queries": [
    "injection",
    "SQL built by concatenation or templates and passed to a known driver's query (pg, mysql, mysql2, sequelize, …)",
  ],
  "strict-transport-security": [
    "http-headers",
    "helmet HSTS disabled or too short",
  ],
  "super-linear-regex": ["redos", "regexes with super-linear backtracking"],
  "unverified-certificate": ["crypto", "rejectUnauthorized: false"],
  "unverified-hostname": [
    "crypto",
    "checkServerIdentity that accepts any host",
  ],
  "weak-ssl": ["crypto", "SSLv3/TLS 1.0/1.1"],
  "x-powered-by": ["http-headers", "Express without disabling x-powered-by"],
  "xml-parser-xxe": ["injection", "libxmljs parsing with external entities"],
};
// Biome: the security group, plus noDocumentCookie (suspicious) and the nursery rules that
// cover the same sinks.
const BIOME = {
  "security/noBlankTarget": [
    "tabnabbing",
    'literal target="_blank" on links and forms (internal too) without rel noopener or noreferrer',
  ],
  "security/noDangerouslySetInnerHtml": [
    "xss",
    "the dangerouslySetInnerHTML prop, in JSX and createElement (not a spread object)",
  ],
  "security/noDangerouslySetInnerHtmlWithChildren": [
    "xss",
    "dangerouslySetInnerHTML together with children",
  ],
  "security/noGlobalEval": [
    "code-injection",
    "eval(…), aliases, window/globalThis.eval, Reflect.apply(eval); not self.eval or new Function",
  ],
  "security/noScriptUrl": [
    "url-scheme",
    "a literal javascript: URL in a JSX href (not other string literals)",
  ],
  "security/noSecrets": [
    "secrets",
    "high-entropy and known-format secrets in string literals",
  ],
  "suspicious/noDocumentCookie": ["cookies", "assignments to document.cookie"],
  "nursery/noImpliedEval": [
    "code-injection",
    "setTimeout/setInterval/Function with strings",
  ],
  "nursery/useIframeSandbox": ["xss", "<iframe> without sandbox"],
  "nursery/noUnsafeIframeSandbox": ["xss", "unsafe sandbox values"],
  "nursery/noAstroSetHtmlDirective": ["xss", "Astro set:html"],
  "nursery/noSvelteAtHtmlTags": ["xss", "Svelte {@html}"],
};

// react-doctor: the rules it puts in its own "Security" category, read from the plugin.
const reactDoctorSecurity = async () => {
  const mod = await import(
    pathToFileURL(
      require.resolve("oxlint-plugin-react-doctor", { paths: [ULTRACITE] })
    ).href
  );
  const rules = mod.default.rules;
  // no-document-write is filed under Performance by react-doctor, but document.write is an
  // HTML injection sink, so it's counted here too.
  const extra = new Set(["no-document-write"]);
  return Object.fromEntries(
    Object.entries(rules)
      .filter(([name, r]) => r.category === "Security" || extra.has(name))
      .map(([name, r]) => [name, ["react-doctor", r.title ?? name]])
  );
};

// ── preset loading ─────────────────────────────────────────────────────
const importFile = async (path) =>
  (await import(pathToFileURL(path).href)).default;

const severityOn = (value) => {
  const s = Array.isArray(value) ? value[0] : value;
  return !["off", 0, undefined].includes(s);
};

const oxlintPreset = async (name) =>
  importFile(join(CLI, "config/oxlint", name, "index.mjs"));

const eslintRules = async (relPath) => {
  const config = await importFile(join(CLI, "config/eslint", relPath));
  const rules = {};
  // Blocks that only target test files, route files or non-script files are overrides; skip
  // them so the merged map is what an ordinary .ts/.tsx source file gets.
  const isOverride = (glob) =>
    /test|spec|__tests__|pages|\$|__root|\+page|\.html$|\.astro|\.vue|\.svelte/.test(
      glob
    );
  for (const block of [config].flat()) {
    if (block.files && block.files.flat().every(isOverride)) {
      continue;
    }
    Object.assign(rules, block.rules ?? {});
  }
  return rules;
};

const biomePreset = (name) => {
  const { parse } = require(require.resolve("jsonc-parser", { paths: [CLI] }));
  return parse(
    readFileSync(join(CLI, "config/biome", name, "biome.jsonc"), "utf8")
  );
};

// ── tools ──────────────────────────────────────────────────────────────
const oxlintPkgPath = require.resolve("oxlint/package.json", {
  paths: [ULTRACITE],
});
const oxlintBin = join(dirname(oxlintPkgPath), "bin", "oxlint");
// Some packages don't export ./package.json, so walk up from the resolved entry point.
const versionOf = (name, base) => {
  try {
    return require(require.resolve(`${name}/package.json`, { paths: [base] }))
      .version;
  } catch {
    // fall through: ./package.json isn't exported
  }
  let dir = dirname(require.resolve(name, { paths: [base] }));
  while (dir !== dirname(dir)) {
    const pkg = join(dir, "package.json");
    if (existsSync(pkg)) {
      const json = JSON.parse(readFileSync(pkg, "utf8"));
      if (json.name === name) {
        return json.version;
      }
    }
    dir = dirname(dir);
  }
  return null;
};

const toolVersions = () => ({
  node: process.version,
  oxlint: require(oxlintPkgPath).version,
  // oxlint finds tsgolint next to itself, so resolve it from oxlint's own directory.
  "oxlint-tsgolint": versionOf("oxlint-tsgolint", dirname(oxlintPkgPath)),
  eslint: versionOf("eslint", CLI),
  "@typescript-eslint/parser": versionOf("@typescript-eslint/parser", CLI),
  "eslint-plugin-sonarjs (ESLint)": versionOf("eslint-plugin-sonarjs", CLI),
  "eslint-plugin-sonarjs (Oxlint JS plugin)": versionOf(
    "eslint-plugin-sonarjs",
    ULTRACITE
  ),
  "eslint-plugin-react": versionOf("eslint-plugin-react", CLI),
  "eslint-plugin-github": versionOf("eslint-plugin-github", CLI),
  "eslint-plugin-unicorn": versionOf("eslint-plugin-unicorn", CLI),
  "eslint-plugin-react-doctor": versionOf("eslint-plugin-react-doctor", CLI),
  "oxlint-plugin-react-doctor": versionOf(
    "oxlint-plugin-react-doctor",
    ULTRACITE
  ),
  "@biomejs/biome": versionOf("@biomejs/biome", CLI),
});

const gitHead = (dir) => {
  try {
    return execFileSync("git", ["-C", dir, "rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim();
  } catch {
    return null;
  }
};

const permalink = (github, sha, file, line, endLine) =>
  `https://github.com/${github}/blob/${sha}/${file}#L${line}${endLine && endLine !== line ? `-L${endLine}` : ""}`;

const per10k = (n, lines) => Math.round((n / lines) * 1e5) / 10;

module.exports = {
  BIOME,
  CALIBRATION_DIR,
  CLASSES,
  CLI,
  DOGFOOD,
  ESLINT_CORE,
  GITHUB,
  HERE,
  OUT_DIR,
  REACT,
  RESULTS_DIR,
  SONARJS,
  TOPIC,
  TYPESCRIPT,
  ULTRACITE,
  UNICORN,
  arg,
  biomePreset,
  eslintRules,
  flag,
  gitHead,
  oxlintBin,
  oxlintPreset,
  per10k,
  permalink,
  reactDoctorSecurity,
  severityOn,
  toolVersions,
};
