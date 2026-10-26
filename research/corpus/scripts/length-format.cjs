// How much of what the line limits measure is the formatter. Copies of every file (source and
// tests, never the clones) are formatted with Oxfmt using Ultracite's preset (printWidth 80, the
// preset's own value), and again at printWidth 100 and 120 with the rest of the preset unchanged.
// Each formatted copy is parsed and measured again (length-lib.cjs `measure`), and every function is
// matched to its unformatted self by order, name and kind within the file.
//
// Reported: how line counts change from each project's own formatting to Ultracite's, which
// functions and files cross a limit only because of formatting (both ways), whether statement and
// parameter counts stay the same (they should), and every file that fails to format or to parse
// after formatting.
//
// Usage: node --max-old-space-size=12288 research/corpus/scripts/length-format.cjs [--repos a,b]
// Needs out/length-limits/census. Writes results/length-limits/format.json and
// out/length-limits/format/<repo>.<config>.jsonl.
"use strict";

const { join } = require("node:path");

const lib = require("./length-lib.cjs");
const { formatCopies } = require("./length-format-lib.cjs");

const CENSUS = join(lib.OUT_DIR, "census");
const CONFIGS = [
  ["ultracite", null],
  ["pw100", 100],
  ["pw120", 120],
];
const LIMITS = {
  biomeLines: [50],
  fileLines: [300, 500, 1000],
  lines: [50, 100],
  linesCode: [50],
  sonarLines: [200],
};

const main = () => {
  const repos = lib.selectedRepos();
  const result = {
    configs: {},
    generated: new Date().toISOString(),
    note: "`before` is each project's own formatting at its pinned commit; `ultracite` is Oxfmt with Ultracite's preset (printWidth 80) minus its ignore patterns; `pw100` and `pw120` change only printWidth. Functions are matched to themselves by position in document order, name and kind; `unmatched` counts files whose function lists differ. `crossUp` is the number of functions at or under a limit before and over it after formatting; `crossDown` the reverse.",
    repos: {},
    tools: lib.toolVersions(),
  };
  for (const name of repos) {
    const repo = lib.getRepo(name);
    const fns = lib.readJsonl(join(CENSUS, `${name}.functions.jsonl`));
    const files = lib.readJsonl(join(CENSUS, `${name}.files.jsonl`));
    const byFile = new Map();
    for (const f of fns) {
      if (!byFile.has(f.file)) {
        byFile.set(f.file, []);
      }
      byFile.get(f.file).push(f);
    }
    result.repos[name] = {};
    for (const [label, printWidth] of CONFIGS) {
      const t0 = Date.now();
      const out = formatCopies({
        files: files.map((f) => f.file),
        label: `${name}-${label}`,
        printWidth,
        root: repo.root,
      });
      result.configs[label] ??= out.config;
      const rows = [];
      const fileRows = [];
      const problems = { formatErrors: [], parseErrors: [], unmatched: [] };
      if (out.status !== 0) {
        problems.formatErrors.push(out.stderr.slice(0, 2000));
      }
      for (const fr of files) {
        const text = lib.readFileSync(join(out.dir, fr.file), "utf8");
        const m = lib.measure(text, fr.file);
        if (m.error) {
          problems.parseErrors.push({ error: m.error, file: fr.file });
          continue;
        }
        fileRows.push({
          file: fr.file,
          lines: m.file.lines,
          linesBefore: fr.lines,
          test: fr.test,
        });
        const before = byFile.get(fr.file) ?? [];
        const after = m.functions;
        // names can change (a callee's quotes), so match by order, kind, node type and depth
        const same =
          before.length === after.length &&
          before.every(
            (b, i) =>
              b.kind === after[i].kind &&
              b.nodeType === after[i].nodeType &&
              b.depth === after[i].depth
          );
        if (!same) {
          problems.unmatched.push({
            after: after.length,
            before: before.length,
            file: fr.file,
          });
          continue;
        }
        before.forEach((b, i) => {
          const a = after[i];
          rows.push({
            biomeLines: [b.biomeLines, a.biomeLines],
            id: b.id,
            iife: b.iife,
            lines: [b.lines, a.lines],
            linesCode: [b.linesCode, a.linesCode],
            params: [b.paramsEslint, a.paramsEslint],
            sonarExempt: b.iifeSonar || b.sonarReactExempt,
            sonarLines: [b.sonarLines, a.sonarLines],
            emptyStatements: [b.own.emptyStatements, a.own.emptyStatements],
            statements: [b.statements, a.statements],
            test: fr.test,
          });
        });
      }
      lib.writeJsonl(
        join(lib.OUT_DIR, "format", `${name}.${label}.jsonl`),
        rows
      );
      const summary = { seconds: 0 };
      for (const scope of ["source", "tests"]) {
        const rs = rows.filter((r) => r.test === (scope === "tests"));
        const fs = fileRows.filter((r) => r.test === (scope === "tests"));
        if (fs.length === 0) {
          continue;
        }
        const s = {
          fileLinesAfter: fs.reduce((t, f) => t + f.lines, 0),
          fileLinesBefore: fs.reduce((t, f) => t + f.linesBefore, 0),
          files: fs.length,
          functions: rs.length,
          limits: {},
          paramsChanged: rs.filter((r) => r.params[0] !== r.params[1]).length,
          statementsChanged: rs.filter(
            (r) => r.statements[0] !== r.statements[1]
          ).length,
          // ...of which the change is exactly the empty statements the formatter removed
          // (semicolon-less code's `;(` and `;[` guards after a block)
          statementsChangedByEmpty: rs.filter(
            (r) =>
              r.statements[0] !== r.statements[1] &&
              r.statements[0] - r.statements[1] ===
                r.emptyStatements[0] - r.emptyStatements[1]
          ).length,
        };
        // per-function line change, relative
        const ratios = rs
          .filter((r) => r.lines[0] >= 10)
          .map((r) => r.lines[1] / r.lines[0]);
        s.lineRatio = lib.distribution(
          ratios.map((x) => Math.round(x * 1000) / 1000)
        );
        s.linesChanged = rs.filter((r) => r.lines[0] !== r.lines[1]).length;
        for (const [field, limits] of Object.entries(LIMITS)) {
          for (const t of limits) {
            if (field === "fileLines") {
              const before = fs.filter((f) => f.linesBefore > t).length;
              const after = fs.filter((f) => f.lines > t).length;
              s.limits[`${field}>${t}`] = {
                after,
                before,
                crossDown: fs.filter((f) => f.linesBefore > t && f.lines <= t)
                  .length,
                crossUp: fs.filter((f) => f.linesBefore <= t && f.lines > t)
                  .length,
              };
              continue;
            }
            const eligible = rs.filter((r) =>
              field === "sonarLines" ? !r.sonarExempt : !r.iife
            );
            const over = (r, k) => (r[field][k] ?? 0) > t;
            s.limits[`${field}>${t}`] = {
              after: eligible.filter((r) => over(r, 1)).length,
              before: eligible.filter((r) => over(r, 0)).length,
              crossDown: eligible.filter((r) => over(r, 0) && !over(r, 1))
                .length,
              crossUp: eligible.filter((r) => !over(r, 0) && over(r, 1)).length,
            };
          }
        }
        summary[scope] = s;
      }
      summary.problems = {
        formatErrors: problems.formatErrors,
        parseErrors: problems.parseErrors,
        unmatchedFiles: problems.unmatched.length,
        unmatchedExamples: problems.unmatched.slice(0, 10),
      };
      summary.seconds = Math.round((Date.now() - t0) / 100) / 10;
      result.repos[name][label] = summary;
      console.log(
        `${name} ${label}: ${rows.length} functions matched, ${problems.parseErrors.length} parse errors, ${problems.unmatched.length} unmatched files, format status ${out.status}, ${summary.seconds}s`
      );
    }
  }
  lib.writeJson(join(lib.RESULTS_DIR, "format.json"), result);
};

main();
