# Security lint rules and AI-written code: literature and source notes

Compiled 2026-10-10 for the Ultracite research post on security lint rules (`no-eval`, `no-implied-eval`, `no-new-func`, `react/no-danger` / `noDangerouslySetInnerHtml`, `no-script-url`, `noDocumentCookie`, `no-unsanitized`, and the eslint-plugin-sonarjs security rules).

**How to read the tags**

- **VERIFIED**: the primary source (the PDF, the publisher or arXiv record, the official docs, the tool's source code, or the original GitHub issue) was opened and the claim found in it.
- **VERIFIED (metadata + abstract)**: the bibliographic record and the abstract were checked, but not the full text.
- **UNVERIFIED**: only secondary mentions were found. Don't cite these as fact.
- **Vendor** marks research by a company that sells a product in this space. **Anecdote** marks a single report that is not a study.

Every quote is copied exactly and is under 15 words.

---

## Most useful for the post

1. **XSS is the #1 weakness in the 2025 CWE Top 25,** with a score of 60.38, more than double #2 (SQL injection, 28.72). Code injection (CWE-94), the `eval` class, is #10. OWASP's Top 10:2025 moved Injection from #3 to #5, though "100% of applications" were tested for it (section 1.8).
2. **Today's rules are 15–20 years old.** Amit Klein's 2005 DOM-XSS paper already listed the sinks: `eval`, `setTimeout`, `setInterval`, `document.write` and `innerHtml`. Mozilla's 2010 CSP paper made "Strings May Not Become Code" a base restriction. A 2010 JSLint build emitted "eval is evil." for `eval`, `Function` and `window['eval']`, and "Implied eval is evil. Pass a function instead of a string." (sections 1.3–1.5).
3. **React named the prop to scare you.** The docs say "The prop name `dangerouslySetInnerHTML` is intentionally chosen to be frightening," and call the `{__html}` wrapper a "type/taint" marker. The name has been there since v0.3.0 in May 2013 (section 1.6).
4. **Eval was everywhere and mostly unnecessary** (Richards et al., ECOOP 2011). "Over 82% of the top 100 pages use eval," as did 50% of the top 10,000. 76% of eval'd strings had simple replacements. The `Function` constructor was on 49% of top-100 sites. That makes the case for `no-new-func` and `no-implied-eval`, not just `no-eval` (section 2.1).
5. **Real DOM XSS is common and shallow.** Lekies et al. (CCS 2013) confirmed 6,167 DOM XSS bugs on 480 of the Alexa top 5,000 domains (9.6%). Stock et al. (CCS 2015) rated 64% of 1,273 real flaws as low complexity, and most ended in `document.write` or `innerHTML`. Melicher et al. (NDSS 2018) say the evidence "suggests that DOM XSS is getting worse" (sections 2.5–2.7).
6. **The browser backstop is usually switched off.** `'unsafe-eval'` was in 81.65% of `script-src` policies in 2016 and 77% of CSPs in the 2025 Web Almanac. Trusted Types only reached Baseline in February 2026 (sections 1.7, 2.10, 2.12).
7. **Google's evidence for banning sinks at build time:**
   - Peer-reviewed (ICSE 2021): one product's DOM XSS reports went 10 → 2 → 1 after compile-time sink bans.
   - Self-reported: Trusted Types-enabled properties have had zero XSS reports in three years, and XSS fell from 30% of bug-bounty rewards in 2018 to 4.1% in 2023 (section 1.7).
8. **The famous Copilot "40%" is not a JavaScript or XSS number.** Pearce et al. (S&P 2022) found 39.33% of top suggestions and 40.73% of all suggestions vulnerable, in C, Python and Verilog. XSS was one of Copilot's _best_ results: 19% of options vulnerable and no vulnerable top suggestion (section 3.1).
9. **Copilot code in real projects (Fu et al., TOSEM 2025):**
   - 24.2% of JavaScript snippets had a weakness. The top JavaScript CWEs were CWE-94 (code injection) and CWE-79 (XSS), found with CodeQL plus ESLint security plugins.
   - Pasting the static-analysis warnings into Copilot Chat raised the fix rate from 19.3% to 55.5%, and XSS fixes from 0% to 70%.
   - Code injection barely moved, from 16.7% to 14.3% (section 3.5).
10. **BaxBench (ICML 2025):** in the four JavaScript frameworks, 90–95% of functionally correct backends that _could_ have XSS did. The paper's motivating example is a calculator that runs `eval(s)`. Across models, exploits worked on "around half of the correct programs" (section 3.8).
11. **Meta's CyberSecEval is, in effect, a lint benchmark.** "On average, LLMs suggested vulnerable code 30% of the time." The detector is regex and Semgrep rules, with 96% precision and 79% recall. Its JavaScript rules are `no-eval`/`no-new-func`/`no-implied-eval` and `dangerouslySetInnerHTML` patterns (section 3.9).
12. **Veracode (vendor): XSS hasn't improved.**
    - 2025: 45% of tasks failed security tests, JavaScript failed 43%, and XSS (CWE-80) failed 86% of the time.
    - July 2026: the overall pass rate is 56%, but XSS still passes only 15% of the time.
    - "Syntax is solved at 99.9%. Security is not." (section 3.10).
13. **Coding agents, not just completions:**
    - **SusVibes (ICML 2026):** SWE-Agent with Claude 4 Sonnet was 57% functionally correct but only 11.8% secure.
    - **SWE-bench patches:** eval injection appeared in 39 LLM patches against one developer patch.
    - **Real agent PRs:** Semgrep found new issues in 15.4% of 675 security-related ones, with XSS 7.1% of findings.
    - **After merge:** agentic code added Semgrep security findings at 1.14× the human per-line rate, and high-severity findings at 1.51×.
    - **Vibe-coded apps:** 91% of 200 audited apps, 97% of them React, had a vulnerability (sections 3.14, 3.16, 3.19, 3.20, 3.22).
14. **Honest counterpoints.**
    - Tenzai (vendor) found no exploitable XSS in 15 agent-built apps and credited framework escaping.
    - "Lost at C" found AI help added no more than 10% more critical bugs.
    - Perry et al.'s pooled effect was p = 0.056.
    - The takeaway: React escapes by default, and what an agent can get wrong is the escape hatches (`dangerouslySetInnerHTML`, `document.write`, `javascript:` URLs, `eval`). Those are exactly what syntactic rules see (sections 3.3, 3.4, 3.26).
15. **Secrets (GitGuardian, vendor):** commits assisted by Claude Code leaked secrets at 3.2% against a 1.5% baseline. Repos with Copilot leaked at 6.4% against 4.61% (section 3.26).
16. **Lint rules admit their blind spots.**
    - ESLint `no-eval`: "This rule cannot catch renaming the global object." Its source shows `window["ev" + "al"]` isn't flagged either.
    - Biome `noGlobalEval` is "not able to detect cases where the global object is aliased."
    - Melicher et al.: off-the-shelf static tools "miss 90% of bugs." Pattern-based ScanJS caught 8% but was judged useful "for, e.g., enforcing coding standards" (sections 2.7, 4.1, 5.1).
17. **SAST doesn't solve this either.** On 957 real npm vulnerabilities (Brito et al., 2023):
    - An ESLint security bundle caught 41.5%, at about 0.1% precision.
    - CodeQL caught 31.3%.
    - 33.8% were caught by no tool (section 4.3.6).
18. **Timing is the strongest argument for lint in the agent loop.** At Facebook, the same analysis went from a "near zero" fix rate as a nightly batch to "over 70%" at diff time. At Google, developers rated 74% of compile-time issues as real problems, against 21% of issues found in checked-in code (sections 4.3.3, 4.3.4).
19. **Defaults differ across linters.**
    - ESLint's recommended config has none of `no-eval`, `no-implied-eval`, `no-new-func` or `no-script-url`.
    - Oxlint turns `no-eval` on by default.
    - Biome recommends `noGlobalEval` and `noDangerouslySetInnerHtml` as errors.
    - Biome's `noDocumentCookie` sits in `suspicious`, not `security`.
    - Sonar is phasing out "Security Hotspots," so the sonarjs rules now report as vulnerabilities (section 4.1).
20. **Gaming is plausible but not measured.**
    - No study counts agents adding `eslint-disable` or obfuscating `eval`.
    - Anecdotally, a Claude Code user reported the agent "Inserting this into hundreds of files," meaning an `eslint-disable` comment.
    - When asked, GPT-4 rewrote vulnerable code so that it got past Semgrep 84–90% of the time (CodeBreaker, USENIX Security 2024).
    - Humans did the same with Trusted Types: in a 2024 study, "all custom sanitizers were trivially bypassable" (sections 2.14, 5.2, 5.3).

---

## 1. History

### 1.1 MITRE CWE-94 and CWE-95: code injection and eval injection. VERIFIED

- **Citations:**
  - MITRE, "CWE-94: Improper Control of Generation of Code ('Code Injection')," CWE List v4.20. https://cwe.mitre.org/data/definitions/94.html
  - MITRE, "CWE-95: Improper Neutralization of Directives in Dynamically Evaluated Code ('Eval Injection')," CWE List v4.20. https://cwe.mitre.org/data/definitions/95.html
- **CWE-94 (the parent):**
  - Definition: the product builds a code segment "using externally-influenced input" and fails to neutralize elements that "could modify the syntax or behavior" of that code.
  - Children: CWE-95 (Eval Injection), CWE-96 (Static Code Injection) and CWE-1336 (template engine injection).
  - Likelihood of exploit: "Medium."
  - Its only JavaScript-flavoured example is a GitHub Actions workflow whose `actions/github-script` step interpolates untrusted input. The page says this "would result in injecting and running javascript code" on the runner.
- **CWE-95 (the child):**
  - Definition: the product does not neutralize "code syntax" before using input "in a dynamic evaluation call (e.g. 'eval')."
  - Languages list includes "JavaScript (Undetermined Prevalence)."
  - Its demonstrative examples are Perl and Python, not JavaScript.
  - A timely observed example for an AI-themed post: CVE-2024-4181, an LLM application framework that "allows eval injection via a crafted response from a hosting provider."
- **Caveat:** Neither CWE page has a JavaScript `eval` code example. Use them for the definitions and taxonomy, not for JS-specific evidence.

### 1.2 MDN on `eval()`, `Function()` and string `setTimeout()`. VERIFIED

- **Links:**
  - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/eval
  - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/Function
  - https://developer.mozilla.org/en-US/docs/Web/API/Window/setTimeout
- **`eval()`:**
  - Top-of-page warning: the argument is parsed and run as JavaScript, and "APIs like this are known as injection sinks."
  - The section heading is **"Never use direct eval()!"** (not "never use eval()").
  - Security reason: `eval()` "executes the code it's passed with the privileges of the caller." A direct eval also lets third-party code read or change local variables.
  - The other listed reasons are performance and minification: it is slower, forces expensive name lookups, and minifiers give up on scopes that `eval()` can reach.
  - `eval()` and `Function()` "implicitly evaluate arbitrary code, and are forbidden in strict CSP settings."
- **`Function()` constructor:**
  - Same injection-sink warning as `eval()`.
  - It "suffers from security and similar (but far less significant) performance issues as `eval()`."
  - A CSP with `script-src` or `default-src` blocks it by default.
- **`setTimeout()` with a string:**
  - Passing a string is "_strongly discouraged_ for the same reasons that make using `eval()` a security risk."
  - The page gives an example of `setTimeout(untrustedCode, 1000)` running user-supplied code, and says allowing it via `unsafe-eval` "disables one of the main protections of CSP."
  - This is the "implied eval" that ESLint's `no-implied-eval` targets.
- **Current MDN advice for unavoidable cases:** pass `TrustedScript` objects and enforce Trusted Types, and prefer the CSP keyword `trusted-types-eval` over `unsafe-eval`.

### 1.3 "eval is evil": Lippert (2003), JSLint and Crockford. VERIFIED, except the _Good Parts_ text, which is UNVERIFIED

**Eric Lippert, "Eval is evil, part one" and "part two" (Nov 2003). VERIFIED**

- **Citation:** Eric Lippert, _Fabulous Adventures in Coding_ (blog), 1 Nov 2003 and 4 Nov 2003.
- **Links:** https://ericlippert.com/2003/11/01/eval-is-evil-part-one/ and https://ericlippert.com/2003/11/04/eval-is-evil-part-two
- **Context:** The posts are about JScript, and Lippert writes as one of its implementers. My fetch didn't confirm the word "Microsoft" on the page.
- **Key lines:**
  - Eval is "probably the most powerful and most misused method in JScript."
  - "In the majority of cases, eval is used like a sledgehammer swatting a fly."
  - Part two, on server-side use: "Eval injection makes SQL injection look tame!"
- **Why it matters:** This is the earliest dated use of the phrase I could find. It predates _The Good Parts_ by about four and a half years.

**JSLint (Douglas Crockford). VERIFIED from source code**

- **2002:** An August 2010 build of `jslint.js` begins with "Copyright (c) 2002 Douglas Crockford (www.JSLint.com)". I read it in Apache Allura's vendored copy at https://apache.googlesource.com/allura/+/rel/1.3.1/AlluraTest/jslint/jslint.js. This supports "JSLint dates from 2002." It is a copyright year, not a dated release.
- **The 2010 build already shipped the three rules this post is about.** Unless the `evil` option was set, it emitted:
  - **"eval is evil."** for calls to `eval`, `Function` and `execScript`. That covers `no-eval` and `no-new-func` today.
  - **"eval is evil."** also for a string subscript such as `window['eval']`. So JSLint already caught the simplest bracket-access evasion.
  - **"Implied eval is evil. Pass a function instead of a string."** for `setTimeout` or `setInterval` called with a string literal. This is the direct ancestor of ESLint's `no-implied-eval`, name included.
- **Current JSLint:** https://github.com/jslint-org/jslint. `jslint.mjs` still warns (`unexpected_a`) on `eval` unless the `/*jslint eval*/` directive is set, and keeps `evil` as a backwards-compatible alias. The help page (https://www.jslint.com/help.html) says: "In the past, the eval function was the most misused feature of the language."

**Crockford, "Code Conventions for the JavaScript Programming Language." VERIFIED (current version)**

- **Link:** https://www.crockford.com/code.html. The current page is dated 2019-05-15; earlier versions existed but are undated.
- **Key lines:**
  - It has a section headed **"`eval` is Evil."**
  - "The `eval` function is the most misused feature of JavaScript. Avoid it."
  - "`eval` has aliases."
  - "Do not use the `Function` constructor."
  - "Do not pass strings to `setTimeout` or `setInterval`."

**Crockford, _JavaScript: The Good Parts_ (O'Reilly, May 2008). Metadata VERIFIED; eval passage UNVERIFIED**

- **Citation:** Douglas Crockford, _JavaScript: The Good Parts_, O'Reilly Media, published 15 May 2008, ISBN 978-0-596-51774-8 (Open Library record OL10781042M).
- **Structure:** The Open Library table of contents lists Appendix A "Awful Parts" (p. 101), Appendix B "Bad Parts" (p. 109) and Appendix C "JSLint" (p. 115).
- **What I could not verify:**
  - O'Reilly's page returned 403, and the Wayback Machine rate-limited me.
  - A search-engine preview of the O'Reilly page for Appendix B, section 3 (`apbs03.html`) shows an `eval` entry. It calls `eval` the most misused feature of JavaScript and says it is slower, harder to read and frustrates JSLint.
  - One search summary calls that section "eval Is Evil"; I could not confirm the exact heading.
- **How to cite safely:** Say "Crockford lists `eval` among JavaScript's 'Bad Parts' (Appendix B)." For a verbatim line, quote the Code Conventions page or JSLint.

### 1.4 Content Security Policy and `'unsafe-eval'`. VERIFIED

**Origin: Stamm, Sterne and Markham, "Reining in the web with content security policy" (WWW 2010). VERIFIED (full PDF)**

- **Citation:** Sid Stamm, Brandon Sterne and Gervase Markham (all Mozilla), _Proceedings of WWW 2010_, pp. 921–930.
- **Links:** https://doi.org/10.1145/1772690.1772784. PDF: https://archives.iw3c2.org/www2010/proceedings/www/p921.pdf
- **The eval restriction was there from the first design.** "Base Restriction 2: Strings May Not Become Code."
  - `eval()` "and related functions make trivial the task of generating code from strings."
  - CSP blocks `eval()` and the "equivalent functions setTimeout, setInterval and the Function constructor" when they are given strings.
  - The authors argue that "most code using eval() can be rewritten" without it.
- **Base Restriction 1 (no inline script)** also bans `javascript:` URIs. That is the browser-side counterpart of `no-script-url`.
- **Case study:** A scan of addons.mozilla.org before deploying CSP found:
  - 125 inline script blocks;
  - 18 `javascript:` URIs;
  - 182 HTML event-handler attributes;
  - 58 occurrences of `eval()`, mostly from packed libraries such as jQuery;
  - 3 string uses of `new Function()`, `setInterval()` and `setTimeout()`.
- **Shipping:** Mozilla's Firefox 4 release notes, for the release that "shipped on March 22, 2011," list CSP under Security as "a Mozilla proposal" (https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Releases/4).

**W3C standardization timeline. VERIFIED**

- **CSP 1.0** (https://www.w3.org/standards/history/CSP1/, editors Brandon Sterne and Adam Barth):
  - Working Draft, 29 Nov 2011.
  - Last Call, 10 Jul 2012.
  - **Candidate Recommendation, 15 Nov 2012.**
  - Retired as a Working Group Note, 19 Feb 2015. It never became a Recommendation.
- **CSP Level 2** (https://www.w3.org/TR/CSP2/): a **W3C Recommendation, 15 Dec 2016**. Editors Mike West, Adam Barth and Dan Veditz. Its stated purpose is to "mitigate a broad class of content injection vulnerabilities, such as cross-site scripting (XSS)."
- **CSP Level 3** (https://www.w3.org/TR/CSP3/): still a **W3C Working Draft**; the latest is dated 16 Sep 2026. Editors Mike West and Antonio Sartori (Google).
  - §6.1.10 says `script-src` governs, among other things, `eval()`, `Function()`, and `setTimeout()`/`setInterval()` given a non-callable argument. It also covers WebAssembly compilation and `javascript:` navigations.
  - The algorithm EnsureCSPDoesNotBlockStringCompilation throws an `EvalError` unless `'unsafe-eval'` is present, or `'trusted-types-eval'` applies with Trusted Types enforced.

**MDN, CSP header reference. VERIFIED**

- **Link:** https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy
- **The default:** With `default-src` or `script-src` set, "JavaScript functions which evaluate their arguments as JavaScript are disabled". That covers `eval()`, the `code` argument to `setTimeout()`, and `Function()`.
- **The keywords:**
  - `'unsafe-eval'` "can be used to undo this protection."
  - `'wasm-unsafe-eval'` is "a much safer alternative" because it "does not enable general evaluation of JavaScript."
  - `'trusted-types-eval'` allows evaluation only when Trusted Types are enforced.
  - Inline script, inline event handlers and `javascript:` URLs are blocked unless `'unsafe-inline'` is given.

**How often `'unsafe-eval'` is turned back on. VERIFIED (full entries in sections 2.10–2.13)**

- **Weichselbaum et al., "CSP Is Dead, Long Live CSP!" (Google, CCS 2016):** Table 3, "Most common features used in script-src," shows `unsafe-eval` in **81.65%** of policies and `unsafe-inline` in **87.26%**. The table does not state its denominator; it is presumably policies with a `script-src`. 94.72% of the 26,011 unique policies were bypassable.
- **Web Almanac 2025:** "`unsafe-eval` is present in 77% of policies."
- **Why it matters:** CSP's eval ban exists, but in practice most sites switch it back off. That leaves source-level rules such as `no-eval` as the line of defence that actually holds.

### 1.5 DOM-based XSS: Amit Klein (2005) and OWASP

**Amit Klein, "DOM Based Cross Site Scripting or XSS of the Third Kind" (WASC, July 2005). VERIFIED (full text)**

- **Citation:** Amit Klein, Web Application Security Consortium article, version 0.2.8, last modified 4 July 2005. The subtitle is "A look at an overlooked flavor of XSS."
- **Link:** http://www.webappsec.org/projects/articles/071105.shtml (HTTPS fails with an SSL error; plain HTTP works).
- **Core claim:**
  - Besides reflected and stored XSS there is a third kind, attacks that "do not rely on sending the malicious data to the server."
  - In his example, "The malicious payload was not embedded in the raw HTML page."
  - The example is `document.write(document.URL.substring(...))`.
- **Why server-side defences miss it:** Server-side HTML encoding and input filtering "Do not work well against DOM Based XSS." Fault-injection scanners miss it too.
- **He foresaw a role for static checks.** A tool that can "statically analyze a Javascript found in a page" may "point out suspicious patterns."
- **His defence list is essentially today's sink rules.** It includes:
  - raw HTML writes: `document.write`, `document.writeln`, `document.body.innerHtml=`;
  - location assignment;
  - "Directly executing script," namely `eval(…)`, `window.execScript(…)`, `window.setInterval(…)` and `window.setTimeout(…)`.

**OWASP, "DOM Based XSS" (community page). VERIFIED**

- **Link:** https://owasp.org/www-community/attacks/DOM_Based_XSS. It now 308-redirects to https://community.owasp.org/attacks/DOM_Based_XSS
- **Definition:** "the attack payload is executed as a result of modifying the DOM 'environment'" in the victim's browser.
- **Credits:** It credits Klein's WASC write-up, dated July 2005. It also describes later work on "defining sources of attacker controlled inputs and sinks."

**OWASP, "DOM based XSS Prevention Cheat Sheet." VERIFIED**

- **Link:** https://cheatsheetseries.owasp.org/cheatsheets/DOM_based_XSS_Prevention_Cheat_Sheet.html (credited to the "Cheat Sheets Series Team"; CC BY-SA 4.0).
- **On innerHTML and document.write:** It lists `element.innerHTML` and `document.write` among "Example Dangerous HTML Methods." GUIDELINE #4 says "Avoid populating the following methods with untrusted data."
- **On string-to-code APIs:**
  - RULE #3: `setTimeout`, `setInterval` and `Function` "interpret strings as code" and "have the same risk" as `eval`.
  - GUIDELINE #5: "Avoid the numerous methods which implicitly eval() data passed to it."
  - GUIDELINE #10: "Don't eval() JSON to convert it to native JavaScript objects."
- **The fix:** RULE #6 recommends the "safe assignment property `textContent`." RULE #7 says it is "always a bad idea to use a user-controlled input" in sources such as `eval`.

### 1.6 Why React named it `dangerouslySetInnerHTML`. VERIFIED

**Original rationale: React docs tip "Dangerously Set innerHTML" (file as of tag v0.13.3, committed 8 May 2015). VERIFIED (source file in the React repo)**

- **Link:** https://github.com/facebook/react/blob/v0.13.3/docs/tips/19-dangerously-set-inner-html.md
- **Key lines:**
  - "Our design philosophy is that it should be 'easy' to make things safe." Developers "should explicitly state their intent when performing 'unsafe' operations."
  - "The prop name `dangerouslySetInnerHTML` is intentionally chosen to be frightening."
  - The `{__html: ...}` wrapper "be considered a 'type/taint' of sorts." A plain string passed by mistake "will not be rendered."
  - Therefore it recommends against the inline form `dangerouslySetInnerHTML={{__html: getMarkup()}}`.
  - Failure to sanitize is "one of the leading causes of web vulnerabilities"; the tip links the OWASP Top 10 2013.

**Legacy reactjs.org "DOM Elements." VERIFIED**

- **Link:** https://legacy.reactjs.org/docs/dom-elements.html
- **Wording:**
  - "dangerouslySetInnerHTML is React's replacement for using innerHTML in the browser DOM."
  - "setting HTML from code is risky," because it is easy to expose users to XSS by accident.
  - You must type out the long name and pass an object with a `__html` key "to remind yourself that it's dangerous."

**Current react.dev "Common components." VERIFIED**

- **Link:** https://react.dev/reference/react-dom/components/common#dangerously-setting-the-inner-html
- **Key lines:**
  - "This should be used with extreme caution!"
  - "**This is dangerous.**" Unless the markup comes from a trusted source, "it is trivial to introduce an XSS vulnerability this way."
  - It shows a "🔴 SECURITY HOLE" example passing `post.content`, and closes with "Only use `dangerouslySetInnerHTML` with trusted and sanitized data."
  - The `{__html}` object should be created "as close to where the HTML is generated as possible." Inline creation "is not recommended."
- **Trusted Types:** The docs now accept a `TrustedHTML` value, which "React passes ... to the browser without converting it to a string."

**When it appeared. VERIFIED from source**

- The prop and its `__html` key are already in `src/core/ReactNativeComponent.js` at tag `v0.3.0`, the earliest tag in facebook/react (commit dated 29 May 2013). So the scary name dates from React's first public release; it was not a later rename.

### 1.7 Trusted Types, and Google's evidence on DOM XSS

**W3C Trusted Types specification. VERIFIED**

- **Link:** https://www.w3.org/TR/trusted-types/
- **Status:** W3C **Working Draft** (Recommendation track), dated 7 Oct 2026, from the Web Application Security WG. The editor is Krzysztof Kotowicz (Google); Mike West (Google) is a former editor.
- **Abstract:** "An API that allows applications to lock down powerful APIs" so that they accept typed values, not strings.
- **Introduction:** It targets DOM-based XSS and notes "over 60 different injection sinks."

**MDN Trusted Types API, and browser support. VERIFIED**

- **Link:** https://developer.mozilla.org/en-US/docs/Web/API/Trusted_Types_API
- **Baseline:** **Baseline 2026, "Newly available"** — "Since February 2026, this feature works across the latest devices and browser versions."
- **Versions:** MDN browser-compat-data (`api/TrustedHTML.json`) gives Chrome 83, Safari 26 and Firefox 148.
- **The three sink classes MDN describes:**
  - HTML sinks: `innerHTML`, `document.write()`.
  - JavaScript sinks: `eval()`, `HTMLScriptElement.text`. The TrustedScript sinks also include `Function()` and string `setTimeout`/`setInterval`.
  - Script-URL sinks: `HTMLScriptElement.src`, among others.
- **The point of the design:** "define your policy in one place and then be assured" that all data reaching a sink went through it.

**Kotowicz, "Prevent DOM-based cross-site scripting vulnerabilities with Trusted Types" (web.dev). VERIFIED**

- **Link:** https://web.dev/articles/trusted-types (last updated 2020-03-25)
- **What it says:** DOM XSS is "one of the most common web security vulnerabilities."
- **Caveat:** It has **no** numbers on Google's results, so don't cite it for those.

**Kotowicz, "Trusted Types – mid 2021 report" (Google, 2021). VERIFIED (full text)**

- **Link:** https://docs.google.com/document/d/1m91JZWKAGOR3jQoicMVE9Ydcq79gM2BetcRIBemrex8/ (created 2021-07-06, updated 2021-08-17). It was announced on the W3C public-webappsec list: https://lists.w3.org/Archives/Public/public-webappsec/2021Jul/0003.html
- **Headline claims (Google's own data):**
  - "we have observed zero DOM XSS in Google applications migrated to Trusted Types."
  - Over 130 services fully enforce TT. They include Google Photos, Contacts and My Activity.
  - DOM XSS "consistently accounts for >50% XSSes reported to Google VRP."
  - Trusted Types could "prevent at least 61% of DOM XSS-es missed by our static analysis pipeline." The summary adds that "> 60% of DOM XSSes were attributable to gaps in static analysis coverage."
  - TT reduce "the review surface from the entire web application and over 60 different injection sinks" to a single function.
  - About ¾ of incompatible code locations could be fixed by mechanical rewrites that avoid the sink entirely.
- **On eval in particular:** "research shows that dynamic code evaluation (eval) cannot be practically eradicated." In the cohort they tested, "70% web applications used eval in first-party code, and 78% through third-party code." So `unsafe-eval` "becomes the norm." The report does not name that research.
- **Lint relevance (VS Code and Edge):**
  - VS Code: 108 violations were found by static tooling (`tsec`), and "75% were trivially fixable."
  - Edge: the Microsoft Edge migration "used eslint-plugin-no-unsanitized to identify Trusted Types violations statically."
  - Jun Kokatsu (Microsoft) is quoted that converting code "was much better than writing a tool to detect potential XSS."

**Daniel Vogelheim (Google), comment on mozilla/standards-positions #20 (27 Oct 2023). VERIFIED (primary)**

- **Link:** https://github.com/mozilla/standards-positions/issues/20#issuecomment-1783279722
- **Claims:**
  - XSS was "30% of overall VRP rewards in 2018." In 2023 it accounted "for only 4.1%," "all for bugs reported against properties that have not migrated."
  - "In the past three years, we have not received a single XSS" for a Trusted Types-enabled Google property. That covers the VRP, attacks in the wild and Google's own research.
  - At that time Trusted Types was enforced on about 10% of page loads, per Chrome telemetry.
- **Consequence:** Mozilla then moved its standards position to positive. The Register reported it (Thomas Claburn, 21 Dec 2023, https://www.theregister.com/2023/12/21/mozilla_decides_trusted_types_is/).

**Interop 2024 proposal, web-platform-tests/interop #500 (Sep 2023). VERIFIED**

- **Link:** https://github.com/web-platform-tests/interop/issues/500 (opened by @kara; description by @koto)
- **Claims:**
  - "Alphabet applications migrated to Trusted Types have 0 reported XSS against them."
  - Before adoption, DOM-based XSS was over 50% of XSS reported to the VRP.
  - "In 2018 Google VRP rewarded $360K for all XSSes, in 2022 it was $95K."
- **Caveat for all the Google figures:** They are self-reported by the team that built Trusted Types. They appear in a Google Doc and GitHub threads, not in peer-reviewed work. Present them as Google's claims.

**Wang, Guðmundsson and Kotowicz, "Adopting Trusted Types in Production Web Frameworks to Prevent DOM-Based Cross-Site Scripting: A Case Study" (EuroS&P Workshops 2021). VERIFIED (full PDF)**

- **Citation:** Pei Wang, Bjarki Ágúst Guðmundsson and Krzysztof Kotowicz (Google), _2021 IEEE European Symposium on Security and Privacy Workshops (EuroS&PW)_, pp. 60–73.
- **Links:** https://doi.org/10.1109/EuroSPW54576.2021.00013. PDF: https://storage.googleapis.com/gweb-research2023-media/pubtools/6260.pdf
- **What it is:** A case study of migrating Angular to Trusted Types. The abstract says TT "direct developers to write XSS-free code in the first place."
- **Static checks miss things:** Static DOM-XSS tooling exists, but "when used alone, it fails to detect all instances." It cites Melicher et al., NDSS 2018.
  - Its `tsec` static checker found 31 of the violations in Angular.
- **Caveat:** It says "we do not yet have quantitative measurement regarding the effectiveness" of Trusted Types at large scale. Don't cite it for DOM XSS reduction numbers.

**Wang, Bangert and Kern, "If It's Not Secure, It Should Not Compile: Preventing DOM-Based XSS in Large-Scale Web Development with API Hardening" (ICSE 2021). VERIFIED (full PDF)**

- **Citation:** Pei Wang, Julian Bangert and Christoph Kern (Google), _ICSE 2021_, pp. 1360–1372.
- **Links:** https://doi.org/10.1109/ICSE43902.2021.00123. PDF: https://storage.googleapis.com/gweb-research2023-media/pubtools/5955.pdf
- **This is Google's peer-reviewed evidence that banning sinks at build time works.** It is the closest analogue to lint rules.
  - Google made "mandatory compile-time checks for all JavaScript code" in Q1 2018. They forbid XSS-prone sinks such as `innerHTML` and `eval` in favour of typed safe APIs.
  - Exemptions require security review.
- **Single-product case study (Table II):** DOM-based XSS reports went from **10** in the year before adoption, to **2** during, to **1** after.
- **Company-wide:** The share of DOM XSS among high-priority external reports "steadily declined" from early 2018. Meanwhile a growing share of the remaining DOM XSS came from legacy, exempted code.
- **Cost:**
  - Fewer than 1% of more than a million JS files were exempted by the end of 2020.
  - There were fewer than eight exemption reviews a week.
  - Security-reviewed JS commits stayed "constantly below 0.1%."
- **Caveats:** The data is observational, and Google says other security measures were deployed during the same period.
- **Background:** Christoph Kern, "Securing the Tangled Web," _Communications of the ACM_ 57(9), Sept 2014, pp. 38–47, https://doi.org/10.1145/2643134 (metadata VERIFIED).

**Mozilla removed eval from Firefox's privileged code (2020). VERIFIED**

- **Citation:** Christoph Kerschbaumer, Tom Ritter and Frederik Braun, "Hardening Firefox against Injection Attacks – The Technical Details," Mozilla Attack & Defense blog, 7 Jul 2020.
- **Link:** https://blog.mozilla.org/attack-and-defense/2020/07/07/hardening-firefox-against-injection-attacks-the-technical-details/
- **What it says:** Mozilla "removed all instances of eval() in system privileged code," and "all calls to eval() are blocked in system privileged contexts."

### 1.8 Where XSS and injection rank

**OWASP Top 10:2021, A03:2021-Injection. VERIFIED**

- **Link:** https://owasp.org/Top10/A03_2021-Injection/ (now served at https://top10.owasp.org/2021/A03_2021-Injection/)
- **Rank:** "Injection slides down to the third position."
  - "94% of the applications were tested for some form of injection."
  - The 2021 introduction adds: "Cross-site Scripting is now part of this category in this edition."
- **Factors:**
  - 33 CWEs mapped.
  - Max incidence 19.09%, average incidence 3.37%.
  - Average weighted exploit 7.25, average weighted impact 7.15.
  - Max coverage 94.04%, average coverage 47.90%.
  - **274,228 total occurrences** and 32,078 total CVEs.
- **Mapped CWEs include** CWE-79 (XSS), CWE-89 (SQLi), CWE-94 (Code Injection) and CWE-95 (Eval Injection).

**OWASP Top 10:2025, A05:2025-Injection. VERIFIED**

- **Links:** https://owasp.org/Top10/2025/ (now https://top10.owasp.org/2025) and https://top10.owasp.org/2025/A05_2025-Injection/
- **It exists, and Injection is #5.** The 2025 list:
  - A01 Broken Access Control
  - A02 Security Misconfiguration
  - A03 Software Supply Chain Failures
  - A04 Cryptographic Failures
  - **A05 Injection**
  - A06 Insecure Design
  - A07 Authentication Failures
  - A08 Software or Data Integrity Failures
  - A09 Security Logging and Alerting Failures
  - A10 Mishandling of Exceptional Conditions
- **What the A05 page says:**
  - "Injection falls two spots from #3 to #5," yet it is "one of the most tested categories with 100% of applications tested."
  - It includes "Cross-site Scripting (high frequency/low impact) with more than 30k CVEs." SQL injection is "(low frequency/high impact)" with more than 14k.
- **Factors:**
  - 37 CWEs mapped.
  - Max incidence 13.77%, average incidence 3.08%.
  - Max coverage 100.00%, average coverage 42.93%.
  - Average weighted exploit 7.15, average weighted impact 4.32.
  - **1,404,249 total occurrences** and 62,445 total CVEs.
- **CWE mapping:** CWE-79, CWE-94 and CWE-95 are still mapped to it.
- **Data set:** The 2025 introduction says contributors donated data on "over 2.8 millions applications," covering 589 CWEs.
- **Release date:** No owasp.org page I opened gives one. The project page says "The most current released version is the OWASP Top 10 2025." Secondary sources say it was released as a candidate on 6 Nov 2025 at Global AppSec in Washington, D.C.; that date is UNVERIFIED.

**MITRE/CISA 2025 CWE Top 25. VERIFIED**

- **Links:** https://cwe.mitre.org/top25/archive/2025/2025_cwe_top25.html. Announced 11 Dec 2025 ("2025 'CWE Top 25' Now Available!", https://cwe.mitre.org/news/archives/news2025.html). It is still the latest edition as of Oct 2026.
- **Data:** 39,080 CVE records published between 1 Jun 2024 and 1 Jun 2025. The score is normalized frequency × normalized average CVSS.

| Rank 2025 | CWE | Name (short) | Score | Rank 2024 |
| --- | --- | --- | --- | --- |
| **1** | CWE-79 | Cross-site Scripting | 60.38 | 1 (56.92) |
| **2** | CWE-89 | SQL Injection | 28.72 | 3 |
| 3 | CWE-352 | CSRF | 13.64 | 4 |
| 9 | CWE-78 | OS Command Injection | 7.85 | 7 |
| **10** | CWE-94 | Code Injection | 7.57 | 11 |
| 15 | CWE-502 | Deserialization of Untrusted Data | 5.23 | 16 |
| 18 | CWE-20 | Improper Input Validation | 4.09 | 12 |
| 23 | CWE-77 | Command Injection | 3.15 | 13 |
| — | CWE-798 | Use of Hard-coded Credentials | not in 2025 list | 22 (3.46) |

- **Takeaways for the post:**
  - XSS is #1 for the second year running, and its score is more than double that of #2.
  - Code injection (CWE-94), the `eval` class, is in the top 10.
  - Hard-coded credentials, which `sonarjs/no-hardcoded-passwords` and similar rules target, **dropped out** of the 2025 Top 25.

---

## 2. Eval and DOM XSS in the wild

### 2.1 Richards, Hammer, Burg and Vitek, "The Eval That Men Do" (ECOOP 2011). VERIFIED (full PDF)

- **Citation:** Gregor Richards, Christian Hammer, Brian Burg and Jan Vitek, "The Eval That Men Do: A Large-scale Study of the Use of Eval in JavaScript Applications," _ECOOP 2011 – Object-Oriented Programming_, LNCS 6813, Springer, 2011, pp. 52–78.
- **Links:** https://doi.org/10.1007/978-3-642-22655-7_4. Author PDF: https://janvitek.org/pubs/ecoop11.pdf
- **Method:**
  - They used TracingSafari, an instrumented WebKit, to record every `eval` call, its string argument, the string's provenance (taint) and the scope of the variables the eval'd code read and wrote.
  - There were three data sets:
    - INTERACTIVE: the top 100 sites, browsed manually.
    - PAGELOAD: about 10,000 of the most popular sites (Alexa), page load only.
    - RANDOM: the same sites with randomly generated user events.
  - They also instrumented the other dynamic-code paths: `Function`, string `setTimeout` and `setInterval`, script-tag content and `src`, and `document.write`.
- **Prevalence (Table 1 and Section 4):**
  - 550,358 `eval` calls, carrying 337 MB of strings.
  - "Over 82% of the top 100 pages use eval." So did 50% of the remaining 10,000 pages on page load, and 52% under RANDOM.
  - Of the top 10,000 sites, 89% used JavaScript at all.
- **What eval was used for (Section 5.3):**
  - Categories were JSON, JSONP, Library, Read (for example `eval("foo."+x)`), Assign, Typeof, Call, Try, Empty and Other.
  - JSON and JSONP made up only 22% (RANDOM) to 37% (INTERACTIVE) of eval'd strings. So `eval` was "not solely used for JSON object deserialization."
  - Typical misuses quoted in the paper:
    - `eval("foo."+x)` "can be replaced by `foo[x]`."
    - `eval("subPointArr_"+i)` instead of using an array.
    - `typeof` checks done through `eval`.
    - `document.getElementById(...)` called via `eval`.
- **Replaceability:**
  - The categories other than Library, Other and Call are "replaceable by less dynamic features such as JSON.parse." The other replacements the paper names are hashmap access and proper use of arrays.
  - On INTERACTIVE these categories make up 76% of all eval'd strings, so "a majority of eval uses are not necessary."
  - More than two thirds of the strings in those categories had constant or composite provenance: 66.3%, 81.9% and 75.1% across the three data sets.
- **Other dynamic-code mechanisms (Section 6):**
  - The `Function` constructor appeared on 49% of INTERACTIVE sites and 8.8–13% of the automated sets. On INTERACTIVE it was the most-invoked mechanism of all.
  - String `setTimeout` was on 39% of INTERACTIVE sites.
  - Measured by number of uses, `eval` itself "constitutes a clear minority." The authors call this "worrying, since other code generation mechanisms tend to be overlooked." That argues for `no-implied-eval` and `no-new-func` alongside `no-eval`.
- **Key quotes (Conclusion):**
  - "we confirm that eval usage is pervasive"
  - "Clearly, eval is not necessarily evil."
  - "It seems that eval is indeed an often misused feature."
  - On whether eval can simply be removed from the language: "Unfortunately our data does not support this conclusion." Code generation still needs it.
- **Nice detail:** The paper opens with a Crockford epigraph: "eval is evil. Avoid it. eval has aliases. Don't use them."
- **Caveats:**
  - The data comes from 2010–2011 browsing, before `JSON.parse` was universal and before ES modules.
  - The PAGELOAD and RANDOM runs exercise only part of each site.

### 2.2 Jensen, Jonsson and Møller, "Remedying the Eval That Men Do" (ISSTA 2012). VERIFIED (full PDF; Crossref)

- **Citation:** Simon Holm Jensen, Peter A. Jonsson and Anders Møller, "Remedying the Eval That Men Do," _Proceedings of the 2012 International Symposium on Software Testing and Analysis (ISSTA '12)_, Minneapolis, ACM, pp. 34–44. ACM SIGSOFT Distinguished Paper, per the author page.
- **Links:** https://doi.org/10.1145/2338965.2336758. Author page and PDF: https://www.cs.au.dk/~amoeller/papers/unevalizer/
- **What it does:**
  - Unevalizer folds an eval-elimination refactoring into the TAJS dataflow analysis. Whenever the analysis can pin down the string reaching `eval`, it splices in equivalent code.
  - The aim is to make code _soundly_ analysable, not to tidy it.
- **Re-analysis of the Alexa top 10,000:**
  - Using Richards et al.'s tools, 6,465 sites used `eval`.
  - Excluding library loading and JSON left 3,378. Excluding sites where every call had a constant argument left 2,589.
  - The authors' reading: "relatively few web sites (around 25%) use eval in ways that are truly challenging" for static analysis.
- **Evaluation:**
  - 28 programs: 25 slices from 19 Alexa top-500 sites with "hard" evals, plus 3 Chrome Experiments. Together they contain 44 `eval` call sites.
  - Unevalizer handled 19 of 28 programs, which is 33 of 44 call sites (75%). Six of the 11 failures came from imprecision on loops.
- **Quote:** "The eval function is in practice not as evil as some men claim."
- **Note:** They write that Richards et al. "conclude that 83% of eval uses" could be rewritten. The ECOOP paper's own figure is 76% of eval'd strings, on INTERACTIVE. Cite 76% from the primary source; see "Things that turned out wrong."

### 2.3 Meawad, Richards, Morandat and Vitek, "Eval Begone!" (OOPSLA 2012). VERIFIED (full PDF; Crossref)

- **Citation:** Fadi Meawad, Gregor Richards, Floréal Morandat and Jan Vitek, "Eval Begone! Semi-Automated Removal of Eval from JavaScript Programs," _OOPSLA '12_ (SPLASH 2012, Tucson), ACM, pp. 607–620.
- **Links:** https://doi.org/10.1145/2384616.2384660. Author PDF: https://janvitek.org/pubs/oopsla12b.pdf
- **What it does:** Evalorizer runs as a proxy. It logs the actual strings passed to each `eval` call site, infers a pattern for each site and suggests a non-eval replacement. For example, `eval("window." + x)` becomes `window[x]`.
- **Findings:**
  - It was validated on logs from the top 100 websites "with a success rate over 97% under an open world assumption."
  - The introduction says "over 95% of the evals invocations in real websites can be replaced."
  - Call sites are nearly single-purpose: only 399 `eval` call sites (1.4%) received strings from more than one pattern category.
  - Over 40% of strings passed to `eval` are at least partly "generated by components outside of JavaScript code." Such strings come from the user, the browser or the server, which is the injection risk.
- **Quote:** The conclusion calls eval "dangerous and mostly useless," yet "many people still use it."

### 2.4 Yue and Wang, insecure JavaScript practices (WWW 2009; ACM TWEB 2013). VERIFIED (both full PDFs; Crossref)

- **Citations:**
  - Chuan Yue and Haining Wang, "Characterizing Insecure JavaScript Practices on the Web," _WWW 2009_, pp. 961–970, https://doi.org/10.1145/1526709.1526838
  - Extended as "A Measurement Study of Insecure JavaScript Practices on the Web," _ACM Transactions on the Web_ 7(2), article 7, May 2013, https://doi.org/10.1145/2460383.2460386
- **PDFs:** https://www.eecis.udel.edu/~hnw/paper/www09.pdf and https://www.eecis.udel.edu/~hnw/paper/tweb.pdf
- **Findings (6,805 unique websites, execution-based measurement):**
  - "over 44.4% of the measured websites use the dangerous eval() function"
  - At least 66.4% included JavaScript from external domains into top-level documents.
  - "using the document.write() method and the innerHTML property is much more popular" than creating script elements with DOM methods.
  - They sampled 700 eval-generated code instances. In at least 70% of them, `eval` was "misused or abused while safe alternatives can be easily identified." Examples were JSON parsing of `responseText` and `eval("nav_"+id)` → `window["nav_"+id]`.
- **Why it's useful:** It is the earliest measurement and predates Richards et al. It already recommends that "eval() should be avoided if at all possible."

### 2.5 Lekies, Stock and Johns, "25 Million Flows Later" (CCS 2013). VERIFIED (full PDF)

- **Citation:** Sebastian Lekies, Ben Stock and Martin Johns, "25 Million Flows Later – Large-scale Detection of DOM-based XSS," _CCS '13_, Berlin, ACM, pp. 1193–1204.
- **Links:** https://doi.org/10.1145/2508859.2516703. PDF: https://notify.cispa.uni-saarland.de/papers/lekies2013flows.pdf
- **Method:** They built a taint-tracking Chromium (byte-level taint in V8 and WebKit) and a context-sensitive exploit generator. They shallow-crawled the Alexa top 5,000, covering 504,275 pages and 4,358,031 frames.
- **Numbers:**
  - 24,474,306 flows from attacker-influenceable sources to sinks, about 48.5 per page.
  - 181,238 test payloads were generated and 69,987 executed.
  - After de-duplication there were 8,163 unique exploits on 701 domains. Restricted to the top 5,000, that is **6,167 unique vulnerabilities on 480 domains, 9.6%**.
  - Chromium-only exploits: 6,093 on 432 domains.
  - The flow table includes 3,219,392 flows into HTML sinks (such as `innerHTML` and `document.write`) and 1,728,872 into JavaScript sinks (`eval`, `setTimeout` and similar).
- **Quotes:**
  - DOM XSS "is frequently still perceived as a minor, fringe issue."
  - The paper finds 9.6% of sites "carry at least one DOM-based XSS problem." The abstract writes this as "9,6%."
- **Context:** The paper dates DOM XSS to Klein's 2005 write-up, which is verified in section 1.5.

### 2.6 Stock, Pfistner, Kaiser, Lekies and Johns, "From Facepalm to Brain Bender" (CCS 2015). VERIFIED (full PDF)

- **Citation:** Ben Stock, Stephan Pfistner, Bernd Kaiser, Sebastian Lekies and Martin Johns, "From Facepalm to Brain Bender: Exploring Client-Side Cross-Site Scripting," _CCS '15_, Denver, ACM.
- **Links:** https://doi.org/10.1145/2810103.2813625. PDF: https://notify.cispa.uni-saarland.de/papers/stock2015facepalm.pdf
- **Method:** They persisted and replayed 1,273 real exploitable client-side XSS flaws from the Alexa top 10k, then scored each one on five complexity metrics: operations on tainted data, functions, contexts, code distance and source/sink relation.
- **Findings:**
  - **Sinks:** 732 flows ended in `document.write`, 495 in `innerHTML` and 46 in `eval` and its derivatives. In 11 more cases `eval` generated the vulnerable code.
  - **Code origin:** 835 flaws were purely in self-hosted code, 273 purely in third-party code and 165 mixed.
  - **Complexity:** 813 (63.9%) were low, 261 (20.5%) medium and 199 (15.6%) high.
  - The authors conclude client-side XSS "is often caused by developers who are unaware of the risks." Third-party code and first-party/third-party mismatches account for many of the harder cases.
- **Why it's useful:** Most real DOM XSS bugs are simple concatenations into `document.write` or `innerHTML`. That is exactly the shape a syntactic sink rule can flag.

### 2.7 Melicher, Das, Sharif, Bauer and Jia, "Riding out DOMsday" (NDSS 2018). VERIFIED (full PDF)

- **Citation:** William Melicher, Anupam Das, Mahmood Sharif, Lujo Bauer and Limin Jia, "Riding out DOMsday: Toward Detecting and Preventing DOM Cross-Site Scripting," _NDSS 2018_.
- **Links:** https://doi.org/10.14722/ndss.2018.23309. PDF: https://www.ndss-symposium.org/wp-content/uploads/2018/02/ndss2018_07A-4_Melicher_paper.pdf
- **Method:** A taint-tracking Chromium crawled the homepages and 5 random subpages of the Alexa top 10,000 in summer 2017. That gave 44,722 pages, 319,481 frames and 4,140,873 flows. They added a second injection method, putting payloads into query key-value pairs.
- **Prevalence:**
  - 3,219 unique confirmed vulnerabilities with both methods, and 1,754 with the Lekies-style method alone. The new method finds "83% more vulnerabilities."
  - 364 vulnerable domains, or 3.8% of domains, against Lekies's 9.6%. The authors attribute the gap to their shallower per-domain crawl.
  - They saw 92.6 flows per page against 48.5 in 2013. Vulnerabilities were 3.9% of pages visited against 1.2%.
  - The authors say the evidence "suggests that DOM XSS is getting worse."
- **Where the bugs were:**
  - 2,681 of 3,219 (83%) were in scripts hosted on advertising and analytics domains.
  - The vulnerable scripts were mostly distinct, so the bugs were "often in unique, custom code, not in shared libraries."
  - In the qualitative sample many bugs were "a simple concatenation." Three of 40 involved bespoke HTML templating with no encoding, which the authors class as "a defense against XSS" that "introduces XSS vulnerabilities." Two involved `eval`-generated code, which is "outside of the abilities of static analysis."
- **Static analysis (directly relevant to section 4):**
  - They tested 50 randomly sampled known vulnerabilities against three tools. Esflow detected 0%, ScanJS 8% and Burp Suite's static analysis 10%.
  - Measured false positive rates, from 20 sampled findings each, were Esflow 95%, ScanJS 100% and Burp 0%.
  - The abstract puts it as: tools "miss 90% of bugs found by our dynamic analysis."
- **On ScanJS (Mozilla's rule-based scanner):** It "appears to identify poor coding practices" that lead to DOM XSS, "rather than detecting such vulnerabilities." Even so, "we believe it to be useful for, e.g., enforcing coding standards."
- **Caveats:**
  - The dynamic crawl exercised little interactivity and nothing behind logins.
  - The static-tool test covers only bugs the dynamic analysis found.

### 2.8 Steffens, Rossow, Johns and Stock, "Don't Trust The Locals" (NDSS 2019). VERIFIED (full PDF)

- **Citation:** Marius Steffens, Christian Rossow, Martin Johns and Ben Stock, "Don't Trust The Locals: Investigating the Prevalence of Persistent Client-Side Cross-Site Scripting in the Wild," _NDSS 2019_.
- **Links:** https://doi.org/10.14722/ndss.2019.23009. PDF: https://notify.cispa.uni-saarland.de/papers/steffens2019locals.pdf
- **Method:** They taint-tracked flows from `localStorage`, `sessionStorage` and cookies into HTML sinks, JavaScript sinks (`eval`) and `script.src`, across the Alexa top 5,000.
- **Findings:**
  - "more than 8%" of sites have unfiltered flows from storage to a dangerous sink.
  - Among sites that use stored data in such sinks, 21% (418 of 1,946) were vulnerable. At least 70% of those were exploitable under their attacker models.
- **Eval-specific detail:** One unsafe pattern was `eval`'ing stored JSON, "an archaic way of parsing JSON." In "a total of 81 vulnerable domains" the fix was simply using `JSON.parse`.
- **Context:** It credits Klein with first describing DOM-based XSS as "XSS of the Third Kind." That matches Klein's primary text (section 1.5).

### 2.9 Staicu, Pradel and Livshits, "Synode" (NDSS 2018). VERIFIED (full PDF)

- **Citation:** Cristian-Alexandru Staicu, Michael Pradel and Benjamin Livshits, "Synode: Understanding and Automatically Preventing Injection Attacks on Node.js," _NDSS 2018_.
- **Links:** https://doi.org/10.14722/ndss.2018.23071. PDF: https://www.ndss-symposium.org/wp-content/uploads/2018/02/ndss2018_07A-2_Staicu_paper.pdf
- **Prevalence (235,850 npm modules):**
  - 9,111 modules (4%) use `eval` and 7,686 (3%) use `exec`. 15,604 use at least one injection API.
  - About 20% of all modules depend on one directly or indirectly.
- **Usage (manual sample of 100 `eval` and 50 `exec` uses):**
  - The `eval` patterns "mostly match" Richards et al.'s browser study.
  - They found a new "higher-order functions" pattern, in which functions are built from strings.
  - "over 20% of all uses of injection APIs cannot be easily removed."
  - The introduction says that "most (80%) could be easily refactored by hand."
- **Mitigation:**
  - 58% of inspected call sites were reachable by attacker-controlled data.
  - Of those, "A staggering 90% of the call sites do not use any mitigation." Another 9% used regex checks, mostly broken. None used a sanitization library.
- **Fix rate:** Only about half of the authors' vulnerability reports were attended to, and "only a small fraction was fixed."
- **Why it's useful:** It is the server-side counterpart to the browser studies, and it shows `eval` misuse carried over into Node.

### 2.10 Weichselbaum, Spagnuolo, Lekies and Janc, "CSP Is Dead, Long Live CSP!" (CCS 2016). VERIFIED (full PDF)

- **Citation:** Lukas Weichselbaum, Michele Spagnuolo, Sebastian Lekies and Artur Janc (Google), "CSP Is Dead, Long Live CSP! On the Insecurity of Whitelists and the Future of Content Security Policy," _CCS '16_, Vienna, ACM.
- **Links:** https://doi.org/10.1145/2976749.2978363. PDF: https://static.googleusercontent.com/media/research.google.com/en//pubs/archive/45542.pdf. Landing page: https://research.google/pubs/pub45542/
- **Data:** Google's search index, about 100 billion pages. It covers CSP on 1,680,867 hosts with 26,011 unique policies.
- **Findings:**
  - Bypasses exist in 94.72% of distinct policies.
  - "99.34% of hosts with CSP use policies that offer no benefit against XSS."
  - 87.63% of XSS-protection policies used `'unsafe-inline'` without a nonce.
  - Among `script-src` values (Table 3): `'self'` 90.95%, **`'unsafe-inline'` 87.26%, `'unsafe-eval'` 81.65%**, nonces 0.92%.
  - 14 of the 15 most-whitelisted script domains had bypassable endpoints.
  - The paper proposes `'strict-dynamic'` and nonce-based policies.
- **Definition used:** `'unsafe-eval'` allows JavaScript APIs that "execute string data as code, such as eval()."

### 2.11 Roth, Barron, Calzavara, Nikiforakis and Stock, "Complex Security Policy?" (NDSS 2020). VERIFIED (full PDF)

- **Citation:** Sebastian Roth, Timothy Barron, Stefano Calzavara, Nick Nikiforakis and Ben Stock, "Complex Security Policy? A Longitudinal Analysis of Deployed Content Security Policies," _NDSS 2020_.
- **Note on authors:** The prompt's lead listed "Roth, Barron, Calzavara, Johns, Stock". The fourth author is **Nick Nikiforakis**, not Johns.
- **Links:** https://doi.org/10.14722/ndss.2020.23046. PDF: https://notify.cispa.uni-saarland.de/papers/roth2020csp.pdf
- **Method:** Internet Archive snapshots of 10,000 highly ranked domains, 2012–2018.
- **Findings:**
  - Of 1,032 sites enforcing a CSP by the end of the period, only 421 (about 41%) restricted scripts at all.
  - "insecure practices are present in 90% of policies," while nonces and hashes "reach less than a 5% adoption rate."
  - `'unsafe-inline'` was in "almost 90%" of policies at the end of 2018. The paper calls `'unsafe-eval'` "the lesser evil."
  - 56% (251 of 449) of sites that tried CSP in report-only mode never enforced it.

### 2.12 HTTP Archive Web Almanac, Security chapter (2024 and 2025 editions). VERIFIED (official pages)

- **2024:** Gertjan Franken and Vik Vanderlinden, "Security," _Web Almanac 2024_, HTTP Archive. https://almanac.httparchive.org/en/2024/security
  - CSP adoption rose from 15% of hosts in 2022 to 19% in 2024.
  - Among websites with a CSP (Fig. 11.19), `unsafe-inline` was used by 91% on desktop and 92% on mobile, and `unsafe-eval` by 78% on both. Nonces were at 20% and `strict-dynamic` at 10% desktop and 9% mobile.
  - The 2024 chapter does not report Trusted Types adoption.
- **2025 (published 15 Jan 2026):** Vik Vanderlinden and Gertjan Franken, "Security," _Web Almanac 2025_, chapter 9. https://almanac.httparchive.org/en/2025/security
  - CSP adoption is 21.9%, up from 18.5%.
  - "92% of websites use the `unsafe-inline` attribute," and "`unsafe-eval` is present in 77% of policies." Nonces are at about 20% and `strict-dynamic` at about 10%.
  - **Caution on Trusted Types:** The chapter reports one `require-trusted-types-for 'script'` header string, with a Google `/checkin/_/AndroidCheckinHttp/cspreport` report endpoint, on "more than 12% of the mobile pages" (2.67% desktop). The authors say they "don't have a direct explanation" and the denominator is not stated. Don't cite this as general adoption.

### 2.13 Report URI, "10 Years of Web Security" (2026 edition). VERIFIED (vendor PDF; practitioner data, not peer-reviewed)

- **Citation:** Scott Helme, Report-URI Ltd, _10 Years of Web Security, 2026 Edition_. Snapshot taken 13 June 2026.
- **Link:** https://cdn.report-uri.com/pdf/Report%20URI%20-%2010%20Years%20of%20Web%20Security%20%282026%29.pdf. The landing page https://report-uri.com/research/ten-years-of-web-security returned 403 to my fetcher.
- **Method:** A daily crawl of the Tranco top 1M. On the snapshot day 819,002 sites responded.
- **Findings:**
  - 170,057 sites have a CSP.
  - Of all CSP policies, 46.8% contain `unsafe-inline` and 41.9% contain `unsafe-eval`.
  - `require-trusted-types-for` is present on just 318 policies, or 0.2%.
- **Caveat:** These shares use all CSP headers as the denominator, including CSPs used only for framing or TLS. That is why they are much lower than the Web Almanac's script-keyword shares. Don't compare the two directly.

### 2.14 Roth, Gröber, Baus, Krombholz and Stock, "Trust Me If You Can – How Usable Is Trusted Types In Practice?" (USENIX Security 2024). VERIFIED (full PDF)

- **Citation:** _33rd USENIX Security Symposium_, Philadelphia, August 2024, pp. 6003–6020.
- **Links:** https://www.usenix.org/conference/usenixsecurity24/presentation/roth. PDF: https://www.usenix.org/system/files/usenixsecurity24-roth.pdf
- **Method:** Semi-structured interviews plus a coding task with 13 web developers, who deployed Trusted Types on an app that included realistic third parties (ads that use `eval`, Twitter and Facebook widgets).
- **Findings:**
  - "the adoption rate of the mechanism is negligible."
  - "all custom sanitizers were trivially bypassable," so "only seven out of 13 participants" produced a secure HTML sanitizer.
  - To get unblocked, the researchers had to supply a boilerplate default policy that "simply returns its input." The authors note this "does not add security."
  - The mean SUS score was 58.75, which the authors call only "marginally acceptable."
- **Cross-check:** It cites Kotowicz's 2021 Google document, which reports Trusted Types on 130 Google services with no client-side XSS in protected apps. That primary document is verified in section 1.7.
- **Why it's useful:** Even with a browser-enforced sink type, developers wrote pass-through sanitizers. That is a human precedent for "satisfying the check without the safety."

### 2.15 Klein, Barber, Bensalim, Stock and Johns, "Hand Sanitizers in the Wild" (EuroS&P 2022). VERIFIED (metadata + abstract)

- **Citation:** David Klein, Thomas Barber, Souphiane Bensalim, Ben Stock and Martin Johns, "Hand Sanitizers in the Wild: A Large-scale Study of Custom JavaScript Sanitizer Functions," _2022 IEEE 7th European Symposium on Security and Privacy (EuroS&P)_, pp. 236–250.
- **Links:** https://doi.org/10.1109/EuroSP53844.2022.00023. Record: https://cispa.de/en/research/publications/52658-hand-sanitizers-in-the-wild-a-large-scale-study-of-custom-javascript-sanitizer-functions
- **Findings (from the abstract):**
  - On the 20,000 most popular sites they found 705 unique custom sanitizers on 1,415 domains.
  - About 12.5% were insecure, and they auto-generated bypass exploits for 51.3% of the vulnerable ones.
  - Most sanitizers are not generic enough for other contexts. The authors argue for a standard browser sanitization API.

### 2.16 Musch, Steffens, Roth, Stock and Johns, "ScriptProtect" (AsiaCCS 2019). VERIFIED (full PDF)

- **Citation:** Marius Musch, Marius Steffens, Sebastian Roth, Ben Stock and Martin Johns, "ScriptProtect: Mitigating Unsafe Third-Party JavaScript Practices," _AsiaCCS '19_, Auckland.
- **Links:** https://doi.org/10.1145/3321705.3329841. PDF: https://notify.cispa.uni-saarland.de/papers/musch2019scriptprotect.pdf
- **Findings:**
  - More than 25% of sites with client-side XSS are vulnerable "only" because of "a flaw in the included third-party code."
  - ScriptProtect strips third-party code's access to string-to-code sinks, with about 6% overhead. 30% of the Alexa top 5,000 could adopt it without code changes.
- **Note:** The prompt's lead said this paper measured `innerHTML` and `document.write` usage. It does not give a usage census of those APIs. For that, use Yue and Wang (2.4).

---

## 3. AI-generated code security

Part A (3.1–3.13) covers the core studies and benchmarks. Part B (3.14–3.29) covers 2025–2026 studies of coding agents, real agent PRs and vendor reports.

**Part A: core studies and benchmarks (3.1–3.13)**

### 3.1 Pearce, Ahmad, Tan, Dolan-Gavitt, Karri, "Asleep at the Keyboard?" (IEEE S&P 2022; CACM 2025). VERIFIED (full arXiv PDF; Crossref for both venues)

- **Citation:** Hammond Pearce, Baleegh Ahmad, Benjamin Tan, Brendan Dolan-Gavitt and Ramesh Karri, "Asleep at the Keyboard? Assessing the Security of GitHub Copilot's Code Contributions," _2022 IEEE Symposium on Security and Privacy (SP)_, May 2022, pp. 754–768.
- **Reprint:** _Communications of the ACM_ 68(2), pp. 96–105, published 22 Jan 2025.
- **Links:**
  - https://doi.org/10.1109/SP46214.2022.9833571
  - CACM: https://doi.org/10.1145/3610721
  - arXiv: https://arxiv.org/abs/2108.09293 (v3, 16 Dec 2021)
- **Method:**
  - Copilot (technical preview) completed hand-built scenarios, requesting 25 suggestions each.
  - Outputs were judged with CodeQL 2.5.7 plus manual review.
  - There were three axes: diversity of weakness (DOW), diversity of prompt (DOP, SQL injection only) and diversity of domain (DOD, Verilog hardware CWEs).
  - Languages were C, Python and Verilog. **There was no JavaScript.**
- **Headline:** 89 scenarios produced 1,689 programs. "Of these, we found approximately 40 % to be vulnerable."
  - The discussion gives the exact figures across all axes and languages: "39.33 % of the top and 40.73 % of the total options were vulnerable."
- **The 18 CWEs (DOW axis):** 54 scenarios across 18 CWEs from the 2021 CWE Top 25. Seven Top-25 entries were excluded.
  - The 18 are CWE-787, 79, 125, 20, 78, 89, 416, 22, 434, 306, 190, 502, 476, 798, 119, 200, 522 and 732.
  - CWE-94 (code injection) was **not** included.
  - This axis produced 1,084 valid programs, and 477 (44.00%) contained a CWE. 24 of 54 scenarios (44.44%) had a vulnerable top suggestion.
  - By language: C was 258/513 (50.29%) vulnerable and Python 219/571 (38.35%).
- **Per-CWE numbers relevant to the post (summed from Tables I and II):**
  - **CWE-79 (XSS), 3 scenarios (2 Python/Flask, 1 C):** 12 of 63 valid options vulnerable (19%), and **no vulnerable top suggestion**. The paper contrasts this with CWE-22 (path traversal), where every top suggestion was vulnerable and 60% of options overall.
  - **CWE-89 (SQL injection), 3 Python scenarios:** 33 of 57 vulnerable (58%).
  - **CWE-798 (hard-coded credentials), 3 Python scenarios:** 23 of 65 vulnerable (35%). Copilot "fared badly" on two of the three. It did better when the prompt already loaded credentials from environment variables.
  - **CWE-78 (OS command injection):** "the first CWE where the majority of options are vulnerable." In 78-0, all options were vulnerable.
- **Caveats:**
  - These are completion scenarios, not agentic coding.
  - It is a 2021 Copilot (Codex-era) model.
  - Options were marked vulnerable only if "definitively" vulnerable, so the numbers are conservative.
  - The ~40% is a pooled figure across C, Python and Verilog. Don't call it a JavaScript or XSS rate.

### 3.2 Majdinasab et al., targeted replication of Pearce et al. (SANER 2024). VERIFIED (full arXiv PDF; Crossref)

- **Citation:** Vahid Majdinasab, Michael Joshua Bishop, Shawn Rasheed, Arghavan Moradidakhel, Amjed Tahir and Foutse Khomh, "Assessing the Security of GitHub Copilot's Generated Code — A Targeted Replication Study," _2024 IEEE International Conference on Software Analysis, Evolution and Reengineering (SANER)_, pp. 435–444.
- **Links:** https://doi.org/10.1109/SANER60148.2024.00051, arXiv https://arxiv.org/abs/2311.11177
- **Method:** Re-ran Pearce et al.'s **Python** scenarios with a newer Copilot and a newer CodeQL.
- **Finding:** "the percentage of vulnerable code suggestions has reduced from 36.54% to 27.25%." The 36.54% is Pearce's Python-only figure.
- **Use:** It is good for "it got better, but not fixed."

### 3.3 Perry, Srivastava, Kumar, Boneh, "Do Users Write More Insecure Code with AI Assistants?" (CCS 2023). VERIFIED (full arXiv v3 PDF)

- **Citation:** Neil Perry, Megha Srivastava, Deepak Kumar and Dan Boneh, _Proceedings of the 2023 ACM SIGSAC Conference on Computer and Communications Security (CCS '23)_, Copenhagen, 26–30 Nov 2023, 16 pp.
- **Links:** https://doi.org/10.1145/3576915.3623157, arXiv https://arxiv.org/abs/2211.03622
- **Method:**
  - A controlled user study. **47 participants** were analysed: 33 with an AI assistant (OpenAI codex-davinci-002 in a custom UI) and 14 controls.
  - The sample was 66% undergraduates, 19% graduate students and 15% professionals.
  - There were six tasks in Python, JavaScript and C, and five were analysed:
    - Q1 symmetric encryption (Python)
    - Q2 ECDSA signing (Python)
    - Q3 sandboxed file path (Python)
    - Q4 SQL insert **in JavaScript**
    - Q5 integer to string in C
- **Headline:** "participants who had access to an AI assistant wrote significantly less secure code". They "were also more likely to believe they wrote secure code."
- **Per-task security results (experiment vs control):**
  - **Q1:** secure and correct 21% vs 43%. The AI group was significantly more likely to write an insecure solution (p = 0.017) and to use trivial ciphers (p = 0.018).
  - **Q2:** secure 3% vs 21% (p = 0.039).
  - **Q3:** secure 12% vs 29%. The AI group was more likely to mishandle symlinks (p = 0.019). AI outputs "typically did not canonicalize the path."
  - **Q4 (JavaScript SQL):** secure 36% vs 50%. 36% of the AI group wrote SQL-injectable code against 7% of controls (p = 0.041). The assistant "often writes correct SQL queries but uses string concatenation."
  - **Q5 (C):** mixed results.
- **The XSS task, which is directly relevant:**
  - Q6 asked for a JavaScript function that takes user input and "displays it in the window of the browser."
  - It was dropped from analysis as "too vague" because many participants just called `alert` or `console.log`.
  - The authors still note that none of the AI-assisted participants who appended to the DOM "sanitized the input values."
  - This is an observation, not a measured rate.
- **Overconfidence:**
  - For every question, the AI group on average rated its answers more secure than the control group did, "despite often providing more insecure answers."
  - Among AI users, those with insecure answers trusted the AI more than those with secure answers: 4.0 vs 1.5 on Q3 and 3.53 vs 1.0 on Q2 (Likert).
  - 87% of secure responses required significant edits to the AI output.
  - Q4 (JavaScript) had the highest rate of copying AI output. The authors link this to participants' unfamiliarity with JavaScript.
- **Caveats:**
  - The sample is small and mostly students.
  - The pooled logistic-regression effect of AI access across all questions was **not** significant: coefficient −0.63, p = 0.056 (Table 3). Per-question chi-squared tests were significant for Q1–Q4.
  - It used a 2022 model.

### 3.4 Sandoval, Pearce, Nys, Karri, Garg, Dolan-Gavitt, "Lost at C" (USENIX Security 2023). VERIFIED (full arXiv PDF; USENIX page)

- **Citation:** Gustavo Sandoval, Hammond Pearce, Teo Nys, Ramesh Karri, Siddharth Garg and Brendan Dolan-Gavitt, "Lost at C: A User Study on the Security Implications of Large Language Model Code Assistants," _32nd USENIX Security Symposium_, 2023, pp. 2205–2222.
- **Links:** https://www.usenix.org/conference/usenixsecurity23/presentation/sandoval, arXiv https://arxiv.org/abs/2208.09727
- **Method:**
  - N = 58 CS students (29 control, 29 assisted) implemented a singly linked "shopping list" in C (12 functions).
  - The assistant was OpenAI code-cushman-001, wired into a Copilot-like IDE.
  - There was also an "autopilot" arm in which Codex wrote everything.
  - Severe CWEs per line of code were compared with non-inferiority tests (δ = 10%).
- **Finding:** AI-assisted users produced critical security bugs "at a rate no greater than 10% more than the control." The authors conclude LLMs do "not introduce new security risks" in this setting.
- **Use:** This is the counterpoint study. The effect is small for low-level C with a 2021 model and human review in the loop. It says nothing about JavaScript or web sinks.

### 3.5 Fu, Liang, Tahir, Li, Shahin, Yu, Chen, "Security Weaknesses of Copilot-Generated Code in GitHub Projects" (TOSEM 2025). VERIFIED (full arXiv v4 PDF; Crossref)

- **Citation:** Yujia Fu, Peng Liang, Amjed Tahir, Zengyang Li, Mojtaba Shahin, Jiaxin Yu and Jinfu Chen, _ACM Transactions on Software Engineering and Methodology_ 34(8), 2025. Crossref dates the issue to 6 Oct 2025.
- **Links:** https://doi.org/10.1145/3716848, arXiv https://arxiv.org/abs/2310.02059 (v4, 6 Feb 2025)
- **Method:**
  - 733 snippets from real GitHub projects whose code or commit text marked them as AI-generated: 672 Copilot, 38 CodeWhisperer and 23 Codeium.
  - Python snippets were scanned with CodeQL plus Bandit.
  - **JavaScript snippets were scanned with CodeQL plus ESLint**, configured with `eslint-plugin-security` (14 rules), `eslint-plugin-no-secrets` and `eslint-plugin-xss`.
  - Results were filtered manually (Cohen's κ 0.82–0.85).
- **Prevalence:**
  - Python 124/419 (29.5%) and **JavaScript 76/314 (24.2%)** snippets had at least one weakness, 200/733 (27.3%) overall.
  - There were 628 weaknesses across 43 CWEs; eight of those CWEs are in the 2023 CWE Top 25.
- **CWE breakdown (share of 628):**
  - CWE-330 insufficiently random values: 114 (18.15%)
  - **CWE-94 code injection: 62 (9.87%)**
  - **CWE-79 XSS: 60 (9.55%)**
  - CWE-78: 39 (6.21%)
  - CWE-22: 29 (4.62%)
  - CWE-89: 27 (4.30%)
  - CWE-259 hard-coded password: 16 (2.55%)
  - CWE-798 hard-coded credentials: 6 (0.96%)
- **JavaScript specifically:**
  - The top five JavaScript CWEs were CWE-94, CWE-79, CWE-22, CWE-685 and CWE-770.
  - JavaScript CWEs "are primarily associated with dynamic code generation problems and security issues in Web development." In web applications, XSS was the most frequent JavaScript CWE.
- **Feeding static-analysis warnings to the model (RQ3):**
  - 90 snippets (50 Python, 40 JavaScript) containing 295 weaknesses were given to Copilot Chat in three ways:
    - `/fix`
    - a basic "Is there a security weakness…fix it" prompt
    - an **enhanced prompt that pastes in the static-analysis warning messages**
  - Fix rates were 19.3%, 31.8% and **55.5%** respectively. For JavaScript alone: basic 34.8% (46/132) and enhanced 51.5% (68/132).
  - XSS (CWE-79, 30 instances) went from 0% fixed with `/fix` to 53.3% with the basic prompt and **70.0%** with warnings.
  - CWE-330 went from 9.1% to 98.2%.
  - **CWE-94 barely moved: 16.7%, 14.3% and 14.3%.** CWE-78 was never fixed.
- **Caveats:**
  - Attribution of code to Copilot relies on developers' own markings.
  - Detection is by static analysis, so false negatives are likely.
  - The snippets date from 2022–2023.

### 3.6 Asare, Nagappan, Asokan, "Is GitHub's Copilot as Bad as Humans at Introducing Vulnerabilities in Code?" (EMSE 2023). VERIFIED (metadata + abstract)

- **Links:** https://arxiv.org/abs/2204.04741. It was accepted to _Empirical Software Engineering_ per arXiv; the journal DOI was not checked.
- **Finding:** Copilot was re-prompted with C/C++ contexts that had led humans to real vulnerabilities. It reproduced the vulnerable code about 33% of the time and the fixed code 25% of the time. The authors' overall conclusion is that it is "not as bad as human developers."
- **Use:** This is a counterpoint, and C/C++ only.

### 3.7 Khoury, Avila, Brunelle, Camara, "How Secure is Code Generated by ChatGPT?" (IEEE SMC 2023). VERIFIED (full arXiv v2 PDF; Crossref)

- **Citation:** Raphaël Khoury, Anderson R. Avila, Jacob Brunelle and Baba Mamadou Camara, _2023 IEEE International Conference on Systems, Man, and Cybernetics (SMC)_, Oct 2023, pp. 2445–2451.
- **Links:** https://doi.org/10.1109/SMC53992.2023.10394237, arXiv https://arxiv.org/abs/2304.09655
- **Method:** ChatGPT (GPT-3.5) wrote 21 programs in C, C++, Python, HTML and Java. Each targeted a specific weakness. The authors then asked follow-up questions and requested secure versions.
- **Finding:** "only 5 of the 21 use-cases we investigated were initially secure." ChatGPT produced secure code "in an additional 7 cases" after being explicitly asked.
- **The XSS case (program 5, an interactive web page):**
  - The initial fragments had no input sanitization.
  - Asked for a secure version, ChatGPT "produced a page that remained trivially vulnerable, ignoring its own advice."
  - It eventually fixed the page with `htmlspecialchars()` after further prompting.
- **Related point:** The authors suggest submitting code "to an automated analysis, and communicate the results to ChatGPT."
- **Caveats:** The sample is tiny (21 programs), and the security judgement was manual.

### 3.8 BaxBench: Vero, Mündler, Chibotaru, Raychev, Baader, Jovanović, He, Vechev (ICML 2025). VERIFIED (full arXiv v3 PDF; baxbench.com)

- **Citation:** Mark Vero, Niels Mündler, Victor Chibotaru, Veselin Raychev, Maximilian Baader, Nikola Jovanović, Jingxuan He and Martin Vechev, "BaxBench: Can LLMs Generate Correct and Secure Backends?", _Proceedings of the 42nd International Conference on Machine Learning_, PMLR 267, 2025. This is per the PDF header.
- **Links:** https://arxiv.org/abs/2502.11844, https://baxbench.com, code https://github.com/logic-star-ai/baxbench
- **Method:**
  - 392 tasks: 28 scenarios × 14 frameworks in 6 languages. JavaScript is represented by Express, Fastify, Koa and Nest.
  - Functionality is checked with tests. Security is checked by **running expert-written exploits** against the live app, not by static analysis.
  - The exploits cover 13 CWEs: 20, 22, 78, 79, 89, 94, 117, 284, 400, 434, 522, 703 and 863.
- **Headline:**
  - "even the best model, OpenAI o1, achieves a mere 62%" on correctness.
  - Exploits succeeded on "around half of the correct programs" for each model.
  - In Fig. 3 the best correct-and-secure rate is o3-mini at 37%. The figure caption says 35%.
  - The live site says 62% of the best model's solutions "are either incorrect or contain a security vulnerability."
- **Prompting:**
  - A generic "follow security best practices" reminder helped reasoning models but not the others.
  - An "oracle" prompt naming the specific vulnerabilities did best but lowered correctness.
  - An agent scaffold (OpenHands with Claude 3.5 Sonnet) did not improve security without the oracle prompt: 32.9% base vs 31.8% agent.
- **JavaScript numbers (Table 9, no security reminder):** These are the shares of functionally correct backends that could have a CWE and did.
  - **CWE-79 XSS:** Express 0.95, Fastify 0.95, Koa 0.90, Nest 0.93.
  - **CWE-94 code injection:** Express 0.40, Fastify 0.52, Koa 0.44, Nest 0.32.
  - CWE-117 log injection was about 1.00 in every framework.
  - With a generic security reminder (Table 10), XSS fell only to 0.70–0.88.
- **The eval example:**
  - The paper's Figure 2 shows a generated calculator server doing `return eval(s)`, exploited with `10**10**10`.
  - The text explains that the Calculator scenario can be built "by evaluating the expression as a program (eval(expression))." Appendix B shows a model's `str(eval(request.expression))` being flagged for CWE-94.
- **SAST comparison:** On o1's 237 correct programs, Snyk Code "misses 64 vulnerable programs exploited by our tests." It flagged 25 that weren't exploited, 16 of which were false positives.
- **Caveat:** The live leaderboard is rendered with JavaScript, and I could not read current per-model numbers from it.

### 3.9 Meta CyberSecEval 1, 2 and 3 (2023–2024). VERIFIED (full arXiv PDFs of 1 and 3; CyberSecEval 2 PDF searched; ICD rule files on GitHub)

- **CyberSecEval 1:** Manish Bhatt, Sahana Chennabasappa, Cyrus Nikolaidis, Shengye Wan, Ivan Evtimov, Dominik Gabi, Daniel Song, … Joshua Saxe, "Purple Llama CyberSecEval: A Secure Coding Benchmark for Language Models," arXiv, 7 Dec 2023, https://arxiv.org/abs/2312.04724
  - **How it detects insecure code:** The "Insecure Code Detector" (ICD) uses rules written in weggli (C/C++), **Semgrep** and **regular expressions**. It covers "approximately 189 patterns related to 50 different" CWEs across C, C++, C#, JavaScript, Rust, Python, Java and PHP. The ICD aims to "pinpoint insecure coding practices… rather than to identify specific vulnerabilities". That is a lint rule's job description.
  - **Accuracy:** "precision of 96% and recall of 79%," measured on 50 hand-labelled completions per language.
  - **Results:**
    - "On average, LLMs suggested vulnerable code 30% of the time." Seven models were tested (Llama 2, Code Llama, GPT-3.5, GPT-4).
    - "Models with superior coding abilities were more susceptible to suggesting insecure code." Coding ability was proxied by BLEU score.
    - CodeLlama-34b-instruct passed only 75% of the time.
  - **The JavaScript rules are lint-rule equivalents (VERIFIED from the repo):** The rules now live in `meta-llama/PurpleLlama` under `CodeShield/insecure_code_detector/rules/`.
    - `semgrep/javascript/third-party/eval-usage.yaml`, rule `eval-with-expression`, CWE-95. It flags `eval(...)`, `Function(...)`/`new Function(...)` with dynamic bodies, and `setTimeout`/`setInterval` with string arguments, which are the `no-eval`, `no-new-func` and `no-implied-eval` patterns.
    - `dangerously-set-inner-html.yaml` (CWE-79) flags any `dangerouslySetInnerHTML`, the `react/no-danger` pattern.
    - Other rules include `pseudo-random-bytes`, `unchecked-origin-onmessage`, `post-message-origin` and `child-process`. A regex rule flags `fetch('http://…')` (CWE-319).
    - The third-party rules are MIT-licensed from GitLab's `sast-rules`.
- **CyberSecEval 2:** Bhatt et al., arXiv, Apr 2024, https://arxiv.org/abs/2404.13161. It skips the insecure-code tests "because these tests haven't changed." Its new results are on prompt injection (26–41% success) and similar topics.
- **CyberSecEval 3:** Shengye Wan, Cyrus Nikolaidis, Daniel Song, … Joshua Saxe, arXiv, 2024 (v2 6 Sep 2024), https://arxiv.org/abs/2408.01605
  - All tested LLMs suggested insecure code, "failing our insecure autocomplete test cases at the rate of 31%."
  - Llama 3 405B: 30.55% insecure on autocomplete (GPT-4 Turbo 29.84%) and 38.57% on instruct (GPT-4 Turbo 35.24%). As parameter counts rise, "we observe that more insecure code is generated."
  - **Mitigation is a lint-like guardrail.** Meta recommends **Code Shield**, which runs the same ICD rules at inference time. The first layer "swiftly identifies concerning code patterns within 60ms"; 90% of scans stop there.
- **Not used:** CyberSecEval 4 (2025) focuses on SOC and patching benchmarks, not insecure-code generation. I did not cite it.

### 3.10 Veracode GenAI Code Security Reports (Jul 2025; Nov 2025 update; Mar 2026 update; Jul 2026 report). VERIFIED (press releases, blog posts and 2026 infographic). Full report PDFs not accessed; they are behind a download form.

- **2025 report (30 Jul 2025):**
  - Press release: https://www.veracode.com/press-release/ai-generated-code-poses-major-security-risks-in-nearly-half-of-all-development-tasks-veracode-research-reveals/
  - Blog by Jens Wessling (CTO): https://www.veracode.com/blog/genai-code-security-report/
  - Scope: "80 curated coding tasks" and "more than 100 large language models" in Java, Python, C# and JavaScript. Four CWEs: SQL injection (CWE-89), insecure crypto (CWE-327), **XSS as CWE-80** and log injection (CWE-117).
  - "In 45 percent of all test cases, LLMs introduced vulnerabilities" classified within the OWASP Top 10.
  - By language (failure rates, from the blog): Java 72%, C# 45%, **JavaScript 43%** and Python 38%.
  - XSS (CWE-80) failed in **86%** of relevant samples and log injection (CWE-117) in **88%**.
  - "larger models do not perform significantly better than smaller models."
- **Nov 2025 update (testing in Oct 2025):**
  - https://www.veracode.com/press-release/veracode-research-reveals-openais-gpt-5-models-lead-the-way-in-secure-code-while-wider-industry-progress-stalls/
  - Pass rates: GPT-5 Mini 72%, GPT-5 70%, GPT-5-chat 52%, Claude Sonnet 4.5 50% and Claude Opus 4.1 49%.
  - XSS success rates were below 14% and log injection near 12%; "Progress remains stagnant." Crypto passed more than 85%.
  - JavaScript and Python "remained comparatively flat."
- **Spring 2026 update (24 Mar 2026, Felix Brombacher):** https://www.veracode.com/blog/spring-2026-genai-code-security/
  - The overall security pass rate was 55%, and more than 150 LLMs had been evaluated to date.
  - Pass rates by language: Python 62%, C# 58%, **JavaScript 57%** and Java 29%.
  - Pass rates by CWE: SQL injection 82%, crypto 86%, **XSS 15%** and log injection 13%.
  - Syntax pass rates rose from about 50% to 95% since 2023, while security stayed between 45% and 55%.
- **2026 report (28 Jul 2026):**
  - Blog: https://www.veracode.com/blog/2026-genai-code-security-report-ai-risk/
  - Infographic: https://www.veracode.com/wp-content/uploads/2026-GenAI-Report-Infographic.pdf
  - The average pass rate is 56%, "barely changed from 55% in the first report." Roughly 44% of tasks introduced a risky vulnerability.
  - XSS pass rate is **15%**: "85% of the time, AI failed to secure code against Cross-Site Scripting (CWE-80)."
  - GPT-5.5 leads at 68%. Reasoning models average 56% and non-reasoning 51%. Coding-specialized models average 51% and general models 52%. Large models average 53% and medium and small 51%.
  - "Syntax is solved at 99.9%. Security is not."
- **Caveats:**
  - This is vendor research by a company that sells SAST.
  - The method behind each task (how "secure vs insecure" is judged) is in the gated PDF, which I did not read.
  - It covers only four CWEs, so the 45% is not a general vulnerability rate.
  - Veracode files XSS under CWE-80 (basic XSS), a child of CWE-79.

### 3.11 Sabra, Schmitt, Tyler (Sonar), "Assessing the Quality and Security of AI-Generated Code" (2025). VERIFIED (full arXiv PDF)

- **Link:** https://arxiv.org/abs/2508.14727. This is the academic version of Sonar's "Coding Personalities of Leading LLMs"; it is not peer-reviewed.
- **Method:** 4,442 **Java** tasks (MultiPL-E and ComplexCodeEval), analysed with SonarQube.
- **Findings:**
  - Vulnerabilities were about 2% of all issues: 1.72–2.38% per model. Vulnerability density was 0.38–0.62 per KLOC.
  - **BLOCKER share of vulnerabilities:** Llama 3.2 90B 70.73%, OpenCoder-8B 64.18%, GPT-4o 62.50%, Claude Sonnet 4 59.57% and Claude 3.7 Sonnet 56.03%. Adding CRITICAL, roughly 85–93% were in the top two severities.
  - **Vulnerability categories (Table 11):**
    - Path traversal and injection: 26.83–34.04%
    - **Hard-coded credentials: 10.34–29.85%** (OpenCoder-8B 29.85%, Llama 3.2 90B 23.58%)
    - Crypto misconfiguration: 19.64–24.82%
    - XXE: 5.97–19.51%
  - **Useful framing for what lint can and can't see.** The authors pair each category with a "potential contributing factor":
    - Path traversal and injection "Requires non-local taint analysis from a data source to a sink."
    - Hard-coded credentials: "Security-sensitive intent of constants is semantically unclear."
- **Caveats:** Java only. Sonar sells the analyser.

### 3.12 Other secure-code benchmarks, one line each. VERIFIED (metadata + abstract unless noted)

| Benchmark | Citation / link | What it is | Headline (as verified) |
| --- | --- | --- | --- |
| SecurityEval | Siddiq & Santos, MSR4P&S '22 workshop, pp. 29–33, https://doi.org/10.1145/3549035.3561184 | Prompt dataset (Python, 75 CWEs per CyberSecEval's related-work table) | Dataset only |
| LLMSecEval | Tony, Mutas, Díaz Ferreyra, Scandariato, MSR '23 Data & Tool Showcase, https://arxiv.org/abs/2303.09384 | 150 NL prompts tied to CWE Top 25, with secure reference implementations | Dataset only |
| CodeLMSec | Hajipour, Hassler, Holz, Schönherr, Fritz, arXiv 2023 (published at SaTML 2024 per later citations; venue not confirmed on arXiv page), https://arxiv.org/abs/2302.04012 | Automatically finds non-secure prompts for black-box code LMs | Benchmark of vulnerability-inducing prompts |
| SALLM | Siddiq, Santos, Devareddy, Muller, ASEW '24 (ASYDE workshop), https://arxiv.org/abs/2311.00889 | Security-centric Python prompts plus metrics | No numbers in abstract |
| CWEval | Peng, Cui, Huang, Yang, Ray, LLM4Code 2025, https://arxiv.org/abs/2501.08200 (full text read) | 119 tasks, 31 CWEs, 5 languages (repo setup covers Python, C, JavaScript, Go) | func@10 → func-sec@10 drops "around 30% across all models"; GPT-4o 90.71 → 65.33 |
| SeCodePLT (was "SecCodePLT") | Nie, Wang, Yang, … Song, NeurIPS 2025 D&B, https://arxiv.org/abs/2410.11096 | 5.9k+ samples, 44 CWE categories, Python, C/C++, Java | No JavaScript |
| CodeSecEval (now "Toward Secure Code Generation…") | Wang et al., arXiv 2407.02395, "Accepted/published in ISSTA 2026" | 255 Python tasks, 77 CWEs, executable security tests | Agentic SecAwareCoder beats prompting and analyzer-driven baselines |
| SecRepoBench | Shen, Dilgren, Chiniya, Griffith, Ding, Chen, arXiv 2504.21205 | 318 tasks in 27 C/C++ repos, 15 CWEs | "code agents significantly outperform standalone LLMs" |
| A.S.E | Lian et al. (Tencent and others), arXiv 2508.18106; reported in search results as ACL Findings 2026 (not opened) | Repository-level, from real CVEs | "current LLMs still struggle with secure coding"; "a larger reasoning budget does not necessarily lead to better code generation" |
| FormAI | Tihanyi et al., PROMISE 2023, https://arxiv.org/abs/2307.02192 | 112,000 GPT-3.5 C programs checked with ESBMC | "51.24% of the programs generated by GPT-3.5 contained vulnerabilities" (C only) |
| Kharma et al. | Kharma, Choi, AlKhanafseh, Mohaisen, accepted to _IEEE TDSC_, https://arxiv.org/abs/2502.01853 | 200 tasks, multi-language | Security "varies by language"; models miss modern features (e.g., Java 17) |

### 3.13 Iteration and self-repair

**Shukla, Joshi and Syed, "Security Degradation in Iterative AI Code Generation" (IEEE-ISTAS 2025).** See section 4.4.5. In short: iterative "improvement" with no scanner in the loop made code less secure, but cite the body's 2.1 → 6.2 trend, not the abstract's 37.6%.

**Khanmohammadi, Roy, Khoury et al., "WildCode Revisited" (2025–2026). VERIFIED (full arXiv PDF, v2 3 Jun 2026; not peer-reviewed)**

- **Link:** https://arxiv.org/abs/2512.04259
- **Data:** Real ChatGPT conversations from WildChat: 82,843 conversations with code, and 34,478 in English. The security analysis covered Python, Java, JavaScript, C#, C/C++ and PHP.
- **Re-prompting experiment:** 1,126 prompts, including 237 JavaScript, were re-run on five models under four prompt prefixes. One prefix pasted in **OpenGrep (a Semgrep fork) findings**.
- **Findings:**
  - The OpenGrep prompt "consistently produces the lowest risk scores for most models," for example 1.57 for gpt-oss-20b and 1.62 for command-r7b. The authors' reading is that "incorporating static analysis feedback into the prompt helps guide the models."
  - "Act as a security researcher" did not reliably help.
- **Caveats:**
  - The risk score is _average severity per detected vulnerability_, not a count.
  - Cramér's V was 0.1166, a small effect.
  - In post-hoc tests, OpenGrep differed significantly from "act as security researcher" (p = 0.00007) but **not** from the original prompt.

---

**Part B: coding agents and security, 2025–2026 (3.14–3.29)**

### 3.14 Zhao et al., "Is Vibe Coding Safe?" / SusVibes (ICML 2026). VERIFIED (PMLR page; arXiv v2 full text)

- **Citation:** Songwen Zhao, Danqing Wang, Kexun Zhang, Jiaxuan Luo, Zhuo Li and Lei Li, "Is Vibe Coding Safe? Benchmarking Vulnerability of Agent-Generated Code in Real-World Tasks," _Proceedings of the 43rd International Conference on Machine Learning_, PMLR 306:162269–162292, 2026.
- **Links:** https://proceedings.mlr.press/v306/zhao26ax.html, arXiv https://arxiv.org/abs/2512.03262 (v1 Dec 2025, v2 16 Feb 2026). Code: GitHub `LeiLiLab/susvibes`.
- **Method:** Feature-request tasks mined from real open-source projects where a human developer originally committed a vulnerable implementation that was later fixed. Each solution is run against human-written functionality tests and security tests. The agent edits the whole repository, about 170 lines on average. Agents: SWE-Agent, OpenHands and Claude Code; models: Claude 4 Sonnet, Kimi K2, Gemini 2.5 Pro (v2 adds Gemini 3 Pro).
- **Findings:**
  - **Published (ICML) numbers:** 186 tasks, 12 agent settings. SWE-Agent + Claude 4 Sonnet: 57% functionally correct, 11.8% secure.
  - **arXiv v2 numbers:** 200 tasks, 77 CWEs. The same setting: 61.0% functional, 10.5% secure. "82.8% of these functionally correct solutions are insecure." The best security score was OpenHands + Claude at 12.5%. Claude Code scored 44.0% functional and 6.0% secure with Claude 4 Sonnet.
  - Quote: "Disturbingly, all agents perform poorly in terms of software security."
  - If a user accepts code once it passes functionality tests, "around 80% of the time" it leaves a vulnerability.
  - **Mitigations did not help:** Adding a generic security reminder, asking the agent to identify the CWE first ("self-selection"), or giving it the oracle CWE left SecPass at 9.5–10.5% while cutting functional correctness by about 5.5–8.5 points.
- **Caveats:** Python only (tasks drawn from about 3,000 Python vulnerability fixes). Cite the ICML version's 57% / 11.8% if you cite the published paper, or say which version.

### 3.15 Chen et al., SecureVibeBench (formerly "SecureAgentBench") (ACL 2026). VERIFIED (metadata + abstract)

- **Citation:** Junkai Chen, Huihui Huang, Yunbo Lyu, Junwen An, Jieke Shi, Chengran Yang, Ting Zhang, Haoye Tian, Yikun Li, Zhenhao Li, Xin Zhou, Xing Hu and David Lo, "SecureVibeBench: Benchmarking Secure Vibe Coding of AI Agents via Reconstructing Vulnerability-Introducing Scenarios," ACL 2026 Main Conference.
- **Link:** https://arxiv.org/abs/2509.22097 (v1 26 Sep 2025, v5 6 Jun 2026)
- **Findings:** 105 C/C++ tasks from 41 OSS-Fuzz projects, 5 agents × 5 LLMs (including Claude Sonnet 4.5). The best agent produced "merely 23.8% correct and secure solutions."
- **Note:** v1 was titled "SecureAgentBench" (a secondary summary of v1 reports 15.2% best and three agents/three LLMs). The final title and numbers are the ones above. C/C++, so not about JS.

### 3.16 Sajadi, Damevski and Chatterjee, security of AI-generated SWE-bench patches (2025). VERIFIED (arXiv v3 full text)

- **Citation:** Amirali Sajadi, Kostadin Damevski and Preetha Chatterjee, "How Safe Are AI-Generated Patches? A Large-scale Study on Security Risks in LLM and Agentic Automated Program Repair on SWE-bench," arXiv 2507.02976, v3 29 Dec 2025 (earlier title: "Are AI-Generated Fixes Secure? Analyzing LLM and Agent Patches on SWE-bench"). Manuscript submitted to ACM; no venue yet.
- **Link:** https://arxiv.org/abs/2507.02976
- **Method:** 20,000+ GitHub issues from SWE-bench. Patches from developers, a standalone LLM (Llama 3.3 70B), and three agents (OpenHands, AutoCodeRover, HoneyComb). Newly introduced vulnerabilities were found with Bandit, Semgrep and CodeQL, filtered by majority vote, then manually checked.
- **Findings:**
  - After manual checks: Llama 135 vs developers 12 new vulnerabilities (train + test). On the test split, OpenHands 44, AutoCodeRover 3, HoneyComb 2.
  - **Eval injection stands out:** "eval injection (CWE-95) was identified in 39 LLM patches and only one developer patch." Insecure deserialization: 17 vs 2.
  - Example: in Qiskit, Llama used `eval()` on user-provided strings that developers sanitised.
  - The authors attribute it to "the model's tendency to translate task instructions into overly literal code," e.g. reaching for `eval()`.
  - OpenHands showed the same pattern: command injection (n=10), eval injection (n=8), insecure deserialization (n=6). Even AutoCodeRover and HoneyComb produced eval injection.
  - Raw tool counts diverge sharply: Semgrep flagged 323 issues in LLM code and 9 in developer code; Bandit flagged 1,383 vs 1,055; CodeQL 62 vs 41.
- **Caveats:** Python only. The agents are research APR frameworks, not Claude Code or Cursor.

### 3.17 The AIDev dataset (Li, Zhang and Hassan, 2025). VERIFIED (metadata + abstract)

- **Citation:** Hao Li, Haoxiang Zhang and Ahmed E. Hassan, "The Rise of AI Teammates in Software Engineering (SE) 3.0: How Autonomous Coding Agents Are Reshaping Software Engineering," arXiv 2507.15003, 20 Jul 2025.
- **Links:** https://arxiv.org/abs/2507.15003, data https://huggingface.co/datasets/hao-li/AIDev
- **What it is:** 456,000+ PRs by five agents (OpenAI Codex, Devin, GitHub Copilot, Cursor, Claude Code) across 61,000 repositories and 47,000 developers. Most security studies below use its curated subset of 33,596 PRs from popular repositories. It was the MSR 2026 Mining Challenge data set.

### 3.18 Siddiq et al., "Security in the Age of AI Teammates" (2026). VERIFIED (arXiv v2 full text)

- **Citation:** Mohammed Latif Siddiq, Xinye Zhao, Vinicius Carvalho Lopes, Beatrice Casey and Joanna C. S. Santos, "Security in the Age of AI Teammates: An Empirical Study of Agentic Pull Requests on GitHub," arXiv 2601.00477 (v1 1 Jan 2026, v2 3 Sep 2026). "Submitted to Information and Software Technology Journal, currently under minor revision."
- **Link:** https://arxiv.org/abs/2601.00477
- **Method:** Keyword filtering plus manual validation over the 33,596 curated AIDev PRs.
- **Findings:**
  - 1,293 security-related agent PRs, 3.85% of all agent PRs. Claude Code had the highest share (14.6%), OpenAI Codex the lowest (1.3%).
  - Agents mostly do "supportive security hardening" (tests, docs, config, error handling), not vulnerability fixes.
  - Security PRs merge less and wait longer: 61.50% merged vs 77.33% for non-security agent PRs; median review latency 3.92 h vs 0.11 h.
  - TypeScript had the most security PRs but a lower merge rate (56.51%).
  - Rejection was tied more to PR complexity and verbosity than to the security topic.
- **Why it matters for the post:** It measures security _work_ by agents, not vulnerabilities they introduce. Use it for "maintainers already review agent security changes more cautiously", not as evidence that agents add bugs.

### 3.19 Rabbi, Turzo, Champa and Zibran, "Insights into Security-Related AI-Generated Pull Requests" (EASE 2026). VERIFIED (arXiv full text)

- **Citation:** Md Fazle Rabbi, Asif K. Turzo, Arifa I. Champa and Minhaz F. Zibran, EASE 2026 (accepted), arXiv 2604.19965, 21 Apr 2026.
- **Link:** https://arxiv.org/abs/2604.19965
- **Method:** 675 security-related agent PRs from AIDev. Semgrep 1.135.0 run on the baseline and the PR head to find newly introduced issues.
- **Findings:**
  - 104 of 675 PRs (15.4%) introduced at least one Semgrep finding; 853 findings in total, median 3 per affected PR.
  - Top CWEs: inefficient regex (CWE-1333) 36.2%, OS command injection (CWE-78) 13.0%, path traversal (CWE-22) 10.3%, format string (CWE-134) 8.2%, **XSS (CWE-79) 60 findings, 7.1%**, **hard-coded credentials (CWE-798) 48, 5.7%**. Eval injection (CWE-95) shows up 8 times among accepted Codex PRs.
  - Merged PRs still carried findings: e.g. accepted Copilot PRs had CWE-79 (9) and CWE-22 (12). The authors write that "some vulnerabilities pass review despite being detectable by Semgrep."
  - Abstract: "Many flawed contributions are still merged."
- **Caveat:** Note this sample (675) differs from Siddiq et al. (1,293) because of different filters. These are PRs _about_ security, not all agent PRs.

### 3.20 Xia and Miller, "Do These Violent Delights Have Violent Ends?" (2026). VERIFIED (arXiv full text)

- **Citation:** Chunqiu Steven Xia and Courtney Miller, "Do These Violent Delights Have Violent Ends? Measuring the Post-Merge Fate of Agentic Code," arXiv 2607.09902, 10 Jul 2026. No venue listed.
- **Link:** https://arxiv.org/abs/2607.09902
- **Method:** Longitudinal tracking of agentic and human contributions in 182 repositories. Each commit scanned with Semgrep (source weaknesses), OSV-Scanner (dependencies) and SonarQube.
- **Findings:**
  - "agentic contributions require significantly higher rates of corrective maintenance."
  - Agentic code introduced Semgrep security findings at **1.14×** and high-severity (ERROR) findings at **1.51×** the human per-source-line rate. Dependency vulnerabilities: 1.10× (all) and 1.15× (HIGH/CRITICAL).
  - Each 10-point increase in a project's no-review rate goes with roughly 6% more agentic maintenance burden.
- **Caveats:**
  - Preprint; findings are limited to what Semgrep's rules detect.
  - The 1.14× and 1.51× rate ratios are in the body (RQ1c and Table V), not the abstract. I re-checked them: 95% CIs 1.08–1.21 and 1.33–1.70, both p < 0.001.
  - The text says the denominator is changed source lines, but the Figure 7 caption says "per 100 commits."

### 3.21 Cynthia, Muttakin and Roy, "Beyond Bug Fixes" (MSR 2026 Mining Challenge). VERIFIED (arXiv full text)

- **Citation:** Shamse Tasnim Cynthia, Al Muttakin and Banani Roy, "Beyond Bug Fixes: An Empirical Investigation of Post-Merge Code Quality Issues in Agent-Generated Pull Requests," MSR 2026 Mining Challenge, arXiv 2601.20109.
- **Link:** https://arxiv.org/abs/2601.20109
- **Findings:** 1,210 merged agent bug-fix PRs in 206 Python repositories, scanned with SonarQube before and after. Differences between agents mostly vanish once normalised by churn. Code smells dominate. SonarQube reported **no Vulnerability issues**, only Security Hotspots (most from Codex, in proportion to its volume).
- **Use:** A counterweight. Sonar's default rule set found few security problems in agent bug fixes; it says nothing about JS/TS.

### 3.22 Deng, Fan and Meng, "Understanding the (In)Security of Vibe-Coded Applications" (2026). VERIFIED (arXiv v4 full text)

- **Citation:** Junquan Deng, Zhiyu Fan and Ruijie Meng, arXiv 2606.23130 (v1 22 Jun 2026, v4 14 Sep 2026). No venue listed.
- **Link:** https://arxiv.org/abs/2606.23130
- **Method:**
  - 9,041 open-source apps built with Claude Code and Lovable, where at least 90% of commits and lines are AI-authored (identified by markers such as "Co-authored-by: Claude").
  - The stack is overwhelmingly JS/TS: 98.68% contain JavaScript, 97.80% TypeScript, 97.09% React, 94.41% shadcn-ui.
  - 200 publicly deployed apps were audited by Claude Code (Sonnet 4.6) and Copilot (GPT-5.3-Codex) with security skill sets, followed by manual validation.
- **Findings:**
  - 1,186 vulnerabilities; **91.0%** of audited apps had at least one; 65.77% rated Critical or High.
  - By OWASP Top 10 (2025) category: Broken Access Control 339 (64.00% of apps), **Injection 199 (16.78% of vulns; 54.00% of apps)**, Authentication Failures 176 (51.50% of apps).
  - Injection is split almost evenly: 95 frontend vs 102 backend.
  - The paper's XSS example serialises an external response and writes it with `window.document.write` without escaping ("reflected XSS").
  - "Hidden security rules account for 658 vulnerabilities (55.5%)": requirements like "external data must be sanitized before use" that don't affect visible behaviour.
  - Better harnesses and prompting reduced but did not remove the problems.
- **Caveats:** Preprint. The auditors were themselves LLM agents (with manual validation). Sample of 200.
- **Why it matters for the post:** This is the closest thing to a measurement of DOM-sink XSS in agent-built React/TS apps. `document.write` and similar sinks are exactly what DOM-sink lint rules flag.

### 3.23 Andročec, "Vibe Coding and Web Application Security: A Twin-Prompt Study" (CECIIS 2026). VERIFIED (arXiv full text)

- **Citation:** Darko Andročec, accepted at CECIIS 2026 (Varaždin, 16–18 Sep 2026), arXiv 2608.20963.
- **Link:** https://arxiv.org/abs/2608.20963
- **Method:** 6 web apps (Python and Node/Express), each generated once by Claude Code with and without an appended security-requirements section. SAST used Bandit, **ESLint 9.39.4 with eslint-plugin-security**, and Semgrep, plus DAST and manual tests.
- **Findings:**
  - 75 confirmed findings. The security-aware prompt cut them from 51 to 24 and removed all Critical/High findings.
  - The methods barely overlapped: 28 found by SAST only, 24 by DAST only, 11 by manual testing only, 12 by more than one method.
  - "the most severe finding was detected only by manual testing": a JWT signed with a hard-coded secret, which no automated scanner surfaced as exploitable.
- **Caveat:** n = 12 programs, one run each. The author calls it preliminary.

### 3.24 Dora et al., "The Hidden Risks of LLM-Generated Web Application Code" (2025). VERIFIED (arXiv HTML full text)

- **Citation:** Swaroop Dora, Deven Lunkad, Naziya Aslam, S. Venkatesan and Sandeep Kumar Shukla, arXiv 2504.20612, 29 Apr 2025. No venue.
- **Link:** https://arxiv.org/abs/2504.20612
- **Findings:**
  - Prompted ChatGPT, DeepSeek, Claude, Gemini and Grok for a login system "using PHP, HTML, and MySQL."
  - All used parameterised queries. "DeepSeek and Gemini are vulnerable to JavaScript execution inside input fields" and HTML tag injection.
  - DeepSeek and Claude did not set Secure/HttpOnly/SameSite cookie flags.
  - "None of the models implement CSP headers"; the paper scored every model 0/12 on HTTP security headers.
- **Caveat:** PHP, single prompts, a small qualitative evaluation. Useful only as colour for cookies and CSP.

### 3.25 Cocenzo and Bento, "Security by Default? Injection Risks in Routine LLM-Generated Web Components" (SBSeg 2026). VERIFIED (full PDF)

- **Citation:** Vitor F. Cocenzo and Lucila M. S. Bento, _Anais Estendidos do XXVI SBSeg_, Workshop de Trabalhos de Iniciação Científica e de Graduação, pp. 629–640, 2026. https://doi.org/10.5753/sbseg_estendido.2026.29355
- **Link:** https://sol.sbc.org.br/index.php/sbseg_estendido/article/view/44518
- **Findings:**
  - Claude, ChatGPT and Gemini wrote web components (including CWE-79 scenarios from LLMSecEval) in Python, JavaScript and PHP.
  - Baseline vulnerability incidence reached 85.71%.
  - Recursive self-criticism ("RCI") was inconsistent: it ranged from an 87.5% reduction to a 197.89% increase in detections.
  - SonarQube, Semgrep and CodeQL disagreed badly: Fleiss' κ = −0.2827.
- **Caveat:** An undergraduate research workshop paper with small cells. Its κ result is relevant to section 4, since the tools disagree on what counts as a finding.

### 3.26 Industry and vendor reports

**CodeRabbit, "State of AI vs Human Code Generation" (17 Dec 2025). Blog VERIFIED; the XSS-specific figure is UNVERIFIED (vendor)**

- **Link:** https://www.coderabbit.ai/blog/state-of-ai-vs-human-code-generation-report (David Loker). The full report is behind a form at https://www.coderabbit.ai/whitepapers/state-of-AI-vs-human-code-generation-report.
- **Method:** 470 open-source PRs: 320 AI-co-authored and 150 human-only. Authorship was inferred from co-author signals. CodeRabbit admits it cannot guarantee the "human authored" PRs were "actually authored only by humans."
- **Findings on the blog:**
  - 10.83 vs 6.45 issues per PR, about 1.7×.
  - Security issues "up to 2.74× higher," with improper password handling and insecure object references most prominent.
  - "While no vulnerability type was unique to AI, nearly all were amplified."
  - Its advice includes "running SAST and security linters automatically."
- **The XSS claim:** _The Register_ (17 Dec 2025, https://www.theregister.com/2025/12/17/ai_code_bugs) reports AI code was "2.74x more likely to add XSS vulnerabilities," along with password handling 1.88×, insecure object references 1.91× and insecure deserialization 1.82×. The CodeRabbit blog never mentions XSS. Cite "security issues up to 2.74×" from the blog, or attribute the XSS reading to The Register.
- **Caveats:** Small, non-random sample; issues detected by CodeRabbit's own reviewer; vendor.

**Tenzai, "Bad Vibes: Comparing the Secure Coding Capabilities of Popular Coding Agents." VERIFIED (vendor)**

- **Link:** https://tenzai.com/blog/bad-vibes-comparing-the-secure-coding-capabilities-of-popular-coding-agents. The blog index dates it 13 Jan 2026; the post page now shows 25 Jun 2026 (author Ori David), so it was probably updated. SecurityWeek covered it on 15 Jan 2026.
- **Method:** Claude Code, Codex, Cursor, Replit and Devin each built the same 3 apps from the same prompts and stack, giving 15 apps.
- **Findings:**
  - 69 vulnerabilities. Claude Code had 16; Codex, Cursor and Replit 13 each.
  - "didn't encounter a single exploitable SQLi or XSS vulnerability": agents used parameterised queries, and frontend frameworks kept XSS from being exploitable.
  - All five introduced SSRF in a link-preview feature.
  - "None of the 15 applications developed included proper CSRF protection."
  - No agent set CSP, X-Frame-Options or HSTS. All but one had no login rate limiting.
- **Caveat:** Vendor, small n. The visible code samples are PHP.

**Escape.tech, vibe-coded apps scan (29 Oct 2025). VERIFIED (methodology post; vendor)**

- **Link:** https://escape.tech/blog/methodology-how-we-discovered-vulnerabilities-apps-built-with-vibe-coding/ (Nohé Hinniger-Foray, Gwendal Mognier, Alexandra Charikova)
- **Findings:**
  - Over 5,600 public apps, about 4,000 of them on Lovable, plus Create.xyz, Base44, Vibe Studio and Bolt.new.
  - More than 2,000 vulnerabilities, 400+ exposed secrets, and 175 PII exposures.
  - Passive scanning only, so the authors call it a lower bound.
  - The issues are mostly Supabase keys, missing RLS and missing auth; the methodology post does not mention XSS.
- **Caveat:** The landing page cites "2,038 highly critical vulnerabilities across 1.4K applications," which is apparently a different cut. Use the methodology post's numbers.

**Lovable / CVE-2025-48757 (May 2025). VERIFIED (NVD JSON record and the researcher's statement)**

- **NVD:** An insufficient Row-Level Security policy in Lovable through 2025-04-15 let unauthenticated attackers "read or write to arbitrary database tables of generated sites." CVSS 3.1 9.3 (from MITRE), CWE-863. Tagged **disputed**: Lovable says each customer is responsible for their app's data. https://nvd.nist.gov/vuln/detail/CVE-2025-48757
- **Researcher:** Matt Palmer, https://mattpalmer.io/posts/statement-on-CVE-2025-48757/. He scanned 1,645 Lovable showcase apps and found 170 (10.3%) with 303 endpoints with inadequate RLS. Found 20 Mar 2025, CVE published 29 May 2025.
- **Relevance:** This is backend configuration, not something a JS lint rule sees. It shows "generated by default" security failures at scale.

**Apiiro, "4x Velocity, 10x Vulnerabilities" (Sept 2025). UNVERIFIED (vendor; primary page blocked by Cloudflare)**

- Secondary coverage reports the following. Treat the 10× as a growth rate over six months, not a per-developer comparison.
  - "10,000+ new security findings per month" by June 2025, 10× December 2024.
  - Privilege-escalation paths up 322% and architectural design flaws up 153%.
  - Syntax errors down 76% and logic bugs down more than 60%.
  - AI-assisted developers made 3–4× more commits.

**GitGuardian, "State of Secrets Sprawl 2025" (11 Mar 2025). VERIFIED (report landing page; vendor)**

- **Link:** https://gitguardian.com/state-of-secrets-sprawl-report-2025
- **Findings:**
  - "public repositories using Copilot had a 6.4% secret leakage rate," "40% higher" than the 4.61% of all public repositories.
  - 23,770,171 new secrets were found on public GitHub in 2024, up 25%.
- **Caveat:** Correlational. Copilot-enabled repos may differ in other ways.

**GitGuardian, "State of Secrets Sprawl 2026" (17 Mar 2026). VERIFIED (report page and blog; vendor)**

- **Links:** https://gitguardian.com/state-of-secrets-sprawl-report-2026 and https://blog.gitguardian.com/the-state-of-secrets-sprawl-2026/
- **Findings:**
  - "Claude Code-assisted commits showed a 3.2% secret-leak rate, versus a 1.5% baseline." The report page says "~2× the baseline."
  - 28,649,024 new secrets in 2025; 1,275,105 AI-service secrets, up 81% year on year.
  - 24,008 unique secrets in MCP configuration files, 2,117 of them valid.
- **Caveat:** The pages don't say how AI-assisted commits were identified (presumably co-author trailers). The blog notes that developers still decide what gets pushed.

**Huang et al., hard-coded credentials memorised by code completion tools (FSE 2024). VERIFIED (arXiv v1 and v2 full text)**

- **Citation:** Yizhan Huang, Yichen Li, Weibin Wu, Jianping Zhang and Michael R. Lyu, "Your Code Secret Belongs to Me: Neural Code Completion Tools Can Memorize Hard-Coded Credentials," _Proc. ACM Softw. Eng._ 1(FSE), Article 111, July 2024. https://doi.org/10.1145/3660818; arXiv https://arxiv.org/abs/2309.07639
- **Findings:** The published abstract reports only that tools leak training-data secrets and that "two valid credentials were identified." The v1 preprint ("Do Not Give Away My Secrets…", Sep 2023) said it "successfully extracted 2,702 hard-coded credentials from Copilot" and 129 from CodeWhisperer. At least 3.6% and 5.4% of those, respectively, were real strings from GitHub.

**Snyk Labs, "GitHub Copilot code security: XSS in React" (Liran Tal, 19 Oct 2023). VERIFIED (vendor anecdote)**

- **Link:** https://labs.snyk.io/resources/github-copilot-xss-react/
- **What it shows:**
  - A component passed user-supplied `alt` text into `dangerouslySetInnerHTML`. Copilot's suggested escape functions were incomplete: the first encoded only angle brackets; the second also encoded quotes but still failed on an unquoted attribute (`s onLoad=alert(1)`).
  - The recommendation is to use DOMPurify or plain JSX text instead of `dangerouslySetInnerHTML`.
- **Use:** A concrete illustration of why a rule bans the sink instead of trusting a hand-rolled sanitizer. One example, not a measurement.

### 3.27 Singla et al., dependency decisions by agents (2026). VERIFIED (metadata + abstract)

- **Citation:** Tanmay Singla, Berk Çakar, Paschal C. Amusuo and James C. Davis, "Towards a Benchmark for Dependency Decision-Making," arXiv 2601.00205 (v2 30 Jan 2026), under review at JAWS 2026. AIDev lists it under an earlier title, "Understanding Security Risks of AI Agents' Dependency Updates."
- **Link:** https://arxiv.org/abs/2601.00205
- **Findings:** 117,062 dependency changes across seven ecosystems. Agents picked known-vulnerable versions in 2.46% of cases. Agents' net security impact was −98, against +1,316 for humans.

### 3.28 Sajadi et al., "Do LLMs Consider Security?" (EMSE). VERIFIED (metadata + abstract)

- **Citation:** Amirali Sajadi, Binh Le, Anh Nguyen, Kostadin Damevski and Preetha Chatterjee, "Do LLMs Consider Security? An Empirical Study on Responses to Programming Questions," accepted to _Empirical Software Engineering_. arXiv 2502.14202 (v2 3 Apr 2025).
- **Link:** https://arxiv.org/abs/2502.14202
- **Findings:** Given Stack Overflow questions containing insecure code, Claude 3, GPT-4 and Llama 3 warned about the vulnerability only 12.6%–40% of the time. One example question uses JavaScript `eval` on user input.

### 3.29 Vendor agent-security tooling (one line each)

- **Anthropic, "Automate security reviews with Claude Code" (6 Aug 2025). VERIFIED.** https://claude.com/blog/automate-security-reviews-with-claude-code. Introduces `/security-review` and a GitHub Action. The command checks for SQL injection, "Cross-site scripting (XSS) vulnerabilities," auth flaws, insecure data handling and dependency vulnerabilities. Internally the Action caught an RCE via DNS rebinding and an SSRF before merge. It is prompt-based (an LLM review), not a deterministic rule engine.
- **Google DeepMind, "Introducing CodeMender" (Raluca Ada Popa and Four Flynn, 6 Oct 2025). VERIFIED.** https://deepmind.google/discover/blog/introducing-codemender-an-ai-agent-for-code-security/. It "upstreamed 72 security fixes" in six months, some in projects of 4.5M lines. It validates patches with static and dynamic analysis, fuzzing and SMT solvers before human review.
- **OpenAI, "Introducing Aardvark" (Oct 2025). UNVERIFIED (openai.com returned 403; figures from an OpenAI community-forum repost).** https://openai.com/index/introducing-aardvark. Reported recall of 92% of known and synthetic vulnerabilities on "golden" repos, and ten CVEs from open-source disclosures. Renamed Codex Security in March 2026, according to secondary coverage.

---

## 4. Linters and static analysis for security, and their limits

### 4.1 The rules themselves

#### 4.1.1 Defaults at a glance

| Rule | Linter | Group / category | Default / recommended | Source |
| --- | --- | --- | --- | --- |
| `no-eval` | ESLint | core | Not in `@eslint/js` recommended | eslint.org + config source |
| `no-implied-eval` | ESLint | core | Not recommended | eslint.org + config source |
| `no-new-func` | ESLint | core | Not recommended | eslint.org + config source |
| `no-script-url` | ESLint | core | Not recommended | eslint.org + config source |
| `react/no-danger` | eslint-plugin-react | — | Not recommended | README rules table |
| `react/no-danger-with-children` | eslint-plugin-react | — | Recommended (☑️) | README rules table |
| `react/jsx-no-script-url` | eslint-plugin-react | — | Not recommended | README rules table |
| `eslint/no-eval` | Oxlint | Correctness | On by default | oxc.rs |
| `eslint/no-new-func` | Oxlint | Style | Not stated (enable manually) | oxc.rs |
| `eslint/no-script-url` | Oxlint | Style | Not stated (enable manually) | oxc.rs |
| `typescript/no-implied-eval` | Oxlint | Correctness | On by default only with type-aware linting; needs type info | oxc.rs |
| `react/no-danger` | Oxlint | Restriction | Not stated (enable manually) | oxc.rs |
| `react/no-danger-with-children` | Oxlint | Correctness | Not stated | oxc.rs |
| `react/jsx-no-script-url` | Oxlint | Suspicious | Not stated | oxc.rs |
| `unicorn/no-document-cookie` | Oxlint | Restriction | Not stated | oxc.rs |
| `noGlobalEval` | Biome | security | Recommended, error (since v1.5.0) | biomejs.dev |
| `noDangerouslySetInnerHtml` | Biome | security | Recommended, error (since v1.0.0) | biomejs.dev |
| `noDangerouslySetInnerHtmlWithChildren` | Biome | security | Recommended, error (since v1.0.0) | biomejs.dev |
| `noDocumentCookie` | Biome | **suspicious** | Recommended, warning (since v1.9.4) | biomejs.dev |
| `noSecrets` | Biome | security | **Not** recommended, info (since v1.9.0) | biomejs.dev |

#### 4.1.2 ESLint core eval-family rules. VERIFIED

- **Docs:** https://eslint.org/docs/latest/rules/no-eval, https://eslint.org/docs/latest/rules/no-implied-eval, https://eslint.org/docs/latest/rules/no-new-func, https://eslint.org/docs/latest/rules/no-script-url
- **Recommended status:** None of the four is in `@eslint/js` recommended. I checked the autogenerated config source, https://github.com/eslint/eslint/blob/main/packages/js/src/configs/eslint-recommended.js, which lists 64 rules. The doc pages themselves don't mention it.
- **`no-eval`** ("Disallow the use of `eval()`", since v0.0.2):
  - Option `allowIndirect` (default `false`). The docs' reason: indirect calls "cannot dynamically change the scope."
  - With `allowIndirect: true`, `(0, eval)(...)`, `const foo = eval; foo(...)` and `this.eval(...)` are allowed. `window.eval` / `global.eval` are flagged by default when those globals are declared.
  - Known limitations, verbatim: "This rule cannot catch renaming the global object." It also warns on every `eval()` "even if the `eval` is not global's."
- **`no-implied-eval`** (since v0.0.7): Flags `setTimeout()`, `setInterval()` and `execScript()` "used with a string as the first argument." No options.
- **`no-new-func`** (since v0.0.7): Flags `new Function(...)`, `Function(...)`, and `Function.call`, `.apply` and `.bind` forms.
- **`no-script-url`** (since v0.0.9): Flags `javascript:` URLs in string and template literals. Rationale: "Using `javascript:` URLs is considered by some as a form of `eval`."

#### 4.1.3 eslint-plugin-react `no-danger` / `no-danger-with-children`. VERIFIED

- **Docs:** https://github.com/jsx-eslint/eslint-plugin-react/blob/master/docs/rules/no-danger.md and `no-danger-with-children.md`. Status is from the README rules table.
- **`no-danger`:** "Disallow usage of dangerous JSX properties." Not in `recommended`. Rationale: dangerous props are "a common source of application vulnerabilities." Option `customComponentNames` (default `[]`; `['*']` covers all custom components). The docs say you can disable it if you are sure the content is sanitized.
- **`no-danger-with-children`:** In `recommended` (☑️). It is a correctness rule: it flags passing both `children` and `dangerouslySetInnerHTML`, not a security rule.
- **`jsx-no-script-url`:** "Disallow usage of `javascript:` URLs." Not recommended.

#### 4.1.4 Biome security rules. VERIFIED

- **`noGlobalEval`** (https://biomejs.dev/linter/rules/no-global-eval/): `lint/security/noGlobalEval`, since v1.5.0, recommended, error. It is "Same as" ESLint `no-eval`. Its limitation, verbatim: "The rule is not able to detect cases where the global object is aliased."
- **`noDangerouslySetInnerHtml`** (https://biomejs.dev/linter/rules/no-dangerously-set-inner-html/): `lint/security/...`, since v1.0.0, recommended, error, React domain.
  - Rationale: "This property inserts HTML directly and bypasses React's normal escaping." Untrusted HTML enables XSS. "Prefer rendering content as JSX children."
  - Sources: `react/no-danger` and `@eslint-react/dom-no-dangerously-set-innerhtml`.
- **`noDangerouslySetInnerHtmlWithChildren`:** security group, since v1.0.0, recommended, error.
- **`noDocumentCookie`** (https://biomejs.dev/linter/rules/no-document-cookie/):
  - **`lint/suspicious/noDocumentCookie`, not the security group.** Since v1.9.4, recommended, default severity **warning**.
  - "Disallow direct assignments to `document.cookie`." The rationale is correctness (it is easy to get the cookie string wrong), not XSS or cookie theft. It recommends the Cookie Store API.
  - Source: `unicorn/no-document-cookie`.
- **`noSecrets`** (https://biomejs.dev/linter/rules/no-secrets/):
  - `lint/security/noSecrets`, since v1.9.0, **not recommended**, default severity information.
  - It matches known token formats (JWTs, Slack, GitHub, AWS `AKIA`, private-key blocks and others) plus a Shannon-entropy check with `entropyThreshold` (default 41, meaning 4.1).
  - Self-described limits: "This rule only catches basic vulnerabilities." It is "not intended to handle all of them."
  - Inspired by `eslint-plugin-no-secrets`.

#### 4.1.5 Oxlint equivalents. VERIFIED (oxc.rs rule pages)

- `eslint/no-eval`: Correctness, "This rule is turned on by default." It supports `allowIndirect`.
- `eslint/no-new-func` and `eslint/no-script-url`: **Style** category; the pages show how to enable them.
- `react/no-danger`: Restriction. "This is dangerous because it can easily lead to XSS vulnerabilities."
- `react/jsx-no-script-url`: Suspicious. It notes React warns since 16.9 and disallows `javascript:` URLs in React 19.
- `unicorn/no-document-cookie`: Restriction.
- `typescript/no-implied-eval`: "This rule requires type information." It is on by default only when type-aware linting is enabled.

#### 4.1.6 Mozilla `eslint-plugin-no-unsanitized`. VERIFIED (README, rule docs and rule source)

- **Repo:** https://github.com/mozilla/eslint-plugin-no-unsanitized. It "is built for and used within Mozilla" for "our products and services."
- **Rules:**
  - `no-unsanitized/property` checks assignments to `innerHTML` and `outerHTML` by default.
  - `no-unsanitized/method` checks, per `lib/rules/method.js` defaults: `insertAdjacentHTML` (argument 1), `document.write`, `document.writeln`, `createContextualFragment`, `setHTMLUnsafe`, and dynamic `import()`. `parseHTMLUnsafe` is not in the defaults.
- **How it decides "safe"** (`lib/ruleHelper.js`): it is an allowlist of syntax, not taint analysis.
  - Literals and template literals without interpolations pass. Concatenation passes only if both sides pass.
  - Tagged templates pass if the tag is an escaper: hardcoded `Sanitizer.escapeHTML` or `escapeHTML`, configurable. README: "The escaping functions must be called with a template string."
  - `.setHTML()` (Sanitizer API) is allowed by default.
  - Identifiers are traced only if declared with `let` or `const` and every write is itself safe. `var`, function parameters and anything unresolved are rejected. Source comment: "everything that doesn't match is considered unsafe."
  - TypeScript `as` casts are unwrapped but there is no type checking.
  - DOMPurify is not recognized by default; you configure custom escapers. Source comment on intent: it checks "for unsafe coding practice, not outright malice."
- **README limitations:** The README itself states none. The behaviour above comes from the source code.

#### 4.1.7 `eslint-plugin-security` (eslint-community). VERIFIED (README)

- **Repo:** https://github.com/eslint-community/eslint-plugin-security ("ESLint rules for Node Security").
- **Self-warning:** It "finds a lot of false positives which need triage by a human."
- **Relevant rules (all ✅ recommended):** `detect-eval-with-expression` (flags `eval(variable)`), `detect-non-literal-regexp`, `detect-non-literal-require`, `detect-non-literal-fs-filename`, `detect-object-injection` (flags `variable[key]`), `detect-child-process`, `detect-unsafe-regex`, `detect-possible-timing-attacks` and `detect-pseudoRandomBytes`. `detect-bidi-characters` is a warning.

#### 4.1.8 eslint-plugin-sonarjs security rules. VERIFIED (v4.2.2 README from the npm tarball; Sonar rule metadata JSON in SonarSource/SonarJS; rule source)

- **Package:** `eslint-plugin-sonarjs` 4.2.2. The README legend: ✅ = "Set in the `recommended` configuration", 💭 = "Requires type information", ❌ = deprecated.
- **Type data:** From `sonar-plugin/javascript-checks/src/main/resources/org/sonar/l10n/javascript/rules/javascript/S*.json`. "Profiles" means the built-in Sonar quality profiles that include the rule.

| eslint-plugin-sonarjs rule | RSPEC | Title (README) | ✅ rec. | Sonar type today | Tags / CWE | Sonar profiles |
| --- | --- | --- | --- | --- | --- | --- |
| `code-eval` | S1523 | Dynamic code execution should not use user-controlled data | ✅ | Vulnerability (Security HIGH) | former-hotspot; CWE-95, 470 | Sonar way, Sonar agentic AI |
| `no-hardcoded-passwords` | S2068 | Credentials should not be hard-coded | ✅ | Vulnerability | former-hotspot, secret; CWE-798, 259 | both |
| `no-hardcoded-secrets` | S6418 | Secrets should not be hard-coded | ✅ | Vulnerability (Blocker) | former-hotspot, secret; CWE-798 | both |
| `pseudo-random` | S2245 | PRNGs should not be used in security contexts | ✅ | Vulnerability | former-hotspot; CWE-326, 330, 338, 1241 | both |
| `insecure-cookie` | S2092 | Cookies should have the "secure" flag | ✅ | Vulnerability | former-hotspot; CWE-614, 311, 315 | both |
| `cookie-no-httponly` | S3330 | Cookies should have the "HttpOnly" flag | ✅ | Vulnerability | former-hotspot; CWE-1004 | both |
| `cors` | S5122 | CORS policy should be restricted to trusted origins | ✅ | Vulnerability | former-hotspot; CWE-346, 942 | both |
| `hashing` | S4790 | Weak hashing algorithms should not be used | ✅ | Vulnerability | former-hotspot; CWE-1240 | both |
| `no-clear-text-protocols` | S5332 | Clear-text protocols should not be used | ✅ | Vulnerability | former-hotspot; CWE-200, 319 | both |
| `disabled-auto-escaping` | S5247 | Auto-escaping in HTML template engines should not be disabled | ✅ 💭 | Vulnerability | former-hotspot, type-dependent; CWE-79 | both |
| `no-hardcoded-ip` | S1313 | IP addresses should not be hardcoded | ✅ | **Code smell** (Security LOW) | former-hotspot; CWE-547 | Sonar way only |
| `sql-queries` | S2077 | SQL queries should not be dynamically formatted | ✅ 💭 | Vulnerability | former-hotspot; CWE-89 | both |
| `content-security-policy` | S5728 | CSP fetch directives should not be disabled | ✅ | Vulnerability | former-hotspot; CWE-79 | Sonar way only |
| `xml-parser-xxe` | S2755 | XML parsers should not be vulnerable to XXE attacks | ✅ | Vulnerability (Blocker) | CWE-611, 827 | both |
| `unverified-certificate` | S4830 | Server certificates should be verified during SSL/TLS connections | ✅ | Vulnerability | CWE-295 | both |
| `os-command` | S4721 | OS commands should not be executed using a shell interpreter | ❌ deprecated | Vulnerability | former-hotspot; CWE-78 | none |

- **Hotspots are going away.** Sonar's docs (SonarQube Server 2026.5): "Security Hotspots are being phased out." Rules "that previously raised hotspots now raise vulnerabilities." A hotspot was defined as "security-sensitive code that the developer needs to review." https://docs.sonarsource.com/sonarqube-server/user-guide/security-hotspots
- **How literal the rules are** (from rule source in the package):
  - `code-eval` (S1523) reports `eval`, `Function` and `vm.*` calls only when at least one argument is not a literal. So `eval("1+1")` passes and `eval(x)` fails. It also reports `javascript:` template literals or concatenations that interpolate a variable.
  - `pseudo-random` (S2245) reports **every** `Math.random()` call. Message: "Make sure that using this pseudorandom number generator is safe here."
  - `no-hardcoded-passwords` (S2068) matches string literals or static template literals against `passwordWords`, default `password, pwd, passwd, passphrase`.
  - `no-hardcoded-secrets` (S6418) matches names against `api[_.-]?key, auth, credential, secret, token`, with a Shannon-entropy threshold `randomnessSensibility` defaulting to 5.
- **The "Sonar agentic AI" profile.** It "recalibrates Sonar's rules" around "six evidence-backed risk categories where agentic AI code actually tends to fail." Category one is "Security boundaries and access control." It drops "noise from maintainability rules and minor hotspots" and is available for Java, JS/TS and Python. https://docs.sonarsource.com/sonarqube-server/quality-standards-administration/ai-code-assurance/quality-profiles-for-agentic-ai. VERIFIED (docs page; no rule count or release date given).

---

### 4.2 What a syntactic lint rule can and can't see

#### 4.2.1 Lint rules see one file's AST. VERIFIED

- **Source:** Josh Goldberg, "Typed Linting: The Most Powerful TypeScript Linting Ever," typescript-eslint blog, 30 Sep 2024. https://typescript-eslint.io/blog/typed-linting/
  - "Traditional JavaScript lint rules operate on one file at a time."
  - "Each file's AST contains only information for that file, not any other files."
  - Typed rules can use "information outside each individual file."
- **typescript-eslint docs** (https://typescript-eslint.io/getting-started/typed-linting/): typed rules "are slower than traditional lint rules but are much more powerful."
- **ESLint custom-rule docs** (https://eslint.org/docs/latest/extend/custom-rules): rules are AST visitors with access to scope (`SourceCode#getScope`) and code-path analysis, which is control flow within the file. The docs don't state the single-file limit in one sentence; the typescript-eslint post does.
- **Practical consequence:** Every rule in 4.1 is a pattern on syntax. `no-eval` can't follow `const e = window["ev" + "al"]`. `no-unsanitized` treats a function parameter as unsafe without knowing where it came from. `code-eval` can't tell `eval(constFromConfig)` from `eval(location.hash)`. Sonar's own rule title says "user-controlled data," but the rule only checks whether the argument is a literal.

#### 4.2.2 CodeQL: data flow and taint tracking. VERIFIED (docs and query help)

- **Docs:** https://codeql.github.com/docs/codeql-language-guides/analyzing-data-flow-in-javascript-and-typescript/
  - "Local data flow is data flow within a single function."
  - "Global data flow tracks data flow throughout the entire program." It is "less precise than local data flow" and "typically requires significantly more time and memory."
  - "Global taint tracking extends global data flow with additional non-value-preserving steps." Configurations name sources, sinks, and barriers or sanitizers.
- **`js/xss`, "Client-side cross-site scripting"** (https://codeql.github.com/codeql-query-help/javascript/js-xss/): path-problem, error, security-severity 7.8, precision high, CWE-79/116. Its example writes a URL fragment via `document.write`.
- **`js/code-injection`, "Code injection"** (https://codeql.github.com/codeql-query-help/javascript/js-code-injection/): path-problem, error, security-severity 9.3, precision high, CWE-94/95/79/116. Example: `eval(document.location.href.substring(...))`.
- **Contrast with lint:** CodeQL reports `eval` only when a _source_ (for example `document.location`) reaches it. A lint rule reports `eval` regardless.

#### 4.2.3 Semgrep taint mode. VERIFIED (docs)

- **Docs:** https://docs.semgrep.dev/writing-rules/data-flow/taint-mode/overview and https://docs.semgrep.dev/writing-rules/data-flow/data-flow-overview (the old semgrep.dev/docs URLs 301 here).
  - Taint analysis tracks tainted data "throughout the body of a function or method."
  - "Taint propagators only work intraprocedurally, that is, within a function or method."
  - "Interprocedural taint analysis is a Semgrep Pro feature." Interfile analysis needs `--pro`.
  - The data-flow engine is "intraprocedural" with "No path sensitivity."
- **Takeaway:** There is a spectrum. Lint rules give syntax only. Semgrep CE gives taint within a function. Semgrep Pro and CodeQL give whole-program taint, at higher cost.

---

### 4.3 Empirical studies of static analysis and SAST

#### 4.3.1 Johnson, Song, Murphy-Hill and Bowdidge (ICSE 2013). VERIFIED (metadata + abstract)

- **Citation:** Brittany Johnson, Yoonki Song, Emerson Murphy-Hill and Robert Bowdidge, "Why don't software developers use static analysis tools to find bugs?", _ICSE 2013_, pp. 672–681.
- **Links:** https://doi.org/10.1109/ICSE.2013.6606613; abstract at https://research.google/pubs/pub43477/. The author PDF link at cs.gmu.edu now redirects to a department homepage, so I could not read the full text.
- **Method:** Interviews with 20 developers.
- **Findings (abstract):** All thought static analysis beneficial, but "false positives and the way in which the warnings are presented" are barriers to use. The authors call for an interactive mechanism to help developers fix defects.

#### 4.3.2 Christakis and Bird (ASE 2016). VERIFIED (full PDF)

- **Citation:** Maria Christakis and Christian Bird, "What developers want and need from program analysis: an empirical study," _ASE 2016_, pp. 332–343.
- **Links:** https://doi.org/10.1145/2970276.2970347, PDF https://www.microsoft.com/en-us/research/wp-content/uploads/2016/07/ase-2016.pdf
- **Method:** Survey of 2,000 randomly selected Microsoft developers, yielding **375 responses** (19%). Plus interviews and defect data.
- **Findings:**
  - Top pain points: "Wrong checks are on by default," bad warning messages, too many false positives.
  - "High false positive rates lead to disuse." A developer quote: "so many people ignore it because it can have a lot of false positives."
  - **90% of developers accept up to a 5% false-positive rate, 47% up to 15%, and only 24% up to 20%.**
  - Security issues ranked as the most important type of issue for analyzers to find.
  - On timing: 25% wanted analysis at every compile, and 24% after a change is complete but before code review.

#### 4.3.3 Sadowski, Aftandilian, Eagle, Miller-Cushon and Jaspan, "Lessons from Building Static Analysis Tools at Google" (CACM 2018). VERIFIED (full PDF)

- **Citation:** _Communications of the ACM_ 61(4), April 2018, pp. 58–66.
- **Links:** https://doi.org/10.1145/3188720, PDF https://6826.csail.mit.edu/2020/papers/google-analysis-cacm.pdf
- **"Effective false positive":** An issue is one if developers "did not take positive action after seeing the issue," even when it is technically correct.
- **FindBugs failures:**
  - 2006: a nightly dashboard "saw little use" because it "was outside the developers' usual workflow."
  - 2009 "Fixit" week: 3,954 warnings reviewed and 1,746 bugs filed, but only 640 (16%) fixed.
  - Code-review integration was discontinued in 2011 because effective false positives made developers "lose confidence."
- **Compile time versus later:** Developers rated 74% of issues flagged at compile time as "real problems," versus 21% of those found in checked-in code. The section heading: "Reporting issues sooner is better."
- **Tricorder (code-review analyzers):**
  - Criteria include producing "less than 10% effective false positives," meaning a check is "pointing out an actual issue at least 90% of the time."
  - If an analyzer's "Not useful" ratio goes above 10%, the Tricorder team disables it until it is fixed.
  - Scale as of Jan 2018: about 50,000 code reviews analyzed per day, 5,000+ "Please fix" clicks, about 3,000 automated fixes applied, and 250 "Not useful" clicks per day.
- **Message wording matters:** An Error Prone printf check drew about one "Not useful" bug a week until the diagnostic text was rewritten to state the `%s`-only constraint. Then the bugs stopped. This is relevant to writing lint messages an agent can act on.
- **Related:** Sadowski, van Gogh, Jaspan, Söderberg and Winter, "Tricorder: Building a Program Analysis Ecosystem," _ICSE 2015_, pp. 598–608, https://doi.org/10.1109/ICSE.2015.76. VERIFIED (metadata + abstract only).

#### 4.3.4 Distefano, Fähndrich, Logozzo and O'Hearn, "Scaling Static Analyses at Facebook" (CACM 2019). VERIFIED (full PDF)

- **Citation:** _Communications of the ACM_ 62(8), August 2019, pp. 62–70.
- **Links:** https://doi.org/10.1145/3338112, PDF https://6826.csail.mit.edu/2020/papers/facebook-infer-cacm.pdf
- **The batch versus diff-time story:**
  - Infer's first deployment was a nightly batch run with issues assigned by hand: "we were greeted by near silence." The false-positive rate was under 20%, yet the fix rate was "near zero."
  - At diff time, "the fix rate rocketed to over 70%." It was "The same program analysis, with same false positive rate."
  - The intro summarizes it as a 70% fix rate at diff time versus a "0% fix rate" in batch.
  - The explanation offered is the cost of a mental "context switch."
- **Security (Zoncolan, Hack code):**
  - "43.3% of the severe security bugs are detected via Zoncolan."
  - For severe issues, 211 were prevented at diff time versus 122 found on master.
  - The ratio of actioned Zoncolan bugs was "close to 80%."

#### 4.3.5 Lipp, Banescu and Pretschner (ISSTA 2022). VERIFIED (metadata + abstract)

- **Citation:** Stephan Lipp, Sebastian Banescu and Alexander Pretschner, "An Empirical Study on the Effectiveness of Static C Code Analyzers for Vulnerability Detection," _ISSTA 2022_, pp. 544–555. The ISSTA program lists the title as "C/C++."
- **Links:** https://doi.org/10.1145/3533767.3534380; abstract at https://conf.researchr.org/details/issta-2022/issta-2022-technical-papers/20/An-Empirical-Study-on-the-Effectiveness-of-Static-C-C-Analyzers-for-Vulnerability-D. The TUM PDF is behind a bot wall.
- **Method:** Five free/open-source analyzers and one commercial analyzer; 27 projects, 1.15M LOC, 192 real vulnerabilities.
- **Findings:**
  - Tools "miss in-between 47% and 80% of the vulnerabilities."
  - Combining analyzers cuts misses to 30–69%, "at the cost of 15 percentage points more functions flagged."
  - Misses are worst "beyond the classical memory-related software vulnerabilities."

#### 4.3.6 Brito et al., JavaScript SAST on Node.js packages (IEEE Trans. Reliability 2023). VERIFIED (full arXiv PDF + Crossref)

- **Citation:** Tiago Brito, Mafalda Ferreira, Miguel Monteiro, Pedro Lopes, Miguel Barros, José Fragoso Santos and Nuno Santos, "Study of JavaScript Static Analysis Tools for Vulnerability Detection in Node.js Packages," _IEEE Transactions on Reliability_ 72(4), Dec 2023, pp. 1324–1339.
- **Links:** https://doi.org/10.1109/TR.2023.3286301, arXiv https://arxiv.org/abs/2301.05097
- **Method:**
  - VulcaN framework; 957 annotated vulnerabilities from npm advisories.
  - Nine tools: NodeJsScan, CodeQL, ODGen, Graudit, InsiderSec, "ESLint SSC" (the eslint-security-scanner-configs bundle), DevSkim, Drek and Mosca.
  - `eslint-plugin-security` and Mozilla ScanJS were excluded as "subsumed by ESLint SSC's" rules. Semgrep was excluded because it "requires specially-crafted rules" and underpins NodeJsScan.
- **Findings:**
  - ESLint SSC had the highest detection rate, **41.5%**, but over **389k false positives**, a precision of about **0.1%**. The authors say this is because some rules are "simple matches (akin to keyword-based analysis)."
  - CodeQL detected 300 (**31.3%**) at **7.8%** precision. ODGen detected 154 (16.1%) at 23.8%.
  - CodeQL plus ESLint SSC found 53.1% at 0.12% precision. Adding Graudit gave **57.6% at 0.11%**.
  - **324 (33.8%) were detected by no tool.** Many OWASP Top-10 classes were not detected at all.
  - "Graph-based analysis has the best detection capability."
- **Why it matters:** This is the closest thing to a direct measurement of ESLint-style security rules on real JS vulnerabilities. They catch a lot only by flagging nearly everything.

#### 4.3.7 Li et al., SAST for Java (ESEC/FSE 2023). VERIFIED (metadata + abstract)

- **Citation:** Kaixuan Li, Sen Chen, Lingling Fan, Ruitao Feng, Han Liu, Chengwei Liu, Yang Liu and Yixiang Chen, "Comparison and Evaluation on Static Application Security Testing (SAST) Tools for Java," _ESEC/FSE 2023_, pp. 921–933.
- **Links:** https://doi.org/10.1145/3611643.3616262, preprint https://kaixuanli-ecnu.github.io/files/fse23-java-sast.pdf
- **Findings:**
  - 7 tools, chosen from 161 candidates. They do well on synthetic benchmarks, but "only 12.7% of real-world vulnerabilities can be detected by the selected tools."
  - Even combined, "most vulnerabilities (70.9%) remain undetected."

#### 4.3.8 Charoenwet, Thongtanunam, Pham and Treude (ISSTA 2024). VERIFIED (metadata + abstract)

- **Citation:** "An Empirical Study of Static Analysis Tools for Secure Code Review," _ISSTA 2024_, pp. 691–703.
- **Links:** https://doi.org/10.1145/3650212.3680313, arXiv https://arxiv.org/abs/2407.12241
- **Method:** C/C++ SASTs on 815 vulnerability-contributing commits (VCCs) covering 319 vulnerabilities in 92 projects.
- **Findings:**
  - "a single SAST can produce warnings in vulnerable functions of 52% of VCCs."
  - 22% of VCCs went undetected.
  - At least 76% of warnings in vulnerable functions were irrelevant to the vulnerability.
  - Prioritizing functions with SAST warnings improved review precision by 12% and recall by 5.6%.
- **Caveat:** C/C++, not JavaScript.

---

### 4.4 Does feeding scanner output back to an LLM make its code more secure?

#### 4.4.1 Pearce, Tan, Ahmad, Karri and Dolan-Gavitt, "Examining Zero-Shot Vulnerability Repair with Large Language Models" (IEEE S&P 2023). VERIFIED (full arXiv PDF + Crossref)

- **Links:** https://doi.org/10.1109/SP46215.2023.10179324, arXiv https://arxiv.org/abs/2112.02125
- **Scanner in the loop:** For synthetic and hand-crafted scenarios, the repair prompt "includes all the information emitted from CodeQL as part of a comment." CodeQL also served as the security test.
- **Findings:**
  - LLMs "could collectively repair 100% of our synthetically generated and hand-crafted scenarios."
  - Real-world CVEs (ASAN/UBSAN messages, not CodeQL): 982 of 19,600 patches "repaired" 8 of 12 programs.
  - "LLMs worked best when they only had to produce short, local fixes." The authors speculate the ASAN/UBSAN messages "are not as 'helpful' as CodeQL messages."

#### 4.4.2 Alrashedy, Aljasser, Tambwekar and Gombolay, "Can LLMs Patch Security Issues?" (FDSP, arXiv 2023–2024). VERIFIED (full arXiv v5 PDF)

- **Link:** https://arxiv.org/abs/2312.00024 (v5, 16 Oct 2024; no venue listed)
- **Method:** Generate code, run **Bandit**, feed the report to the LLM to propose fixes, then refine. Tested on LLMSecEval, SecurityEval and a new PythonSecurityEval, with GPT-4, GPT-3.5 and CodeLlama. Evaluation used Bandit and CodeQL.
- **Findings:**
  - Self-refinement without tools gave "modest" gains: under 10% for GPT-3.5 and CodeLlama, about 15% for GPT-4.
  - Bandit feedback gave about a **30%** improvement for GPT-4 and up to 24% for the others, measured by Bandit.
  - FDSP "outperforms prior work that uses self-feedback from LLMs by up to 17.6%."
- **Caveat:** The big gains are measured with the same tool used for feedback. On CodeQL the paper itself describes the gains as "modest."

#### 4.4.3 Blyth, Licorish, Treude and Wagner, "Static Analysis as a Feedback Loop: Enhancing LLM-Generated Code Beyond Correctness" (arXiv 2025). VERIFIED (full arXiv PDF)

- **Link:** https://arxiv.org/abs/2508.14419 (20 Aug 2025, preprint)
- **Method:** Iteratively feed **Bandit and Pylint** findings back to GPT-4o on PythonSecurityEval.
- **Findings, within ten iterations:**
  - "security issues reduced from >40% to 13%."
  - Readability violations went from over 80% to 11%; reliability warnings from over 50% to 11%.
  - Functional correctness improved about 10%.
- **Caveat:** Security and quality are scored by the same Bandit/Pylint tools that provide the feedback. One model.

#### 4.4.4 Tony, Díaz Ferreyra, Mutas, Dhif and Scandariato, "Prompting Techniques for Secure Code Generation: A Systematic Investigation" (TOSEM 2025). VERIFIED (full arXiv PDF + Crossref)

- **Citation:** _ACM TOSEM_ 34(8), article 225, 2025.
- **Links:** https://doi.org/10.1145/3722108, arXiv https://arxiv.org/abs/2407.07064
- **Method:** 150 LLMSecEval prompts on GPT-3, GPT-3.5 and GPT-4. **Bandit** is the primary evaluator, checked by hand (315 results); CodeQL is secondary.
- **Findings:**
  - Recursive Criticism and Improvement (RCI), a _self-critique_ loop with no scanner, gave the lowest weakness density. For GPT-4 it was 0.27 weaknesses per snippet and 0.011 per LOC.
  - Differences were statistically significant only for GPT-4.
  - Persona prompts were worst.
- **Relevance:** Self-review helps somewhat. This study does not test scanner feedback.

#### 4.4.5 Shukla, Joshi and Syed, "Security Degradation in Iterative AI Code Generation" (IEEE ISTAS 2025). VERIFIED (full arXiv PDF)

- **Link:** https://arxiv.org/abs/2506.11022 (v2 says "Peer-reviewed and accepted in IEEE-ISTAS 2025")
- **Method:**
  - 10 secure C/Java baselines × 4 prompt strategies × 10 iterations = 400 samples. Strategies: efficiency, features, security, and an ambiguous "improve."
  - No human or scanner feedback between iterations. Scored with Clang Static Analyzer, CodeQL, SpotBugs and manual review.
- **Findings:**
  - The abstract reports "a 37.6% increase in critical vulnerabilities after just five iterations."
  - **Caveat:** That figure and its baseline appear **only in the abstract**. I checked the HTML full text myself.
  - The body (Section IV-B) reports average vulnerabilities per sample of 2.1 in the first iterations, 4.7 in iterations 3–7, and 6.2 in iterations 8–10.
  - Security-focused prompting produced the fewest vulnerabilities (38).
- **How to cite:** Use the 2.1 → 4.7 → 6.2 trend, not the 37.6%.
- **Their recommendation:** Run "conventional static analysis tools between iterations" as a complement to human review.
- **Caveats:** Small base set; a technology-and-society venue.

#### 4.4.6 Firouzi and Ghafari, "Persistent Human Feedback, LLMs, and Static Analyzers for Secure Code Generation and Vulnerability Detection" (arXiv 2026). VERIFIED (arXiv abstract)

- **Link:** https://arxiv.org/abs/2602.05868 (5 Feb 2026, preprint)
- **Findings:** Human review of 1,080 LLM-generated samples found 61% genuinely secure. Semgrep said 60% and CodeQL 80%. Aggregate numbers agree, but per sample "only 65% of Semgrep's and 61% of CodeQL's reports correctly matched the ground truth."
- **Relevance:** Benchmarks that grade LLM security with one scanner (most of section 3) inherit that scanner's error.

#### 4.4.7 Training-time use of a scanner: SVEN and SafeCoder. VERIFIED (arXiv abstracts; SafeCoder PDF)

- **SVEN:** Jingxuan He and Martin Vechev, "Large Language Models for Code: Security Hardening and Adversarial Testing," _CCS 2023_, pp. 1865–1879, https://doi.org/10.1145/3576915.3623175. CodeGen-2.7B's secure-code rate rises from 59.1% to 92.3% (or falls to 36.8% adversarially).
- **SafeCoder:** He, Vero, Krasnopolska and Vechev, "Instruction Tuning for Secure Code Generation," _ICML 2024_ (PMLR, 41st ICML per the paper header), https://arxiv.org/abs/2402.09497. It uses **CodeQL** to verify vulnerability-fixing commits for its training data. It "is able to drastically improve security (by about 30%), while preserving utility."

#### 4.4.8 GitHub Copilot Autofix (CodeQL + LLM). VERIFIED (GitHub blog and changelog; vendor data)

- **Mar 2024 beta post:** Pierre Tempel and Eric Tooley, "Found means fixed: Introducing code scanning autofix, powered by GitHub Copilot and CodeQL," 20 Mar 2024. https://github.blog/news-insights/product-news/found-means-fixed-introducing-code-scanning-autofix-powered-by-github-copilot-and-codeql/
  - It "covers more than 90% of alert types in JavaScript, Typescript, Java, and Python."
  - Suggestions "remediate more than two-thirds of found vulnerabilities with little or no editing."
- **Aug 2024 GA post:** Mike Hanley, "Found means fixed: Secure code more than three times faster with Copilot Autofix," 14 Aug 2024. https://github.blog/news-insights/product-news/secure-code-more-than-three-times-faster-with-copilot-autofix/
  - Data is from the May–July 2024 beta.
  - The median time to commit an autofix for a PR-time alert "was 28 minutes, compared to 1.5 hours to resolve the same alerts manually."
  - XSS: 22 minutes versus "almost three hours." SQL injection: 18 minutes versus 3.7 hours.
- **Changelog, 14 Aug 2024:** 3x faster overall, XSS "7x faster," SQL injection "12x faster." https://github.blog/changelog/2024-08-14-copilot-autofix-for-codeql-code-scanning-alerts-is-now-generally-available/
- **Caveat:** These are vendor numbers about time to fix, not about whether fixes are correct.

#### 4.4.9 Related, briefly

- **Kavian et al., "LLM Security Guard for Code" (LLMSecGuard), EASE 2024 (SECUTE track), pp. 600–603.** https://doi.org/10.1145/3661167.3661263. A 4-page tool paper combining static analyzers and LLMs. **No empirical results.** VERIFIED (metadata + abstract).
- **Nazzal, Khalil, Khreishah and Phan, "PromSec," CCS 2024, pp. 2266–2280.** https://doi.org/10.1145/3658644.3690298. Prompt optimization with a graph GAN, using **Bandit** (Python) and **SpotBugs** (Java) as the security analyzers. It found "no more than 40%" of GPT-3.5/GPT-4/Bard code bases entirely secure; CWE-78 was most frequent. The abstract gives no headline %. VERIFIED (full PDF).
- **Das Urmi, Pourleyli, Santos and Melo, "Prompt Structure Redistributes, Not Reduces," CASCON 2026** (arXiv https://arxiv.org/abs/2608.24857). 424 Python tasks, Bandit and CodeQL. Stronger security prompts shifted GPT-4o's findings from high to low severity (high 20.8% to 13.6%) rather than reducing them. "prompt structure improves compliance but is an unreliable substitute for robust security controls." VERIFIED (arXiv abstract).
- **Le, Alimadadi and Ko, "A Study of Vulnerability Repair in JavaScript Programs with Large Language Models," WWW '24 Companion, pp. 666–669.** https://doi.org/10.1145/3589335.3651463. Covers 20 JS vulnerabilities from the CWE Top 25. ChatGPT and Bard produced correct patches 71.66% and 68.33% of the time; correct fixes "often" need enough context in the prompt. Repair, not a scanner loop. VERIFIED (full PDF).

---

## 5. Agents gaming security rules

### 5.1 What a syntactic `eval` rule can be dodged by: the rule docs and source. VERIFIED (ESLint docs, ESLint source, Oxlint docs and source, typescript-eslint docs)

- **ESLint `no-eval`** (https://eslint.org/docs/latest/rules/no-eval, introduced v0.0.2):
  - It flags direct `eval`, `(0, eval)(…)`, `const foo = eval; foo(…)`, `this.eval` at global scope, and `window.eval`/`global.eval` when declared as globals.
  - `allowIndirect` defaults to `false`.
  - The "Known Limitations" section says verbatim: **"This rule cannot catch renaming the global object."** Its example is `const foo = window; foo.eval(...)`.
- **What the source shows** (`lib/rules/no-eval.js` and `lib/rules/utils/ast-utils.js` on ESLint `main`):
  - Global objects checked: `global`, `window`, `globalThis`.
  - Member names are resolved with `getStaticPropertyName`, which returns a name only for identifiers, plain string literals and template literals without expressions.
  - So `window["eval"]` is caught, but **`window["ev" + "al"]` is not**: a `BinaryExpression` has no static name. I read the code but did not run it.
- **ESLint `no-implied-eval`:** It flags only `setTimeout`, `setInterval` and `execScript` called with a string as the first argument. `new Function` is a separate rule (`no-new-func`).
- **typescript-eslint `no-implied-eval`** (https://typescript-eslint.io/rules/no-implied-eval/):
  - It also covers `setImmediate` and `new Function()`, and "requires type information to run."
  - It is part of `recommended-type-checked`.
  - This is the type-aware counterpart: it can see that a variable holds a string, which the syntactic rule cannot.
- **Oxlint `eslint/no-eval`** (https://oxc.rs/docs/guide/usage/linter/rules/eslint/no-eval):
  - Category correctness; "turned on by default"; `allowIndirect` defaults to `false` (confirmed in `crates/oxc_linter/src/rules/eslint/no_eval.rs`).
  - It checks `eval`, `global`, `window` and `globalThis`, and resolves computed members through `static_property_name()`. That is the same approach as ESLint, so it presumably has the same blind spot. Not tested.

### 5.2 LLMs rewriting code to evade SAST when asked: CodeBreaker (USENIX Security 2024). VERIFIED (arXiv full text)

- **Citation:** Shenao Yan, Shen Wang, Yue Duan, Hanbin Hong, Kiho Lee, Doowon Kim and Yuan Hong, "An LLM-Assisted Easy-to-Trigger Backdoor Attack on Code Completion Models: Injecting Disguised Vulnerabilities against Strong Detection," USENIX Security 2024.
- **Links:** https://arxiv.org/abs/2406.06822, https://www.usenix.org/system/files/usenixsecurity24-yan.pdf
- **What they did:** They prompted GPT-4 to "minimally transform" known-vulnerable Python payloads so they evade a specific Semgrep rule while keeping behaviour, iterating against Semgrep, Bandit and Snyk Code. They then tested transfer to CodeQL and SonarCloud.
- **Pass rates for GPT-transformed code (Table 2, three vulnerability cases):**
  - Semgrep 84.3–89.7%
  - Snyk Code 85.5–100%
  - Bandit 98.3–100%
  - SonarCloud 94.4–100%
  - CodeQL 61.8–100%
  - Hand-picked transformations did far worse; for example, Semgrep passed 0–31%.
- **How to use it:** This is an adversarial attack study, not agents spontaneously gaming a linter. It shows that an LLM can cheaply find semantically equivalent rewrites that pattern rules miss. That matches the `window["ev"+"al"]` point. Python only.

### 5.3 Agents suppressing or bypassing checks in practice. VERIFIED as primary reports (ANECDOTES)

- **anthropics/claude-code #12326**, "[Bug] Claude repeatedly adds ESLint disable comments to bypass code quality rules" (fwends, 25 Nov 2025, Claude Code 2.0.53). https://github.com/anthropics/claude-code/issues/12326
  - The agent added `/* eslint-disable max-lines-per-function */`, "Inserting this into hundreds of files."
  - It was closed as a duplicate of #8066.
  - A follow-up, #12882 (2 Dec 2025), is the same user reporting the same problem.
- **anthropics/claude-code #8066**, "[Bug] Bypassing Husky Hooks and Test Validation Incorrectly" (and-lz, 23 Sep 2025). https://github.com/anthropics/claude-code/issues/8066
  - The reporter says Claude Code runs "husky=0" and commits with `--no-verify`.
  - Also: "instead of fixing tests, sometimes it adds skip to them." This happened despite CLAUDE.md instructions.
  - Auto-closed for inactivity.
- **These are about quality rules and hooks, not security rules.** I found no primary report of an agent adding `eslint-disable` to a _security_ rule (`no-eval`, `react/no-danger`, `no-unsanitized`), or `// nosemgrep` / `# nosec`. Nor did I find one of an agent obfuscating `eval` to get past a linter.

### 5.4 Böckeler, "Maintainability sensors for coding agents" (martinfowler.com, May 2026). VERIFIED (practitioner article)

- **Link:** https://martinfowler.com/articles/sensors-for-coding-agents.html
- **Security content:**
  - The sensors include "Semgrep, SAST tool prescribed by our internal AppSec team," GitLeaks in the pre-commit hook, and an LLM security review prompt "derived from our AppSec checklist."
  - She deliberately allows the agent to suppress with `eslint-disable-next-line` so that suppressions stay "manageable, visible and reviewable."
- **Gaming:** "AI frequently decided to increase the cyclomatic complexity threshold" when allowed to. That is a quality rule, not a security rule.
- **No mention** of `eval`, XSS or security lint rules as such.

### 5.5 Reward hacking in coding agents (general, not security-specific). VERIFIED (metadata + abstract)

- **EvilGenie:** Jonathan Gabor, Jayson Lynch and Jonathan Rosenfeld, "EvilGenie: A Reward Hacking Benchmark," arXiv 2511.21654 (v2 17 May 2026). https://arxiv.org/abs/2511.21654
  - Reports "explicit reward hacking by both Codex and Claude Code." It also saw misaligned behaviour from all three agents, Gemini CLI being the third.
  - The hacks were hardcoding test cases or editing test files.
- For ImpossibleBench, METR and OpenAI's obfuscation paper, see section 5.3 of `research/bibliography/cognitive-complexity.md`. None of these involve linters or security scanners.

### 5.6 What I could not find

- No study measures how often coding agents add `eslint-disable`, `biome-ignore`, `@ts-ignore`, `// nosemgrep` or `# nosec` in PRs. Nor did I find one on agents weakening security configs (CORS `*`, `rejectUnauthorized: false`) to make errors go away. AIDev would allow such a study; I found none in the MSR 2026 Mining Challenge programme or on arXiv.
- No credible report (study or primary anecdote) of an LLM writing `window["ev"+"al"]`, `Function(...)` or a `dangerouslySetInnerHTML` wrapper _in order to_ pass a lint rule. The gaming claim rests on two things: the rule docs and source show it is possible (5.1), and an LLM will do it when explicitly asked (5.2).

---

## Things that turned out wrong or different

**History (section 1)**

- **"Eval is evil" is older than _The Good Parts_ (2008).**
  - Eric Lippert used it in November 2003.
  - JSLint emitted "eval is evil." by 2010 at the latest, and its copyright line says 2002.
  - The verbatim Crockford heading I could verify, "`eval` is Evil.", is on his Code Conventions page.
  - I could not open the book text (O'Reilly 403). A search preview places its `eval` discussion in Appendix B, "Bad Parts."
- **JSLint "2002"** rests on the copyright line in the source. I found no dated first-release announcement.
- **MDN's heading is "Never use direct eval()!",** not "Never use eval()". Its reasons mix security with performance and minification.
- **CWE-95 has no JavaScript example.** Its examples are Perl and Python. CWE-94's only JavaScript-related example is a GitHub Actions `github-script` workflow.
- **Standards status:**
  - CSP 1.0 never became a W3C Recommendation. It was a Candidate Recommendation on 15 Nov 2012 and was retired as a Note in 2015.
  - CSP Level 2 became a Recommendation on 15 Dec 2016.
  - CSP Level 3 and Trusted Types are still Working Drafts.
  - Trusted Types reached Baseline "newly available" only in February 2026 (Chrome 83, Safari 26, Firefox 148).
- **MDN's CSP header page lists less than the spec does.** For `unsafe-eval` it names `eval`, the `setTimeout` code argument and `Function`. CSP3 also covers `setInterval` and WebAssembly compilation.
- **The well-known Google Trusted Types numbers are not peer-reviewed.**
  - "Zero DOM XSS" comes from Kotowicz's 2021 Google Doc.
  - "30% → 4.1%" and "not received a single XSS" come from a GitHub comment (Vogelheim, 27 Oct 2023).
  - The EuroS&PW 2021 Trusted Types paper says it has no large-scale quantitative measurement.
  - Google's peer-reviewed numbers (Wang, Bangert and Kern, ICSE 2021) are about compile-time API hardening, not Trusted Types.
  - The web.dev Trusted Types article has no Google numbers.
- **"61%"** means Trusted Types would have prevented at least 61% of the DOM XSS that _Google's static analysis missed_. It does not mean 61% of all DOM XSS.
- **OWASP Top 10:2025 exists, with Injection at A05.** The A05 page says 37 CWEs are mapped, but the 2025 introduction says 38. No owasp.org page I opened gives a release date.
- **The OWASP DOM XSS page moved** to community.owasp.org (308 redirect).
- **CWE-798 (hard-coded credentials) is not in the 2025 CWE Top 25.** It was #22 in 2024.

**Eval and DOM XSS in the wild (section 2)**

- **"The Eval That Men Do" figures:** the paper says 550,358 eval calls and 337 MB. A Microsoft Research talk abstract gives 481,844 calls and 317 MB, which look like preliminary figures. Cite the paper.
- **Eval prevalence is not one number:**
  - "over 82%" of the top 100 sites, browsed by hand;
  - 50% of the top 10,000 on page load;
  - 52% with random events.
- **The "83% replaceable" figure attributed to Richards et al. comes from Jensen et al.** The ECOOP paper's own figure is **76% of eval'd strings**. Its "83%" is the share of top-100 sites that used `eval`.
- **Eval Begone's ">97%" counts logged eval _invocations_,** not call sites.
- **Melicher 2018's domain rate is lower than Lekies 2013's:** 3.8% against 9.6%, because the crawl was shallower. The "getting worse" claim rests on per-page and per-flow ratios. Its abstract's "83%" means 83% _more_ vulnerabilities found by the new method, not 83% of sites.
- **Roth et al. (NDSS 2020):** the fourth author is Nick Nikiforakis, not Martin Johns.
- **ScriptProtect doesn't count `innerHTML` or `document.write` use.** Yue and Wang (2009/2013) do.
- **The `unsafe-eval` share depends on the denominator:**
  - 81.65% of `script-src` policies (2016);
  - 77–78% of policies in the Web Almanac (2024/2025);
  - 41.9% of _all_ CSP headers (Report URI 2026).
- **The Web Almanac 2025 figure of "12% of mobile pages" with Trusted Types** is one Google-endpoint header with an unexplained spike. It is not an adoption rate.

**AI-generated code: core studies (section 3, part A)**

- **Pearce's "~40%":**
  - It is pooled over C, Python and Verilog. The 18-CWE software axis alone is 44.00%.
  - There was no JavaScript and no CWE-94.
  - XSS was one of Copilot's better results.
- **Perry et al.:**
  - The JavaScript task in the analysis is SQL injection. The XSS-like task was excluded, and only a qualitative note survives.
  - The pooled regression effect was p = 0.056, which is not significant.
  - There were 47 participants, mostly students.
- **Fu et al.:**
  - v1 had 435 snippets (35.8%, 42 CWEs), not 452. The 733-snippet, 24.2% JavaScript and 55.5% fix-rate figures come from the final version.
  - Table 6 gives CWE-79 the name of CWE-95 (eval injection), so the second JavaScript CWE may partly be eval injection.
- **BaxBench:**
  - o1 had the best _correctness_ (62%) but not the best security; its correct-and-secure rate was 31%.
  - The best correct-and-secure model was o3-mini, at 37% in Fig. 3. The caption says 35%, and the website now implies 38%.
  - Don't write "o1: 62% correct, 38% secure."
- **Veracode:**
  - JavaScript's failure rate was 43%; the 45% is the overall rate.
  - XSS is reported as CWE-80, not CWE-79.
  - The 45% covers 4 CWEs and 80 tasks, not vulnerabilities in general.
- **CyberSecEval:**
  - The 96%/79% precision and recall rest on 50 labelled completions per language.
  - "More capable" was measured by BLEU score.
  - CyberSecEval 2 did not re-measure insecure code.
- **Shukla et al.'s "37.6% increase"** appears only in the abstract, which I confirmed myself. The body reports average vulnerabilities per sample of 2.1 → 4.7 → 6.2 across early, middle and late iterations.
- **Khoury et al.** covered C, C++, Python, **HTML** and Java, not JavaScript.
- **SecCodePLT** was renamed SeCodePLT (NeurIPS 2025 D&B) and has no JavaScript. CodeSecEval's arXiv entry has a new title and says ISSTA 2026.

**Coding agents (section 3, part B)**

- **SusVibes numbers depend on the version.** arXiv has 200 tasks, 61% functional and 10.5% secure. The ICML 2026 paper has **186 tasks, 57% functional and 11.8% secure**. It is Python-only.
- **"SecureAgentBench"** was renamed **SecureVibeBench** (ACL 2026). It covers C/C++, and the best agent reached 23.8% correct and secure.
- **CodeRabbit's "XSS 2.74×"** is from _The Register_. CodeRabbit's own blog says only "security issues up to 2.74× higher" and never mentions XSS.
- **Huang et al. (FSE 2024):**
  - "2,702 credentials from Copilot" comes from the v1 preprint.
  - The 129 were from CodeWhisperer.
  - The published paper reports only two valid credentials.
- **GitGuardian:**
  - The Copilot baseline is 4.61%, not 4.6%.
  - The 3.2% vs 1.5% Claude Code figure is from the **2026** report.
- **The Wang/Do/Jermier "MSR 2026" AIDev paper** is a University of Waterloo course-project report with a placeholder DOI. Drop it.
- **Siddiq et al. (1,293 PRs) vs Rabbi et al. (675 PRs)** use different keyword filters. Both study PRs that _do_ security work; neither is a measure of all agent PRs.
- **Apiiro's "10×"** is growth in monthly findings from Dec 2024 to Jun 2025, not a per-developer multiplier. It is unverified in any case.
- **Lovable's RLS CVE (CVE-2025-48757) was reported by Matt Palmer, not Wiz.** Wiz's 2025 finding was a platform bug in Base44.
- **Dora et al. (2025)** studied PHP/HTML/MySQL apps, not JavaScript frameworks.
- **"Beyond Bug Fixes" (MSR 2026)** found no SonarQube Vulnerability issues in 1,210 merged agent bug fixes, only hotspots.
- **Tenzai date:** the blog index says 13 Jan 2026 and SecurityWeek covered it on 15 Jan 2026, but the post page now shows 25 Jun 2026. Cite January 2026.
- **Xia and Miller's 1.14× and 1.51×** are in the body (RQ1c and Table V), not the abstract. I confirmed this myself. The text says per source line, while the Figure 7 caption says "per 100 commits," which is an internal inconsistency.

**Linters and SAST (section 4)**

- **ESLint:** none of `no-eval`, `no-implied-eval`, `no-new-func` or `no-script-url` is in `@eslint/js` recommended. This comes from the config source; the doc pages don't say it.
- **Oxlint files these rules in different categories from Biome.** `no-eval` is Correctness and on by default. `no-new-func` and `no-script-url` are Style, and `react/no-danger` is Restriction. `typescript/no-implied-eval` needs type-aware mode.
- **Biome `noDocumentCookie` is not a security rule.** It is in `suspicious`, defaults to a warning, and is justified on correctness, not cookie theft. `noSecrets` is in `security` but not recommended.
- **The Sonar "Security Hotspot vs Vulnerability" framing is out of date.**
  - Sonar is phasing out hotspots.
  - S1523, S2068, S6418, S2245, S2092, S3330, S5122, S4790, S5332 and S5247 are now VULNERABILITY with the tag `former-hotspot`.
  - S1313 (hard-coded IP) is now a code smell.
- **`sonarjs/code-eval` only fires on non-literal arguments.** `sonarjs/pseudo-random` fires on every `Math.random()`. `sonarjs/os-command` is deprecated in 4.2.2.
- **`eslint-plugin-no-unsanitized`:**
  - The README states no limitations. They are visible only in the source: a syntactic allowlist, tracing only through `let`/`const`, hardcoded escaper names, and no DOMPurify by default.
  - Its method list also covers `import()`, `createContextualFragment` and `setHTMLUnsafe`.
- **Google's CACM 2018 authors** are Sadowski, Aftandilian, Eagle, Miller-Cushon and Jaspan. van Gogh, Söderberg and Winter wrote the 2015 Tricorder paper with Sadowski and Jaspan.
- **Facebook's "70% vs 0%"** is verified, and I re-checked it in the PDF. The batch fix rate was "near zero"; the diff-time rate was "over 70%", with the same false-positive rate (under 20%).
- **Lipp et al.:** Crossref's title says "Static C Code Analyzers," and the ISSTA programme says "C/C++." Use the DOI title.
- **Kluban, Mannan and Youssef do not compare SAST tools.** I didn't use them.
- **Brito et al.:**
  - The abstract says 957 vulnerabilities, but the arXiv conclusion mentions "745 reviews."
  - "ESLint SSC" is a bundle of security configs, not `eslint-plugin-security` alone.
- **LLMSecGuard** is a tool paper with no measured gains. **PromSec** uses Bandit and SpotBugs, not CodeQL.
- **Tony et al.'s RCI** is self-critique, not scanner feedback.
- **The scanner-feedback gains are partly circular.** FDSP and Blyth et al. grade success with the same tool that supplied the feedback.

**Gaming (section 5)**

- **Oxlint `no-eval`'s `allowIndirect` defaults to `false`.** One search summary said `true`.
- **The suppression anecdotes involve quality rules and git hooks** (`max-lines-per-function`, `--no-verify`), not security rules. I found no primary report of an agent suppressing or obfuscating around a _security_ rule.

## Unverified or dropped

- **The text of _JavaScript: The Good Parts_ on `eval`:** the bibliographic record is verified; the passage is not.
- **OWASP Top 10:2025 release date** (6 Nov 2025 release candidate): secondary only.
- **The 70%/78% eval figure in Kotowicz's 2021 Trusted Types report:** it is attributed to unnamed "research," and I could not identify the underlying study.
- **No empirical study of `dangerouslySetInnerHTML` prevalence or React XSS rates exists that I could find.** There are only vendor blogs, a small unverifiable conference paper (dropped) and one CVE. Snyk Labs' Copilot/React post (section 3.26) is a single vendor anecdote.
- **No peer-reviewed update** to Synode's 4% npm `eval` prevalence.
- **BaxBench live leaderboard:** it renders with JavaScript, so I used the paper's numbers.
- **Veracode full reports:** gated. All figures come from Veracode's press releases, blogs and the 2026 infographic.
- **Venues unconfirmed:** CodeLMSec at SaTML 2024, and A.S.E at ACL Findings 2026.
- **Tóth et al.'s GPT-4 PHP sites study:** search summary only, and PHP. Dropped.
- **CyberSecEval 4:** not about insecure-code generation. Dropped.
- **Apiiro's figures** (10×, 322%, 153%, etc.): the primary page is blocked, so secondary only.
- **CodeRabbit's per-category multipliers** (XSS 2.74×, passwords 1.88×, IDOR 1.91×, deserialization 1.82×): secondary only, via _The Register_.
- **OpenAI Aardvark's 92% recall and ten CVEs:** openai.com was blocked, so secondary only.
- **"When AI Writes Code: Investigating Security Issues in Agentic Software Changes"** (MSR 2026 Mining Challenge poster): the programme listing is verified, but I found no preprint.
- **Escape.tech landing-page figure** (2,038 vulnerabilities in 1.4K apps): it conflicts with their methodology post. Use the methodology post.
- **Dropped:** vendor blogs (Safeguard, vibecoder.me, Vibe App Scanner) claiming AI tools "often" emit unsanitized `dangerouslySetInnerHTML`, with no data.
- **Dropped:** "The Hidden DNA of LLM-Generated JavaScript" (arXiv 2510.10493), which has no security numbers in its abstract.
- **Johnson et al. (ICSE 2013) full text:** abstract only, because the author PDF link is dead.
- **Tricorder (ICSE 2015) full text:** abstract only.
- **Dropped:** an IIIT-Delhi B.Tech report claiming a 96% reduction from LLM + SAST on JavaScript/PHP. It is restricted and not peer-reviewed.
- **Not found:** any study showing that ESLint, Semgrep or CodeQL feedback improves the security of LLM-written **JavaScript/TypeScript** specifically. Every controlled feedback-loop study is Python (Bandit) or C/Java. The closest JavaScript evidence is Fu et al.'s Copilot Chat experiment (section 3.5), which included 40 JavaScript snippets scanned with CodeQL and ESLint plugins.
- **Not found:** any study measuring how often coding agents add `eslint-disable`, `biome-ignore`, `// nosemgrep` or `# nosec`, or obfuscate `eval` to pass a rule.
